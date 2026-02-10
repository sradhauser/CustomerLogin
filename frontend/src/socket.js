import { io } from 'socket.io-client';

// Uses http://192.168.0.37:5555 in Dev 
// Uses https://app.patratravels.com in Prod
const URL = process.env.REACT_APP_BASE_URL;

export const socket = io(URL, {
  autoConnect: false,
  transports: ['websocket'], // Keeps connection stable on mobile data
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});