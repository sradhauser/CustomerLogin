import db from "../config/database.js";
import { sendEmail } from "../utils/emailService.js"; 

// 1. HELPER: Generate HTML Table for Checklist
const generateChecklistHTML = (checklistObj) => {
  if (!checklistObj) return "<p>No checklist provided.</p>";

  // Clean, text-only table
  let html = `<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; font-family: Arial, sans-serif;">
    <thead>
      <tr style="background:#f2f2f2">
        <th style="text-align:left;">Item</th>
        <th style="text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>`;

  // Use Object.values to handle the JSON structure { "1": {name: "Tyres", value: 1}, ... }
  Object.values(checklistObj).forEach((item) => {
    const color = item.value === 1 ? "green" : "red";
    const txt = item.value === 1 ? "YES" : "NO";

    html += `<tr>
      <td>${item.name}</td>
      <td style="color:${color}; font-weight:bold; text-align:center;">${txt}</td>
    </tr>`;
  });
  return html + "</tbody></table>";
};

// 2. HELPER: Prepare and Send Email (Background Task)
const sendEmailInBackground = async (
  driver,
  actionType,
  currentTime,
  odoVal,
  checklist
) => {
  try {
    const checklistHTML = generateChecklistHTML(checklist);

    // Format time to Indian Standard Time
    const timeString = currentTime.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Create the Email Body
    const emailSubject = `DUTY ${actionType}: ${driver.driver_fstname} (${driver.regNo || driver.id})`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #fd7e14; margin-top: 0;">Driver Duty: ${actionType}</h2>
        <p><strong>Driver Name:</strong> ${driver.driver_fstname} ${driver.driver_lstname || ""}</p>
        <p><strong>Driver ID:</strong> ${driver.regNo || driver.id}</p>
        <p><strong>Time:</strong> ${timeString}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        
        <h3 style="margin-bottom: 5px;">🚗 Odometer Reading</h3>
        <p style="font-size: 24px; font-weight: bold; margin-top: 0; color: #333;">${odoVal} KM</p>
        
        <h3 style="margin-bottom: 10px;">📋 Safety Checklist Report</h3>
        ${checklistHTML}
        
        <p style="margin-top: 30px; font-size: 12px; color: #888;">
          This is an automated message from the Patra Travels App.
        </p>
      </div>
    `;
//     const emailBody = `
// <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:16px;">
//   <div style="
//     max-width:600px;
//     margin:auto;
//     background:#ffffff;
//     border-radius:10px;
//     overflow:hidden;
//     box-shadow:0 4px 12px rgba(0,0,0,0.08);
//   ">

//     <!-- HEADER -->
//     <div style="
//       background:#fd7e14;
//       color:#ffffff;
//       padding:16px;
//       text-align:center;
//     ">
//       <h2 style="margin:0; font-size:20px;">
//         🚗 Driver Duty ${actionType}
//       </h2>
//       <p style="margin:4px 0 0; font-size:13px; opacity:0.9;">
//         Patra Travels – Duty Update
//       </p>
//     </div>

//     <!-- BODY -->
//     <div style="padding:16px; color:#111827; font-size:14px; line-height:1.6;">

//       <!-- DRIVER DETAILS -->
//       <div style="margin-bottom:14px;">
//         <p style="margin:0 0 6px;">
//           <strong>Driver Name</strong><br />
//           ${driver.driver_fstname} ${driver.driver_lstname || ""}
//         </p>
//         <p style="margin:0 0 6px;">
//           <strong>Driver ID</strong><br />
//           ${driver.regNo || driver.id}
//         </p>
//         <p style="margin:0;">
//           <strong>Time</strong><br />
//           ${timeString}
//         </p>
//       </div>

//       <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;" />

//       <!-- ODOMETER -->
//       <div style="
//         background:#f9fafb;
//         padding:14px;
//         border-radius:8px;
//         text-align:center;
//         margin-bottom:16px;
//       ">
//         <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">
//           🚘 Odometer Reading
//         </div>
//         <div style="
//           font-size:26px;
//           font-weight:bold;
//           color:#111827;
//         ">
//           ${odoVal} KM
//         </div>
//       </div>

//       <!-- CHECKLIST -->
//       <div style="margin-bottom:20px;">
//         <h3 style="
//           margin:0 0 10px;
//           font-size:16px;
//           color:#111827;
//         ">
//           📋 Safety Checklist Report
//         </h3>
//         ${checklistHTML}
//       </div>

//     </div>

//     <!-- FOOTER -->
//     <div style="
//       background:#f3f4f6;
//       padding:10px;
//       text-align:center;
//       font-size:12px;
//       color:#6b7280;
//     ">
//       This is an automated message from the Patra Travels App.
//     </div>

//   </div>
// </div>
// `;


    // CALL THE SHARED SERVICE
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: emailSubject,
      html: emailBody,
      // No attachments needed as per your request
    });

  } catch (err) {
    console.error("❌ Background Email Failed:", err.message);
  }
};

