import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import OtpInput from "react-otp-input";

// Material UI Imports
import { 
  TextField, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  CircularProgress, 
  Divider,
  Typography,
  Box
} from "@mui/material";

// Assets
import b1 from "../assets/b1.png"; // Top Wave
import b3 from "../assets/b3.png"; // Bottom Wave
import patraLogo from "../assets/logo.png";
import api from "../api/Api.js";

const STAGE = { INITIAL: "initial", OTP: "otp", MPIN_LOGIN: "mpin_login" };
const REMEMBER_ME_KEY = "patra_cust_auth_remember"; // Updated key name
const MPIN_LOCK_KEY = "patra_cust_mpin_locked";     // Updated key name

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isLockoutActive = searchParams.get("lockout") === "true";

  const [isOtpOnly, setIsOtpOnly] = useState(false);
  const [stage, setStage] = useState(STAGE.INITIAL);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- RENAMED STATE VARIABLES (driverId -> customerId) ---
  const [customerId, setCustomerId] = useState(""); 
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [mpinInput, setMpinInput] = useState("");
  const [visibleOtp, setVisibleOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [isMpinLocked, setIsMpinLocked] = useState(false);

  // --- LOGIC: Cleanup Toasts ---
  useEffect(() => {
    return () => toast.dismiss();
  }, []);

  // --- LOGIC: Timer ---
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // --- LOGIC: Remember Me ---
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    if (saved) {
      try {
        const { savedCustId, savedMobile } = JSON.parse(saved);
        setCustomerId(savedCustId || "");
        setMobileNumber(savedMobile || "");
        setRememberMe(true);
      } catch {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    }
    const locked = localStorage.getItem(MPIN_LOCK_KEY) === "true";
    setIsMpinLocked(locked);
    if (isLockoutActive || locked) {
      setStage(STAGE.INITIAL);
    }
  }, [isLockoutActive]);

  // --- LOGIC: Success Handler ---
  const handleSuccess = (token, isFirstTime, mobile, cId, wasMpinLocked = false) => {
    toast.dismiss();
    
    // 1. Handle Remember Me
    if (rememberMe) {
      localStorage.setItem(
        REMEMBER_ME_KEY,
        JSON.stringify({ savedCustId: cId, savedMobile: mobile })
      );
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    // 2. SAVE TOKENS (Crucial for Redirect)
    // We save as 'customerToken' specificially, but ALSO as 'token' 
    // because many Router/App.js files look for the generic 'token' key.
    localStorage.setItem("token", token); 
    localStorage.setItem("customerToken", token);
    localStorage.setItem("customerMobile", mobile);
    localStorage.setItem("customerId", cId);
    
    // Remove old driver tokens to prevent conflicts
    localStorage.removeItem("driverToken"); 

    // 3. Navigation Logic
    if (isFirstTime) {
      toast.success("Please set your MPIN to login");
      setTimeout(() => navigate("/setup-mpin", { replace: true }), 1000);
    } else if (wasMpinLocked) {
      toast.error("Your MPIN is locked. Please reset it.");
      localStorage.removeItem(MPIN_LOCK_KEY);
      setIsMpinLocked(false);
      setTimeout(() => navigate("/reset-mpin", { replace: true }), 1500);
    } else {
      toast.success("Login successful!");
      // Using replace: true prevents back button from returning to login
      setTimeout(() => navigate("/dashboard", { replace: true }), 1000);
    }
  };

  // --- LOGIC: Request OTP ---
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!customerId || !mobileNumber) return toast.error("Please fill all fields");

    setLoading(true);
    const toastId = toast.loading("Sending OTP...");

    try {
      // Updated payload key to customerId
      const res = await api.post("/customer/login", { customerId, mobileNumber });
      
      toast.success(res.data.message || "OTP sent", { id: toastId });
      if (res.data.dev_otp) setVisibleOtp(res.data.dev_otp);
      
      setStage(STAGE.OTP);
      setOtp("");
      setResendTimer(30);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request OTP", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: Verify OTP ---
  const handleVerifyOtp = async () => {
    if (otp.length !== 4) return toast.error("Enter valid 4-digit OTP");
    setLoading(true);
    const toastId = toast.loading("Verifying...");

    try {
      const res = await api.post("/customer/verify-otp", {
        mobileNumber,
        otp,
        customerId, // Updated key
      });
      
      toast.dismiss(toastId);
      const locked = localStorage.getItem(MPIN_LOCK_KEY) === "true";
      handleSuccess(res.data.token, res.data.isFirstTime, mobileNumber, customerId, locked);
    } catch {
      toast.dismiss(toastId);
      toast.error("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: MPIN Login ---
  // inside AuthPage.js

  const handleMpinLogin = async (e) => {
    e.preventDefault(); // Prevents default form refresh
    if (mpinInput.length !== 4) return toast.error("Enter 4-digit MPIN");
    
    setLoading(true);
    const toastId = toast.loading("Logging in...");

    try {
      const response = await api.post("/customer/mpin-login", {
        customerId, 
        mpin: mpinInput,
        mobileNumber
      });
      
      toast.dismiss(toastId);
      handleSuccess(response.data.token, false, mobileNumber, customerId);

    } catch (err) {
      toast.dismiss(toastId);
      setMpinInput(""); // Clear input on error
      
      const data = err.response?.data;
      const errorMessage = data?.message || "MPIN login failed";

      // 1. Show the Alert (e.g., "Invalid MPIN. 3 attempts remaining")
      toast.error(errorMessage);

      // 2. Check if Locked -> Redirect to Reset
      if (data?.locked === true) {
        
        // Optional: Set a flag so the reset page knows why they are there
        localStorage.setItem(MPIN_LOCK_KEY, "true"); 
        setIsMpinLocked(true);

        setTimeout(() => {
          // Redirect to Reset MPIN Page (or switch stage to OTP to reset)
          // Assuming you want to go to the OTP/Reset flow:
          setStage(STAGE.INITIAL); 
          navigate("/login?lockout=true", { replace: true });
        }, 2000); // Wait 2 seconds so they can read the toast
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #f0e443 0%, #0f80e2 100%)",
        padding: "16px",
      }}
    >
      <style>{`
        /* Card & Layout */
        .login-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 28px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        /* Waves */
        .wave-top {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 0;
          opacity: 0.9;
        }
        .wave-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          max-height: 140px;
          object-fit: cover;
          z-index: 0;
          opacity: 0.9;
        }

        .card-content {
          position: relative;
          z-index: 2;
          padding: 2.5rem 2rem;
        }

        /* OTP Input Styling Override */
        .otp-input-material input {
          width: 50px !important;
          height: 56px !important;
          border-radius: 8px;
          border: 1px solid #c4c4c4;
          font-size: 22px;
          font-weight: 500;
          background: transparent;
          color: #333;
          transition: all 0.2s;
        }
        .otp-input-material input:focus {
          border-color: #1976d2;
          border-width: 2px;
          outline: none;
          background: #f0f7ff;
        }
      `}</style>

      <div className="login-card fade-in">
        <img src={b1} alt="" className="wave-top" />
        <img src={b3} alt="" className="wave-bottom" />

        <div className="card-content">
          <Box className="text-center mb-4">
            <img
              src={patraLogo}
              alt="Logo"
              style={{ height: "55px", objectFit: "contain", marginBottom: "8px" }}
            />
          </Box>

          {/* --- STAGE 1: CUSTOMER LOGIN --- */}
          {stage === STAGE.INITIAL && (
            <div className="d-flex flex-column gap-3">
              <div className="text-center mb-1">
                <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '1.4rem' }}>
                  Customer Login
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Welcome back! Please sign in to continue.
                </Typography>
              </div>

              {isLockoutActive && (
                <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning p-2 rounded small text-center">
                  ⚠️ Too many attempts. Use OTP.
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="d-flex flex-column gap-3">
                <TextField
                  label="Customer ID"
                  variant="outlined"
                  fullWidth
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  InputProps={{ sx: { borderRadius: '12px', backgroundColor: '#fff' } }}
                />

                <TextField
                  label="Registered Mobile"
                  variant="outlined"
                  type="tel"
                  fullWidth
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                  InputProps={{ sx: { borderRadius: '12px', backgroundColor: '#fff' } }}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2" fontWeight={500} color="text.secondary">Keep me signed in</Typography>}
                  sx={{ ml: 0.5 }}
                />

                <Button
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={loading}
                  sx={{
                    borderRadius: '12px',
                    height: '50px',
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    backgroundColor: '#1976d2', 
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Get OTP"}
                </Button>

                {!isOtpOnly && !isMpinLocked && (
                  <>
                    <Divider sx={{ my: 1, color: 'text.secondary', fontSize: '0.875rem' }}>or sign in with</Divider>

                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => {
                        setStage(STAGE.MPIN_LOGIN);
                        navigate("/mpin-login");
                      }}
                      sx={{
                        borderRadius: '12px',
                        height: '50px',
                        textTransform: 'none',
                        fontSize: '15px',
                        fontWeight: 600,
                        borderColor: '#e0e0e0',
                        color: '#555',
                        '&:hover': { borderColor: '#bdbdbd', backgroundColor: '#f5f5f5' }
                      }}
                    >
                      Login with MPIN
                    </Button>
                  </>
                )}
              </form>
            </div>
          )}

          {/* --- STAGE 2: OTP VERIFICATION --- */}
          {stage === STAGE.OTP && (
            <div className="text-center d-flex flex-column gap-3">
              <div>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                  Verify OTP
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Enter the 4-digit code sent to<br />
                  <strong>{mobileNumber}</strong>
                </Typography>
              </div>

              {visibleOtp && (
                <div className="alert alert-success border-0 bg-success bg-opacity-10 text-success p-2 rounded small fw-bold">
                  Dev OTP: {visibleOtp}
                </div>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }} className="otp-input-material">
                <OtpInput
                  value={otp}
                  onChange={(val) => setOtp(val.replace(/[^0-9]/g, ""))}
                  numInputs={4}
                  renderInput={(props) => <input {...props} />}
                  containerStyle={{ gap: "12px" }}
                  shouldAutoFocus={true}
                />
              </Box>

              <Button
                variant="contained"
                size="large"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 4}
                sx={{
                  borderRadius: '12px',
                  height: '50px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  backgroundColor: '#1976d2',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Verify & Login"}
              </Button>

              <div className="mt-1">
                {resendTimer > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Resend code in <strong style={{ color: '#333' }}>{resendTimer}s</strong>
                  </Typography>
                ) : (
                  <Button
                    variant="text"
                    onClick={() => handleRequestOtp()}
                    disabled={loading}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Resend Code
                  </Button>
                )}
              </div>

              <Divider sx={{ my: 1, fontSize: '0.85rem' }}>or sign in with</Divider>

              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  setStage(STAGE.MPIN_LOGIN);
                  navigate("/mpin-login");
                }}
                sx={{
                  borderRadius: '12px',
                  height: '50px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#e0e0e0',
                  color: '#555'
                }}
              >
                Login with MPIN
              </Button>
            </div>
          )}

          {/* --- STAGE 3: MPIN LOGIN --- */}
          {stage === STAGE.MPIN_LOGIN && (
            <div className="text-center d-flex flex-column gap-3">
              <div>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                  MPIN Access
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Enter your 4-digit security PIN
                </Typography>
              </div>

              <TextField
                label="Customer ID"
                variant="filled"
                fullWidth
                value={customerId}
                InputProps={{
                  readOnly: true,
                  sx: { borderRadius: '8px 8px 0 0', backgroundColor: '#f5f5f5' }
                }}
                sx={{ mt: 2 }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }} className="otp-input-material">
                <OtpInput
                  value={mpinInput}
                  onChange={setMpinInput}
                  numInputs={4}
                  inputType="password"
                  renderInput={(props) => <input {...props} />}
                  containerStyle={{ gap: "12px" }}
                  shouldAutoFocus={true}
                />
              </Box>

              <Button
                variant="contained"
                size="large"
                onClick={handleMpinLogin}
                disabled={loading || mpinInput.length !== 4}
                sx={{
                  borderRadius: '12px',
                  height: '50px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '16px',
                  backgroundColor: '#1976d2',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
              </Button>

              <Divider sx={{ my: 1, fontSize: '0.85rem' }}>or sign in with</Divider>

              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  setStage(STAGE.INITIAL);
                  navigate("/login", { replace: true });
                }}
                sx={{
                  borderRadius: '12px',
                  height: '50px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#e0e0e0',
                  color: '#555'
                }}
              >
                Login with Customer ID
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;