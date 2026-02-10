import express from "express";
import db from "../config/database.js";
import axios from "axios";
import dotenv from "dotenv";
import { sendEmail } from "../utils/emailService.js";

dotenv.config();
const router = express.Router();

// --- HELPER: Get Address from Coordinates ---
const fetchGoogleAddress = async (latitude, longitude) => {
  const API_KEY = process.env.GOOGLE_MAPS_KEY;
  if (!API_KEY) return "Location unavailable";

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`;
    const response = await axios.get(url);
    if (response.data.status === "OK" && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
  } catch (error) {
    console.error("Map Error:", error.message);
  }
  return `Lat: ${latitude}, Lng: ${longitude}`;
};

// --- CUSTOMER SOS ROUTE ---
router.post("/trigger", async (req, res) => {
  try {
    const { customerId, latitude, longitude } = req.body;

    const USER_TYPE_CUSTOMER = 2;

    const [custRows] = await db.execute(
      `SELECT gustcust_id, gustcust_fstname, gustcust_mdlname, gustcust_lstname, gustcust_contphone, gustcust_email 
       FROM tbl_customers WHERE id = ?`,
      [customerId],
    );

    if (custRows.length === 0) {
      console.warn("❌ Customer Not Found in DB:", customerId);
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const customer = custRows[0];
    const cust_id = customer.gustcust_id;
    const fullName = `${customer.gustcust_fstname} ${customer.gustcust_mdlname} ${customer.gustcust_lstname}`;

    // 3. Send Response Immediately (Don't keep App waiting)
    res.json({ success: true, message: "SOS Sent" });

    // 4. Background Task (Map API + DB Insert + Email)
    setImmediate(async () => {
      try {
        const locationName = await fetchGoogleAddress(latitude, longitude);

        await db.execute(
          `INSERT INTO tbl_sos_alerts 
           (user_id, user_type, latitude, longitude, location_name, status) 
           VALUES (?, ?, ?, ?, ?, 'Pending')`,
          [cust_id, USER_TYPE_CUSTOMER, latitude, longitude, locationName],
        );

        // Send Email
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">
            <h2 style="color: #721c24; margin-top: 0;">🚨 CUSTOMER SOS ALERT</h2>
            <p><strong>Customer:</strong> ${fullName} (ID: ${customerId})</p>
            <p><strong>Phone:</strong> <a href="tel:${customer.gustcust_contphone}">${customer.gustcust_contphone}</a></p>
            <p><strong>Location:</strong> ${locationName}</p>
            <p style="font-size: 12px; color: #555;">Lat: ${latitude}, Lng: ${longitude}</p>
            <br/>
            <a href="http://maps.google.com/maps?q=${latitude},${longitude}" 
               style="background-color: #dc3545; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               📍 View on Google Maps
            </a>
          </div>
        `;

        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: `🚨 SOS: ${fullName}`,
          html: emailHtml,
        });

        console.log("✅ SOS Email Sent");
      } catch (err) {
        console.error("⚠️ Background Task Error:", err.message);
      }
    });
  } catch (err) {
    console.error("🔥 SOS Route Error:", err);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
