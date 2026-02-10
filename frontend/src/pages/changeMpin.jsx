import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import OtpInput from "react-otp-input";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Smartphone,
  Lock,
  ChevronRight
} from "lucide-react";

import {
  Button,
  CircularProgress,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Fade,
  Collapse,
  TextField,
  InputAdornment
} from "@mui/material";

import api from "../api/Api.js"; 

const ChangeMpinPage = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [mode, setMode] = useState("change"); // 'change' or 'forgot'
  const [loading, setLoading] = useState(false);

  // Change Mode States
  const [oldMpin, setOldMpin] = useState("");
  const [newMpin, setNewMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [stepCurrentDone, setStepCurrentDone] = useState(false);

  // Forgot Mode States
  const [forgotStep, setForgotStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");

  // Auth Data
  const token = localStorage.getItem("customerToken");
  const customerId = localStorage.getItem("customerId");

  // --- EFFECT: Auto-Reveal New MPIN Section ---
  useEffect(() => {
    if (oldMpin.length === 4) {
      setStepCurrentDone(true);
    } else {
      setStepCurrentDone(false);
    }
  }, [oldMpin]);

  // --- HANDLERS ---
  const handleChangeMpin = async (e) => {
    e.preventDefault();
    if (newMpin !== confirmMpin) return toast.error("New MPINs do not match");
    if (oldMpin.length !== 4 || newMpin.length !== 4) return toast.error("MPIN must be 4 digits");

    setLoading(true);
    try {
      await api.post(
        "/customer/change-mpin",
        { customerId, oldMpin, newMpin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("MPIN Updated Successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change MPIN");
      setOldMpin("");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (mobileNumber.length < 10) return toast.error("Invalid Mobile Number");
    setLoading(true);
    try {
      const res = await api.post("/customer/request-otp-mpin", { mobileNumber });
      toast.success(res.data.message || "OTP Sent!");
      setForgotStep(2);
    } catch (err) {
      toast.error("User not found or Server Error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (otp.length !== 4) return toast.error("Enter valid OTP");
    if (newMpin.length !== 4) return toast.error("Enter new MPIN");

    setLoading(true);
    try {
      await api.post("/customer/reset-mpin", { mobileNumber, otp, newMpin, customerId });
      toast.success("MPIN Reset Successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER HELPER: RESPONSIVE OTP INPUT ---
  const renderOtpInput = (value, onChange, isVisible = false, autoFocus = false) => (
    <Box 
      display="flex" 
      justifyContent="center" 
      sx={{ width: "100%", margin: "0 auto" }}
    >
      <OtpInput
        value={value}
        onChange={onChange}
        numInputs={4}
        inputType={isVisible ? "tel" : "password"}
        shouldAutoFocus={autoFocus}
        renderInput={(props) => <input {...props} />}
        containerStyle={{
          gap: "12px", // Consistent gap
        }}
        inputStyle={{
          width: "50px", // Fixed width for consistent look
          height: "50px", // Square shape
          borderRadius: "14px",
          border: "2px solid #eef2f6",
          backgroundColor: "#f8fafc",
          fontSize: "22px",
          fontWeight: "700",
          color: "#1e293b",
          outline: "none",
          transition: "all 0.2s ease-in-out",
        }}
        focusStyle={{
          borderColor: "#2563eb",
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
          transform: "translateY(-2px)"
        }}
      />
    </Box>
  );

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        bgcolor: "#f8f9fa",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        pb: 10 // Space for bottom nav
      }}
    >
      {/* --- 1. GRADIENT HEADER --- */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #008cff 0%, #4400ff 100%)",
          pt: 4,
          pb: 10, 
          px: 3,
          borderBottomLeftRadius: "35px",
          borderBottomRightRadius: "35px",
          color: "white",
          textAlign: "center",
          position: "relative",
          zIndex: 0
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
           <IconButton 
              onClick={() => navigate(-1)} 
              
            >
               {/* <ArrowLeft size={20} /> */}
            </IconButton>
            <Typography variant="subtitle2" sx={{ opacity: 0.9, letterSpacing: 1, fontWeight: 600 }}>
                SECURITY
            </Typography>
            <Box width={40} /> {/* Spacer */}
        </Box>

        <Typography variant="h5" fontWeight="800" mb={1}>
          Security Settings
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, maxWidth: 300, mx: "auto" }}>
          Manage your 4-digit security PIN for safe and quick access.
        </Typography>
      </Box>

      {/* --- 2. FLOATING CARD --- */}
      <Box sx={{ px: 2, mt: -8, position: "relative", zIndex: 1 }}>
        <Card
            elevation={0}
            sx={{
            width: "100%",
            maxWidth: 400,
            mx: "auto",
            borderRadius: "28px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
            overflow: "visible"
            }}
        >
            <CardContent sx={{ p: "24px !important" }}>

            {/* Toggle Switch */}
            <Box display="flex" justifyContent="center" mb={4}>
                <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(e, newMode) => newMode && setMode(newMode)}
                fullWidth
                sx={{
                    bgcolor: "#f1f5f9",
                    borderRadius: "16px",
                    p: 0.5,
                    width: "100%",
                    "& .MuiToggleButton-root": {
                        border: "none",
                        borderRadius: "12px !important",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        color: '#64748b',
                        py: 1
                    },
                    "& .Mui-selected": {
                        bgcolor: "#fff !important",
                        color: "#2563eb !important",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                    }
                }}
                >
                <ToggleButton value="change">Change MPIN</ToggleButton>
                <ToggleButton value="forgot">Forgot?</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* --- MODE: CHANGE MPIN --- */}
            {mode === "change" && (
                <Fade in={true}>
                <form onSubmit={handleChangeMpin}>
                    
                    {/* 1. CURRENT MPIN */}
                    <Box mb={3} textAlign="center">
                    <Typography variant="caption" fontWeight="700" color="#64748b" mb={1.5} display="block" letterSpacing={1}>
                        ENTER CURRENT MPIN
                    </Typography>
                    {renderOtpInput(oldMpin, setOldMpin, false, true)}
                    </Box>

                    {/* 2. REVEAL NEW MPIN SECTION */}
                    <Collapse in={stepCurrentDone} timeout={400}>
                        <Box 
                        sx={{ 
                            mt: 2, 
                            p: 2.5, 
                            bgcolor: "#f8fafc", 
                            borderRadius: "20px",
                            border: "1px solid #e2e8f0" 
                        }}
                        >
                            <Box display="flex" alignItems="center" gap={1} mb={2} justifyContent="center">
                                <KeyRound size={16} className="text-blue-600"/>
                                <Typography variant="subtitle2" fontWeight="700" color="#334155">
                                    Set New Security Pin
                                </Typography>
                            </Box>

                            <Box mb={3}>
                                <Typography variant="caption" display="block" color="#94a3b8" mb={1} textAlign="center">
                                    NEW MPIN
                                </Typography>
                                {renderOtpInput(newMpin, setNewMpin)}
                            </Box>

                            <Box mb={3}>
                                <Typography variant="caption" display="block" color="#94a3b8" mb={1} textAlign="center">
                                    CONFIRM MPIN
                                </Typography>
                                {renderOtpInput(confirmMpin, setConfirmMpin)}
                            </Box>

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                endIcon={loading ? null : <ChevronRight size={18} />}
                                sx={{
                                    py: 1.5,
                                    borderRadius: "14px",
                                    textTransform: "none",
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    bgcolor: "#2563eb",
                                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                                    "&:hover": { bgcolor: "#1d4ed8" }
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit"/> : "Update Now"}
                            </Button>
                        </Box>
                    </Collapse>

                    {!stepCurrentDone && oldMpin.length > 0 && (
                        <Typography variant="caption" display="block" textAlign="center" color="#94a3b8" mt={2}>
                            Enter 4 digits to continue
                        </Typography>
                    )}

                </form>
                </Fade>
            )}

            {/* --- MODE: FORGOT MPIN --- */}
            {mode === "forgot" && (
                <Fade in={true}>
                <Box>
                    {forgotStep === 1 && (
                        <Box textAlign="center" py={2}>
                            <Box 
                                sx={{ 
                                    width: 60, height: 60, 
                                    borderRadius: "50%", 
                                    bgcolor: "#eff6ff", 
                                    display: "flex", alignItems: "center", justifyContent: "center", 
                                    margin: "0 auto", mb: 2
                                }}
                            >
                                <Smartphone size={28} className="text-blue-600" />
                            </Box>
                            
                            <Typography variant="body2" color="#64748b" mb={3} px={2}>
                                We will send a verification code to your registered mobile number.
                            </Typography>

                            <TextField 
                                fullWidth 
                                placeholder="Mobile Number"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                                sx={{ 
                                    mb: 3, 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: '16px',
                                        bgcolor: '#f8fafc',
                                        '& fieldset': { borderColor: '#e2e8f0' }
                                    } 
                                }}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><span className="text-gray-500 font-bold">+91</span></InputAdornment>,
                                }}
                            />
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleSendOtp}
                                disabled={loading}
                                sx={{
                                    py: 1.8,
                                    borderRadius: "14px",
                                    textTransform: "none",
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    bgcolor: "#2563eb"
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit"/> : "Send OTP Code"}
                            </Button>
                        </Box>
                    )}

                    {forgotStep === 2 && (
                        <Box textAlign="center">
                            <Box display="flex" justifyContent="center" mb={3} mt={1}>
                                <Box 
                                    sx={{ 
                                        bgcolor: "#ecfdf5", 
                                        color: "#10b981", 
                                        px: 2, py: 0.5, 
                                        borderRadius: "20px", 
                                        display: "flex", alignItems: "center", gap: 1
                                    }}
                                >
                                    <ShieldCheck size={16} />
                                    <Typography variant="caption" fontWeight="700">OTP SENT</Typography>
                                </Box>
                            </Box>
                            
                            <Box mb={4}>
                                <Typography variant="caption" color="#94a3b8" mb={1} display="block">ENTER 4-DIGIT OTP</Typography>
                                {renderOtpInput(otp, setOtp)}
                            </Box>

                            <Box mb={4}>
                                <Box display="flex" alignItems="center" gap={1} mb={1} justifyContent="center">
                                    <Lock size={14} className="text-gray-400"/>
                                    <Typography variant="caption" fontWeight="700" color="#64748b">SET NEW MPIN</Typography>
                                </Box>
                                {renderOtpInput(newMpin, setNewMpin)}
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleVerifyAndReset}
                                disabled={loading}
                                sx={{
                                    py: 1.8,
                                    borderRadius: "14px",
                                    textTransform: "none",
                                    fontSize: "1rem",
                                    fontWeight: 700,
                                    bgcolor: "#10b981",
                                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                                    "&:hover": { bgcolor: "#059669" }
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit"/> : "Verify & Reset"}
                            </Button>
                            
                            <Button 
                                fullWidth 
                                variant="text" 
                                size="small"
                                sx={{ mt: 2, color: '#94a3b8', textTransform: 'none' }}
                                onClick={() => setForgotStep(1)}
                            >
                                Wrong number? Change it
                            </Button>
                        </Box>
                    )}
                </Box>
                </Fade>
            )}

            </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ChangeMpinPage;