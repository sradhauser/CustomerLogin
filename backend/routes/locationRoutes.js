import express from "express";
import dotenv from "dotenv";
import axios from "axios"; // <--- Import Axios

dotenv.config();

const router = express.Router(); 

router.post("/geocode", async (req, res) => {
  console.log("📍 [DEBUG] Geocode Request Received");
  
  try {
    const { latitude, longitude } = req.body;
    console.log(`   - Coordinates: ${latitude}, ${longitude}`);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Coordinates missing" });
    }

    const API_KEY = process.env.GOOGLE_MAPS_KEY;
    if (!API_KEY) {
      console.error("❌ ERROR: API Key missing in .env");
      return res.status(500).json({ message: "Server Config Error" });
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`;
    console.log("   - Connecting to Google...");

    // 🔴 CHANGE: Using axios instead of fetch
    const response = await axios.get(googleUrl, {
        timeout: 5000 // Wait max 5 seconds
    });
    
    const data = response.data;
    console.log(`   - Google Status: ${data.status}`);

    if (data.status === "OK" && data.results.length > 0) {
      console.log("✅ Location:", data.results[0].formatted_address);
      res.json({ 
        success: true, 
        address: data.results[0].formatted_address 
      });
    } else {
      console.error("❌ Google Error:", data.status, data.error_message);
      res.status(400).json({ message: "Google refused request", details: data.error_message });
    }

  } catch (error) {
    console.error("🔥 NETWORK ERROR DETECTED:");
    
    // DETAILED DIAGNOSIS
    if (error.code === 'ENOTFOUND') {
        console.error("👉 CAUSE: DNS Error. Your computer cannot find 'maps.googleapis.com'. Check your WiFi/Ethernet.");
    } else if (error.code === 'ETIMEDOUT') {
        console.error("👉 CAUSE: Connection timed out. Internet is too slow or firewall is blocking Node.js.");
    } else if (error.response) {
        console.error("👉 CAUSE: Google Blocked IP. Status:", error.response.status);
    } else {
        console.error("👉 CAUSE:", error.message);
    }

    res.status(500).json({ message: "Server Network Error", error: error.message });
  }
});

export default router;