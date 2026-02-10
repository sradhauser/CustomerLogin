import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import db from "./config/database.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import util from "util";

// --- IMPORT UNIFIED CUSTOMER ROUTES ---
import customerRoutes from "./routes/customerauthroutes.js";
import contactRoutes from "./routes/contactpageroutes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "./.env" });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8081;

// --- LOGGING CONFIGURATION ---
const logFile = fs.createWriteStream(path.join(__dirname, "server_error.log"), {
  flags: "a",
});
const logStdout = process.stdout;

// Helper function to get India Time
const getISTTime = () => {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

console.log = function (d) {
  logFile.write(util.format(d) + "\n");
  logStdout.write(util.format(d) + "\n");
};

console.error = function (d) {
  const timestamp = getISTTime();
  const message = `[${timestamp}] ERROR: ${util.format(d)}\n`;
  logFile.write(message);
  logStdout.write(util.format(d) + "\n");
};

// --- 1. SETUP SOCKET.IO ---
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://app.patratravels.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- 2. CREATE UPLOAD DIRECTORIES ---
// Only creating the folder needed for customer profiles
const uploadDirs = [path.join(__dirname, "uploads", "customer_profile")];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. SERVE STATIC UPLOADS ---
// Only serving customer profiles
app.use(
  "/uploads/customer_profile",
  express.static(path.join(__dirname, "uploads", "customer_profile")),
);

// --- 4. SOCKET LOGIC ---
io.on("connection", (socket) => {
  // console.log(`New connection: ${socket.id}`);

  // Generic join for tracking ID (used by drivers usually)
  socket.on("join_app_session", (regNo) => {
    socket.join(regNo);
    console.log(`User ${regNo} is active.`);
  });

  // Specific customer join event (from your Frontend)
  socket.on("join_customer_session", (customerId) => {
    socket.join(customerId);
    console.log(`Customer ${customerId} joined session.`);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected.");
  });
});

async function startServer() {
  try {
    await db.testConnection();

    // --- 5. API ROUTES ---
    // Only mounting the Customer Routes (Login + Profile)
    app.use("/api/v1/customer", customerRoutes);
     app.use("/api/v1/contact", contactRoutes);

    // Add this line with your other routes
    app.use(
      "/api/v1/customer/sos",
      (await import("./routes/customerSos.js")).default,
    );
    app.use("/api/v1/sos", (await import("./routes/allsos.js")).default);

    // --- 6. ERROR HANDLER ---
    app.use((err, req, res, next) => {
      console.error("Server Error:", err.stack);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    });

    httpServer.listen(PORT, () => {
      console.log(`Your Server running on Port: ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
