import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Clock,
  Car,
  CreditCard,
  ShieldCheck,
  Star,
  Plus,
  ChevronRight,
  Settings, // Added Settings Icon
  User,
} from "lucide-react";
import { toast } from "sonner";
import api, { IMAGE_BASE_URL } from "../api/Api.js";
import { socket } from "../api/socket";
import Loader from "../components/Loader2.jsx"; // Using Loader1 for this example

// --- 1. COMPACT CLOCK (Right Aligned) ---
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-end">
      <div
        className="d-flex align-items-baseline justify-content-end text-white"
        style={{
          fontFamily: "monospace",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        <span className="fw-bold fs-3">
          {time
            .toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
            .slice(0, -3)}
        </span>
        <span className="small opacity-75 ms-1 fw-bold">
          {time.toLocaleTimeString([], { hour12: true }).slice(-2)}
        </span>
      </div>
      <div
        className="text-white text-uppercase fw-bold mt-1"
        style={{ fontSize: "0.6rem", letterSpacing: "1px" }}
      >
        {time.toLocaleDateString([], {
          weekday: "short",
          day: "numeric",
          month: "short",
        })}
      </div>
    </div>
  );
};

// --- 2. HEADER COMPONENT (The "Smart Widget" Layout) ---
const DashboardHeader = ({ profile }) => {
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const styles = {
    card: {
      background: "linear-gradient(135deg, #f18c49 0%, #5f26c9 100%)", // Premium Dark Gradient
      borderRadius: "0 0 30px 30px", // Modern "App Bar" rounded bottom
      marginBottom: "20px",
      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
      position: "relative",
      overflow: "hidden",
    },
    avatar: {
      width: "90px",
      height: "90px",
      borderRadius: "50%",
      border: "3px solid rgb(152, 61, 255)", // Subtle border
    },
    settingsBtn: {
      width: "45px",
      height: "45px",
      borderRadius: "14px",
      background: "rgba(255,255,255,0.1)",
      backdropFilter: "blur(5px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid rgba(255,255,255,0.05)",
      transition: "transform 0.2s",
    },
  };

  return (
    <div style={styles.card}>
      {/* Background Decor (Optional) */}
      {/* <div
        className="position-absolute top-0 end-0 opacity-10"
        style={{
          transform: "translate(30%, -30%)",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, #0066ffa9 0%, transparent 70%)",
        }}
      ></div> */}

      <div className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          {/* Avatar */}
          <div style={styles.avatar} className="position-relative">
            <div className="w-100 h-100 rounded-circle overflow-hidden bg-dark">
              {profile.cust_img ? (
                <img
                  src={`${IMAGE_BASE_URL}${profile.cust_img}`}
                  alt="Profile"
                  className="w-100 h-100 object-fit-cover"
                />
              ) : (
                <div
                  className="w-100 h-100 d-flex align-items-center justify-content-center fw-bold fs-4 text-white"
                  style={{ background: "#3b82f6" }}
                >
                  {profile.fullName
                    ? profile.fullName.charAt(0).toUpperCase()
                    : "U"}
                </div>
              )}
            </div>
          </div>

          {/* Clock */}
          <LiveClock />
        </div>

        {/* ROW 2: Info (Left) --- Settings (Right) */}
        <div className="d-flex justify-content-between align-items-end">
          {/* Text Info */}
          <div>
            <div
              className="text-primary fw-bold text-uppercase mb-1"
              style={{ fontSize: "0.70rem", letterSpacing: "1px" }}
            >
              {getGreeting()}
            </div>
            <h4 className="fw-bold text-white mb-1 leading-tight">
              {profile.fullName || "Guest User"}
            </h4>
            <div className="text-white small d-flex align-items-center gap-1">
              <User size={15} />
              <span className="text-truncate" style={{ maxWidth: "200px" }}>
                {profile.email || "Add your email"}
              </span>
            </div>
          </div>

          {/* Settings Icon */}
          <div
            style={styles.settingsBtn}
            className="text-white cursor-pointer active-scale"
            onClick={() => navigate("/profile")} // Redirects to Profile
          >
            <Settings size={22} />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 3. MAIN PAGE INTEGRATION ---
const DashboardPage = () => {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem("customerToken"));
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ fullName: "Guest", cust_img: null });
  const [upcomingTrips, setUpcomingTrips] = useState([]);

  // Native-feel Styles
  const nativeStyles = {
    page: { background: "#F4F6F9", minHeight: "100vh", paddingBottom: "100px" },
    squircleIcon: {
      width: "52px",
      height: "52px",
      borderRadius: "18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    },
    glassCard: {
      background: "white",
      borderRadius: "20px",
      border: "1px solid #f0f0f0",
      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
    },
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchDashboardData();

    if (socket) {
      const handleDriverUpdate = (data) => {
        toast.success(`Update: ${data.message}`);
        fetchDashboardData();
      };
      socket.on("driver_assigned", handleDriverUpdate);
      return () => socket.off("driver_assigned", handleDriverUpdate);
    }
  }, [token, navigate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profileRes, tripsRes] = await Promise.all([
        api.get("/customer/profile").catch(() => ({ data: {} })),
        Promise.resolve({ data: [] }), // Replace with API when ready
      ]);
      setProfile(profileRes.data || {});
      setUpcomingTrips(tripsRes.data || []);

      // Mock Data (Delete later)
      if (!tripsRes.data || tripsRes.data.length === 0) {
        setUpcomingTrips([
          {
            id: 101,
            pickup: "Airport Terminal 1",
            drop: "Grand Hotel",
            date: "Today",
            time: "10:30 AM",
            status: "Scheduled",
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={nativeStyles.page}>
      {/* 1. Header (The New Layout) */}
      <DashboardHeader profile={profile} />

      <div className="container px-3">
        {/* 2. Book Ride Banner */}
        <div
          className="card border-0 mb-4 shadow-sm text-white overflow-hidden"
          style={{
            borderRadius: "24px",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          }}
        >
          <div className="card-body p-4 position-relative">
            <Car
              className="position-absolute end-0 bottom-0 text-white opacity-25"
              size={120}
              style={{ transform: "translate(20%, 20%)" }}
            />
            <h4 className="fw-bold mb-1">Where to?</h4>
            <p className="small opacity-75 mb-4">
              Book your safe & luxury ride.
            </p>
            <button
              className="btn btn-light w-100 rounded-pill py-3 fw-bold text-primary shadow-sm d-flex align-items-center justify-content-center gap-2"
              onClick={() => navigate("/book-ride")}
            >
              <Plus size={20} strokeWidth={3} /> Book New Ride
            </button>
          </div>
        </div>

        {/* 3. Quick Actions */}
        <div className="row g-3 mb-4">
          {[
            {
              label: "My Trips",
              icon: MapPin,
              color: "#e0f2fe",
              text: "#0284c7",
              path: "/my-trips",
            },
            {
              label: "Wallet",
              icon: CreditCard,
              color: "#f0fdf4",
              text: "#16a34a",
              path: "/payment-history",
            },
            {
              label: "Support",
              icon: ShieldCheck,
              color: "#fff7ed",
              text: "#ea580c",
              path: "/contact-office",
            },
            {
              label: "Offers",
              icon: Star,
              color: "#f5f3ff",
              text: "#7c3aed",
              path: "/offers",
            },
          ].map((item, index) => (
            <div
              className="col-3"
              key={index}
              onClick={() => navigate(item.path)}
            >
              <div className="d-flex flex-column align-items-center cursor-pointer">
                <div
                  style={{
                    ...nativeStyles.squircleIcon,
                    background: item.color,
                    color: item.text,
                  }}
                >
                  <item.icon size={24} />
                </div>
                <span
                  className="fw-bold text-dark"
                  style={{ fontSize: "0.7rem" }}
                >
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 4. Upcoming Ride Widget */}
        <div className="d-flex justify-content-between align-items-center mb-2 px-1">
          <h6 className="fw-bold m-0 text-dark">Upcoming</h6>
          <span
            className="text-primary small fw-bold cursor-pointer"
            onClick={() => navigate("/my-trips")}
          >
            View All
          </span>
        </div>

        {upcomingTrips.length > 0 ? (
          upcomingTrips.map((trip) => (
            <div
              key={trip.id}
              className="card border-0 mb-3"
              style={nativeStyles.glassCard}
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2 text-muted small fw-bold">
                    <Clock size={14} /> {trip.time}
                  </div>
                  <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3">
                    {trip.status}
                  </span>
                </div>
                <div className="d-flex flex-column gap-3 ps-2 border-start border-2 border-light ms-2">
                  <div className="ps-2">
                    <div
                      className="text-muted small fw-bold"
                      style={{ fontSize: "0.6rem" }}
                    >
                      PICKUP
                    </div>
                    <div className="fw-bold text-dark text-truncate">
                      {trip.pickup}
                    </div>
                  </div>
                  <div className="ps-2">
                    <div
                      className="text-muted small fw-bold"
                      style={{ fontSize: "0.6rem" }}
                    >
                      DROP
                    </div>
                    <div className="fw-bold text-dark text-truncate">
                      {trip.drop}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 rounded-4 bg-white border border-dashed">
            <p className="text-muted small mb-0">No active rides</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
