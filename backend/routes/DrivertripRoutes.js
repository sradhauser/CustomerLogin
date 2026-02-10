import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp"; // Image compression library
import db from "../config/database.js";

const router = express.Router();

// 1. Ensure Directories Exist
const uploadBase = path.resolve();
const odoDir = path.join(uploadBase, "uploads", "odometer");
const selfieDir = path.join(uploadBase, "uploads", "customer_selfie");

// Helper to create folders if they don't exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureDir(odoDir);
ensureDir(selfieDir);

// 2. Multer Storage (Use MemoryStorage to process with Sharp first)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (processed later)
});

router.get("/assigned-trip", async (req, res) => {
  try {
    const { driver_regno } = req.query;

    if (!driver_regno) {
      return res.status(400).json({ message: "driver_regno required" });
    }
    // console.log(driver_regno);
    // 1️⃣ Get driver_id
    const [driverRows] = await db.execute(
      "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
      [driver_regno]
    );

    if (driverRows.length === 0) {
      return res.json([]);
    }

    const driver_id = driverRows[0].driver_id;

    const sql = `
SELECT 
  e.*,

  -- cab assignment
  ca.cab_id,
  ca.pickloc_name,

  -- time
  atime.time_name AS arrive_time_name,
  dtime.time_name AS depart_time_name,

  -- itinerary
  itin.pickloc_name  AS itin_pickloc_name,
  itin.pickcity_name AS itin_pickcity_name,
  itin.drop_location AS itin_drop_location,
  itin.pick_address  AS itin_pick_address,

  -- driver trip details
  dtd.drv_tripid,
  dtd.accept_status,
  dtd.cust_otp

FROM tbl_cabassignments ca

INNER JOIN tbl_enquiries e 
  ON ca.enq_id = e.enq_id

LEFT JOIN tbl_time atime ON e.arrive_time = atime.time_id
LEFT JOIN tbl_time dtime ON e.dept_time = dtime.time_id
LEFT JOIN tbl_enqitenary itin ON itin.enq_id = e.enq_id

LEFT JOIN drv_tripdetails dtd 
  ON dtd.cust_bookingid = e.enq_id 
  AND dtd.drv_id = ?

WHERE 
  ca.driver_id = ?
  AND e.arrive_dt >= CURDATE()
  AND atime.value_time > CURTIME()
  AND e.confirmation_id IS NOT NULL

ORDER BY e.enq_id DESC
LIMIT 1
`;

    // 3) execute query
    const [tripRows] = await db.execute(sql, [driver_id, driver_id]);

    // 4) print rows returned
    // console.log("tripRows result:", tripRows);

    // 5) return response
    return res.json(tripRows);
  } catch (err) {
    console.error("Driver assigned-trip error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================================================
   ACCEPT / REJECT TRIP
===================================================== */
router.post("/accept-trip", async (req, res) => {
  try {
    const { enq_id, driver_regno, action } = req.body;

    if (!enq_id || !driver_regno || !action) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // 1️⃣ Get driver_id using driver_regno
    const [driverRows] = await db.execute(
      "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
      [driver_regno]
    );

    if (driverRows.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver_id = driverRows[0].driver_id;

    // 2️⃣ Map accept / reject
    const accept_status = action === "accept" ? 1 : 2;

    // 3️⃣ INSERT record — NO UPDATE
    await db.execute(
      `
      INSERT INTO drv_tripdetails 
        (cust_bookingid, drv_id, accept_status, acpt_date)
      VALUES 
        (?, ?, ?, NOW())
      `,
      [enq_id, driver_id, accept_status]
    );

    return res.json({
      success: true,
      message: "Trip response recorded",
      accept_status,
    });
  } catch (err) {
    console.error("Accept trip insert error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { enq_id } = req.body;

    if (!enq_id) {
      return res.status(400).json({ message: "enq_id required" });
    }

    // generate 4 digit OTP
    const cust_otp = Math.floor(1000 + Math.random() * 9000);

    await db.execute(
      `
      UPDATE drv_tripdetails
      SET cust_otp = ?, cust_otptime = NOW()
      WHERE cust_bookingid = ?
      `,
      [cust_otp, enq_id]
    );

    return res.json({
      success: true,
      otp: cust_otp,
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/// Assuming you have multer configured as 'upload'
// router.post(
//   "/start-trip",
//   upload.single("odometer_image"),
//   async (req, res) => {
//     try {
//       const { drv_tripid, driver_regno, entered_otp, latitude, longitude } =
//         req.body;
//       const odometer_image = req.file
//         ? `/uploads/odometer/${req.file.filename}`
//         : null;

//       if (!drv_tripid || !driver_regno || !entered_otp) {
//         return res.status(400).json({ message: "Invalid request" });
//       }

//       // 1. Resolve Driver ID
//       const [driverRows] = await db.execute(
//         "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
//         [driver_regno]
//       );

//       if (driverRows.length === 0)
//         return res.status(404).json({ message: "Driver not found" });
//       const driver_id = driverRows[0].driver_id;

//       // 2. Verify OTP
//       const [tripRows] = await db.execute(
//         "SELECT cust_otp FROM drv_tripdetails WHERE drv_tripid = ? AND drv_id = ?",
//         [drv_tripid, driver_id]
//       );

//       if (tripRows.length === 0)
//         return res.status(404).json({ message: "Trip not found" });
//       if (String(tripRows[0].cust_otp) !== String(entered_otp).trim()) {
//         return res.status(400).json({ message: "Invalid OTP" });
//       }

//       // 3. Update Trip Status with Odometer and GPS
//       await db.execute(
//         `UPDATE drv_tripdetails
//        SET otp_verified = 1,
//            tstart_datetime = NOW(),
//            tsodomtr_image = ?,
//            tsgps_latitude = ?,
//            tsgps_longitude = ?
//        WHERE drv_tripid = ? AND drv_id = ?`,
//         [odometer_image, latitude, longitude, drv_tripid, driver_id]
//       );

//       // 4. Fetch updated data
//       const [updatedTrip] = await db.execute(
//         "SELECT * FROM drv_tripdetails WHERE drv_tripid = ?",
//         [drv_tripid]
//       );

//       return res.json({
//         success: true,
//         message: "Trip Started Successfully",
//         data: updatedTrip[0],
//       });
//     } catch (err) {
//       console.error("Start trip error:", err);
//       res.status(500).json({ message: "Server error" });
//     }
//   }
// );

router.post(
  "/start-trip",
  // Accept two specific fields: odometer_image and driver_selfie
  upload.fields([
    { name: "odometer_image", maxCount: 1 },
    { name: "driver_selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 1. Destructure matching YOUR REACT FORM DATA
      const {
        enq_id, // React sends enq_id, not drv_tripid
        driver_regno,
        entered_otp,
        odometer_value,
        latitude,
        longitude,
        location_name,
      } = req.body;

      // Debugging: Check what is received
      // console.log("Start Trip Body:", req.body);
      // console.log("Start Trip Files:", req.files);

      if (!enq_id || !driver_regno || !entered_otp) {
        return res
          .status(400)
          .json({ message: "Invalid request. Missing required fields." });
      }

      // 2. Resolve Driver ID
      const [driverRows] = await db.execute(
        "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
        [driver_regno]
      );

      if (driverRows.length === 0)
        return res.status(404).json({ message: "Driver not found" });
      const driver_id = driverRows[0].driver_id;

      // 3. Find Trip & Verify OTP
      // We look for the trip assigned to this driver for this booking ID (enq_id)
      const [tripRows] = await db.execute(
        "SELECT drv_tripid, cust_otp FROM drv_tripdetails WHERE cust_bookingid = ? AND drv_id = ?",
        [enq_id, driver_id]
      );

      if (tripRows.length === 0)
        return res
          .status(404)
          .json({ message: "Trip not found for this driver/enquiry" });

      const tripDetails = tripRows[0];

      // Strict OTP Check
      if (String(tripDetails.cust_otp).trim() !== String(entered_otp).trim()) {
        return res
          .status(400)
          .json({ message: "Invalid OTP. Please try again." });
      }

      // 4. Image Processing with Sharp
      let odometerPath = null;
      let selfiePath = null;
      const timestamp = Date.now();

      // A. Process Odometer Image
      if (req.files && req.files["odometer_image"]) {
        const odoFile = req.files["odometer_image"][0];
        const odoFilename = `trip_odo-${tripDetails.drv_tripid}-${timestamp}.jpeg`;
        const odoFilePath = path.join(odoDir, odoFilename);

        await sharp(odoFile.buffer)
          .resize(800) // Resize width to 800px (auto height)
          .jpeg({ quality: 70 }) // Compress quality
          .toFile(odoFilePath);

        odometerPath = `/uploads/odometer/${odoFilename}`;
      }

      // B. Process Selfie Image (If provided)
      if (req.files && req.files["driver_selfie"]) {
        const selfieFile = req.files["driver_selfie"][0];
        const selfieFilename = `cust_selfie-${tripDetails.drv_tripid}-${timestamp}.jpeg`;
        const selfieFilePath = path.join(selfieDir, selfieFilename);

        await sharp(selfieFile.buffer)
          .resize(800)
          .jpeg({ quality: 70 })
          .toFile(selfieFilePath);

        selfiePath = `/uploads/customer_selfie/${selfieFilename}`;
      }

      // 5. Update Database
      // Note: Added `tsstart_km` for odometer value
      // Note: Added `ts_cust_selfie` (Assuming this column exists, remove if not)
      await db.execute(
        `UPDATE drv_tripdetails 
         SET otp_verified = 1, 
             tstart_datetime = NOW(),
             tsgps_locname = ?,
             tsodomtr_image = ?,
             tsstart_km = ?, 
             ts_cust_selfie = ?, 
             tsgps_latitude = ?,
             tsgps_longitude = ?,
             accept_status = 3  
         WHERE drv_tripid = ?`,
        [
          location_name,
          odometerPath,
          odometer_value,
          selfiePath,
          latitude,
          longitude,
          tripDetails.drv_tripid,
        ]
      );

      // 6. Return Success
      const [updatedTrip] = await db.execute(
        "SELECT * FROM drv_tripdetails WHERE drv_tripid = ?",
        [tripDetails.drv_tripid]
      );

      return res.json({
        success: true,
        message: "Trip Started Successfully",
        data: updatedTrip[0],
      });
    } catch (err) {
      console.error("Start trip error:", err);
      res.status(500).json({ message: "Server error processing start trip" });
    }
  }
);
export default router;