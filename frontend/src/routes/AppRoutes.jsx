import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import AppLayout from "../components/header.jsx";

// Pages
import AuthPage from "../pages/LoginPage.jsx";
import MpinSetupPage from "../pages/MpinPage.jsx";
import MpinResetPage from "../pages/resetMpin.jsx";
import ChangeMpin from "../pages/changeMpin.jsx";
// import DashboardPage from "../pages/DashboardPage.jsx";
import AttendanceHistory from "../pages/AttendanceHistory.jsx";
import AttendanceLog from "../pages/AttendanceLogPage.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import DocumentsPage from "../pages/DocumentsPage.jsx";
import Mytrip from "../pages/MyTripDetails.jsx";
import DmrPage from "../pages/DmrPage.jsx";
import StartTrip from "../pages/StartTrip.jsx";
import SosAll from "../pages/sos.jsx";
import Feedback from "../pages/feedback.jsx";
import TestFeedback from "../pages/feedbacktest.jsx";


// --- NEW PAGES ADDED ---
import RefuelPage from "../pages/RefuelPage.jsx";
import ContactOfficePage from "../pages/ContactOfficePage.jsx";

// Components
import PrivateRoute from "../components/PrivateRoute.jsx";

const AppRoutes = () => {
  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverRegNo");
    window.location.href = "/login";
  };

  return (
    <Routes>
      {/* ---------- PUBLIC ROUTES ---------- */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/mpin-login" element={<AuthPage />} />

      {/* ---------- PROTECTED ROUTES (NO LAYOUT) ---------- */}
      <Route
        path="/setup-mpin"
        element={
          <PrivateRoute>
            <MpinSetupPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/reset-mpin"
        element={
          <PrivateRoute>
            <MpinResetPage />
          </PrivateRoute>
        }
      />

      {/* ---------- PROTECTED ROUTES WITH LAYOUT ---------- */}
      <Route
        element={
          <PrivateRoute>
            <AppLayout handleLogout={handleLogout} />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/attendance-history" element={<AttendanceHistory />} />
        <Route path="/attendance-log/:date/:month/:year" element={<AttendanceLog />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/my-trips/:id" element={<Mytrip />} />
        <Route path="/dmr" element={<DmrPage />} />
        <Route path="/start-trip/:enq_id" element={<StartTrip />} />
        <Route path="/sos-alerts" element={<SosAll />} />
        
        {/* --- NEW ROUTES --- */}
        <Route path="/refuel" element={<RefuelPage />} />
        <Route path="/change-mpin" element={<ChangeMpin />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/test-feedback" element={<TestFeedback />} />
        <Route path="/contact-office" element={<ContactOfficePage />} />
      </Route>

      {/* ---------- 404 ---------- */}
      <Route
        path="*"
        element={<h1 style={notFoundStyle}>404 - Page Not Found</h1>}
      />
    </Routes>
  );
};

const notFoundStyle = {
  textAlign: "center",
  marginTop: "50px",
  color: "white", // Changed to black/dark since bg might be light, or keep white if background is dark
  fontFamily: "Inter, sans-serif",
};

export default AppRoutes;