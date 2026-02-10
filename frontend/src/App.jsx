import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster, toast } from "sonner";
import AppRoutes from "./routes/AppRoutes";
import Loader from "./components/Loader";
import { socket } from "./socket";

function App() {
  const [appInitializing, setAppInitializing] = useState(() => {
    // Session storage ensures flash screen only shows once per session
    return !sessionStorage.getItem("appInitialized");
  });

  // --- 1. GPS WATCHER (Customer Context) ---
  const watchIdRef = useRef(null);

  const startLocationWatch = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      // Quiet fail for customers is sometimes better, but let's notify gently
      console.warn("Location not supported on this device");
      return;
    }

    // 🔹 STEP 1: CHECK PERMISSION STATE
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({
          name: "geolocation",
        });

        if (status.state === "denied") {
          toast.error(
            "Please enable Location access to book rides."
          );
          return;
        }
      } catch (e) {
        console.warn("Permission check failed");
      }
    }

    // 🔹 STEP 2: START WATCHING (Important for live tracking on map)
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted → start watching
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          () => {
            // Success: GPS is working
            toast.dismiss("gps-error");
          },
          (err) => {
            let msg = "Unable to fetch location.";

            if (err.code === 1)
              msg = "Please allow Location Permission to continue.";
            if (err.code === 2)
              msg = "Location is OFF. Please turn it on.";

            // Don't spam customers with toasts, show once with ID
            toast.error(msg, {
              id: "gps-error",
              duration: 4000,
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      },
      (err) => {
        let msg = "Location error.";
        if (err.code === 1) msg = "Please enable Location Services.";
        
        toast.error(msg, {
          id: "gps-error",
          duration: 4000,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, []);

  // --- 2. SPLASH SCREEN LOGIC ---
  useEffect(() => {
    if (!appInitializing) return;

    // Show flash screen for 2.5 seconds for premium feel
    const timer = setTimeout(() => {
      sessionStorage.setItem("appInitialized", "true");
      setAppInitializing(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [appInitializing]);

  // --- 3. SOCKET & REAL-TIME UPDATES ---
  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      console.log("Customer App Connected! ID:", socket.id);
    };

    socket.on("connect", onConnect);

    // Join Room using Customer ID
    const myCustomerId = localStorage.getItem("customerId");
    if (myCustomerId) {
      // Emit event tailored for customer
      socket.emit("join_customer_session", myCustomerId);
    }

    // LISTENER: When a driver accepts the request
    const handleDriverFound = (data) => {
      // Optional: Verify the event is for this customer
      if (data.customerId && data.customerId !== myCustomerId) return;

      toast.success("Driver Found! 🚖", {
        description: `${data.driverName || "A driver"} is on the way.`,
        duration: 6000,
        action: {
          label: "TRACK",
          onClick: () => (window.location.href = `/trip/${data.tripId}`),
        },
      });
    };

    socket.on("driver_assigned", handleDriverFound);

    // Start GPS logic
    startLocationWatch();

    return () => {
      socket.disconnect();
      socket.off("driver_assigned", handleDriverFound);
      socket.off("connect", onConnect);

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startLocationWatch]);

  // --- 4. RENDER FLASH SCREEN ---
  if (appInitializing) {
    return <Loader message="STARTING YOUR JOURNEY..." />;
  }

  // --- 5. MAIN RENDER ---
  return (
    <Router>
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme="light"
        toastOptions={{
          style: {
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "'Inter', sans-serif",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          },
          duration: 2000,
        }}
      />
      <AppRoutes />
    </Router>
  );
}

export default App;