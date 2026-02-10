import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/Api";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Hash,
  CheckCircle2,
  XCircle,
  Navigation,
  FileText,
  Car,
} from "lucide-react";
import CarLoader from "../components/Loader1";

const MyTripDetails = () => {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const navigate = useNavigate();
  const driverRegNo = localStorage.getItem("driverRegNo");

  useEffect(() => {
    fetchTrip();
  }, []);

  const fetchTrip = async () => {
    try {
      const res = await api.get(
        `/driver/assigned-trip?driver_regno=${driverRegNo}`
      );
      const tripData = Array.isArray(res.data) ? res.data[0] : res.data;
      setTrip(tripData || null);
    } catch (err) {
      toast.error("Trip fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (accept) => {
    setAccepting(true);
    try {
      await api.post("/driver/accept-trip", {
        enq_id: trip.enq_id,
        driver_regno: driverRegNo,
        action: accept ? "accept" : "reject",
      });
      toast.success(accept ? "Trip Accepted" : "Trip Rejected");
      setTrip({ ...trip, accept_status: accept ? 1 : 2 });
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setAccepting(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      // 1. Capture the response
      const res = await api.post("/driver/send-otp", { enq_id: trip.enq_id });

      // 2. Show DEV OTP Alert (Only if OTP is returned)
      if (res.data.otp) {
        toast.success("OTP sent to guest successfully " + res.data.otp);
      }

      // 3. Navigate after alert is closed
      navigate(`/start-trip/${trip.enq_id}`);
    } catch (err) {
      console.error(err);
      toast.error("OTP send failed");
    } finally {
      setSendingOtp(false);
    }
  };

  // --- LOADER ---
  if (loading) {
    return <CarLoader />;
  }

  // --- NO TRIP STATE ---
  if (!trip) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center h-100 px-4 text-center"
        style={{ minHeight: "80vh" }}
      >
        <div className="bg-white p-4 rounded-circle shadow-sm mb-3">
          <Navigation size={48} className="text-secondary opacity-50" />
        </div>
        <h5 className="fw-bold text-dark">No Active Trips</h5>
        <p className="text-muted small">
          You don't have any assigned trips at the moment.
        </p>
      </div>
    );
  }

  // --- HELPERS ---
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="container-fluid bg-light min-dvh-100 p-0 pb-5">
      <div className="row justify-content-center g-0">
        <div className="col-12 col-md-8 col-lg-6 mx-auto">
          <div className="bg-primary text-white p-4 rounded-bottom-4 shadow-sm mb-4 position-relative overflow-hidden">
            <Car
              size={140}
              className="position-absolute text-white opacity-10"
              style={{ right: -30, top: -20, transform: "rotate(1deg)" }}
            />

            <div className="position-relative z-1 mt-2">
              <h2 className="fw-bold mb-1">Trip Details</h2>
              <p className="mb-0 opacity-75 small">Manage your assignment</p>
            </div>
          </div>

          {/* Wrapper for content with padding */}
          <div className="px-3">
            {/* 1. STATUS CARD */}
            <div className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden bg-white">
              <div
                className={`card-header border-0 py-3 ${
                  trip.accept_status === 1
                    ? "bg-success bg-opacity-10"
                    : trip.accept_status === 2
                    ? "bg-danger bg-opacity-10"
                    : "bg-primary bg-opacity-10"
                }`}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span
                    className={`fw-bold small text-uppercase ${
                      trip.accept_status === 1
                        ? "text-success"
                        : trip.accept_status === 2
                        ? "text-danger"
                        : "text-primary"
                    }`}
                  >
                    {trip.accept_status === 1
                      ? "Confirmed"
                      : trip.accept_status === 2
                      ? "Rejected"
                      : "New Assignment"}
                  </span>
                  <span className="badge bg-white text-dark shadow-sm fw-bold px-3 py-2 rounded-pill">
                    #{trip.confirmation_id}
                  </span>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-6">
                    <small
                      className="text-muted d-block mb-1"
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                      }}
                    >
                      REFERENCE ID
                    </small>
                    <div className="d-flex align-items-center">
                      <Hash size={14} className="text-secondary me-1" />
                      <span className="fw-bold text-dark">
                        {trip.enqref_no}
                      </span>
                    </div>
                  </div>
                  <div className="col-6">
                    <small
                      className="text-muted d-block mb-1"
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                      }}
                    >
                      GUEST NAME
                    </small>
                    <div className="d-flex align-items-center">
                      <User size={14} className="text-secondary me-1" />
                      <span className="fw-bold text-dark text-truncate">
                        {trip.gustcust_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. ITINERARY TIMELINE */}
            <div className="card border-0 shadow-sm rounded-4 mb-3 bg-white">
              <div className="card-body p-4">
                <h6
                  className="fw-bold mb-4 text-secondary text-uppercase"
                  style={{ fontSize: "0.75rem", letterSpacing: "1px" }}
                >
                  Itinerary Schedule
                </h6>

                {/* PICKUP SECTION */}
                <div className="d-flex">
                  {/* Timeline Column */}
                  <div
                    className="d-flex flex-column align-items-center"
                    style={{ width: "40px" }}
                  >
                    <div
                      className="bg-success rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm z-1"
                      style={{ width: "32px", height: "32px" }}
                    >
                      <MapPin size={16} />
                    </div>
                    {/* Connecting Line */}
                    <div
                      className="h-100 border-start border-2 border-success border-opacity-25"
                      style={{ minHeight: "50px" }}
                    ></div>
                  </div>

                  {/* Content Column */}
                  <div className="flex-grow-1 ms-3 pb-4">
                    <span
                      className="badge bg-success bg-opacity-10 text-success mb-1 px-2 py-1"
                      style={{ fontSize: "0.65rem" }}
                    >
                      PICKUP
                    </span>
                    <h6 className="fw-bold text-dark mb-1">
                      {trip.itin_pickloc_name}, {trip.itin_pickcity_name}
                    </h6>
                    <div className="d-flex align-items-center text-muted small mt-2 bg-light rounded-3 px-2 py-1 d-inline-flex">
                      <Calendar size={14} className="me-1 text-secondary" />
                      <span className="fw-medium me-2">
                        {formatDate(trip.arrive_dt)}
                      </span>
                      <Clock size={14} className="me-1 text-secondary" />
                      <span className="fw-medium">{trip.arrive_time_name}</span>
                    </div>
                  </div>
                </div>

                {/* DROP SECTION */}
                <div className="d-flex">
                  <div
                    className="d-flex flex-column align-items-center"
                    style={{ width: "40px" }}
                  >
                    <div
                      className="bg-danger rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm z-1"
                      style={{ width: "32px", height: "32px" }}
                    >
                      <MapPin size={16} />
                    </div>
                  </div>

                  <div className="flex-grow-1 ms-3">
                    <span
                      className="badge bg-danger bg-opacity-10 text-danger mb-1 px-2 py-1"
                      style={{ fontSize: "0.65rem" }}
                    >
                      DROP OFF
                    </span>
                    <h6 className="fw-bold text-dark mb-1">
                      {trip.itin_drop_location}
                    </h6>
                    <p className="text-secondary small mb-1 fst-italic">
                      {trip.itin_pick_address || "Address not specified"}
                    </p>
                    <div className="d-flex align-items-center text-muted small mt-2 bg-light rounded-3 px-2 py-1 d-inline-flex">
                      <Calendar size={14} className="me-1 text-secondary" />
                      <span className="fw-medium me-2">
                        {formatDate(trip.dept_dt)}
                      </span>
                      <Clock size={14} className="me-1 text-secondary" />
                      <span className="fw-medium">{trip.depart_time_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. GUEST INFO CARD */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
              <div className="card-body p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="bg-light p-3 rounded-circle me-3">
                    <User size={20} className="text-dark" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">
                      {trip.gustcust_name}
                    </h6>
                    <small className="text-muted">Primary Guest</small>
                  </div>
                </div>
                <a
                  href={`tel:${trip.guestmob_no}`}
                  className="btn btn-outline-success rounded-circle p-2 d-flex align-items-center justify-content-center"
                  style={{ width: "45px", height: "45px" }}
                >
                  <Phone size={20} />
                </a>
              </div>
            </div>

            {/* 4. ACTIONS */}
            <div className="d-grid gap-3 mb-5">
              {trip.accept_status == null && (
                <>
                  <button
                    className="btn btn-primary btn-lg rounded-pill shadow-sm py-3 fw-bold d-flex align-items-center justify-content-center"
                    onClick={() => handleAccept(true)}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <CheckCircle2 size={20} className="me-2" />
                    )}
                    ACCEPT TRIP
                  </button>
                  <button
                    className="btn btn-outline-danger btn-lg rounded-pill py-3 fw-bold d-flex align-items-center justify-content-center"
                    onClick={() => handleAccept(false)}
                    disabled={accepting}
                    style={{ borderWidth: "2px" }}
                  >
                    <XCircle size={20} className="me-2" />
                    DECLINE
                  </button>
                </>
              )}

              {trip.accept_status === 1 && (
                <button
                  className="btn btn-dark btn-lg rounded-pill shadow-lg py-3 fw-bold d-flex align-items-center justify-content-center"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  style={{
                    background: "linear-gradient(135deg, #1f2937, #111827)",
                  }}
                >
                  {sendingOtp ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <Navigation size={20} className="me-2" />
                  )}
                  SEND OTP & START
                </button>
              )}

              {trip.accept_status === 2 && (
                <div className="alert alert-danger border-0 d-flex align-items-center justify-content-center py-3 rounded-4 shadow-sm mb-0">
                  <XCircle size={20} className="me-2" />
                  <span className="fw-bold">You have rejected this trip</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTripDetails;