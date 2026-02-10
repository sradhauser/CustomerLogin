import express from "express";
import db from "../config/database.js";

const router = express.Router();

router.post("/php-notify-driver", (req, res) => {
    const { driverRegNo, tripId, message } = req.body;

    console.log(`Received Signal from PHP for Driver: ${driverRegNo}`);

    // Access 'io' via the middleware we set up in server.js
    if (req.io) {
        req.io.to(driverRegNo).emit("driver_assigned", {
            tripId: tripId,
            driverRegNo: driverRegNo,
            message: message || "New Trip Assigned!"
        });
        
        return res.json({ success: true, status: "Socket Sent" });
    }

    res.status(500).json({ success: false, error: "Socket.io not initialized" });
});

// if ($insert_success) {
    
//     // 1. Prepare Data for Node.js
//     $driverRegNo = "OR02-1234"; // Get this from your variable
//     $tripId = $new_trip_id;     // Get the ID of the trip you just inserted
    
//     $data = [
//         "driverRegNo" => $driverRegNo,
//         "tripId" => $tripId,
//         "message" => "New Trip Assigned via Admin Panel"
//     ];

//     // 2. Send cURL Request to your Node.js Server
//     // CHANGE URL to your live Node server: https://app.patratravels.com/api/v1/admin/php-notify-driver
//     $url = "http://127.0.0.1:8081/api/v1/admin/php-notify-driver"; 
    
//     $ch = curl_init($url);
//     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
//     curl_setopt($ch, CURLOPT_POST, true);
//     curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
//     curl_setopt($ch, CURLOPT_HTTPHEADER, [
//         'Content-Type: application/json'
//     ]);

//     $response = curl_exec($ch);
//     $error = curl_error($ch);
//     curl_close($ch);

//     // Optional: Log the result for debugging
//     // error_log("Node Notification Result: " . $response);
// }

// ... [Rest of your PHP code] ...
export default router;