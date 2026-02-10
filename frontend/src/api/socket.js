import { io } from "socket.io-client";

const isLocal = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" || 
  window.location.hostname === "192.168.0.37"; 

// 2. Select the correct backend URL
const SOCKET_URL = isLocal 
  ? "http://192.168.0.37:5555"       
  : "https://app.patratravels.com";  

// console.log("Connecting Socket to:", SOCKET_URL); 

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"], 
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  withCredentials: true, 
});