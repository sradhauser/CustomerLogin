// backend/services/otpService.js
import twilio from 'twilio';
import { env } from 'process'; 

// Initialize the Twilio client using environment variables
const accountSid = env.SMS_ACCOUNT_SID;
const authToken = env.SMS_AUTH_TOKEN;
const senderNumber = env.SMS_SENDER_NUMBER;

// NOTE: Twilio client will be initialized only if required credentials are present
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Sends an SMS message using the Twilio API.
 * This function will be commented out in authModel.js for development.
 * * @param {string} toMobileNumber - The recipient's mobile number (e.g., +919778871176)
 * @param {string} otpCode - The 4-digit code
 */
export const sendSMS = async (toMobileNumber, otpCode) => {
    // 1. Skip if Twilio client is not initialized (e.g., in testing/dev without valid keys)
    if (!client || !senderNumber) {
        console.warn("SMS Warning: Twilio client is not configured. Skipping actual SMS sending.");
        return; 
    }

    const messageBody = `Patra Travels OTP: Your verification code is ${otpCode}. It expires in ${env.OTP_EXPIRY_MINUTES || 5} minutes.`;

    try {
        const message = await client.messages.create({
            body: messageBody,
            from: senderNumber, 
            to: toMobileNumber 
        });

        console.log(`SMS Sent: OTP message SID: ${message.sid} to ${toMobileNumber}`);
    } catch (error) {
        // Log the error but do not throw, as the OTP is already saved to the DB
        console.error("SMS Error: Failed to send message via Twilio.", error.message);
    }
};

// You can export the client or other utility functions if needed
// export default client;