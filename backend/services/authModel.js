import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/emailService.js"; 
import { sendOtpSMS } from '../utils/smsService.js';
import { State, City } from "country-state-city";

const MAX_ATTEMPTS = 5;

/**
 * Generates a random 4-digit OTP code.
 */
const generateOtp = () => {
  return crypto.randomInt(1000, 9999).toString();
};
const getOtpTemplate = (otpCode) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #fd7e14; text-align: center;">Verify Your New Email</h2>
      <p style="color: #555; font-size: 16px;">Hello,</p>
      <p style="color: #555; font-size: 16px;">You requested to change your email address. Please use the verification code below to complete the process.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="background-color: #f8f9fa; color: #333; font-size: 32px; font-weight: bold; padding: 10px 20px; letter-spacing: 5px; border: 2px dashed #fd7e14; border-radius: 5px;">
          ${otpCode}
        </span>
      </div>
      
      <p style="color: #999; font-size: 14px; text-align: center;">
        This code is valid for 5 minutes. If you did not request this change, please ignore this email.
      </p>
    </div>
  `;
};
/**
 * Placeholder for SMS Service integration.
 */
const otpService = {
  sendSMS: async (mobileNumber, otpCode) => {
    try {
      // Log for development; replace with third-party gateway logic (e.g., Twilio, Msg91)
      console.log(`[SMS Service] Sending OTP ${otpCode} to ${mobileNumber}`);
      return true;
    } catch (error) {
      console.error("SMS Sending Failed:", error);
      return false;
    }
  },
};

export const logLoginHistory = async (data) => {
  const methodMap = { OTP: 1, MPIN: 2 };
  const loginThrough = methodMap[data.login_through] || 0;

  // 2. Map Status: 1 for Success, 2 for Failed (Matches your column comment)
  const loginStatus = data.login_status === 1 ? 1 : 2;

  try {
    await db.execute(
      `INSERT INTO drv_login_history 
             (drv_regId, drv_mobileno, login_datetime, login_status, login_ip, Login_through) 
             VALUES (?, ?, NOW(), ?, ?, ?)`,
      [
        data.drv_regId,
        data.drv_mobileno,
        loginStatus,
        data.ip || "0.0.0.0",
        loginThrough,
      ]
    );
  } catch (err) {
    console.error(" Login History Log Error:", err.message);
  }
};
/**
 * Verifies driver existence and updates tbl_drivers directly with a new OTP.
 */
export const requestOtp = async ({ driverId, mobileNumber }) => {
  if (!driverId || !mobileNumber) {
    throw new Error("Driver ID and Mobile Number are required.");
  }

  // 1. Verify Driver existence and active status
  const [drivers] = await db.execute(
    "SELECT driver_id, is_mpin_set FROM tbl_drivers WHERE driver_regno = ? AND driver_phno = ? AND status = 1",
    [driverId, mobileNumber]
  );

  if (drivers.length === 0) {
    throw new Error("Details not found or account is inactive.");
  }

  const driver = drivers[0];

  // 2. Generate OTP and fetch expiry from environment
  const otpCode = generateOtp();
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 5);

  await db.execute(
    `UPDATE tbl_drivers 
         SET otp_code = ?, 
             otp_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) 
         WHERE driver_id = ?`,
    [otpCode, expiryMinutes, driver.driver_id]
  );

  // 4. Trigger SMS Service
  await sendOtpSMS(mobileNumber, otpCode);

  return {
    message: "OTP sent successfully.",
    dev_otp: process.env.NODE_ENV === "development" ? otpCode : undefined,
    isMpinSet: !!driver.is_mpin_set,
  };
};

export const verifyOtp = async ({ mobileNumber, otp, ip, driverRegNo }) => {
  if (!mobileNumber || !otp) {
    throw new Error("Mobile number and OTP are required.");
  }

  // 1. Fetch details
  const [existingDrivers] = await db.execute(
    "SELECT driver_id, driver_regno, otp_code, otp_expires_at, driver_fstname, is_mpin_set FROM tbl_drivers WHERE driver_phno = ? AND driver_regno = ? AND status = 1",
    [mobileNumber, driverRegNo]
  );

  if (existingDrivers.length === 0) {
    throw new Error("Account not found or invalid registration number.");
  }

  const driver = existingDrivers[0];

  // ---  STRICT STRING COMPARISON ---
  const storedOtp = String(driver.otp_code || "").trim();
  const providedOtp = String(otp).trim();
  const isValidOtp = storedOtp === providedOtp;

  // ---  ROBUST DATE COMPARISON ---
  const expiryTime = new Date(driver.otp_expires_at).getTime();
  const currentTime = new Date().getTime();
  const isNotExpired = expiryTime > currentTime;

  if (!isValidOtp || !isNotExpired) {
    // Debugging logs to identify the exact cause in your console
    console.log(
      `Auth Failed for ${mobileNumber}: Match=${isValidOtp}, NotExpired=${isNotExpired}`
    );
    console.log(`Stored: ${storedOtp}, Input: ${providedOtp}`);

    await logLoginHistory({
      drv_regId: driver.driver_regno,
      drv_mobileno: mobileNumber,
      login_status: 2,
      ip: ip,
      login_through: "OTP",
    });

    throw new Error(!isValidOtp ? "Invalid OTP code." : "OTP has expired.");
  }

  // --- SUCCESS LOGIC ---
  await db.execute(
    `UPDATE tbl_drivers 
     SET otp_code = NULL, 
         otp_expires_at = NULL, 
         failed_login_attempts = 0 
     WHERE driver_id = ?`,
    [driver.driver_id]
  );
 
  await logLoginHistory({
    drv_regId: driver.driver_regno,
    drv_mobileno: mobileNumber,
    login_status: 1,
    ip: ip,
    login_through: "OTP",
  });

  const isFirstTime = !driver.is_mpin_set;

  const token = jwt.sign(
    {
      id: driver.driver_id,
      regNo: driver.driver_regno,
      driver_fstname: driver.driver_fstname,
      mobileNumber: mobileNumber,
      type: "otp_login",
      isFirstTime: isFirstTime,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    message: "Login successful.",
    isFirstTime,
  };
};

/**
 * Handles login via MPIN with brute-force protection.
 */
export const mpinLogin = async ({ driverRegNo, mpin, ip }) => {
  if (!driverRegNo || !mpin || mpin.length !== 4) {
    throw {
      message: "Driver Registration Number and 4-digit MPIN required",
      locked: false,
    };
  }

  const [drivers] = await db.execute(
    `SELECT driver_id, driver_regno, driver_phno, driver_fstname, mpin_hash, 
            failed_login_attempts, status 
     FROM tbl_drivers 
     WHERE driver_regno = ? AND status = 1`,
    [driverRegNo]
  );

  if (drivers.length === 0) {
    throw { message: "Account not found or inactive", locked: false };
  }

  const driver = drivers[0];

  if (!driver.mpin_hash) {
    throw {
      message: "MPIN is not set. Please login using OTP.",
      otpOnly: true,
    };
  }

  // 3. Compare MPIN
  const isValid = await bcrypt.compare(mpin, driver.mpin_hash);

  if (isValid) {
    // SUCCESS LOGIC
    await db.execute(
      "UPDATE tbl_drivers SET failed_login_attempts = 0 WHERE driver_id = ?",
      [driver.driver_id]
    );

    await logLoginHistory({
      drv_regId: driver.driver_regno,
      driver_fstname: driver.driver_fstname,
      drv_mobileno: driver.driver_phno,
      login_status: 1,
      ip: ip,
      login_through: "MPIN",
    });

    const token = jwt.sign(
      {
        id: driver.driver_id,
        regNo: driver.driver_regno,
        driver_fstname: driver.driver_fstname,
        mobileNumber: driver.driver_phno,
        isFirstTime: false,
        type: "mpin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return { token, message: "Login successful" };
  }

  // 4. FAILURE LOGIC
  const attempts = (driver.failed_login_attempts || 0) + 1;
  const MAX_ATTEMPTS = 5;

  await db.execute(
    "UPDATE tbl_drivers SET failed_login_attempts = ? WHERE driver_id = ?",
    [attempts, driver.driver_id]
  );

  await logLoginHistory({
    drv_regId: driver.driver_regno,
    drv_mobileno: driver.driver_phno,
    login_status: 2,
    ip: ip,
    login_through: "MPIN",
  });

  if (attempts >= MAX_ATTEMPTS) {
    throw {
      message: "Too many failed attempts. Please login using OTP.",
      locked: true,
    };
  }

  throw {
    message: `Invalid MPIN. ${MAX_ATTEMPTS - attempts} attempts remaining.`,
    locked: false,
    attemptsRemaining: MAX_ATTEMPTS - attempts,
  };
};

/**
 * Securely hashes and stores a new MPIN.
 */
export const setupMpin = async ({ mobileNumber, mpin }) => {
  if (!mobileNumber || !mpin || mpin.length !== 4) {
    throw new Error("Mobile Number and a 4-digit MPIN are required.");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedMpin = await bcrypt.hash(mpin, salt);

  const [result] = await db.execute(
    "UPDATE tbl_drivers SET mpin_hash = ?, is_mpin_set = 1 WHERE driver_phno = ?",
    [hashedMpin, mobileNumber]
  );

  if (result.affectedRows === 0) {
    throw new Error("Driver record not found. Setup failed.");
  }

  return {
    message: "MPIN setup successful. You can now login with your MPIN.",
  };
};

/**
 * Resets an existing MPIN.
 */
export const resetMpin = async ({ mobileNumber, newMpin }) => {
  if (!mobileNumber || !newMpin || newMpin.length !== 4) {
    throw new Error("Mobile Number and a 4-digit new MPIN are required.");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedMpin = await bcrypt.hash(newMpin, salt);

  const [result] = await db.execute(
    "UPDATE tbl_drivers SET mpin_hash = ?, is_mpin_set = 1 WHERE driver_phno = ?",
    [hashedMpin, mobileNumber]
  );

  if (result.affectedRows === 0) {
    throw new Error("Driver record not found. MPIN reset failed.");
  }

  return {
    message: "MPIN successfully reset. You can now login with your new MPIN.",
  };
};
// ##############################  DRIVER PROFILE & ADDRESS  ################################

// ############################## STATE & CITY ##############################
export const getAllCountries = async () => {
  const [countries] = await db.execute(
    "SELECT cntry_id, country_name FROM tbl_countries ORDER BY country_name ASC"
  );
  return countries;
};
// export const getAllStates = async () => {
//   const [states] = await db.execute(
//     "SELECT state_id, state FROM tbl_state ORDER BY state ASC"
//   );
//   return states;
// };

// export const getAllCities = async () => {
//   const [cities] = await db.execute(
//     "SELECT city_id, city_name FROM tbl_city ORDER BY city_name ASC"
//   );
//   return cities;
// };
// Replace getAllStates
export const getAllStates = async () => {
  // "IN" is the country code for India
  const states = State.getStatesOfCountry("IN");

  // Mapping to keep your existing frontend format (state_id and state)
  return states.map((s) => ({
    state_id: s.isoCode, // e.g., "OR"
    state: s.name, // e.g., "Odisha"
  }));
};

// Replace getAllCities (Now filtered by stateCode)
export const getCitiesByState = async (stateCode) => {
  if (!stateCode) return [];

  const cities = City.getCitiesOfState("IN", stateCode);

  return cities.map((c) => ({
    city_id: c.name, // Library doesn't use IDs for cities, names are unique within a state
    city_name: c.name,
  }));
};

// ############################### UPDATE DRIVER PROFILE & ADDRESS ################################
// Get Profile
export const getDriverProfile = async (driverPrimaryKey) => {
  const [drivers] = await db.execute(
    `SELECT 
        d.driver_id,
        d.user_type as utype,
        d.driver_regno as driverId, 
        TRIM(CONCAT(d.driver_fstname, ' ', IFNULL(d.driver_mdlname, ''), ' ', d.driver_lstname)) as fullName,
        d.driver_phno as phone, 
        d.driver_email as email, 
        d.driver_photo,
        a.address1, a.address2, a.address3, a.zipcode, 
        a.state as state_id,   /* Matches React state_id */
        a.city as city_id,     /* Matches React city_id */
        a.country_id
     FROM tbl_drivers d
     LEFT JOIN tbl_addresses a ON d.driver_id = a.eu_id AND a.eu_type = d.user_type
     WHERE d.driver_id = ? AND d.status = 1`,
    [driverPrimaryKey]
  );
  return drivers[0];
};

// Update Profile (Upsert Logic)
export const updateDriverprofile = async (driverId, data, photoPath) => {
  const { address1, address2, address3, state_id, city_id, zipcode, utype } =
    data;
  const connection = await db.pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update Driver Photo/Timestamp
    if (photoPath) {
      await connection.execute(
        "UPDATE tbl_drivers SET driver_photo = ?, bydriver_updatedate = NOW() WHERE driver_id = ?",
        [photoPath, driverId]
      );
    } else {
      await connection.execute(
        "UPDATE tbl_drivers SET bydriver_updatedate = NOW() WHERE driver_id = ?",
        [driverId]
      );
    }

    // 2. UPSERT Address: Using columns 'state' and 'city' from your structure
    const [existing] = await connection.execute(
      "SELECT address_id FROM tbl_addresses WHERE eu_type = ? AND eu_id = ?",
      [utype, driverId]
    );

    if (existing.length > 0) {
      // UPDATE: Mapping React 'state_id' to DB column 'state'
      await connection.execute(
        `UPDATE tbl_addresses 
         SET state = ?, city = ?, country_id = '99', zipcode = ?, 
             address1 = ?, address2 = ?, address3 = ?, 
             address_updatedate = NOW(), address_updatedby = ?
         WHERE eu_type = ? AND eu_id = ?`,
        [
          state_id,
          city_id,
          zipcode,
          address1,
          address2,
          address3,
          driverId,
          utype,
          driverId,
        ]
      );
    } else {
      // INSERT: Mapping React 'state_id' to DB column 'state'
      await connection.execute(
        `INSERT INTO tbl_addresses 
         (eu_type, eu_id, state, city, country_id, zipcode, address1, address2, address3, address_createddate, address_createdby) 
         VALUES (?, ?, ?, ?, '99', ?, ?, ?, ?, NOW(), ?)`,
        [
          utype,
          driverId,
          state_id,
          city_id,
          zipcode,
          address1,
          address2,
          address3,
          driverId,
        ]
      );
    }

    await connection.commit();
    return {
      success: true,
      message: "Profile and address updated successfully.",
    };
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
};

// --- MOBILE CHANGE ---
export const requestPhoneChangeOtp = async (driverId, { newMobileNumber }) => {
  const [existing] = await db.execute(
    "SELECT driver_id FROM tbl_drivers WHERE driver_phno = ? AND driver_id != ?",
    [newMobileNumber, driverId]
  );
  if (existing.length > 0) throw new Error("Mobile number already registered.");

  const otpCode = generateOtp();
  await db.execute(
    "UPDATE tbl_drivers SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE driver_id = ?",
    [otpCode, driverId]
  );
  await sendOtpSMS(newMobileNumber, otpCode, 'CHANGE_MOB');
  return { message: "OTP sent to new mobile number.", dev_otp: otpCode };
};

export const verifyPhoneChange = async (driverId, { newMobileNumber, otp }) => {
  const [drivers] = await db.execute(
    "SELECT driver_id FROM tbl_drivers WHERE driver_id = ? AND otp_code = ? AND otp_expires_at > NOW()",
    [driverId, otp]
  );
  if (drivers.length === 0) throw new Error("Invalid or expired OTP.");

  await db.execute(
    "UPDATE tbl_drivers SET driver_phno = ?, otp_code = NULL, otp_expires_at = NULL WHERE driver_id = ?",
    [newMobileNumber, driverId]
  );
  return { message: "Phone number updated successfully." };
};

// --- EMAIL CHANGE ---

export const requestEmailChangeOtp = async (driverId, { newEmail }) => {
  // A. Check if email is already taken by ANOTHER driver
  const [existing] = await db.execute(
    "SELECT driver_id FROM tbl_drivers WHERE driver_email = ? AND driver_id != ?",
    [newEmail, driverId]
  );
  if (existing.length > 0) throw new Error("Email already registered.");
  const otpCode = generateOtp();
  await db.execute(
    "UPDATE tbl_drivers SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE driver_id = ?",
    [otpCode, driverId]
  );
  const emailSent = await sendEmail({
    to: newEmail, 
    subject: "Patra Travels - Email Verification Code",
    html: getOtpTemplate(otpCode),
  });

  if (!emailSent) {
    throw new Error("Could not send verification email. Please check the address.");
  }

  return { message: `Verification code sent to ${newEmail}` };
};


// export const requestEmailChangeOtp = async (driverId, { newEmail }) => {
//   const [existing] = await db.execute(
//     "SELECT driver_id FROM tbl_drivers WHERE driver_email = ? AND driver_id != ?",
//     [newEmail, driverId]
//   );
//   if (existing.length > 0) throw new Error("Email already registered.");

//   const otpCode = generateOtp();
//   await db.execute(
//     "UPDATE tbl_drivers SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE driver_id = ?",
//     [otpCode, driverId]
//   );
//   return { message: "OTP sent to your new email.", dev_otp: otpCode };
// };

export const verifyEmailChange = async (driverId, { newEmail, otp }) => {
  const [drivers] = await db.execute(
    "SELECT driver_id FROM tbl_drivers WHERE driver_id = ? AND otp_code = ? AND otp_expires_at > NOW()",
    [driverId, otp]
  );
  if (drivers.length === 0) throw new Error("Invalid or expired OTP.");

  await db.execute(
    "UPDATE tbl_drivers SET driver_email = ?, otp_code = NULL, otp_expires_at = NULL WHERE driver_id = ?",
    [newEmail, driverId]
  );
  return { message: "Email updated successfully." };
};

// ############################   Documentation   #############################

export const getDriverDocuments = async (driverId) => {
  try {
    // 1. Get the user_type from tbl_drivers
    const [driver] = await db.pool.execute(
      "SELECT user_type FROM tbl_drivers WHERE driver_id = ?",
      [driverId]
    );

    if (!driver.length) throw new Error("Driver not found");
    const euType = driver[0].user_type;

    // 2. Fetch existing documents with their parameter codes
    const [rows] = await db.pool.execute(
      `SELECT 
                t1.idnt_type, 
                t1.idnt_no, 
                t1.idnt_copy, 
                t1.idnt_expdt, 
                t2.par_value as param_code
             FROM tbl_identitydtls t1
             LEFT JOIN tbl_parameters t2 ON t1.idnt_type = t2.parid
             WHERE t1.eu_id = ? AND t1.eu_type = ?`,
      [driverId, euType]
    );

    return { success: true, documents: rows };
  } catch (error) {
    throw error;
  }
};

export const updateDriverDocuments = async (driverId, euType, body, files) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const sessionId = body.session_id || null;
    const sessionTime = body.session_createtime || new Date();

    // 1. Get dynamic ID mappings
    const [params] = await connection.execute(
      `SELECT parid, par_value 
       FROM tbl_parameters 
       WHERE par_type = 'IPF' AND par_status = 1`
    );

    const valueToPrefix = {
      "Adhar Card": "aadhar",
      "Pan Card": "pan",
      "Voter Id": "voter",
      "License": "dl",
    };

    for (const param of params) {
      const prefix = valueToPrefix[param.par_value];
      if (!prefix) continue;

      const fieldPrefix = prefix.toLowerCase();

      // Extract values from body/files
      const idntNo =
        body[`${fieldPrefix}_no`] !== undefined
          ? body[`${fieldPrefix}_no`]
          : null;

      const fileList = files && files[`${fieldPrefix}_file`];
      const fileObj = fileList ? fileList[0] : null;

      const expiryDate = fieldPrefix === "dl" ? body.dl_expiry || null : null;

      // Construct file path if a new file exists
      const fileName = fileObj
        ? `/uploads/documents/${fileObj.filename}`
        : null;

      // Check if we have *any* input to process (number or file)
      if (idntNo !== null || fileObj !== null) {
        // Fetch existing record from DB
        const [existing] = await connection.execute(
          "SELECT idnt_id, idnt_no, idnt_copy, idnt_expdt FROM tbl_identitydtls WHERE eu_id = ? AND eu_type = ? AND idnt_type = ?",
          [driverId, euType, param.parid]
        );

        if (existing.length > 0) {
          // --- CHANGE DETECTION LOGIC ---
          const currentDbNo = existing[0].idnt_no;
          const currentDbFile = existing[0].idnt_copy;

          // Format DB date to YYYY-MM-DD string for comparison (if exists)
          const currentDbExpiry = existing[0].idnt_expdt
            ? new Date(existing[0].idnt_expdt).toISOString().split("T")[0]
            : null;

          // 1. Check if a NEW file was uploaded
          const isFileChanged = fileName !== null;

          // 2. Check if the Number actually changed (compare incoming vs DB)
          // We use loose inequality (!=) to handle string vs int differences safely
          const isNumberChanged = idntNo !== null && idntNo != currentDbNo;

          // 3. Check if Expiry changed (Only if expiryDate is provided)
          const isExpiryChanged =
            expiryDate !== null && expiryDate !== currentDbExpiry;

          // *** CRITICAL FIX: If nothing changed, SKIP the update ***
          if (!isFileChanged && !isNumberChanged && !isExpiryChanged) {
            continue; // Skip to next document loop
          }

          // If we are here, something changed. Prepare values.
          const finalNo = idntNo !== null ? idntNo : currentDbNo;
          const finalFile = fileName !== null ? fileName : currentDbFile;
          // Use raw DB expiry if not changing, otherwise use new date
          const finalExpiry = isExpiryChanged
            ? expiryDate
            : existing[0].idnt_expdt;

          await connection.execute(
            `UPDATE tbl_identitydtls 
             SET idnt_no = ?, 
                 idnt_copy = ?, 
                 idnt_expdt = ?, 
                 session_id = ?,
                 session_createtime = ?,
                 idnt_updatedate = NOW(), 
                 idnt_updatedby = ?
             WHERE idnt_id = ?`,
            [
              finalNo,
              finalFile,
              finalExpiry,
              sessionId,
              sessionTime,
              driverId,
              existing[0].idnt_id,
            ]
          );
        } else {
          // INSERT (New Record) - Only if data actually exists
          if (idntNo || fileName) {
            await connection.execute(
              `INSERT INTO tbl_identitydtls 
               (eu_type, eu_id, idnt_type, idnt_no, idnt_copy, idnt_expdt, status, session_id, session_createtime, idnt_createddate, idnt_createdby) 
               VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), ?)`,
              [
                euType,
                driverId,
                param.parid,
                idntNo,
                fileName,
                expiryDate,
                sessionId,
                sessionTime,
                driverId,
              ]
            );
          }
        }
      }
    }

    await connection.commit();
    return { message: "Documents updated successfully." };
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
};