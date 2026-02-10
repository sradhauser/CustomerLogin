import express from "express";
import db from "../config/database.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.get("/all", async (req, res) => {
  try {
    const query = `
      SELECT 
        s.sos_id, 
        s.user_type,  -- 1: Driver, 2: Customer
        s.latitude, 
        s.longitude, 
        s.location_name, 
        s.trigger_time, 
        s.status,
        
        -- Driver Fields (Will be NULL if it's a Customer)
        d.driver_fstname, 
        d.driver_lstname, 
        d.driver_phno, 
        d.driver_regno,

        -- Customer Fields (Will be NULL if it's a Driver)
        c.gustcust_fstname, 
        c.gustcust_lstname, 
        c.gustcust_contphone,
        c.id AS cust_string_id -- The "CPTT..." ID
      
      FROM tbl_sos_alerts s
      
      -- Join Drivers (Matches if user_type = 1)
      LEFT JOIN tbl_drivers d ON s.user_id = d.driver_id AND s.user_type = 1
      
      -- Join Customers (Matches if user_type = 2)
      LEFT JOIN tbl_customers c ON s.user_id = c.gustcust_id AND s.user_type = 2
      
      ORDER BY s.trigger_time DESC
    `;

    const [rows] = await db.execute(query);

    // Clean up the data for the Frontend
    // We consolidate the different columns into generic "name", "phone", "id" fields
    const formattedData = rows.map(row => {
      let name, phone, displayId, typeLabel;

      if (row.user_type === 1) { // Driver
        name = `${row.driver_fstname || 'Unknown'} ${row.driver_lstname || ''}`;
        phone = row.driver_phno;
        displayId = row.driver_regno;
        typeLabel = "Driver";
      } else { // Customer
        name = `${row.gustcust_fstname || 'Unknown'} ${row.gustcust_lstname || ''}`;
        phone = row.gustcust_contphone;
        displayId = row.cust_string_id; // e.g. CPTT000002
        typeLabel = "Customer";
      }

      return {
        sos_id: row.sos_id,
        type: typeLabel,           // "Driver" or "Customer"
        name: name.trim(),
        phone: phone || "N/A",
        user_id: displayId || "N/A",
        location: row.location_name || "Unknown Location",
        lat: row.latitude,
        lng: row.longitude,
        time: row.trigger_time,
        status: row.status
      };
    });

    res.json({ success: true, data: formattedData });

  } catch (error) {
    console.error("🔥 Error fetching Admin SOS:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// --- 2. UPDATE STATUS (e.g. Mark as Resolved) ---
router.put("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting 'Resolved'

    await db.execute(
      "UPDATE tbl_sos_alerts SET status = ? WHERE sos_id = ?",
      [status, id]
    );

    res.json({ success: true, message: "Status updated successfully" });

  } catch (error) {
    console.error("🔥 Error updating status:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

export default router;