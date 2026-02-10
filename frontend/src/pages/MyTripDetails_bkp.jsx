import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/Api";
import { toast } from "sonner";
import { 
  ChevronLeft, ShieldCheck, MapPin, Clock, Hash, 
  XCircle, Navigation, Activity, Timer, Camera 
} from "lucide-react";
import Loader from "../components/Loader";

const MyTripDetails = () => {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [otp, setOtp] = useState("");
  const [starting, setStarting] = useState(false);
  
  // States for Image Upload
  const [odoImage, setOdoImage] = useState(null);
  const [odoPreview, setOdoPreview] = useState(null);

  const navigate = useNavigate();
  const driverRegNo = localStorage.getItem("driverRegNo");

  const fetchTrip = async () => {
    try {
      const res = await api.get(`/driver/assigned-trip?driver_regno=${driverRegNo}`);
      const tripData = Array.isArray(res.data) ? res.data[0] : res.data;
      setTrip(tripData || null);
    } catch (err) {
      toast.error("Network Synchronisation Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, []);

  // Handle Image Selection
  const handleOdoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOdoImage(file);
      setOdoPreview(URL.createObjectURL(file));
    }
  };

  const handleAcceptTrip = async () => {
    setAccepting(true);
    try {
      await api.post("/driver/accept-trip", {
        drv_tripid: trip.drv_tripid,
        driver_regno: driverRegNo,
        action: "accept",
      });
      toast.success("Duty Confirmed");
      fetchTrip(); 
    } catch (err) {
      toast.error("Confirmation Error");
    } finally {
      setAccepting(false);
    }
  };

  const handleStartTrip = async () => {
    if (otp.length < 4) return toast.error("Enter valid 4-digit OTP");
    if (!odoImage) return toast.error("Start Odometer Image Required");

    setStarting(true);
    const loadId = toast.loading("Verifying Location & Data...");

    // 1. Capture Location
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // 2. Prepare Multipart FormData
          const formData = new FormData();
          formData.append("odometer_image", odoImage); 
          formData.append("drv_tripid", trip.drv_tripid);
          formData.append("driver_regno", driverRegNo);
          formData.append("entered_otp", otp);
          formData.append("latitude", pos.coords.latitude);
          formData.append("longitude", pos.coords.longitude);

          const res = await api.post("/driver/start-trip", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });

          toast.dismiss(loadId);
          toast.success("Safe Journey Commenced");
          
          if (res.data.success && res.data.data) {
            setTrip(res.data.data); // Sync state with updated backend object
          }
        } catch (err) {
          toast.dismiss(loadId);
          toast.error(err.response?.data?.message || "Verification failed");
        } finally {
          setStarting(false);
        }
      },
      () => {
        toast.dismiss(loadId);
        toast.error("GPS Access Denied. Cannot start trip.");
        setStarting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <Loader message="SECURE DATA SYNC..." />;

  if (!trip) {
    return (
      <div className="empty-state-lux">
        <XCircle size={60} strokeWidth={1} color="#333" />
        <h2>No Active Duty</h2>
        <p>Standby for incoming assignments.</p>
        <button className="btn-return" onClick={() => navigate("/dashboard")}>DASHBOARD</button>
      </div>
    );
  }

  return (
    <div className="lux-master">
      
      <main className="lux-body">
        <div className="lux-status-card">
            <div className="lux-label">TRIP STATUS</div>
            <div className="lux-value">
                {trip.otp_verified === 1 ? "MISSION IN PROGRESS" : 
                 trip.accept_status === 1 ? "AWAITING DEPARTURE" : "PENDING REVIEW"}
            </div>
            <div className="lux-progress-bar">
                <div className="progress-fill" style={{ width: trip.otp_verified === 1 ? '100%' : trip.accept_status === 1 ? '60%' : '20%' }}></div>
            </div>
        </div>

        <section className="lux-grid">
            <div className="grid-card">
                <Hash size={16} color="#0062cc" />
                <label>BOOKING ID</label>
                <p>{trip.cust_bookingid}</p>
            </div>
            <div className="grid-card">
                <Timer size={16} color="#64748b" />
                <label>SCHEDULED</label>
                <p>{trip.tstart_datetime ? new Date(trip.tstart_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "ASAP"}</p>
            </div>
        </section>

        <div className="lux-location-card">
            <div className="loc-icon-group">
                <div className="icon-circle"><MapPin size={20} color="#0062cc" /></div>
                <div className="loc-line"></div>
                <div className="icon-circle secondary"><Navigation size={20} color="#10b981" /></div>
            </div>
            <div className="loc-text-group">
                <div className="loc-block">
                    <label>ORIGIN</label>
                    <p>{trip.tsgps_locname || "Detecting pickup point..."}</p>
                </div>
                <div className="loc-block">
                    <label>DESTINATION</label>
                    <p>Verified in Navigation</p>
                </div>
            </div>
        </div>

        <div className="lux-interaction">
            {trip.accept_status === 0 && (
              <div className="dual-action">
                <button className="btn-lux-primary" onClick={handleAcceptTrip} disabled={accepting}>
                  {accepting ? "SYNCING..." : "CONFIRM DUTY"}
                </button>
                <button className="btn-lux-outline" onClick={() => navigate("/dashboard")}>DECLINE</button>
              </div>
            )}

            {trip.accept_status === 1 && trip.otp_verified !== 1 && (
              <div className="lux-otp-section">
                <div className="otp-header">
                    <span>CAPTURE ODOMETER</span>
                </div>

                {/* Odometer Image Box */}
                <div className="odo-capture-box" onClick={() => document.getElementById('odoCam').click()}>
                  {odoPreview ? (
                    <img src={odoPreview} alt="Odometer" className="odo-preview-img" />
                  ) : (
                    <div className="odo-placeholder">
                      <Camera size={36} color="#0062cc" />
                      <p>TAP TO CAPTURE START ODOMETER</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    id="odoCam" 
                    accept="image/*" 
                    capture="environment" 
                    hidden 
                    onChange={handleOdoCapture} 
                  />
                </div>

                <input
                  type="password"
                  placeholder="OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="lux-otp-input"
                />
                <button className="btn-lux-primary" onClick={handleStartTrip} disabled={starting}>
                  {starting ? "VERIFYING..." : "START MISSION"}
                </button>
              </div>
            )}

            {trip.otp_verified === 1 && (
              <div className="lux-live-duty">
                <div className="live-tag">
                    <Activity size={16} className="pulse-icon" /> LIVE TRACKING ACTIVE
                </div>
                <button className="btn-lux-danger" onClick={() => navigate(`/complete-trip/${trip.drv_tripid}`)}>
                  COMPLETE MISSION
                </button>
              </div>
            )}
        </div>
      </main>

      <style>{`
        /* --- THEME VARIABLES (Light Mode) --- */
        :root {
          --primary: #0062cc;       /* Patra Blue */
          --bg-body: #f8f9fa;       /* Very Light Grey Body */
          --bg-surface: #ffffff;    /* White Cards */
          --border: #e2e8f0;        /* Light Border */
          --text-main: #1a1a1a;     /* Dark Text */
          --text-muted: #64748b;    /* Slate Grey */
          --success: #10b981;       /* Green */
          --danger: #ef4444;        /* Red */
        }

        .lux-master { min-height: 100vh; background: var(--bg-body); color: var(--text-main); font-family: 'Inter', sans-serif; padding-bottom: 40px; }
        
        .lux-header { height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
        .back-blur { width: 40px; height: 40px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; cursor: pointer; color: #64748b; }
        
        .lux-body { padding: 20px; max-width: 450px; margin: 0 auto; }
        
        /* Status Card */
        .lux-status-card { background: var(--bg-surface); border-radius: 24px; padding: 24px; border: 1px solid var(--border); margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
        .lux-label { font-size: 10px; color: var(--primary); font-weight: 800; letter-spacing: 1px; margin-bottom: 8px; }
        .lux-value { font-size: 18px; font-weight: 800; color: var(--text-main); margin-bottom: 16px; }
        .lux-progress-bar { height: 6px; background: #f1f5f9; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--primary); transition: width 0.5s ease; border-radius: 10px; }

        /* Grid Info */
        .lux-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .grid-card { background: var(--bg-surface); border-radius: 20px; padding: 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .grid-card label { display: block; font-size: 9px; color: #64748b; font-weight: 700; margin-top: 8px; letter-spacing: 0.5px; }
        .grid-card p { font-size: 14px; font-weight: 700; color: var(--text-main); margin: 4px 0 0; }

        /* Location Card */
        .lux-location-card { background: var(--bg-surface); border-radius: 24px; padding: 20px; border: 1px solid var(--border); display: flex; gap: 16px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
        .icon-circle { width: 36px; height: 36px; border-radius: 50%; background: #f0f7ff; display: flex; align-items: center; justify-content: center; }
        .icon-circle.secondary { background: #ecfdf5; }
        .loc-line { width: 2px; height: 40px; background: #e2e8f0; margin: 4px auto; }
        
        .loc-block label { font-size: 9px; color: #94a3b8; font-weight: 800; letter-spacing: 0.5px; }
        .loc-block p { font-size: 13px; color: var(--text-main); margin: 2px 0 20px; font-weight: 600; line-height: 1.4; }
        .loc-block:last-child p { margin-bottom: 0; }

        /* Odometer Capture */
        .odo-capture-box { width: 100%; height: 180px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 24px; margin-bottom: 24px; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .odo-capture-box:active { background: #f1f5f9; border-color: var(--primary); }
        .odo-preview-img { width: 100%; height: 100%; object-fit: cover; }
        .odo-placeholder { text-align: center; color: #64748b; }
        .odo-placeholder p { font-size: 10px; font-weight: 700; margin-top: 12px; letter-spacing: 1px; color: var(--primary); }

        /* Inputs & Buttons */
        .lux-otp-input { 
            background: #ffffff; 
            border: 2px solid #e2e8f0; 
            border-radius: 16px; 
            padding: 16px; 
            width: 100%; 
            font-size: 28px; 
            color: var(--text-main); 
            text-align: center; 
            font-weight: 800; 
            letter-spacing: 12px; 
            margin-bottom: 20px; 
            outline: none; 
            transition: 0.2s;
            box-sizing: border-box;
        }
        .lux-otp-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 98, 204, 0.1); }

        .btn-lux-primary { width: 100%; background: var(--primary); color: #fff; padding: 18px; border-radius: 18px; border: none; font-weight: 800; cursor: pointer; box-shadow: 0 8px 20px rgba(0, 98, 204, 0.25); font-size: 14px; transition: 0.2s; }
        .btn-lux-primary:active { transform: scale(0.98); }
        
        .dual-action { display: flex; flex-direction: column; gap: 12px; }
        .btn-lux-outline { width: 100%; background: #ffffff; color: #64748b; padding: 16px; border-radius: 18px; border: 1px solid #e2e8f0; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-lux-outline:active { background: #f1f5f9; }
        
        /* Live Status */
        .lux-live-duty { margin-top: 20px; }
        .live-tag { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--primary); font-size: 11px; font-weight: 800; margin-bottom: 20px; letter-spacing: 1px; background: #f0f9ff; padding: 8px; border-radius: 12px; }
        .pulse-icon { animation: pulse 1.5s infinite; color: var(--primary); }
        .btn-lux-danger { width: 100%; background: var(--danger); color: #fff; padding: 18px; border-radius: 18px; border: none; font-weight: 800; cursor: pointer; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.25); }
        
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default MyTripDetails;