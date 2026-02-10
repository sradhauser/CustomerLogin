import React, { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  Navigation,
  MessageCircle,
  AlertTriangle,
  Building2,
  Map as MapIcon,
  Loader2,
} from "lucide-react";
import api from "../api/Api"; // Your Axios instance
import { toast } from "sonner"; // Assuming you use sonner or react-hot-toast

const ContactOfficePage = () => {
  const [loading, setLoading] = useState(true);
  const [contactData, setContactData] = useState(null);

  // --- FETCH DATA FROM API ---
  useEffect(() => {
    const fetchContactDetails = async () => {
      try {
        const res = await api.get("/contact/contact-details"); // Adjust route if needed
        if (res.data.success) {
          setContactData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load contact info", err);
        toast.error("Could not load contact details");
      } finally {
        setLoading(false);
      }
    };

    fetchContactDetails();
  }, []);

  const openLink = (url) => {
    if (url) window.open(url, "_blank");
  };

  // --- LOADING STATE (PREMIUM SKELETON) ---
  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex flex-column align-items-center justify-content-center">
        <Loader2 size={40} className="text-primary animate-spin mb-3" />
        <p className="text-muted fw-semibold animate-pulse">
          Loading Support Hub...
        </p>
        <style>{`
          .animate-spin { animation: spin 1s linear infinite; }
          .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        `}</style>
      </div>
    );
  }

  // --- IF ERROR OR NO DATA ---
  if (!contactData)
    return (
      <div className="p-5 text-center">
        <h5 className="text-muted">Unable to load contact info.</h5>
        <button
          className="btn btn-primary mt-3"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="min-vh-100 bg-white pb-5">
      {/* === 1. HERO HEADER === */}
      <div
        className="px-4 pt-5 pb-5 text-white text-center"
        style={{
          background: "linear-gradient(135deg, #4dc7ff 0%, #0a58ca 100%)",
          borderBottomLeftRadius: "30px",
          borderBottomRightRadius: "30px",
          marginBottom: "-40px",
        }}
      >
        <h2 className="fw-bold mb-1">Help & Support</h2>
        <p className="opacity-75 mb-4 small">How can we help you today?</p>
      </div>

      {/* === 2. MAIN CONTENT CARD === */}
      <div className="px-3" style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* A. PRIMARY ACTIONS (Floating Card) */}
        <div className="card border-0 shadow-lg rounded-4 p-3 mb-4 bg-white">
          {/* WhatsApp Button */}
          <button
            onClick={() => openLink(contactData.whatsapp?.link)}
            className="btn w-100 rounded-pill py-3 fw-bold d-flex align-items-center justify-content-center gap-2 mb-3 shadow-sm"
            style={{
              backgroundColor: "#25D366",
              color: "#fff",
              border: "none",
            }}
          >
            <MessageCircle size={24} fill="white" />
            {contactData.whatsapp?.label || "Chat on WhatsApp"}
          </button>

          <div className="row g-2">
            {/* Call Support */}
            <div className="col-6">
              <div
                onClick={() =>
                  openLink(`tel:${contactData.primary_support?.phone}`)
                }
                className="p-3 rounded-4 bg-light text-center border cursor-pointer h-100 d-flex flex-column align-items-center justify-content-center hover-action"
              >
                <div className="bg-white p-2 rounded-circle shadow-sm mb-2 text-primary">
                  <Phone size={20} />
                </div>
                <span className="fw-bold text-dark small d-block">
                  Call Support
                </span>
                <span className="text-muted extra-small">
                  {contactData.primary_support?.phone}
                </span>
              </div>
            </div>

            {/* Email Ops */}
            <div className="col-6">
              <div
                onClick={() =>
                  openLink(`mailto:${contactData.primary_support?.email}`)
                }
                className="p-3 rounded-4 bg-light text-center border cursor-pointer h-100 d-flex flex-column align-items-center justify-content-center hover-action"
              >
                <div className="bg-white p-2 rounded-circle shadow-sm mb-2 text-danger">
                  <Mail size={20} />
                </div>
                <span className="fw-bold text-dark small d-block">
                  Email Ops
                </span>
                <span
                  className="text-muted extra-small text-break"
                  style={{ fontSize: "10px" }}
                >
                  operations@patratravels.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* B. EMERGENCY BANNER */}
        {/* <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" 
             style={{ background: "linear-gradient(45deg, #dc3545, #ff4d5a)" }}>
          <div className="card-body p-3 d-flex align-items-center text-white">
            <div className="bg-white bg-opacity-25 p-2 rounded-circle me-3 flex-shrink-0">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div className="flex-grow-1">
              <h6 className="fw-bold mb-0 text-white">{contactData.emergency?.title}</h6>
              <small className="opacity-75">{contactData.emergency?.subtitle}</small>
            </div>
            <a href={`tel:${contactData.emergency?.number}`} className="btn btn-white text-danger fw-bold rounded-pill px-3 shadow-sm">
              SOS
            </a>
          </div>
        </div> */}

        {/* C. OFFICE HUBS LIST */}
        <div className="d-flex align-items-center justify-content-between mb-3 px-1">
          <h6 className="fw-bold text-secondary mb-0 text-uppercase small ls-1">
            Visit Our Hubs
          </h6>
          <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
            {contactData.offices?.length || 0} Locations
          </span>
        </div>

        <div className="d-flex flex-column gap-3">
          {contactData.offices?.map((loc) => (
            <div
              key={loc.id}
              className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white"
            >
              <div className="card-body p-0">
                <div className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      {loc.color === "primary" ? (
                        <Building2 size={18} className="text-primary" />
                      ) : (
                        <MapIcon size={18} className="text-secondary" />
                      )}
                      {loc.name}
                    </h6>
                    <span
                      className={`badge bg-${loc.color} bg-opacity-10 text-${loc.color} rounded-pill border border-${loc.color} border-opacity-10`}
                    >
                      {loc.type}
                    </span>
                  </div>

                  <p
                    className="text-muted small mb-3 ps-1"
                    style={{ fontSize: "0.85rem", lineHeight: "1.5" }}
                  >
                    {loc.address}
                  </p>

                  <button
                    onClick={() => openLink(loc.map_url)}
                    className="btn btn-outline-primary w-100 rounded-3 d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                    style={{ borderStyle: "dashed", borderWidth: "1.5px" }}
                  >
                    <Navigation size={16} /> Get Directions
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hover-action { transition: transform 0.2s ease, background 0.2s; }
        .hover-action:active { transform: scale(0.96); background: #e9ecef !important; }
        .extra-small { font-size: 0.75rem; }
        .ls-1 { letter-spacing: 1px; }
      `}</style>
    </div>
  );
};

export default ContactOfficePage;
