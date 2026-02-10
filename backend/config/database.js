// config/database.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    
    // --- HIGH TRAFFIC FIXES ---
    waitForConnections: true,    
    connectionLimit: 120,        // Set to 120 to handle 100 drivers + 20 for Admin/Other tasks
    queueLimit: 0,               // 0 means "unlimited" queue; safer for bursts of 100+
    connectTimeout: 20000,       // Increased to 20s for heavy load stability
    
    // --- PERFORMANCE TUNING ---
    enableKeepAlive: true,       
    keepAliveInitialDelay: 10000,
    maxIdle: 10,                 // Keeps 10 connections warm even when no one is active
    idleTimeout: 60000           // Closes idle connections after 60 seconds
});

export default {
    pool,
    // Standard wrapper for quick queries
    execute: async (sql, params) => {
        try {
            return await pool.execute(sql, params);
        } catch (error) {
            console.error("DB Execution Error:", error.message);
            throw error; 
        }
    },
    // IMPORTANT: Use this for Transactions/Heavy Duty starts
    getConnection: async () => {
        return await pool.getConnection();
    },
    testConnection: async () => {
        try {
            const conn = await pool.getConnection();
            console.log(`Database Pool Ready - Connected to Mysql`);
            conn.release(); 
        } catch (err) {
            console.error("Database Connection Failed:", err.message);
        }
    }
};