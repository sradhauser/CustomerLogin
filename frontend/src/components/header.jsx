import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  User,
  Bell,
  History,
  LayoutDashboard,
  Siren,
  X,
  Menu,
  PhoneCall,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  LayoutGrid, 
  Clock,
  Home
} from "lucide-react";
import api, { IMAGE_BASE_URL } from "../api/Api";
import { toast } from "sonner";
import Swal from "sweetalert2";

// === CSS STYLES (Keep as is) ===
const appStyles = `
  @keyframes sos-pulse-ring {
    0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); opacity: 1; }
    70% { transform: scale(1); box-shadow: 0 0 0 60px rgba(220, 53, 69, 0); opacity: 0; }
    100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); opacity: 0; }
  }
  .sos-pulse-always { background-color: #dc3545 !important; animation: radar-pulse 1.5s infinite; }
  @keyframes radar-pulse {
    0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
  }
  .sidebar-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 1040; opacity: 0; visibility: hidden; transition: opacity 0.3s ease; }
  .sidebar-backdrop.show { opacity: 1; visibility: visible; }
  .sidebar-drawer { position: fixed; top: 0; left: 0; width: 280px; height: 100%; background: #ffffff; z-index: 1050; box-shadow: 4px 0 24px rgba(0,0,0,0.15); transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1); display: flex; flex-direction: column; }
  .sidebar-drawer.open { transform: translateX(0); }
  .sidebar-link { display: flex; align-items: center; padding: 14px 20px; color: #495057; text-decoration: none; font-weight: 500; transition: all 0.2s; border-radius: 8px; margin: 4px 10px; }
  .sidebar-link:hover { background: #f8f9fa; color: #0d6efd; }
  .sidebar-link.active { background: #e7f1ff; color: #0d6efd; font-weight: 600; }
  .bottom-nav-container { position: fixed; bottom: 0; left: 0; width: 100%; background: white; z-index: 1030; box-shadow: 0 -4px 20px rgba(0,0,0,0.08); padding-bottom: env(safe-area-inset-bottom); border-top-left-radius: 20px; border-top-right-radius: 20px; }
  .main-content-area { padding-bottom: 90px; min-height: 100vh; background-color: #f8f9fa; }
`;

const HeaderLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const customerId = localStorage.getItem("customerId");

  // --- STATES ---
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sosTimerRef = useRef(null);

  const [profile, setProfile] = useState({
    fullName: "Guest",
    customerId: "",
    cust_img: null,
  });

  useLayoutEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = appStyles;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  useEffect(() => {
    if (!customerId) return;
    const fetchProfileDetails = async () => {
      try {
        const res = await api.get("/customer/profile");
        setProfile(res.data);
      } catch (err) { console.error("Profile sync failed"); }
    };
    fetchProfileDetails();
  }, [customerId, location.pathname]);

  const isActive = (path) => location.pathname === path;

  // REPLACE your handleTriggerSosApi with this robust version
