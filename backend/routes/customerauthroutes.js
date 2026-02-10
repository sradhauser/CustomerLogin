import express from "express";
import auth from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import {
  requestCustomerOtp,
  verifyCustomerOtp,
  customerMpinLogin,
  setupCustomerMpin, 
  resetCustomerMpin,
  getCustomerProfile,
  updateCustomerProfile,
  requestPhoneChangeOtp,
  verifyPhoneChange,
  requestEmailChangeOtp,
  verifyEmailChange,
  changeCustomerMpin,
  requestMpinResetOtp,
  verifyAndResetMpin
} from "../controllers/customerAuth.js";

const router = express.Router();

const asyncWrapper = (logicFunction) => async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "0.0.0.0";
    
    const data = {
      ...req.body,
      ip,
      customerId: req.body.customerId || req.body.driverId || req.body.driverRegNo, 
    };

    const result = await logicFunction(data);
    return res.status(200).json({ success: true, ...result });

  } catch (error) {
    console.error("Auth Error:", error.message);

    // FIX: Use 400 (Bad Request) for generic failures to avoid 
    // triggering '401 Token Expired' interceptors in frontend.
    // Use 423 (Locked) if account is locked (optional, 400 works too).
    const status = error.locked ? 423 : 400; 
    
    return res.status(status).json({ 
      success: false, 
      message: error.message, 
      locked: error.locked || false,
      otpOnly: error.otpOnly || false
    });
  }
};

const profileDir = "uploads/customer_profile/";
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 1. Get Profile
router.get("/profile", auth, async (req, res) => {
  try {
    const profile = await getCustomerProfile(req.user.id);
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Update Profile (Photo Only)
router.put(
  "/update-complete-profile",
  auth,
  upload.single("photo"),
  async (req, res) => {
    try {
      let photoPath = null;

      if (req.file) {
        const filename = `cust-${req.user.id}-${Date.now()}.jpeg`;
        const filePath = path.join(profileDir, filename);

        await sharp(req.file.buffer)
          .resize({ width: 600 })
          .jpeg({ quality: 80 })
          .toFile(filePath);

        photoPath = `/uploads/customer_profile/${filename}`;
      }

      // We only pass photoPath now, no address data
      const result = await updateCustomerProfile(req.user.id, photoPath, req.user.id);
      res.status(200).json(result);
    } catch (err) {
      console.error(err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// 3. Phone/Email Routes (Same as before)
router.post("/request-phone-change", auth, async (req, res) => {
  try {
    const result = await requestPhoneChangeOtp(req.user.id, req.body.newMobileNumber);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/verify-phone-change", auth, async (req, res) => {
  try {
    await verifyPhoneChange(req.user.id, req.body.newMobileNumber, req.body.otp);
    res.status(200).json({ success: true, message: "Phone updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/request-email-change", auth, async (req, res) => {
  try {
    const result = await requestEmailChangeOtp(req.user.id, req.body.newEmail);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/verify-email-change", auth, async (req, res) => {
  try {
    await verifyEmailChange(req.user.id, req.body.newEmail, req.body.otp);
    res.status(200).json({ success: true, message: "Email updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


router.post("/login", asyncWrapper(requestCustomerOtp));
router.post("/verify-otp", asyncWrapper(verifyCustomerOtp));
router.post("/mpin-login", asyncWrapper(customerMpinLogin));
router.post("/setup-mpin", asyncWrapper(setupCustomerMpin));

router.post("/change-mpin", auth, asyncWrapper(changeCustomerMpin));

// 2. FORGOT MPIN - REQUEST OTP (Public)
// Matches frontend: api.post("/auth/request-otp-mpin", ...)
router.post("/request-otp-mpin", asyncWrapper(requestMpinResetOtp));

// 3. FORGOT MPIN - VERIFY & RESET (Public)
// Matches frontend: api.post("/auth/reset-mpin", ...)
// router.post("/reset-mpin", asyncWrapper(verifyAndResetMpin));
router.post("/reset-mpin", asyncWrapper(resetCustomerMpin));

export default router;