import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends SMS via Fast2SMS DLT Route
 * @param {string} mobileNumber - The recipient's number
 * @param {string} otpCode - The OTP or variable value
 * @param {string} type - The purpose: 'LOGIN', 'TRIP', 'CHANGE_MOB' (Default: 'LOGIN')
 */
export const sendOtpSMS = async (mobileNumber, otpCode, type = 'LOGIN') => {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    const senderId = process.env.FAST2SMS_SENDER_ID;

    // 1. Define the Map of Types to IDs
    const templateMap = {
        'LOGIN': process.env.FAST2SMS_TEMPLATE_LOGIN,
        'TRIP': process.env.FAST2SMS_TEMPLATE_TRIP,
        'CHANGE_MOB': process.env.FAST2SMS_TEMPLATE_CHANGE_MOB
    };

    // 2. Select the correct Template ID
    const templateId = templateMap[type];

    if (!apiKey || !templateId) {
      console.warn(`SMS Config missing for type: ${type}`);
      return false;
    }

    // 3. Prepare Payload
    const payload = {
      route: "dlt",
      sender_id: senderId,
      message: templateId,
      variables_values: `${otpCode}|`, // Ensure this pipe matches your DLT format
      flash: 0,
      numbers: mobileNumber
    };

    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', payload, {
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      }
    });

    return response.data && response.data.return;

  } catch (error) {
    console.error("❌ SMS Error:", error.message);
    return false;
  }
};