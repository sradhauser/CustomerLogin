import express from "express";
import db from "../config/database.js";

const router = express.Router();

router.get("/driverHistory/:driverId/:month/:year", async (req, res) => {
  try {
    const { driverId, month, year } = req.params;

    // const qry = `
    //   SELECT
    //     a.attendance_id,
    //     d.driver_regno,
    //     d.driver_fstname,
    //     a.selfie AS selfie_path,
    //     a.created_at,
    //     a.latitude,
    //     a.longitude
    //   FROM attendance a
    //   JOIN tbl_drivers d ON a.driver_id = d.driver_id
    //   WHERE d.driver_regno = ?
    //     AND MONTH(a.created_at) = ?
    //     AND YEAR(a.created_at) = ?
    //   ORDER BY a.created_at DESC
    // `;

    const qry = `
        SELECT 
          a.*,
          d.driver_regno,
          d.driver_fstname
        FROM drv_attendance_details a
        JOIN tbl_drivers d ON a.drv_id = d.driver_id
        WHERE d.driver_regno = ?
          AND MONTH(a.checkin_datetime) = ?
          AND YEAR(a.checkin_datetime) = ?
        ORDER BY a.checkin_datetime DESC;

      `;

    const [records] = await db.execute(qry, [driverId, month, year]);

    const formattedRecords = records.map((record) => ({
      ...record,
      selfie_path: `uploads/selfies/${record.selfie_path}`,
      checkin_datetime: new Date(record.checkin_datetime).toLocaleString(),
    }));

    res.json({ success: true, data: formattedRecords });
  } catch (err) {
    console.error("Attendance error:", err.message);
    res.status(500).json({
      success: false,
      error: "Server error retrieving attendance records",
    });
  }
});

// router.get("/attendanceHistory/:driverId/:month/:year", async (req, res) => {
//   try {
//     const { driverId, month, year } = req.params;

//     const qry = `
//         SELECT
//           a.drv_atid,
//           d.driver_regno,
//           d.driver_fstname,
//           a.checkin_selfie AS selfie_path,

//           a.checkin_datetime,
//           a.cigps_latitude,
//           a.cigps_longitude
//         FROM drv_attendance_details a
//         JOIN tbl_drivers d ON a.drv_id = d.driver_id
//         WHERE d.driver_regno = ?
//           AND MONTH(a.checkin_datetime) = ?
//           AND YEAR(a.checkin_datetime) = ?
//         ORDER BY a.checkin_datetime DESC
//       `;

//     const [records] = await db.execute(qry, [driverId, month, year]);

//     const formattedRecords = records.map((record) => ({
//       ...record,
//       selfie_path: `uploads/selfies/${record.selfie_path}`,
//       checkin_datetime: new Date(record.checkin_datetime).toLocaleString(),
//     }));

