import fs from "fs";
import sharp from "sharp";
import db from "../config/database.js";

// Helper: Add Watermark (Unchanged)
async function addWatermark(inputPath, textLines) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const imgWidth = metadata.width;
    const wmHeight = 140;

    if (!imgWidth || imgWidth < 100) return;

    const svgString = `
      <svg width="${imgWidth}" height="${wmHeight}">
        <rect width="100%" height="100%" fill="black" fill-opacity="0.6"/>
        ${textLines.map((t, i) =>
            `<text x="20" y="${40 + i * 35}" font-size="28" font-family="Arial" font-weight="bold" fill="white">${t}</text>`
          ).join("")}
      </svg>
    `;

    const svgBuffer = Buffer.from(svgString);
    const tempPath = inputPath + ".tmp";

    await image
      .composite([{ input: svgBuffer, gravity: "southwest" }])
      .toFile(tempPath);

    await fs.promises.rename(tempPath, inputPath);
  } catch (err) {
    console.error("Watermark generation failed:", err);
  }
}

export const submitAttendanceLogic = async ({
  driver,
  filePath,
  fileName,
  latitude,
  longitude,
  locationName,
  buttonParameter, // 0 = IN, >0 (Attendance ID) = OUT
}) => {
  if (!driver?.id) throw new Error("Driver missing");

  // Format Text for Watermark
  const locationText = locationName || "lat: " + latitude.toFixed(5) + ", lon: " + longitude.toFixed(5);
  const timeText = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. NON-BLOCKING WATERMARK
  // We start this process but don't 'await' it immediately if we want super speed. 
  // However, keeping 'await' ensures the file is ready before we say "Success".
  // For 100 users, this is the heaviest part. Ensure your server has good CPU.
  const watermarkPromise = filePath 
    ? addWatermark(filePath, [
        `Driver: ${driver.driver_fstname} (${driver.regNo})`,
        `Loc: ${locationText.substring(0, 40)}...`,
        `Time: ${timeText}`
      ])
    : Promise.resolve();

  // 2. CHECK IN LOGIC (Prevent Duplicates)
  if (Number(buttonParameter) === 0) {
    
    // ATOMIC INSERT: Only insert if no record exists for this driver TODAY
    // This handles the "100 clicks at once" problem.
    const [result] = await db.execute(
      `INSERT INTO drv_attendance_details (
         drv_id, checkin_datetime, checkin_selfie, 
         cigps_locname, cigps_latitude, cigps_longitude, ck_sts
       ) 
       SELECT ?, NOW(), ?, ?, ?, ?, 1
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM drv_attendance_details 
         WHERE drv_id = ? 
         AND DATE(checkin_datetime) = ?
       )`,
      [
        driver.id, fileName, locationText, latitude, longitude, // Insert Values
        driver.id, todayDate // Where Not Exists Values
      ]
    );

    // Wait for watermark to finish before returning (optional)
    await watermarkPromise;

    if (result.affectedRows === 0) {
      throw new Error("Already Punched In Today");
    }

    return { success: true, type: 'IN', id: result.insertId };

  } else {
    // 3. CHECK OUT LOGIC
    const [result] = await db.execute(
      `UPDATE drv_attendance_details
       SET checkout_datetime = NOW(),
           checkout_selfie   = ?,
           cogps_locname     = ?,
           cogps_latitude    = ?,
           cogps_longitude   = ?,
           ck_sts            = 2
       WHERE drv_atid = ? AND ck_sts = 1`, // Added 'AND ck_sts = 1' for safety
      [
        fileName, locationText, latitude, longitude,
        buttonParameter 
      ]
    );

    await watermarkPromise;

    if (result.affectedRows === 0) {
      throw new Error("Check-out failed or already checked out");
    }

    return { success: true, type: 'OUT' };
  }
};