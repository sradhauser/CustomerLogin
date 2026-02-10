import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// 1. Create the Transporter (The Messenger)
// We use 'pool: true' to handle multiple drivers efficiently.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // The email that sends the mail
    pass: process.env.SMTP_PASS, // The password for that email
  },
  pool: true,        // Critical: Keeps connections open for fast sending
  maxConnections: 5, // Max simultaneous connections
  maxMessages: 100,  // Refresh connection after 100 emails
});

// 2. Verify connection on startup (Optional debugging)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Service Error:", error.message);
  } else {
    console.log("✅ Email Service Ready (Connected to Plesk/SMTP)");
  }
});

/**
 * Reusable function to send emails
 * @param {string} subject - Email Subject
 * @param {string} html - HTML Content of the email
 * @param {Array} attachments - Optional array of file attachments
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Patra Travels App" <${process.env.SMTP_USER}>`,
      to: to, 
      subject: subject,
      html: html,
      attachments: attachments,
    });

    console.log(`📩 Email Sent to ${to || "Admin"}: ${info.messageId}`);
    return true;
  } catch (error) {
    // This logs the specific reason why it failed
    console.error("❌ Failed to send email:", error.message);
    return false;
  }
};