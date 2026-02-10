import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import OtpInput from "react-otp-input";
import { ArrowLeft } from "lucide-react"; // Or use MUI Icon

// Material UI Imports
import {
  Button,
  CircularProgress,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";

import api from "../api/Api.js";
import patraLogo from "../assets/logo.png";
import b1 from "../assets/b1.png"; // Top Wave
import b3 from "../assets/b3.png"; // Bottom Wave

const MpinResetPage = () => {
  const navigate = useNavigate();
  const [newMpin, setNewMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [loading, setLoading] = useState(false);

  // FIX: Use Correct Customer Keys
  const mobileNumber = localStorage.getItem("customerMobile");
  const token = localStorage.getItem("customerToken");
  const customerId = localStorage.getItem("customerId");

  // --- Session Check ---
  useEffect(() => {
    if (!mobileNumber || !token) {
      toast.error("Verification required. Please login with OTP first.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    }
  }, [mobileNumber, token, navigate]);

  // --- Handle Reset ---
  const handleResetMpin = async (e) => {
    e.preventDefault();

    if (newMpin.length !== 4 || confirmMpin.length !== 4) {
      return toast.error("MPIN must be 4 digits.");
    }

    if (newMpin !== confirmMpin) {
      return toast.error("MPINs do not match.");
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/customer/reset-mpin",
        {
          mobileNumber,
          newMpin,
          customerId, // Added customerId to payload
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(response.data.message || "MPIN reset successfully!");

      // Clean up lock keys if they exist
      localStorage.removeItem("patra_cust_mpin_locked");

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.message || "MPIN reset failed.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!mobileNumber || !token) return null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #d8e66e 0%, #4facfe 100%)",
        padding: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* BACKGROUND WAVES */}
      <img
        src={b1}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 0,
          opacity: 0.9,
        }}
      />
      <img
        src={b3}
        alt=""
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          maxHeight: "140px",
          objectFit: "cover",
          zIndex: 0,
          opacity: 0.9,
        }}
      />

      {/* MAIN CARD */}
      <Card
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: "28px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          zIndex: 2,
          position: "relative",
          animation: "fadeIn 0.5s ease-out",
        }}
      >
        <CardContent sx={{ p: "40px 30px !important", textAlign: "center" }}>
          {/* Logo */}
          <Box mb={3}>
            <img
              src={patraLogo}
              alt="Logo"
              style={{ height: "55px", objectFit: "contain" }}
            />
          </Box>

          <Typography
            variant="h5"
            fontWeight="700"
            color="#1a1a1a"
            gutterBottom
          >
            Reset MPIN
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={4}>
            Create a new 4-digit security code.
          </Typography>

          <form onSubmit={handleResetMpin}>
            {/* NEW MPIN INPUT */}
            <Box mb={3}>
              <Typography
                variant="caption"
                display="block"
                textAlign="left"
                fontWeight="700"
                color="text.secondary"
                mb={1}
                ml={0.5}
              >
                NEW MPIN
              </Typography>

              <Box display="flex" justifyContent="center">
                <OtpInput
                  value={newMpin}
                  onChange={setNewMpin}
                  numInputs={4}
                  inputType="password"
                  renderInput={(props) => <input {...props} />}
                  containerStyle={{
                    gap: "12px",
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                  inputStyle={{
                    width: "100%",
                    height: "56px",
                    borderRadius: "12px",
                    border: "1px solid #c4c4c4",
                    fontSize: "24px",
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#333",
                    background: "transparent",
                  }}
                  focusStyle={{
                    borderColor: "#1976d2",
                    outline: "none",
                    background: "#f0f7ff",
                  }}
                  shouldAutoFocus
                />
              </Box>
            </Box>

            {/* CONFIRM MPIN INPUT */}
            <Box mb={4}>
              <Typography
                variant="caption"
                display="block"
                textAlign="left"
                fontWeight="700"
                color="text.secondary"
                mb={1}
                ml={0.5}
              >
                CONFIRM NEW MPIN
              </Typography>

              <Box display="flex" justifyContent="center">
                <OtpInput
                  value={confirmMpin}
                  onChange={setConfirmMpin}
                  numInputs={4}
                  inputType="password"
                  renderInput={(props) => <input {...props} />}
                  containerStyle={{
                    gap: "12px",
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                  inputStyle={{
                    width: "100%",
                    height: "56px",
                    borderRadius: "12px",
                    border: "1px solid #c4c4c4",
                    fontSize: "24px",
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#333",
                    background: "transparent",
                  }}
                  focusStyle={{
                    borderColor: "#1976d2",
                    outline: "none",
                    background: "#f0f7ff",
                  }}
                />
              </Box>
            </Box>

            {/* BUTTON ROW */}
            <Box display="flex" gap={2} alignItems="center">
              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{
                  flex: 1,
                  height: "56px",
                  borderRadius: "12px",
                  textTransform: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  backgroundColor: "#1976d2",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                  "&:hover": {
                    backgroundColor: "#1565c0",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Reset MPIN"
                )}
              </Button>

              {/* Back Button */}
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "12px",
                  backgroundColor: "#f0f7ff",
                  border: "1px solid transparent",
                  color: "#1976d2",
                  "&:hover": {
                    backgroundColor: "#1976d2",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
                  },
                }}
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </IconButton>
            </Box>
          </form>
        </CardContent>
      </Card>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Box>
  );
};

export default MpinResetPage;