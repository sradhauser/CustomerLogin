import React, { useState, useEffect } from "react";
import {
  Camera,
  Mail,
  Loader2,
  Smartphone,
  Save,
  ChevronRight,
  X,
  User, // Added missing import
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import Loader from "../components/Loader2.jsx";
import imageCompression from "browser-image-compression";
import api, { IMAGE_BASE_URL } from "../api/Api.js";

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState(null); // 'phone', 'email'
  const [showImageModal, setShowImageModal] = useState(false);

  // OTP States
  const [tempValue, setTempValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    customerId: "",
    email: "",
    phone: "",
    photo: null,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/customer/profile");
      const p = res.data;
      setFormData({
        fullName: p.fullName || "",
        customerId: p.customerId || "",
        email: p.email || "",
        phone: p.phone || "",
        photo: null,
      });
      if (p.cust_img) {
        setPreview(
          `${IMAGE_BASE_URL}${
            p.cust_img.startsWith("/") ? p.cust_img : `/${p.cust_img}`
          }`
        );
      }
    } catch (err) {
      toast.error("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const options = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };
    try {
      const compressedFile = await imageCompression(file, options);
      setFormData((prev) => ({ ...prev, photo: compressedFile }));
      setPreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      toast.error("Image error");
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    const data = new FormData();
    if (formData.photo) data.append("photo", formData.photo);

    try {
      const res = await api.put("/customer/update-complete-profile", data);
      Swal.fire({
        icon: "success",
        title: "Saved",
        text: res.data?.message,
        timer: 1500,
        showConfirmButton: false,
      });
      setUpdating(false);
    } catch (e) {
      setUpdating(false);
      toast.error("Update failed");
    }
  };

  // --- OTP Logic ---
  const handleOpenEditModal = (type, value) => {
    setModalType(type);
    setTempValue(value || "");
    setOtpSent(false);
    setOtpValue("");
  };

  const handleRequestOtp = async () => {
    if (!tempValue) return toast.error(`Enter valid ${modalType}`);
    setOtpLoading(true);
    try {
      const endpoint =
        modalType === "phone"
          ? "/customer/request-phone-change"
          : "/customer/request-email-change";
      const payload =
        modalType === "phone"
          ? { newMobileNumber: tempValue }
          : { newEmail: tempValue };
      const res = await api.post(endpoint, payload);
      if (res.data.dev_otp) toast.success(`OTP: ${res.data.dev_otp}`);
      setOtpSent(true);
    } catch (err) {
      toast.error("Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 4) return toast.error("Enter 4-digit OTP");
    setOtpLoading(true);
    try {
      const endpoint =
        modalType === "phone"
          ? "/customer/verify-phone-change"
          : "/customer/verify-email-change";
      const payload =
        modalType === "phone"
          ? { newMobileNumber: tempValue, otp: otpValue }
          : { newEmail: tempValue, otp: otpValue };
      await api.post(endpoint, payload);
      setFormData((prev) => ({
        ...prev,
        [modalType === "phone" ? "phone" : "email"]: tempValue,
      }));
      toast.success("Updated Successfully!");
      setModalType(null);
    } catch (err) {
      toast.error("Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="container-fluid p-0 bg-light min-vh-100 position-relative">
      
      {/* --- 1. HEADER BANNER --- */}
      <div
        className="text-white text-center position-relative shadow-sm"
        style={{
          borderBottomLeftRadius: "35px",
          borderBottomRightRadius: "35px",
          background: "linear-gradient(135deg, #0d6efd 0%, #0043a8 100%)",
          paddingTop: "30px",
          paddingBottom: "90px", // Increased padding for overlap
          zIndex: 1
        }}
      >
        <h5 className="fw-bold mb-1 letter-spacing-1">My Profile</h5>
        <p className="small opacity-75 mb-0">Manage your account details</p>
      </div>

      {/* --- 2. CENTERED PROFILE CARD --- */}
      <div className="container px-3 position-relative" style={{ marginTop: "-70px", zIndex: 2 }}>
        <div className="card border-0 shadow-lg rounded-4 text-center p-4 bg-white">
          
          {/* Photo Wrapper: Centered & Relative for Icon */}
          <div className="d-flex justify-content-center mb-3">
            <div className="position-relative">
              
              {/* Profile Image */}
              <div
                className="rounded-circle border border-4 border-white shadow-sm overflow-hidden cursor-pointer bg-light d-flex align-items-center justify-content-center"
                style={{ width: "120px", height: "120px" }}
                onClick={() => preview && setShowImageModal(true)}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile"
                    className="w-100 h-100 object-fit-cover"
                  />
                ) : (
                  <span className="text-primary fw-bold display-4">
                    {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "U"}
                  </span>
                )}
              </div>

              {/* Camera Icon Button */}
              <label
                className="btn btn-primary rounded-circle position-absolute border border-3 border-white shadow-sm d-flex align-items-center justify-content-center"
                style={{
                  width: "40px",
                  height: "40px",
                  bottom: "0px",
                  right: "0px", // Aligns to the bottom right of the wrapper
                  cursor: "pointer",
                  transition: "transform 0.2s"
                }}
              >
                <Camera size={18} className="text-white" />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>
          </div>

          {/* User Info */}
          <h4 className="fw-bold text-dark mb-1">{formData.fullName}</h4>
          <div className="d-inline-block">
            <span className="badge bg-light text-secondary border px-3 py-2 rounded-pill fw-medium">
              <span className="text-dark fw-bold">{formData.customerId}</span>
            </span>
          </div>
        </div>
      </div>

      {/* --- 3. DETAILS LIST --- */}
      <div className="container px-3 mt-4 mb-5">
        <h6 className="text-muted fw-bold small text-uppercase mb-3 ps-2">Contact Information</h6>

        <div className="card border-0 rounded-4 shadow-sm overflow-hidden">
          
          {/* Mobile Row */}
          <div
            className="d-flex align-items-center p-3 border-bottom bg-white cursor-pointer active-scale"
            onClick={() => handleOpenEditModal("phone", formData.phone)}
          >
            <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3 text-primary d-flex align-items-center justify-content-center" style={{width: 45, height: 45}}>
              <Smartphone size={22} />
            </div>
            <div className="flex-grow-1">
              <label className="d-block text-secondary x-small fw-bold mb-0 text-uppercase" style={{fontSize: '0.7rem'}}>Mobile Number</label>
              <div className="fw-bold text-dark">{formData.phone}</div>
            </div>
            <div className="text-muted opacity-50">
              <ChevronRight size={20} />
            </div>
          </div>

          {/* Email Row */}
          <div
            className="d-flex align-items-center p-3 bg-white cursor-pointer active-scale"
            onClick={() => handleOpenEditModal("email", formData.email)}
          >
            <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3 text-success d-flex align-items-center justify-content-center" style={{width: 45, height: 45}}>
              <Mail size={22} />
            </div>
            <div className="flex-grow-1">
              <label className="d-block text-secondary x-small fw-bold mb-0 text-uppercase" style={{fontSize: '0.7rem'}}>Email Address</label>
              <div className="fw-bold text-dark text-truncate" style={{ maxWidth: "220px" }}>
                {formData.email || "Add Email"}
              </div>
            </div>
            <div className="text-muted opacity-50">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>

        {/* Save Button (Conditional) */}
        {formData.photo && !updating && (
          <div className="mt-4 animate__animated animate__fadeInUp">
            <button
              className="btn btn-primary w-100 py-3 rounded-4 fw-bold shadow-lg d-flex align-items-center justify-content-center gap-2"
              onClick={handleSaveProfile}
              style={{ background: "linear-gradient(135deg, #0d6efd 0%, #0043a8 100%)" }}
            >
              <Save size={20} /> SAVE CHANGES
            </button>
          </div>
        )}
      </div>

      {/* --- 4. IMAGE VIEW MODAL (Centered Overlay) --- */}
      {showImageModal && preview && (
        <div
          className="fixed-top w-100 h-100 d-flex align-items-center justify-content-center p-4"
          style={{ 
            background: "rgba(0,0,0,0.85)", 
            backdropFilter: "blur(5px)", 
            zIndex: 1060 
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div className="position-relative w-100" style={{ maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-dark rounded-circle position-absolute top-0 end-0 m-3 shadow"
              onClick={() => setShowImageModal(false)}
              style={{ zIndex: 1070 }}
            >
              <X size={20} />
            </button>
            <img
              src={preview}
              alt="Profile Full"
              className="w-100 rounded-4 shadow-lg"
              style={{ maxHeight: "80vh", objectFit: "contain", background: '#000' }}
            />
          </div>
        </div>
      )}

      {/* --- 5. EDIT FORM MODAL (Centered Overlay) --- */}
      {modalType && (
        <div
          className="fixed-top w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ 
            background: "rgba(0,0,0,0.5)", 
            backdropFilter: "blur(5px)", 
            zIndex: 1050 
          }}
        >
          <div 
            className="bg-white rounded-4 shadow-lg w-100 position-relative overflow-hidden" 
            style={{ maxWidth: "380px" }}
          >
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                <h6 className="fw-bold m-0 text-dark">
                    {otpSent ? "Verify OTP" : `Update ${modalType === "phone" ? "Phone" : "Email"}`}
                </h6>
                <button 
                    className="btn btn-sm btn-light rounded-circle border" 
                    onClick={() => setModalType(null)}
                >
                    <X size={18} />
                </button>
            </div>

            <div className="p-4">
            {!otpSent ? (
              /* --- Step 1: Input --- */
              <div className="animate__animated animate__fadeIn">
                <label className="small fw-bold text-muted mb-2 text-uppercase">New {modalType}</label>
                <div className="input-group mb-4 shadow-sm rounded-3 overflow-hidden">
                  <span className="input-group-text bg-white border-end-0 ps-3">
                    <User size={18} className="text-muted" />
                  </span>
                  <input
                    type={modalType === "phone" ? "tel" : "email"}
                    className="form-control border-start-0 py-2 fw-bold text-dark"
                    placeholder={`Enter new ${modalType}`}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  className="btn btn-primary w-100 py-2 rounded-3 fw-bold shadow-sm"
                  onClick={handleRequestOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? <Loader2 className="animate-spin mx-auto"/> : "Send OTP Code"}
                </button>
              </div>
            ) : (
              /* --- Step 2: OTP --- */
              <div className="text-center animate__animated animate__fadeIn">
                <div className="mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-circle mb-2" style={{width: 50, height: 50}}>
                        <CheckCircle2 size={24} />
                    </div>
                  <p className="text-muted small mb-1">Code sent to</p>
                  <span className="fw-bold text-dark px-2 py-1 rounded bg-light border">
                    {tempValue}
                  </span>
                </div>

                <input
                  type="tel"
                  className="form-control text-center fw-bold fs-3 border-primary rounded-3 mb-4 py-2"
                  maxLength={4}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  autoFocus
                  style={{ letterSpacing: "8px" }}
                />

                <button
                  className="btn btn-primary w-100 py-2 rounded-3 fw-bold shadow-sm mb-3"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? <Loader2 className="animate-spin mx-auto"/> : "Verify & Save"}
                </button>

                <button
                  className="btn btn-link text-muted small text-decoration-none"
                  onClick={() => setOtpSent(false)}
                >
                  Change {modalType === 'phone' ? 'Number' : 'Email'}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;