const handleTriggerSosApi = async () => {
  // 1. Validate User
  if (!customerId) {
    toast.error("User ID missing. Please relogin.");
    return;
  }

  // 2. Check for GPS Support
  if (navigator.geolocation) {
    
    // 3. Get Location (Fast Mode)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Show Loading
        const loadingToast = toast.loading("Sending Emergency Alert...");

        try {
          // 4. Send to Backend
          await api.post("/customer/sos/trigger", {
            customerId: customerId, 
            latitude,
            longitude,
          });

          // 5. Success
          toast.dismiss(loadingToast);
          toast.success("SOS SIGNAL SENT TO ADMIN!", {
            style: { background: "#dc3545", color: "#fff" },
            icon: <Siren size={20} color="white" />,
            duration: 5000,
          });

        } catch (err) {
          console.error(err);
          toast.dismiss(loadingToast);
          toast.error("SOS FAILED! NETWORK ERROR.");
        }
      },
      (error) => {
        // Handle GPS Errors
        console.error("GPS Error:", error);
        toast.error("GPS Failed. Check your location settings.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    toast.error("Geolocation not supported");
  }
};
  // --- 2. SOS TIMER LOGIC ---
  useEffect(() => {
    let interval = null;
    if (showSosModal && sosCountdown > 0) {
      interval = setInterval(() => setSosCountdown((prev) => prev - 1), 1000);
      sosTimerRef.current = interval;
    } else if (showSosModal && sosCountdown === 0) {
      // Countdown finished
      console.log("⏰ Countdown Finished. Calling API...");
      clearInterval(interval);
      setShowSosModal(false);
      handleTriggerSosApi(); // Call the function
    }
    return () => clearInterval(interval);
  }, [showSosModal, sosCountdown]);

  const handleLogout = () => {
    setIsSidebarOpen(false);
    Swal.fire({
      title: 'Sign Out?',
      text: "End your current session?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Logout'
    }).then((result) => {
      if (result.isConfirmed) {
         localStorage.removeItem("customerToken");
         localStorage.removeItem("customerId");
         localStorage.removeItem("customerMobile");
        navigate("/login", { replace: true });
      }
    });
  };

  const sidebarItems = [
    { label: "Profile", path: "/profile", icon: User },
    { label: "Booking History", path: "/booking-history", icon: History },
    { label: "Payment History", path: "/payment-history", icon: CreditCard },
    { label: "Change MPIN", path: "/change-mpin", icon: ShieldCheck },
    { label: "Contact Office", path: "/contact-office", icon: PhoneCall },
    { label: "Feedback", path: "/feedback", icon: MessageSquare },
  ];

  const bottomNavItems = [
    { label: "Home", path: "/dashboard", icon: Home },
    { label: "Services", path: "/services", icon: LayoutGrid },
    { label: "Activity", path: "/booking-history", icon: Clock },
    { label: "Account", path: "/profile", icon: User }, 
  ];

  return (
    <div className="d-flex flex-column min-vh-100 bg-white">
      {/* 1. SIDEBAR */}
      <div className={`sidebar-backdrop ${isSidebarOpen ? "show" : ""}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`sidebar-drawer ${isSidebarOpen ? "open" : ""}`}>
        <div className="p-4 mb-2 d-flex flex-column align-items-center text-center text-white"
          style={{ background: "linear-gradient(135deg, #00cebd 0%, #6011c7 100%)", borderRadius: "0 0 24px 0" }}>
          <div className="mb-3 bg-white p-1 rounded-circle shadow-sm" style={{ width: "85px", height: "85px" }}>
            {profile.cust_img ? (
              <img src={`${IMAGE_BASE_URL}${profile.cust_img}`} alt="User" className="rounded-circle w-100 h-100 object-fit-cover" />
            ) : (
              <div className="w-100 h-100 rounded-circle bg-light d-flex align-items-center justify-content-center text-primary fw-bold fs-2">
                {profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "C"}
              </div>
            )}
          </div>
          <h6 className="fw-bold mb-0 text-uppercase">{profile.fullName}</h6>
          <span className="opacity-75 small">{profile.customerId || "ID: --"}</span>
        </div>
        <div className="py-2 flex-grow-1 overflow-auto">
          {sidebarItems.map((item) => (
            <div key={item.path} onClick={() => { setIsSidebarOpen(false); navigate(item.path); }}
              className={`sidebar-link cursor-pointer ${isActive(item.path) ? "active" : ""}`}>
              <item.icon size={20} className="me-3" /> <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="p-3 border-top">
          <button onClick={handleLogout} className="btn btn-light w-100 text-danger fw-bold"><LogOut size={18} className="me-2"/> Logout</button>
        </div>
      </div>

      {/* 2. TOP HEADER */}
      <header className="navbar navbar-light bg-white sticky-top shadow-sm px-3" style={{ height: "64px", zIndex: 900 }}>
        <div className="d-flex align-items-center w-100 justify-content-between">
          <div className="d-flex align-items-center">
            <button className="btn btn-white p-2 me-2" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            <div onClick={() => navigate("/dashboard")} className="d-flex align-items-baseline cursor-pointer">
              <span className="fw-bold text-primary fs-3 lh-1">P</span>
              <span className="fw-bold text-primary small ms-n1 lh-1">ATRA</span>
              <span className="fw-semibold text-dark small ms-1 lh-1">TRAVELS</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-light rounded-circle p-2 position-relative" style={{ width: "40px", height: "40px" }}>
              <Bell size={20} className="text-secondary" />
              <span className="position-absolute bg-danger border border-2 border-white rounded-circle" style={{ width: "10px", height: "10px", top: "10px", right: "10px" }}></span>
            </button>
            
            {/* SOS BUTTON - CLICK STARTS COUNTDOWN */}
            <button 
                className="btn btn-danger rounded-circle p-2 border-0 shadow-sm sos-pulse-always" 
                onClick={() => { 
                    console.log("🔴 SOS Clicked! Starting Countdown...");
                    setShowSosModal(true); 
                    setSosCountdown(3); 
                }} 
                style={{ width: "42px", height: "42px" }}
            >
              <Siren size={20} fill="white" />
            </button>

            <button className="btn btn-light rounded-circle p-2 text-danger" onClick={handleLogout} style={{ width: "40px", height: "40px" }}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT */}
      <main className="main-content-area">
        <Outlet />
      </main>

      {/* 4. BOTTOM NAV */}
      <nav className="bottom-nav-container d-flex justify-content-around align-items-center d-md-none">
        {bottomNavItems.map((item) => (
          <div key={item.path} onClick={() => navigate(item.path)} className="d-flex flex-column align-items-center justify-content-center flex-grow-1 cursor-pointer" style={{ height: "60px" }}>
            <item.icon size={24} className={isActive(item.path) ? "text-primary" : "text-secondary opacity-50"} strokeWidth={isActive(item.path) ? 2.5 : 2} />
            <span className={`mt-1 fw-bold small ${isActive(item.path) ? "text-primary" : "text-secondary opacity-50"}`} style={{ fontSize: "10px" }}>
              {item.label}
            </span>
          </div>
        ))}
      </nav>

      {/* 5. SOS MODAL */}
      {showSosModal && (
        <div className="fixed-top w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-dark" style={{ zIndex: 10000 }}>
          <h1 className="text-white fw-bold display-1 mb-4">{sosCountdown}</h1>
          <button onClick={() => { console.log("SOS Cancelled"); setShowSosModal(false); }} className="btn btn-outline-danger btn-lg rounded-pill px-5 fw-bold"><X size={24} className="me-2"/> CANCEL ALERT</button>
        </div>
      )}
    </div>
  );
};

export default HeaderLayout;