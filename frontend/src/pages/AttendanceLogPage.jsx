import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  X,
  Maximize2,
  Car,
  Clock,
} from "lucide-react";
import api, { IMAGE_BASE_URL } from "../api/Api.js";

const AttendanceDetailPage = () => {
  const { date, month, year } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [attRecord, setAttRecord] = useState(null);
  const [driverId] = useState(localStorage.getItem("driverRegNo"));

  // Interaction States
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/attendanceCheckDate/${driverId}/${date}/${month}/${year}`
        );

        if (res.data?.data && res.data.data.length > 0) {
          setAttRecord(res.data.data[0]);
        }
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [driverId, date, month, year]);

  // --- LOADING STATE ---
  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-white">
        <div className="spinner-border text-primary" />
      </div>
    );

  // --- NO RECORD STATE ---
  if (!attRecord)
    return (
      <div className="min-vh-100 bg-white">
        <div className="bg-primary text-white p-3 d-flex align-items-center shadow-sm">
          <ArrowLeft
            onClick={() => navigate(-1)}
            size={24}
            className="cursor-pointer"
          />
          <h5 className="m-0 fw-bold ms-3">Detail</h5>
        </div>
        <div className="text-center p-5 text-muted">
          <div className="opacity-50 mb-2">
            <XCircle size={48} />
          </div>
          No records found for this date.
        </div>
      </div>
    );

  // --- MAIN RENDER ---
  return (
    <div className="min-vh-100 bg-white pb-4">
      {/* 1. Header */}
      <div className="bg-success text-white p-4 rounded-bottom-4 shadow-sm mb-4 position-relative overflow-hidden">
        <Clock
          size={120}
          className="position-absolute text-white opacity-10"
          style={{ right: -20, top: -10, transform: "rotate(15deg)" }}
        />
        <div className="d-flex align-items-center mb-2 position-relative z-1">
          <h2 className="fw-bold mb-0">Activity Log</h2>
        </div>
        <p className="mb-0 opacity-75 small position-relative z-1 ps-2">
          Details for {date}-{month}-{year}
        </p>
      </div>

      <div className="container px-1" style={{ maxWidth: "600px" }}>
        <h6 className="fw-bold text-primary text-uppercase small mb-2 ps-1 ls-1">
          Activity Log
        </h6>

        {/* --- PUNCH IN CARD --- */}
        <div
          onClick={() => setSelectedEvent("IN")}
          className="card border-0 shadow-sm rounded-4 p-3 bg-white cursor-pointer position-relative overflow-hidden mb-3"
        >
          <div
            className="position-absolute top-0 bottom-0 start-0 w-1 bg-success"
            style={{ width: "6px" }}
          ></div>

          <div className="d-flex align-items-center ps-1">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-success-subtle border border-success-subtle overflow-hidden"
              style={{ width: "60px", height: "60px" }}
            >
              {attRecord.checkin_selfie_url ? (
                <img
                  src={`${IMAGE_BASE_URL}${attRecord.checkin_selfie_url}`}
                  className="w-100 h-100 object-fit-cover"
                  alt="Punch In"
                />
              ) : (
                <Camera size={20} className="text-success" />
              )}
            </div>

            <div className="ms-2 flex-grow-1">
              <div className="text-dark mb-1" style={{ fontSize: "0.95rem" }}>
                <strong>Punched In</strong> {attRecord.checkin_location}
              </div>
              <div className="text-muted small fw-medium">
                By {attRecord.driverName} on {attRecord.readable_checkin_time}
              </div>
            </div>
          </div>
        </div>

        {/* --- PUNCH OUT CARD --- */}
        {attRecord.ck_sts === 2 && (
          <div
            onClick={() => setSelectedEvent("OUT")}
            className="card border-0 shadow-sm rounded-4 p-3 bg-white cursor-pointer position-relative overflow-hidden"
          >
            <div
              className="position-absolute top-0 bottom-0 start-0 w-1 bg-danger"
              style={{ width: "6px" }}
            ></div>

            <div className="d-flex align-items-center ps-1">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 bg-danger-subtle border border-danger-subtle overflow-hidden"
                style={{ width: "60px", height: "60px" }}
              >
                {attRecord.checkout_selfie_url ? (
                  <img
                    src={`${IMAGE_BASE_URL}${attRecord.checkout_selfie_url}`}
                    className="w-100 h-100 object-fit-cover"
                    alt="Punch Out"
                  />
                ) : (
                  <Camera size={20} className="text-danger" />
                )}
              </div>

              <div className="ms-2 flex-grow-1">
                <div className="text-dark mb-1" style={{ fontSize: "0.95rem" }}>
                  <strong>Punched Out</strong> {attRecord.checkout_location}
                </div>
                <div className="text-muted small fw-medium">
                  By {attRecord.driverName} on{" "}
                  {attRecord.readable_checkout_time}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== 2. NATIVE BOTTOM SHEET MODAL ========= */}
      {selectedEvent && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 1050,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white w-100 shadow-lg animate-slide-up"
            style={{
              maxWidth: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              position: "relative",
              zIndex: 1060,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="d-flex justify-content-center pt-3 pb-2">
              <div
                className="bg-secondary opacity-25 rounded-pill"
                style={{ width: "40px", height: "4px" }}
              ></div>
            </div>

            {/* Header */}
            <div className="px-4 pb-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0 text-dark">
                  {selectedEvent === "IN"
                    ? "Punch-In Details"
                    : "Punch-Out Details"}
                </h5>
                <div className="d-flex align-items-center text-primary gap-1 mt-1">
                  <div
                    className="small opacity-75 text-uppercase fw-bold"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Punch Time:
                  </div>
                  {/* --- CORRECTED: Uses Check-in/Out Time --- */}
                  <div className="fw-bold small">
                    {selectedEvent === "IN"
                      ? attRecord.readable_checkin_time
                      : attRecord.readable_checkout_time}
                  </div>
                </div>
                <small className="text-dark d-block mt-1">
                  {selectedEvent === "IN"
                    ? attRecord.has_duty
                      ? "Attendance & Duty Start"
                      : "Attendance Log"
                    : attRecord.has_duty
                    ? "Attendance & Duty End"
                    : "Attendance Log"}
                </small>
              </div>
              <button
                className="btn btn-light rounded-circle p-2 bg-light border-0"
                onClick={() => setSelectedEvent(null)}
              >
                <X size={20} className="text-dark" />
              </button>
            </div>

            <div className="px-4 pb-4">
              {/* --- 1. ATTENDANCE SELFIE --- */}
              <div
                className="rounded-4 overflow-hidden position-relative shadow-sm cursor-pointer border mb-4 bg-dark"
                style={{ height: "220px" }}
                onClick={() =>
                  setFullScreenImage(
                    `${IMAGE_BASE_URL}${
                      selectedEvent === "IN"
                        ? attRecord.checkin_selfie_url
                        : attRecord.checkout_selfie_url
                    }`
                  )
                }
              >
                <img
                  src={`${IMAGE_BASE_URL}${
                    selectedEvent === "IN"
                      ? attRecord.checkin_selfie_url
                      : attRecord.checkout_selfie_url
                  }`}
                  alt="Selfie"
                  className="w-100 h-100 object-fit-cover"
                />
                <div className="position-absolute top-0 end-0 m-2">
                  <span className="badge bg-black bg-opacity-50 rounded-circle p-2">
                    <Maximize2 size={16} className="text-white" />
                  </span>
                </div>
              </div>

              {/* --- 2. DUTY SECTION (Only if has_duty is true) --- */}
              {attRecord.has_duty && (
                <>
                  <h6 className="fw-bold text-secondary text-uppercase small mb-2 ls-1 d-flex align-items-center">
                    <Car size={16} className="me-2" /> Vehicle Duty Log
                  </h6>

                  <div className="d-flex align-items-center text-primary gap-2 mb-2 px-1">
                    <div
                      className="small opacity-75 text-uppercase fw-bold"
                      style={{ fontSize: "0.7rem" }}
                    >
                      Duty Time:
                    </div>
                    <div className="fw-bold  small">
                      {selectedEvent === "IN"
                        ? attRecord.duty_start_time
                        : attRecord.duty_end_time}
                    </div>
                  </div>

                  <div className="card bg-light border-0 rounded-4 mb-3">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div
                            className="text-secondary small text-uppercase fw-bold"
                            style={{ fontSize: "0.7rem" }}
                          >
                            Odometer Reading
                          </div>
                          <div className="fs-3 fw-bold text-dark mt-1">
                            {selectedEvent === "IN"
                              ? attRecord.start_odo_val
                              : attRecord.end_odo_val}
                            <span className="fs-6 text-muted ms-1">KM</span>
                          </div>
                        </div>

                        {/* Odo Image Thumbnail */}
                        {(selectedEvent === "IN"
                          ? attRecord.start_odo_img
                          : attRecord.end_odo_img) && (
                          <div
                            className="rounded-3 overflow-hidden border bg-white shadow-sm cursor-pointer"
                            style={{ width: "60px", height: "60px" }}
                            onClick={() =>
                              setFullScreenImage(
                                `${IMAGE_BASE_URL}${
                                  selectedEvent === "IN"
                                    ? attRecord.start_odo_img
                                    : attRecord.end_odo_img
                                }`
                              )
                            }
                          >
                            <img
                              src={`${IMAGE_BASE_URL}${
                                selectedEvent === "IN"
                                  ? attRecord.start_odo_img
                                  : attRecord.end_odo_img
                              }`}
                              className="w-100 h-100 object-fit-cover"
                              alt="Odo"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CHECKLIST */}
                  <h6 className="fw-bold text-secondary text-uppercase small mb-2 mt-4 ls-1">
                    Safety Checklist
                  </h6>
                  <div className="border rounded-4 overflow-hidden">
                    {(
                      (selectedEvent === "IN"
                        ? attRecord.start_checklist
                        : attRecord.end_checklist) || []
                    ).map((item, idx) => (
                      <div
                        key={idx}
                        className="d-flex align-items-center justify-content-between p-3 border-bottom bg-white"
                      >
                        <span className="fw-bold text-dark small">
                          {item.name}
                        </span>
                        <div className="d-flex align-items-center gap-3">
                          {item.value ? (
                            <CheckCircle2 size={18} className="text-success" />
                          ) : (
                            <XCircle size={18} className="text-danger" />
                          )}

                          {item.image && (
                            <div
                              className="rounded-2 overflow-hidden border cursor-pointer"
                              style={{ width: "32px", height: "32px" }}
                              onClick={() =>
                                setFullScreenImage(
                                  `${IMAGE_BASE_URL}${item.image}`
                                )
                              }
                            >
                              <img
                                src={`${IMAGE_BASE_URL}${item.image}`}
                                className="w-100 h-100 object-fit-cover"
                                alt="Proof"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {(
                      (selectedEvent === "IN"
                        ? attRecord.start_checklist
                        : attRecord.end_checklist) || []
                    ).length === 0 && (
                      <div className="p-4 text-center small text-muted bg-white">
                        No checklist recorded.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Close Button */}
              <button
                className="btn btn-dark w-100 rounded-pill py-3 fw-bold mt-4 shadow"
                onClick={() => setSelectedEvent(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 3. FULL SCREEN IMAGE LIGHTBOX ============== */}
      {fullScreenImage && (
        <div
          className="fixed-top w-100 h-100 bg-black d-flex align-items-center justify-content-center p-0"
          style={{ zIndex: 2000 }}
          onClick={() => setFullScreenImage(null)}
        >
          <button className="position-absolute top-0 end-0 m-4 btn btn-dark rounded-circle p-3 z-3 bg-opacity-50 border-0">
            <X size={24} className="text-white" />
          </button>
          <img
            src={fullScreenImage}
            className="img-fluid"
            style={{
              maxHeight: "100vh",
              maxWidth: "100vw",
              objectFit: "contain",
            }}
            alt="Full"
          />
        </div>
      )}

      <style>{`
        .ls-1 { letter-spacing: 0.5px; }
        .cursor-pointer { cursor: pointer; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .bg-gradient-to-t { background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); }
      `}</style>
    </div>
  );
};

export default AttendanceDetailPage;