// 3. MAIN FUNCTION: Submit Duty
export const submitduty = async ({
  driver,
  odometerFileName,
  odometerValue,
  ci_itemchkstatus,
  buttonParameter,
}) => {
  const isStart = buttonParameter === 1;
  const actionType = isStart ? "START" : "END";
  const currentTime = new Date();

  // --- DATABASE OPERATIONS ---
  if (isStart) {
    // START DUTY LOGIC
    // const [result] = await db.execute(
    //   `INSERT INTO drv_duty_details (
    //      drv_id, duty_in_datetime, ciodomtr_image, odo_civalue, ci_itemchkstatus, ck_sts
    //    ) 
    //    SELECT ?, NOW(), ?, ?, ?, 1
    //    FROM DUAL
    //    WHERE NOT EXISTS (
    //      SELECT 1 FROM drv_duty_details 
    //      WHERE drv_id = ? AND ck_sts = 1
    //    )`,
    //   [
    //     driver.id,
    //     odometerFileName,
    //     odometerValue,
    //     JSON.stringify(ci_itemchkstatus),
    //     driver.id,
    //   ]
    // );
    // INSIDE submitduty FUNCTION (Start Logic)

    // START DUTY LOGIC
    const [result] = await db.execute(
      `INSERT INTO drv_duty_details (
          drv_id, 
          duty_in_datetime, 
          created_date,        -- 1. ADD COLUMN HERE
          ciodomtr_image, 
          odo_civalue, 
          ci_itemchkstatus, 
          ck_sts
       ) 
       SELECT 
          ?, 
          NOW(), 
          NOW(),               -- 2. INSERT VALUE HERE (Current Date/Time)
          ?, 
          ?, 
          ?, 
          1
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM drv_duty_details 
         WHERE drv_id = ? 
         AND ck_sts = 1 
         AND DATE(created_date) = DATE(NOW()) -- 3. USE IT HERE FOR VALIDATION
       )`,
      [
        driver.id,
        // (NOW() is handled by SQL)
        // (NOW() is handled by SQL)
        odometerFileName,
        odometerValue,
        JSON.stringify(ci_itemchkstatus),
        driver.id,
      ]
    );

    if (result.affectedRows === 0) throw new Error("You are already On Duty.");

  } else {
    // END DUTY LOGIC
    // 1. Find the active duty row
    const [activeRows] = await db.execute(
      `SELECT id, odo_civalue FROM drv_duty_details 
       WHERE drv_id = ? AND ck_sts = 1 
       ORDER BY id DESC LIMIT 1`,
      [driver.id]
    );

    if (activeRows.length === 0) throw new Error("No active duty found to end.");

    const activeDuty = activeRows[0];

    // 2. Validation: End Odo > Start Odo
    if (parseFloat(odometerValue) <= parseFloat(activeDuty.odo_civalue)) {
      throw new Error(
        `End Odometer must be higher than Start (${activeDuty.odo_civalue})`
      );
    }

    // 3. Update the row
    await db.execute(
      `UPDATE drv_duty_details
       SET duty_out_datetime = NOW(), 
           coodomtr_image = ?, 
           odo_covalue = ?, 
           co_itemchkstatus = ?, 
           ck_sts = 2
       WHERE id = ?`,
      [
        odometerFileName,
        odometerValue,
        JSON.stringify(ci_itemchkstatus),
        activeDuty.id,
      ]
    );
  }

  // --- TRIGGER EMAIL IN BACKGROUND ---
  // Using setImmediate ensures the driver gets a fast response in the App
  // while the email sends asynchronously.
  setImmediate(() => {
    sendEmailInBackground(
      driver,
      actionType,
      currentTime,
      odometerValue,
      ci_itemchkstatus
    );
  });
  
  return { success: true, message: `Duty ${actionType} Successful` };
};