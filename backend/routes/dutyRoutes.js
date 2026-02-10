import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import db from "../config/database.js";
import auth from "../middleware/auth.js";
import { submitduty } from "../services/duty.js";

const router = express.Router();

// ==============================
// 1. DIRECTORIES SETUP
// ==============================

// A. Odometer Folder
const odometerDir = path.join(process.cwd(), "uploads", "odometer");
if (!fs.existsSync(odometerDir)) {
  fs.mkdirSync(odometerDir, { recursive: true });
}

// B. Checklist Images Folder
const checklistDir = path.join(process.cwd(), "uploads", "chklist_img");
if (!fs.existsSync(checklistDir)) {
  fs.mkdirSync(checklistDir, { recursive: true });
}

// ==============================
// MULTER (MEMORY STORAGE)
// ==============================
const upload = multer({ storage: multer.memoryStorage() });

// ==============================
// 2. SMART COMPRESSION HELPER (< 100KB)
// ==============================
const saveImage = async (file, driverId, targetDir) => {
  if (!file || !file.buffer) return null;

  const filename = `${driverId}_${Date.now()}_${Math.round(
    Math.random() * 1000
  )}.jpeg`;
  const filepath = path.join(targetDir, filename);

  // OPTIMIZATION:
  // Instead of looping (which kills CPU), just resize and compress once efficiently.
  // 800px width + 60% quality is standard for mobile app uploads.
  try {
    await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true }) // Resize if huge
      .jpeg({ quality: 60, mozjpeg: true }) // Aggressive but good quality JPEG
      .toFile(filepath); // Write directly to disk

    return filename;
  } catch (e) {
    console.error("Image Save Error:", e);
    return null;
  }
};

// ==============================
// POST ROUTE (Start/End Duty)
// ==============================
router.post("/duty", auth, upload.any(), async (req, res) => {
  try {
    const driver = req.driver;
    if (!driver?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const buttonParameter = Number(req.body.buttonParameter);

    if (![1, 2].includes(buttonParameter)) {
      return res.status(400).json({ message: "Invalid duty action" });
    }

    // --------------------------
    // A. SAVE ODOMETER IMAGE -> 'uploads/odometer'
    // --------------------------
    let odometerFileName = null;
    const odoFile = req.files.find((f) => f.fieldname === "odometer_image");

    if (odoFile) {
      // Compress & Save to Odometer Folder
      odometerFileName = await saveImage(odoFile, driver.id, odometerDir);
    }

    // --------------------------
    // B. PARSE CHECKLIST JSON
    // --------------------------
    let ci_itemchkstatus = {};
    if (req.body.ci_itemchkstatus) {
      ci_itemchkstatus = JSON.parse(req.body.ci_itemchkstatus);
    }

    // --------------------------
    // C. SAVE CHECKLIST IMAGES -> 'uploads/chklist_img'
    // --------------------------
    for (const file of req.files) {
      // Look for fields named 'checklist_image_1', 'checklist_image_2', etc.
      if (file.fieldname.startsWith("checklist_image_")) {
        const itemId = file.fieldname.replace("checklist_image_", "");

        // Compress & Save to Checklist Folder
        const imgName = await saveImage(file, driver.id, checklistDir);

        // Update the JSON with the new filename
        if (ci_itemchkstatus[itemId]) {
          ci_itemchkstatus[itemId].image = imgName;
        }
      }
    }

    // --------------------------
    // D. CALL SERVICE
    // --------------------------
    await submitduty({
      driver,
      odometerFileName,
      odometerValue: req.body.odometerValue || null,
      ci_itemchkstatus,
      buttonParameter,
    });

    res.json({
      success: true,
      message:
        buttonParameter === 1
          ? "Duty Started Successfully"
          : "Duty Ended Successfully",
    });
  } catch (err) {
    console.error("Duty Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Duty submission failed",
    });
  }
});

