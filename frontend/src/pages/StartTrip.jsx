import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/Api";
import { toast } from "sonner";
import {
  Camera,
  MapPin,
  KeyRound,
  Gauge,
  User,
  Send,
  Navigation,
} from "lucide-react";

// --- IMAGE COMPRESSION UTILITY ---
const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        const newWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        const newHeight =
          img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        ctx.canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            resolve(
              new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          0.5
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const StartTrip = () => {
  const { enq_id } = useParams();
  const navigate = useNavigate();
  const driverRegNo = localStorage.getItem("driverRegNo");

  // State
  const [odoImage, setOdoImage] = useState(null);
  const [odoPreview, setOdoPreview] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  const [odoValue, setOdoValue] = useState("");
  // OTP State: Array of 4 strings for the 4 boxes
  const [otp, setOtp] = useState(["", "", "", ""]);

  const [starting, setStarting] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("Fetching location...");

  // Refs
  const odoInputRef = useRef(null);
  const selfieInputRef = useRef(null);
  const otpRefs = useRef([]);

  // --- LOCATION HELPER ---
  const fetchLocationName = async (latitude, longitude) => {
    if (!latitude || !longitude) return "Unknown Location";
    try {
      const res = await api.post("/location/geocode", { latitude, longitude });
      if (res.data.success) return res.data.address;
      return "Unknown Location";
    } catch (err) {
      console.error("Location API Error:", err);
      return "Unknown Location";
    }
  };

  // --- HANDLERS ---
  const handleOdoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const toastId = toast.loading("Processing...");
      try {
        const compressed = await compressImage(file);
        setOdoImage(compressed);
        setOdoPreview(URL.createObjectURL(compressed));
        toast.success("Done", { id: toastId });
      } catch (err) {
        toast.error("Error", { id: toastId });
      }
    }
  };

  const handleSelfieSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const toastId = toast.loading("Processing...");
      try {
        const compressed = await compressImage(file);
        setSelfieImage(compressed);
        setSelfiePreview(URL.createObjectURL(compressed));
        toast.success("Done", { id: toastId });
      } catch (err) {
        toast.error("Error", { id: toastId });
      }
    }
  };

  // --- OTP INPUT LOGIC ---
  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== "" && index < 3) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    // Handle Backspace to move previous
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  // --- START TRIP LOGIC ---
  const handleStartTrip = async () => {
    const finalOtp = otp.join("");

    // Validations
    if (finalOtp.length !== 4)
      return toast.error("Please enter full 4-digit OTP");
    if (!odoValue) return toast.error("Enter Odometer Reading");
    if (odoValue.length > 6)
      return toast.error("Odometer cannot exceed 6 digits");
    if (!odoImage) return toast.error("Odometer Photo is required");

    setStarting(true); // Disable button immediately
    const toastId = toast.loading("Acquiring GPS & Address...");

    if (!navigator.geolocation) {
      setStarting(false);
      return toast.error("GPS not supported", { id: toastId });
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // 1. Get Address String
          const address = await fetchLocationName(latitude, longitude);
          setCurrentAddress(address);

          // 2. Prepare Data
          const formData = new FormData();
          formData.append("enq_id", enq_id);
          formData.append("driver_regno", driverRegNo);
          formData.append("entered_otp", finalOtp);
          formData.append("odometer_value", odoValue);
          formData.append("odometer_image", odoImage);
          formData.append("latitude", latitude);
          formData.append("longitude", longitude);
          formData.append("location_name", address); // Maps to tsgps_locname in backend

          if (selfieImage) {
            formData.append("driver_selfie", selfieImage);
          }

          // 3. Send API
          toast.loading("Starting Trip...", { id: toastId });
          await api.post("/driver/start-trip", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          toast.success("Trip Started Successfully!", { id: toastId });
          navigate("/dashboard");
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || "Failed to start trip", {
            id: toastId,
          });
          setStarting(false); // Re-enable only on error
        }
      },
      (err) => {
        toast.error("GPS Denied. Enable location.", { id: toastId });
        setStarting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="container-fluid min-vh-100 bg-light py-4 pb-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          {/* HEADER */}
          <div className="mb-4 text-center">
            <h4 className="fw-bold text-dark mb-1">Start Your Trip</h4>
            <p className="text-muted small">
              Verify details to begin the journey
            </p>
          </div>

          {/* === 1. ODOMETER SECTION === */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body p-4">
              <h6
                className="fw-bold text-secondary text-uppercase mb-3"
                style={{ fontSize: "0.75rem", letterSpacing: "1px" }}
              >
                Vehicle Status <span className="text-danger">*</span>
              </h6>

              {/* Photo Upload */}
              <div
                className="position-relative bg-light border border-2 border-dashed rounded-4 d-flex align-items-center justify-content-center cursor-pointer mb-3 overflow-hidden"
                style={{ height: "150px", borderColor: "#cbd5e1" }}
                onClick={() => odoInputRef.current.click()}
              >
                {odoPreview ? (
                  <img
                    src={odoPreview}
                    alt="Odo"
                    className="w-100 h-100 object-fit-cover"
                  />
                ) : (
                  <div className="text-center text-secondary">
                    <div className="bg-white p-3 rounded-circle shadow-sm d-inline-block mb-2">
                      <Camera size={24} className="text-primary" />
                    </div>
                    <p className="mb-0 small fw-bold">Capture Odometer</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  ref={odoInputRef}
                  onChange={handleOdoSelect}
                />
              </div>

              {/* Odometer Value Input (Max 6 Digits) */}
              <div className="input-group input-group-lg border rounded-3 overflow-hidden bg-white shadow-none">
                <span className="input-group-text bg-white border-0 ps-3">
                  <Gauge size={20} className="text-muted" />
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="form-control border-0 fw-bold text-dark ps-2"
                  placeholder="Odometer (Max 6 digits)"
                  value={odoValue}
                  onChange={(e) => {
                    if (e.target.value.length <= 6) setOdoValue(e.target.value);
                  }}
                  style={{ fontSize: "1rem", letterSpacing: "1px" }}
                />
              </div>
            </div>
          </div>

          {/* === 2. OTP SECTION (4 BOXES) === */}
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body p-4 text-center">
              <h6
                className="fw-bold text-secondary text-uppercase mb-3 text-start"
                style={{ fontSize: "0.75rem", letterSpacing: "1px" }}
              >
                Customer Verification <span className="text-danger">*</span>
              </h6>

              <div className="d-flex justify-content-between px-2 gap-2">
                {otp.map((data, index) => {
                  return (
                    <input
                      className="form-control text-center fw-bold fs-3 border rounded-3"
                      type="text"
                      name="otp"
                      maxLength="1"
                      key={index}
                      value={data}
                      inputMode="numeric"
                      ref={(el) => (otpRefs.current[index] = el)}
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onFocus={(e) => e.target.select()}
                      style={{
                        width: "60px",
                        height: "60px",
                        background: "#f8fafc",
                        borderColor: data ? "#0ea5e9" : "#e2e8f0",
                        color: "#0f172a",
                      }}
                    />
                  );
                })}
              </div>
              <div className="form-text mt-3 text-muted small text-start">
                <KeyRound size={14} className="me-1 mb-1" />
                Ask guest for the 4-digit OTP.
              </div>
            </div>
          </div>

          {/* === 3. SELFIE SECTION (OPTIONAL) === */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6
                className="fw-bold text-secondary text-uppercase mb-3"
                style={{ fontSize: "0.75rem", letterSpacing: "1px" }}
              >
                Driver Selfie{" "}
                <span className="badge bg-light text-muted border ms-2">
                  Optional
                </span>
              </h6>

              <div
                className="d-flex align-items-center p-2 rounded-3 cursor-pointer hover-bg-light transition-all"
                style={{ border: "1px solid #e2e8f0" }}
                onClick={() => selfieInputRef.current.click()}
              >
                <div
                  className="flex-shrink-0 bg-light rounded-3 overflow-hidden d-flex align-items-center justify-content-center me-3"
                  style={{ width: "60px", height: "60px" }}
                >
                  {selfiePreview ? (
                    <img
                      src={selfiePreview}
                      alt="Selfie"
                      className="w-100 h-100 object-fit-cover"
                    />
                  ) : (
                    <User size={24} className="text-secondary opacity-50" />
                  )}
                </div>
                <div className="flex-grow-1">
                  <h6
                    className="mb-0 fw-bold text-dark"
                    style={{ fontSize: "0.9rem" }}
                  >
                    {selfiePreview ? "Photo Added" : "Upload Selfie"}
                  </h6>
                  <p className="mb-0 text-muted small">
                    Tap to capture with guest
                  </p>
                </div>
                <div className="text-primary fw-bold small">
                  {selfiePreview ? "Change" : "Add"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  hidden
                  ref={selfieInputRef}
                  onChange={handleSelfieSelect}
                />
              </div>
            </div>
          </div>

          {/* === 4. ACTION BUTTON === */}
          <div className="d-grid">
            <button
              className="btn btn-lg rounded-pill py-3 fw-bold text-white shadow-lg d-flex align-items-center justify-content-center"
              onClick={handleStartTrip}
              disabled={starting}
              style={{
                background: starting
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                transition: "all 0.3s ease",
              }}
            >
              {starting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  STARTING...
                </>
              ) : (
                <>
                  <Navigation size={20} className="me-2" />
                  SWIPE TO START TRIP
                </>
              )}
            </button>
          </div>

          {/* Footer Location Info (Optional Visual) */}
          <div className="text-center mt-3">
            <small className="text-muted" style={{ fontSize: "0.7rem" }}>
              <MapPin size={10} className="me-1" />
              Location will be recorded automatically
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartTrip;