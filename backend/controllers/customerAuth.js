import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
// import { sendEmail } from "../utils/emailService.js";
import { sendOtpSMS } from "../utils/smsService.js";


const getOtpTemplate = (otp) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #0062cc; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Patra Travels</h1>
    </div>
    <div style="padding: 30px; text-align: center;">
        <h2 style="color: #333333; margin-top: 0;">Verify Your New Email</h2>
        <p style="color: #666666; font-size: 16px; line-height: 1.5;">
            You requested to change your email address. Please use the verification code below to confirm this change.
        </p>
        <div style="background-color: #f8f9fa; border: 1px dashed #0062cc; border-radius: 8px; padding: 15px; margin: 25px 0; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0062cc;">${otp}</span>
        </div>
        <p style="color: #999999; font-size: 14px; margin-top: 20px;">
            This code is valid for <strong>5 minutes</strong>. <br>
            If you didn't request this change, please ignore this email.
        </p>
    </div>
    <div style="background-color: #f1f1f1; padding: 15px; text-align: center; color: #888888; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Patra Travels. All rights reserved.
    </div>
</div>
`;

// --- HELPER: LOG HISTORY ---
const logCustomerHistory = async (data) => {
  const methodMap = { OTP: 1, MPIN: 2 };
  const loginThrough = methodMap[data.login_through] || 0;
  const loginStatus = data.login_status === 1 ? 1 : 2; // 1=Success, 2=Failed

  try {
    // We use gustcust_id (Primary Key '1') for the foreign key in history table
    await db.execute(
      `INSERT INTO cust_login_history 
        (cust_id, cust_mobile, login_datetime, login_status, login_ip, login_through) 
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [data.primaryKeyId, data.mobileNumber, loginStatus, data.ip || "0.0.0.0", loginThrough]
    );
  } catch (err) {
    console.error("Login History Log Error:", err.message);
  }
};
const generateOtp = () => crypto.randomInt(1000, 9999).toString();
// --- 1. REQUEST OTP ---
export const requestCustomerOtp = async ({ customerId, mobileNumber }) => {
  // customerId here is the Login ID (e.g., CPTT000000)
  if (!customerId || !mobileNumber) {
    throw new Error("Customer ID and Mobile Number are required.");
  }

  // Verify uniqueness using BOTH 'id' (Login ID) and 'gustcust_contphone'
  const [customers] = await db.execute(
    `SELECT gustcust_id, id, is_mpin_set 
     FROM tbl_customers 
     WHERE id = ? AND gustcust_contphone = ? AND status = 1`,
    [customerId, mobileNumber]
  );

  if (customers.length === 0) {
    throw new Error("Invalid Customer ID or Mobile Number.");
  }

  const customer = customers[0];
  const otpCode = generateOtp();
  const expiryMinutes = 5;

  // Update using Primary Key (gustcust_id)
  await db.execute(
    `UPDATE tbl_customers 
     SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) 
     WHERE gustcust_id = ?`,
    [otpCode, expiryMinutes, customer.gustcust_id]
  );

  // await sendSMS({
  //   to: mobileNumber,
  //   body: `Your OTP is ${otpCode}. Valid for 5 mins.`,
  // });

  return {
    message: "OTP sent successfully.",
    dev_otp: otpCode, // Remove in production
    isMpinSet: !!customer.is_mpin_set,
  };
};
// --- 2. VERIFY OTP ---
export const verifyCustomerOtp = async ({ customerId, mobileNumber, otp, ip }) => {
  if (!customerId || !mobileNumber || !otp) {
    throw new Error("Customer ID, Mobile Number, and OTP are required.");
  }

  // Select Primary Key (gustcust_id) AND Login ID (id)
  const [customers] = await db.execute(
    `SELECT gustcust_id, id, gustcust_contphone, otp_code, otp_expires_at, 
            gustcust_fstname, is_mpin_set 
     FROM tbl_customers 
     WHERE id = ? AND gustcust_contphone = ? AND status = 1`,
    [customerId, mobileNumber]
  );

  if (customers.length === 0) throw new Error("Account not found.");
  const customer = customers[0];

  // Validate OTP
  const storedOtp = String(customer.otp_code || "").trim();
  const providedOtp = String(otp).trim();
  const isValidOtp = storedOtp === providedOtp;
  const isNotExpired = new Date(customer.otp_expires_at).getTime() > new Date().getTime();

  if (!isValidOtp || !isNotExpired) {
    await logCustomerHistory({
      primaryKeyId: customer.gustcust_id,
      mobileNumber,
      login_status: 2,
      ip,
      login_through: "OTP",
    });
    throw new Error(!isValidOtp ? "Invalid OTP." : "OTP expired.");
  }

  // Cleanup & Log Success
  await db.execute(
    `UPDATE tbl_customers 
     SET otp_code = NULL, otp_expires_at = NULL, failed_login_attempts = 0 
     WHERE gustcust_id = ?`,
    [customer.gustcust_id]
  );

  await logCustomerHistory({
    primaryKeyId: customer.gustcust_id,
    mobileNumber,
    login_status: 1,
    ip,
    login_through: "OTP",
  });

  const token = jwt.sign(
    {
      id: customer.gustcust_id, // Internal PK (1)
      loginId: customer.id,     // Public ID (CPTT000000)
      name: customer.gustcust_fstname,
      mobileNumber,
      role: "customer",
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  return { token, message: "Login successful.", isFirstTime: !customer.is_mpin_set };
};
// --- 3. MPIN LOGIN ---
export const customerMpinLogin = async ({ customerId, mobileNumber, mpin, ip }) => {
  if (!customerId || !mobileNumber || !mpin) {
    throw { message: "Customer ID, Mobile, and MPIN required", locked: false };
  }

  // Check against 'id' column
  const [customers] = await db.execute(
    `SELECT gustcust_id, id, gustcust_fstname, mpin_hash, failed_login_attempts 
     FROM tbl_customers 
     WHERE id = ? AND gustcust_contphone = ? AND status = 1`,
    [customerId, mobileNumber]
  );

  if (customers.length === 0) {
    throw { message: "Invalid Credentials", locked: false };
  }

  const customer = customers[0];

  if (!customer.mpin_hash) {
    throw { message: "MPIN not set. Use OTP login.", otpOnly: true };
  }

  const isValid = await bcrypt.compare(mpin, customer.mpin_hash);

  if (isValid) {
    await db.execute("UPDATE tbl_customers SET failed_login_attempts = 0 WHERE gustcust_id = ?", [
      customer.gustcust_id,
    ]);
    await logCustomerHistory({
      primaryKeyId: customer.gustcust_id,
      mobileNumber,
      login_status: 1,
      ip,
      login_through: "MPIN",
    });

    const token = jwt.sign(
      {
        id: customer.gustcust_id, // Internal PK
        loginId: customer.id,     // Public ID (CPTT000000)
        name: customer.gustcust_fstname,
        mobileNumber,
        role: "customer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return { token, message: "Login successful" };
  }

  // Handle Failure
  const attempts = (customer.failed_login_attempts || 0) + 1;
  const MAX_ATTEMPTS = 5;

  await db.execute("UPDATE tbl_customers SET failed_login_attempts = ? WHERE gustcust_id = ?", [
    attempts,
    customer.gustcust_id,
  ]);
  await logCustomerHistory({
    primaryKeyId: customer.gustcust_id,
    mobileNumber,
    login_status: 2,
    ip,
    login_through: "MPIN",
  });

  if (attempts >= MAX_ATTEMPTS) {
    throw { message: "Account locked. Use OTP to reset.", locked: true };
  }

  throw {
    message: `Invalid MPIN. ${MAX_ATTEMPTS - attempts} attempts remaining.`,
    locked: false,
  };
};
// --- 4. SETUP & RESET MPIN ---
export const setupCustomerMpin = async ({ customerId, mobileNumber, mpin }) => {
  if (!customerId || !mobileNumber || !mpin) throw new Error("Missing details.");

  const salt = await bcrypt.genSalt(10);
  const hashedMpin = await bcrypt.hash(mpin, salt);

  // Update WHERE id = ? AND gustcust_contphone = ?
  const [result] = await db.execute(
    `UPDATE tbl_customers SET mpin_hash = ?, is_mpin_set = 1 
     WHERE id = ? AND gustcust_contphone = ?`, 
    [hashedMpin, customerId, mobileNumber]
  );

  if (result.affectedRows === 0) throw new Error("Invalid Customer ID or Mobile.");
  return { message: "MPIN setup successful." };
};
export const resetCustomerMpin = async ({ customerId, mobileNumber, newMpin }) => {
  return setupCustomerMpin({ customerId, mobileNumber, mpin: newMpin });
};
export const getCustomerProfile = async (custId) => {
  // Removed JOIN tbl_addresses
  const [rows] = await db.execute(
    `SELECT 
       gustcust_id,
       id as customerId,
       CONCAT(gustcust_fstname, ' ', IFNULL(gustcust_mdlname,''), ' ', IFNULL(gustcust_lstname,'')) as fullName,
       gustcust_contphone as phone,
       gustcust_email as email,
       cust_img
     FROM tbl_customers
     WHERE gustcust_id = ? AND status = 1`,
    [custId]
  );
  return rows[0] || {};
};
export const updateCustomerProfile = async (custId, photoPath, updatedBy) => {
  // Only updates photo and timestamp if photo is provided
  if (photoPath) {
    await db.execute(
      `UPDATE tbl_customers 
       SET cust_img = ?, gustcust_updatedate = NOW(), gustcust_updatedby = ? 
       WHERE gustcust_id = ?`,
      [photoPath, updatedBy, custId]
    );
    return { success: true, message: "Profile photo updated successfully" };
  } else {
    // Just update timestamp if no photo (e.g. user clicked save without changes)
    await db.execute(
      `UPDATE tbl_customers 
       SET gustcust_updatedate = NOW(), gustcust_updatedby = ? 
       WHERE gustcust_id = ?`,
      [updatedBy, custId]
    );
    return { success: true, message: "Profile synchronized" };
  }
};
// --- 3. PHONE CHANGE (Same as before) ---
export const requestPhoneChangeOtp = async (custId, newPhone) => {
  const [exists] = await db.execute(
    "SELECT gustcust_id FROM tbl_customers WHERE gustcust_contphone = ? AND gustcust_id != ?",
    [newPhone, custId]
  );
  if (exists.length > 0) throw new Error("Mobile number already in use.");

  const otp = generateOtp();
  await db.execute(
    "UPDATE tbl_customers SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE gustcust_id = ?",
    [otp, custId]
  );
  
  // await sendSMS({ to: newPhone, body: `Your verification code is ${otp}` });
  return { message: "OTP Sent", dev_otp: otp };
};
export const verifyPhoneChange = async (custId, newPhone, otp) => {
  const [rows] = await db.execute(
    "SELECT gustcust_id FROM tbl_customers WHERE gustcust_id = ? AND otp_code = ? AND otp_expires_at > NOW()",
    [custId, otp]
  );
  if (rows.length === 0) throw new Error("Invalid or Expired OTP");

  await db.execute(
    `UPDATE tbl_customers 
     SET gustcust_contphone = ?, otp_code = NULL, otp_expires_at = NULL, 
         gustcust_updatedate = NOW(), gustcust_updatedby = ? 
     WHERE gustcust_id = ?`,
    [newPhone, custId, custId]
  );
};
// --- 4. EMAIL CHANGE (Same as before) ---
export const requestEmailChangeOtp = async ( custId, newEmail) => {
  const otp = generateOtp();

  // A. Check if email is already taken by ANOTHER customer
  const [exists] = await db.execute(
    "SELECT gustcust_id FROM tbl_customers WHERE gustcust_email = ? AND gustcust_id != ?",
    [newEmail,  custId]
  );
  
  if (exists.length > 0) {
    throw new Error("Email already registered with another account.");
  }

  // B. Save OTP to DB
  await db.execute(
    "UPDATE tbl_customers SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE gustcust_id = ?",
    [otp,  custId]
  );
  
  // C. Send Email
  // const emailSent = await sendEmail({
  //   to: newEmail, 
  //   subject: "Patra Travels - Email Verification Code",
  //   html: getOtpTemplate(otp),
  // });

  // if (!emailSent) {
  //   throw new Error("Could not send verification email. Please check the address.");
  // }

  // Keeping dev_otp for your testing as requested
  return { message: `Verification code sent to ${newEmail}`, dev_otp: otp };
};
// --- 3. VERIFY EMAIL CHANGE ---
export const verifyEmailChange = async ( custId, newEmail, otp) => {
  const [rows] = await db.execute(
    "SELECT gustcust_id FROM tbl_customers WHERE gustcust_id = ? AND otp_code = ? AND otp_expires_at > NOW()",
    [ custId, otp]
  );
  
  if (rows.length === 0) {
    throw new Error("Invalid or Expired OTP.");
  }

  // Update Email & Timestamp
  await db.execute(
    `UPDATE tbl_customers 
     SET gustcust_email = ?, otp_code = NULL, otp_expires_at = NULL,
         gustcust_updatedate = NOW(), gustcust_updatedby = ? 
     WHERE gustcust_id = ?`,
    [newEmail,  custId,  custId]
  );
  
  return { message: "Email updated successfully." };
};
// =========================================================
// 1. CHANGE MPIN CONTROLLER
// =========================================================
export const changeCustomerMpin = async ({ userId, oldMpin, newMpin }) => {
  // We use 'userId' which comes securely from the auth middleware via routes wrapper
  if (!userId || !oldMpin || !newMpin) {
    throw new Error("Missing required fields.");
  }

  // 1. Get current hash using the Internal ID
  const [rows] = await db.execute(
    "SELECT mpin_hash FROM tbl_customers WHERE gustcust_id = ? AND status = 1",
    [userId]
  );

  if (rows.length === 0) throw new Error("User not found.");
  
  const currentHash = rows[0].mpin_hash;

  // 2. Verify Old MPIN
  if (!currentHash) {
    throw new Error("No MPIN set. Please use 'Forgot MPIN' or Setup.");
  }

  const isMatch = await bcrypt.compare(oldMpin, currentHash);
  if (!isMatch) {
    throw new Error("Incorrect current MPIN.");
  }

  // 3. Hash New MPIN
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newMpin, salt);

  // 4. Update DB
  await db.execute(
    "UPDATE tbl_customers SET mpin_hash = ?, gustcust_updatedate = NOW() WHERE gustcust_id = ?",
    [newHash, userId]
  );

  return { message: "MPIN changed successfully." };
};
// =========================================================
// 2. REQUEST RESET OTP (Forgot Flow)
// =========================================================
export const requestMpinResetOtp = async ({ mobileNumber }) => {
  if (!mobileNumber) throw new Error("Mobile Number is required.");

  const [users] = await db.execute(
    "SELECT gustcust_id FROM tbl_customers WHERE gustcust_contphone = ? AND status = 1",
    [mobileNumber]
  );

  if (users.length === 0) throw new Error("Mobile number not registered.");
  const userId = users[0].gustcust_id;

  const otp = crypto.randomInt(1000, 9999).toString();

  await db.execute(
    `UPDATE tbl_customers 
     SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) 
     WHERE gustcust_id = ?`,
    [otp, userId]
  );

  await sendSMS({
    to: mobileNumber,
    body: `Use OTP ${otp} to reset your Patra Travels MPIN. Valid for 5 minutes.`
  });

  return { message: "OTP Sent Successfully", dev_otp: otp };
};
// =========================================================
// 3. VERIFY & RESET MPIN (Forgot Flow)
// =========================================================
export const verifyAndResetMpin = async ({ mobileNumber, otp, newMpin }) => {
  if (!mobileNumber || !otp || !newMpin) throw new Error("All fields are required.");

  const [users] = await db.execute(
    `SELECT gustcust_id 
     FROM tbl_customers 
     WHERE gustcust_contphone = ? AND otp_code = ? AND otp_expires_at > NOW() AND status = 1`,
    [mobileNumber, otp]
  );

  if (users.length === 0) {
    throw new Error("Invalid or Expired OTP.");
  }
  const userId = users[0].gustcust_id;

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newMpin, salt);

  await db.execute(
    `UPDATE tbl_customers 
     SET mpin_hash = ?, 
         is_mpin_set = 1, 
         otp_code = NULL, 
         otp_expires_at = NULL, 
         failed_login_attempts = 0, 
         gustcust_updatedate = NOW() 
     WHERE gustcust_id = ?`,
    [newHash, userId]
  );

  return { message: "MPIN Reset Successfully. Account Unlocked." };
};