// GET ROUTE (Fetch Status)
router.get("/status/:driverIdentifier", auth, async (req, res) => {
  try {
    const driverIdentifier = req.params.driverIdentifier;

    // 1. Get Date from Frontend Query Param (Robust)
    const queryDate = req.query.date || new Date().toISOString().split("T")[0];

    // 2. Resolve Driver ID
    let driverId = driverIdentifier;
    if (isNaN(driverIdentifier)) {
      const [driverCheck] = await db.execute(
        "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
        [driverIdentifier]
      );
      if (driverCheck.length === 0) return res.json({ dutyStatus: 0 });
      driverId = driverCheck[0].driver_id;
    }

    // 3. SQL Query: Fetch record ONLY for that specific date
    // We use DATE(duty_in_datetime) = ? to match the "2026-01-05" string
    const [rows] = await db.execute(
      `SELECT * FROM drv_duty_details 
       WHERE drv_id = ? 
       AND DATE(duty_in_datetime) = ? 
       ORDER BY duty_in_datetime DESC LIMIT 1`,
      [driverId, queryDate]
    );

    // 4. If no rows found for TODAY, return status 0 (Frontend will show START DUTY)
    if (rows.length === 0) return res.json({ dutyStatus: 0 });

    const record = rows[0];

    // --- HELPER FUNCTIONS ---
    const parseChecklist = (jsonField) => {
      if (!jsonField) return [];
      try {
        const parsed =
          typeof jsonField === "string" ? JSON.parse(jsonField) : jsonField;
        return Object.values(parsed).map((item) => ({
          name: item.name,
          value: item.value === 1 ? "Yes" : "No",
          isYes: item.value === 1,
          image: item.image ? `/uploads/chklist_img/${item.image}` : null,
        }));
      } catch (e) {
        return [];
      }
    };

    const formatDate = (date) =>
      date
        ? new Date(date).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Pending";

    // 5. Construct Response
    const responseData = {
      dutyStatus: record.ck_sts, // Returns 1 (Started) or 2 (Ended)

      // --- START DUTY ---
      start_time: formatDate(record.duty_in_datetime),
      start_odo_val: record.odo_civalue,
      start_odo_img: record.ciodomtr_image
        ? `/uploads/odometer/${record.ciodomtr_image}`
        : null,
      start_checklist: parseChecklist(record.ci_itemchkstatus),

      // --- END DUTY ---
      end_time:
        record.ck_sts === 2 ? formatDate(record.duty_out_datetime) : "On Duty",
      end_odo_img: record.coodomtr_image
        ? `/uploads/odometer/${record.coodomtr_image}`
        : null,
      end_odo_val: record.odo_covalue,
      end_checklist:
        record.ck_sts === 2 ? parseChecklist(record.co_itemchkstatus) : [],
    };

    return res.json(responseData);
  } catch (err) {
    console.error("Duty Status Error:", err);
    res.status(500).json({ message: "Cannot fetch duty status" });
  }
});

// NEW ROUTE: Get ONLY the start odometer for the current active duty
// router.get("/active-odo/:driverIdentifier", auth, async (req, res) => {
//   try {
//     const driverIdentifier = req.params.driverIdentifier;
//     let driverId = driverIdentifier;

//     if (isNaN(driverIdentifier)) {
//       const [driverCheck] = await db.execute(
//         "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
//         [driverIdentifier]
//       );
//       if (driverCheck.length === 0) return res.json({ start_odo: 0 });
//       driverId = driverCheck[0].driver_id;
//     }

//     // 2. QUERY: Get the latest record where the driver is ON DUTY (Status = 1)
//     const [rows] = await db.execute(
//       `SELECT odo_civalue FROM drv_duty_details
//        WHERE drv_id = ? AND ck_sts = 1
//        ORDER BY id DESC LIMIT 1`,
//       [driverId]
//     );

//     if (rows.length > 0) {
//       return res.json({ start_odo: rows[0].odo_civalue });
//     } else {
//       return res.json({ start_odo: 0 });
//     }
//   } catch (err) {
//     console.error(err);
//     res.json({ start_odo: 0 });
//   }
// });

export default router;
