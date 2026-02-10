import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import auth from "../middleware/auth.js";
import { submitAttendanceLogic } from "../services/attendance.js";

const router = express.Router();

// 1. Define upload directory (Selfie Only)
const selfieDir = path.join(process.cwd(), "uploads", "selfies");

// 2. Ensure directory exists
if (!fs.existsSync(selfieDir)) {
  fs.mkdirSync(selfieDir, { recursive: true });
}

// 3. Use memoryStorage to allow compression before saving
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 4. Helper: Compress to < 100KB and Save to target folder
const saveAndCompressImage = async (file, driverId, targetDir) => {
  if (!file) return null;

  const filename = `${driverId}_${Date.now()}_${Math.round(
    Math.random() * 1e9
  )}.jpeg`;
  const filepath = path.join(targetDir, filename);

  let quality = 90; // Start quality
  let buffer = file.buffer;
  const targetSize = 100 * 1024; // 100KB in bytes

  // Resize geometry first (width 800px is standard for mobile apps)
  let sharpInstance = sharp(file.buffer).resize({
    width: 800,
    withoutEnlargement: true,
  });

  // Compression Loop: Reduce quality until < 100KB
  do {
    buffer = await sharpInstance.jpeg({ quality: quality }).toBuffer();
    quality -= 10;
  } while (buffer.length > targetSize && quality > 10);

  // Write final buffer to disk
  await fs.promises.writeFile(filepath, buffer);

  return {
    filename: filename,
    path: filepath,
  };
};

router.post(
  "/",
  auth,
  // Only accept 'selfie' now
  upload.fields([{ name: "selfie", maxCount: 1 }]),
  async (req, res) => {
    try {
      const driverId = req.driver?.id || "NO_ID";

      // 5. Validate Selfie
      if (!req.files?.selfie?.[0]) {
        return res.status(400).json({ message: "Selfie required" });
      }

      // 6. Compress & Save Selfie -> 'uploads/selfies'
      const selfieData = await saveAndCompressImage(
        req.files.selfie[0],
        driverId,
        selfieDir
      );

      // 7. Prepare other data (Location & Button Param only)
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);
      const locationName = req.body.locationName || null;
      const btnpara = req.body.btnParameter || null;

      // 8. Call Logic (Cleaned up arguments)
      await submitAttendanceLogic({
        driver: req.driver,
        filePath: selfieData.path,
        fileName: selfieData.filename,
        latitude,
        longitude,
        locationName,
        buttonParameter: btnpara,
      });

      res.json({ success: true, message: "Attendance Marked Successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Attendance failed" });
    }
  }
);

export default router;