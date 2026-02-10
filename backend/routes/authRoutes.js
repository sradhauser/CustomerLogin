import express from "express";
import auth from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import { State, City } from "country-state-city";

import {
  requestOtp,
  verifyOtp,
  mpinLogin,
  setupMpin,
  resetMpin,
  getDriverProfile,
  requestPhoneChangeOtp,
  verifyPhoneChange,
  requestEmailChangeOtp,
  verifyEmailChange,
  updateDriverprofile,
  getAllCountries,
  getDriverDocuments,
  updateDriverDocuments,
} from "../services/authModel.js";
import db from "../config/database.js";

const router = express.Router();

// --- 1. PROFILE PHOTO CONFIGURATION ---
const storageProfile = multer.memoryStorage();
const uploadProfile = multer({
  storage: storageProfile,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const profileDir = "uploads/profile/";
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// --- 2. DOCUMENT CONFIGURATION ---
// We use memory storage to buffer the file -> compress it -> save to disk
const storageDocs = multer.memoryStorage();
const uploadDocs = multer({
  storage: storageDocs,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const docDir = "uploads/documents/";
if (!fs.existsSync(docDir)) {
  fs.mkdirSync(docDir, { recursive: true });
}

// Async Wrapper
const asyncWrapper = (logicFunction) => async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
    const result = await logicFunction({ ...req.body, ip });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Auth Error:", error);
    if (error.locked === true) {
      return res.status(401).json({ success: false, message: error.message, locked: true });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
//              PROFILE ROUTES
// ==========================================

router.get("/profile", auth, async (req, res) => {
  try {
    const profileData = await getDriverProfile(req.driver.id);
    return res.status(200).json({ success: true, ...profileData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.put(
  "/update-complete-profile",
  auth,
  uploadProfile.single("photo"),
  async (req, res) => {
    try {
      let photoPath = null;

      if (req.file) {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
        const filename = `profile-${req.driver.id}-${dateStr}-${timeStr}.jpeg`;
        const filePath = path.join(profileDir, filename);

        // Compress Profile Photo
        await sharp(req.file.buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .toFormat("jpeg")
          .jpeg({ quality: 90, mozjpeg: true })
          .toFile(filePath);

        photoPath = `/uploads/profile/${filename}`;
      }

      const updateData = {
        address1: req.body.address1 || null,
        address2: req.body.address2 || null,
        address3: req.body.address3 || null,
        state_id: req.body.state_id || null,
        city_id: req.body.city_id || null,
        zipcode: req.body.zipcode || null,
        utype: req.body.utype || req.driver.user_type,
      };

      const result = await updateDriverprofile(req.driver.id, updateData, photoPath);
      res.status(200).json(result);
    } catch (error) {
      console.error("Update Route Error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
//              DOCUMENT ROUTES
// ==========================================

router.get("/get-driver-documents", auth, async (req, res) => {
  try {
    const result = await getDriverDocuments(req.driver.id);
    return res.status(200).json(result);
    
  } catch (error) {
    console.error("Fetch Error:", error); 
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  "/update-all-documents",
  auth,
  uploadDocs.fields([
    { name: "aadhar_file", maxCount: 1 },
    { name: "pan_file", maxCount: 1 },
    { name: "voter_file", maxCount: 1 },
    { name: "dl_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const driverId = req.driver.id;

      let euType = req.user_type || req.driver.user_type;
      if (!euType) {
        const [driver] = await db.pool.execute(
          "SELECT user_type FROM tbl_drivers WHERE driver_id = ?",
          [driverId]
        );
        euType = driver[0]?.user_type;
      }
      if (!euType) throw new Error("User type not identified.");

      const sessionId = req.headers["authorization"]?.split(" ")[1]?.substring(0, 50) || "system-gen";
      req.body.session_id = sessionId;
      req.body.session_createtime = new Date();

      const processedFiles = {};

      if (req.files) {
        const fileKeys = Object.keys(req.files);
        
        // Process documents in parallel
        await Promise.all(fileKeys.map(async (key) => {
          const file = req.files[key][0];
          
          const now = new Date();
          const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
          const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
          
          // Force .jpeg extension
          const filename = `${key.replace('_file', '')}-${driverId}-${dateStr}-${timeStr}.jpeg`;
          const filePath = path.join(docDir, filename);

          // COMPRESS DOCUMENT
          await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true }) 
            .toFormat("jpeg")
            .jpeg({ quality: 80, mozjpeg: true })
            .toFile(filePath);

          processedFiles[key] = [{
             filename: filename,
             path: filePath 
          }];
        }));
      }

      const result = await updateDriverDocuments(driverId, euType, req.body, processedFiles);
      res.status(200).json({ success: true, ...result });

    } catch (error) {
      console.error("Document Sync Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
//              OTP & GEO ROUTES
// ==========================================

router.post("/request-phone-change", auth, async (req, res) => {
  try {
    const result = await requestPhoneChangeOtp(req.driver.id, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/verify-phone-change", auth, async (req, res) => {
  try {
    const result = await verifyPhoneChange(req.driver.id, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/request-email-change", auth, async (req, res) => {
  try {
    const result = await requestEmailChangeOtp(req.driver.id, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/verify-email-change", auth, async (req, res) => {
  try {
    const result = await verifyEmailChange(req.driver.id, req.body);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/geo/countries", async (req, res) => {
  try {
    const result = await getAllCountries();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/geo/states", async (req, res) => {
  try {
    const states = State.getStatesOfCountry("IN");
    const result = states.map((s) => ({ state_id: s.isoCode, state_name: s.name }));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/geo/cities", async (req, res) => {
  try {
    const { stateCode } = req.query;
    if (!stateCode) return res.status(400).json({ success: false, message: "stateCode is required" });
    const cities = City.getCitiesOfState("IN", stateCode);
    const result = cities.map((c) => ({ city_id: c.name, city_name: c.name }));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/login", asyncWrapper(requestOtp));
router.post("/verify-otp", asyncWrapper(verifyOtp));
router.post("/mpin-login", asyncWrapper(mpinLogin));
router.post("/setup-mpin", asyncWrapper(setupMpin));
router.post("/reset-mpin", asyncWrapper(resetMpin));

export default router;