import express from "express";
import multer from "multer";
import path from "path";
const uploadDir = path.join(path.resolve(), "uploads", "odometer");
import db from "../config/database.js";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create a unique filename: tripid-timestamp.jpg
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// 3. Define the 'upload' middleware
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});


router.get("/assigned-trip", async (req, res) => {
  try {
    const { driver_regno } = req.query;

    if (!driver_regno) {
      return res.status(400).json({ message: "driver_regno required" });
    }

    // 1️⃣ Get driver_id
    const [driverRows] = await db.execute(
      "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
      [driver_regno]
    );

    if (driverRows.length === 0) {
      return res.json([]);
    }

    const driver_id = driverRows[0].driver_id;

    // 2️⃣ Get trip details
    const [tripRows] = await db.execute(
      `
      SELECT 
        drv_tripid,
        cust_bookingid,
        drv_id,
        accept_status,
        acpt_date,
        cust_otp,
        cust_otptime,
        tstart_datetime,
        tsgps_locname,
        tsodomtr_image,
        tsgps_latitude,
        tsgps_longitude
      FROM drv_tripdetails
      WHERE drv_id = ?
      ORDER BY drv_tripid DESC
      LIMIT 1
      `,
      [driver_id]
    );

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
    const { drv_tripid, driver_regno, action } = req.body;

    //console.log("ACCEPT TRIP BODY:", req.body);

    if (!drv_tripid || !driver_regno || !action) {
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

    // 2️⃣ Decide accept or reject
    const accept_status = action === "accept" ? 1 : 2;

    // OTP only if accepted
    const cust_otp =
      accept_status === 1
        ? Math.floor(1000 + Math.random() * 9000)
        : null;

    // 3️⃣ Update trip
    await db.execute(
      `
      UPDATE drv_tripdetails
      SET 
        accept_status = ?,
        cust_otp = ?,
         cust_otptime = NOW(),
        acpt_date = NOW()
      WHERE drv_tripid = ? AND drv_id = ?
      `,
      [accept_status, cust_otp, drv_tripid, driver_id]
    );

    // 4️⃣ Send response back to React
    return res.json({
      success: true,
      cust_otp,
    });

  } catch (err) {
    console.error("Accept trip error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/// Assuming you have multer configured as 'upload'
router.post("/start-trip", upload.single('odometer_image'), async (req, res) => {
  try {
    const { drv_tripid, driver_regno, entered_otp, latitude, longitude } = req.body;
    const odometer_image = req.file ? `/uploads/odometer/${req.file.filename}` : null;

    if (!drv_tripid || !driver_regno || !entered_otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // 1. Resolve Driver ID
    const [driverRows] = await db.execute(
      "SELECT driver_id FROM tbl_drivers WHERE driver_regno = ?",
      [driver_regno]
    );

    if (driverRows.length === 0) return res.status(404).json({ message: "Driver not found" });
    const driver_id = driverRows[0].driver_id;

    // 2. Verify OTP
    const [tripRows] = await db.execute(
      "SELECT cust_otp FROM drv_tripdetails WHERE drv_tripid = ? AND drv_id = ?",
      [drv_tripid, driver_id]
    );

    if (tripRows.length === 0) return res.status(404).json({ message: "Trip not found" });
    if (String(tripRows[0].cust_otp) !== String(entered_otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // 3. Update Trip Status with Odometer and GPS
    await db.execute(
      `UPDATE drv_tripdetails 
       SET otp_verified = 1, 
           tstart_datetime = NOW(),
           tsodomtr_image = ?,
           tsgps_latitude = ?,
           tsgps_longitude = ?
       WHERE drv_tripid = ? AND drv_id = ?`,
      [odometer_image, latitude, longitude, drv_tripid, driver_id]
    );

    // 4. Fetch updated data
    const [updatedTrip] = await db.execute(
      "SELECT * FROM drv_tripdetails WHERE drv_tripid = ?",
      [drv_tripid]
    );

    return res.json({
      success: true,
      message: "Trip Started Successfully",
      data: updatedTrip[0]
    });

  } catch (err) {
    console.error("Start trip error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