//     res.json({ success: true, data: formattedRecords });
//   } catch (err) {
//     console.error("Attendance error:", err.message);
//     res.status(500).json({
//       success: false,
//       error: "Server error retrieving attendance records",
//     });
//   }
// });
// 1. GET ATTENDANCE HISTORY LIST (For Calendar Page)
router.get("/attendanceHistory/:driverId/:month/:year", async (req, res) => {
  try {
    const { driverId, month, year } = req.params;

    // --- STEP A: RESOLVE DRIVER (Robust Lookup) ---
    // We check if the input is a Numeric ID or a RegNo string
    let sqlDriver = "SELECT driver_id, driver_regno FROM tbl_drivers WHERE ";
    let paramDriver = [];

    if (!isNaN(driverId)) {
      sqlDriver += "driver_id = ?";
      paramDriver = [driverId];
    } else {
      sqlDriver += "driver_regno = ?";
      paramDriver = [driverId];
    }

    const [driverRows] = await db.execute(sqlDriver, paramDriver);

    if (driverRows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // We now have the definitive ID to use for joins
    const targetDriverId = driverRows[0].driver_id;

    // --- STEP B: FETCH HISTORY ---
    // Now we safely use 'a.drv_id = ?' which is faster and safer
    const qry = `
        SELECT 
          a.drv_atid, 
          d.driver_regno,   
          d.driver_fstname,
          a.checkin_selfie AS selfie_path, 
          a.checkin_datetime,
          a.cigps_latitude,
          a.cigps_longitude
        FROM drv_attendance_details a 
        JOIN tbl_drivers d ON a.drv_id = d.driver_id
        WHERE a.drv_id = ? 
          AND MONTH(a.checkin_datetime) = ?
          AND YEAR(a.checkin_datetime) = ?
        ORDER BY a.checkin_datetime DESC
      `;

    const [records] = await db.execute(qry, [targetDriverId, month, year]);

    // --- STEP C: FORMAT RESPONSE ---
    const formattedRecords = records.map((record) => ({
      ...record,
      selfie_path: record.selfie_path
        ? `uploads/selfies/${record.selfie_path}`
        : null,

      // British Format (DD/MM/YYYY)
      checkin_datetime: new Date(record.checkin_datetime).toLocaleString(
        "en-GB",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }
      ),
    }));

    res.json({ success: true, data: formattedRecords });
  } catch (err) {
    console.error("Attendance History Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 2. GET SINGLE DAY DETAIL + DUTY (For Log Page)
// 2. GET SINGLE DAY DETAIL + DUTY (For Dashboard & Log Page)
router.get(
  "/attendanceCheckDate/:driverId/:date/:month/:year",
  async (req, res) => {
    try {
      const { driverId, date, month, year } = req.params;

      // --- STEP A: RESOLVE DRIVER FIRST ---
      let sqlDriver =
        "SELECT driver_id, driver_regno, driver_fstname, driver_lstname FROM tbl_drivers WHERE ";
      let paramDriver = [];

      if (!isNaN(driverId)) {
        sqlDriver += "driver_id = ?";
        paramDriver = [driverId];
      } else {
        sqlDriver += "driver_regno = ?";
        paramDriver = [driverId];
      }

      const [driverRows] = await db.execute(sqlDriver, paramDriver);

      if (driverRows.length === 0) {
        // Driver not found
        return res.json({ success: true, data: [] });
      }

      const driverInfo = driverRows[0];
      const targetDriverId = driverInfo.driver_id; // Numeric ID

      // --- STEP B: PREPARE DATE ---
      // Ensure date is valid (YYYY-MM-DD)
      const fullDate = `${year}-${month}-${date}`;

      // --- STEP C: FETCH ATTENDANCE ---
      // Uses numeric ID for speed and accuracy
      const qry = `
        SELECT 
          a.*, 
          d.driver_regno,
          d.driver_fstname,
          d.driver_lstname
        FROM drv_attendance_details a 
        JOIN tbl_drivers d ON a.drv_id = d.driver_id
        WHERE a.drv_id = ?
        AND DATE(a.checkin_datetime) = ? 
        ORDER BY a.drv_atid DESC
        LIMIT 1
      `;

      const [records] = await db.execute(qry, [targetDriverId, fullDate]);

      // If no attendance found, return empty
      if (records.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // --- STEP D: FETCH DUTY (If Attendance Exists) ---
      let dutyRecord = null;
      const [dutyRows] = await db.execute(
        `
        SELECT * FROM drv_duty_details 
        WHERE drv_id = ? AND DATE(duty_in_datetime) = ? 
        ORDER BY id DESC LIMIT 1
      `,
        [targetDriverId, fullDate]
      );

      if (dutyRows.length > 0) dutyRecord = dutyRows[0];

      // --- STEP E: FORMATTERS ---
      const parseChecklist = (jsonField) => {
        try {
          const parsed =
            typeof jsonField === "string" ? JSON.parse(jsonField) : jsonField;
          if (!parsed) return [];
          return Object.values(parsed);
        } catch (e) {
          return [];
        }
      };

      const formatDateTime = (dt) =>
        dt
          ? new Date(dt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          : "Pending";

      // --- STEP F: CONSTRUCT RESPONSE ---
      const formattedRecords = records.map((record) => {
        return {
          ...record,

          driverName: `${driverInfo.driver_fstname} ${
            driverInfo.driver_lstname || ""
          }`.trim(),
          readable_checkin_time: formatDateTime(record.checkin_datetime),
          readable_checkout_time:
            record.ck_sts === 2
              ? formatDateTime(record.checkout_datetime)
              : "Not Punched Out",

          checkin_location: record.cigps_locname || "Unknown Location",
          checkout_location:
            record.ck_sts === 2 ? record.cogps_locname || "Unknown" : "Pending",

          checkin_selfie_url: record.checkin_selfie
            ? `/uploads/selfies/${record.checkin_selfie}`
            : null,
          checkout_selfie_url: record.checkout_selfie
            ? `/uploads/selfies/${record.checkout_selfie}`
            : null,

          // --- ATTACH DUTY INFO ---
          has_duty: !!dutyRecord,
          duty_start_time: dutyRecord
            ? formatDateTime(dutyRecord.duty_in_datetime)
            : null,
          duty_end_time:
            dutyRecord && dutyRecord.ck_sts === 2
              ? formatDateTime(dutyRecord.duty_out_datetime)
              : null,

          start_odo_val: dutyRecord ? dutyRecord.odo_civalue : null,
          end_odo_val: dutyRecord ? dutyRecord.odo_covalue : null,

          start_odo_img:
            dutyRecord && dutyRecord.ciodomtr_image
              ? `/uploads/odometer/${dutyRecord.ciodomtr_image}`
              : null,
          end_odo_img:
            dutyRecord && dutyRecord.coodomtr_image
              ? `/uploads/odometer/${dutyRecord.coodomtr_image}`
              : null,

          start_checklist: dutyRecord
            ? parseChecklist(dutyRecord.ci_itemchkstatus).map((i) => ({
                ...i,
                image: i.image ? `/uploads/chklist_img/${i.image}` : null,
              }))
            : [],
          end_checklist:
            dutyRecord && dutyRecord.ck_sts === 2
              ? parseChecklist(dutyRecord.co_itemchkstatus).map((i) => ({
                  ...i,
                  image: i.image ? `/uploads/chklist_img/${i.image}` : null,
                }))
              : [],
        };
      });

      res.json({ success: true, data: formattedRecords });
    } catch (err) {
      console.error("Attendance Check Route Error:", err);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  }
);

router.get("/sendItems", async (req, res) => {
  try {
    const [items] = await db.execute("SELECT * FROM items where is_active=1");

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (err) {
    console.error("Items view error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error retrieving Items records",
    });
  }
});

export default router;