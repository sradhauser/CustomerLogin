import axios from "axios";

// 1. Get the root URL for images
export const IMAGE_BASE_URL = process.env.REACT_APP_BASE_URL;

// 2. Get the API URL for requests
const baseURL = process.env.REACT_APP_API_URL;

if (!baseURL || !IMAGE_BASE_URL) {
  console.error("CRITICAL ERROR: Environment variables are not defined.");
}

const api = axios.create({
  baseURL,
});

// 🔐 Attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    // FIX: Check for 'customerToken' OR 'token' (generic)
    // We check all possible keys to ensure compatibility
    const token = 
      localStorage.getItem("customerToken") || 
      localStorage.getItem("token") || 
      localStorage.getItem("driverToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Handle 401 (Unauthorized)
    if (err.response?.status === 401) {
      console.warn("Session Expired - Redirecting to Login");
      
      // Prevent infinite reload loop if already on login page
      if (!window.location.pathname.includes("/login")) {
        localStorage.clear(); // Clears all tokens
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;