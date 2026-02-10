import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { fileURLToPath } from "url";
import db from "../config/database.js";

// --- 1. SETUP PATHS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- 2. CONFIGURATION ---
const uploadDir = path.join(__dirname, "../uploads/refuel_receipt");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed!"));
  },
});

// --- 3. MAIN CONTROLLER LOGIC ---

router.post("/add", upload.single("receipt_image"), async (req, res) => {
  let filename = null;
  let outputPath = null;

  try {
    // A. Validate Input
    const {
      driver_id,
      station_name,
      liters,
      price_per_liter,
      total_amount,
      odometer,
      payment_mode,
      transaction_id,
    } = req.body;

    if (!driver_id || !req.file) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Driver ID and Receipt are required",
        });
    }

    // --- B. DOUBLE INSERT PREVENTION (Fixed: Removed Callback) ---
    const checkSql = `
            SELECT id FROM drv_fuel_expenses 
            WHERE driver_id = ? 
            AND odometer = ? 
            AND total_amount = ? 
            AND created_at > (NOW() - INTERVAL 5 MINUTE)
        `;

    // db.execute returns [rows, fields]. We grab the first element (rows).
    const [existingRecords] = await db.execute(checkSql, [
      driver_id,
      odometer,
      total_amount,
    ]);

    if (existingRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate entry detected. This refuel seems to be already added.",
      });
    }

    // --- C. Process Image with Sharp ---
    filename = `receipt_${driver_id}_${Date.now()}.jpeg`;
    outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .toFormat("jpeg")
      .jpeg({ quality: 60 })
      .toFile(outputPath);

    // --- D. Database Insert (Fixed: Removed Callback) ---
    const insertSql = `
            INSERT INTO drv_fuel_expenses 
            (driver_id, station_name, liters, price_per_liter, total_amount, odometer, payment_mode, transaction_id, receipt_image, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const initialStatus = "Pending";
    const values = [
      driver_id,
      station_name,
      liters,
      price_per_liter,
      total_amount,
      odometer,
      payment_mode,
      transaction_id || null,
      filename,
      initialStatus,
    ];

    // Simply await the execution. No callbacks needed.
    const [result] = await db.execute(insertSql, values);

    // --- E. Send Response ---
    return res.status(201).json({
      success: true,
      message: "Refuel added successfully",
      id: result.insertId,
      status: initialStatus,
    });
  } catch (error) {
    console.error("Server Error:", error);

    // Show actual server error
    return res.status(500).json({
      success: false,
      message: "Server Error: " + error.message,
    });
  }
});

router.get("/fuelloghistory/:driver_id", async (req, res) => {
  try {
    const { driver_id } = req.params;

    if (!driver_id) {
      return res
        .status(400)
        .json({ success: false, message: "Driver ID is required" });
    }

    const sql = `
            SELECT 
                id, station_name, liters, total_amount, 
                odometer, status, created_at, receipt_image 
            FROM drv_fuel_expenses 
            WHERE driver_id = ? 
            ORDER BY created_at DESC
        `;

    const [rows] = await db.execute(sql, [driver_id]);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;