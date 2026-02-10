import React, { useState, useRef, useEffect } from "react";
import {
  Fuel,
  Gauge,
  MapPin,
  Camera,
  UploadCloud,
  Hash,
  History,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
// 1. Import API and the Image URL constant
import api, { IMAGE_BASE_URL } from "../api/Api";

// --- COMPRESSION HELPER FUNCTION (Unchanged) ---
const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
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
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.6
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const RefuelPage = () => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // History State
  const [logs, setLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [fullImage, setFullImage] = useState(null);

  const [form, setForm] = useState({
    stationName: "",
    liters: "",
    pricePerLiter: "",
    amount: "",
    odometer: "",
    paymentMode: "Cash",
    transactionId: "",
    receipt: null,
    receiptPreview: null,
  });

  // --- FETCH HISTORY ---
  const fetchHistory = async () => {
    const driverRegNo = localStorage.getItem("driverRegNo");
    if (!driverRegNo) return;

    try {
      setHistoryLoading(true);
      const response = await api.get(`/refuel/fuelloghistory/${driverRegNo}`);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("History fetch error", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Auto-calculate Total
  useEffect(() => {
    const l = parseFloat(form.liters);
    const p = parseFloat(form.pricePerLiter);
    if (!isNaN(l) && !isNaN(p)) {
      setForm((prev) => ({ ...prev, amount: (l * p).toFixed(2) }));
    }
  }, [form.liters, form.pricePerLiter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "odometer" && value.length > 6) return;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setCompressing(true);
        const compressedFile = await compressImage(file);
        setForm({
          ...form,
          receipt: compressedFile,
          receiptPreview: URL.createObjectURL(compressedFile),
        });
        toast.success("Receipt processed Successfully!");
      } catch (error) {
        toast.error("Failed to process image");
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const driverRegNo = localStorage.getItem("driverRegNo");

    if (!driverRegNo)
      return toast.error("Driver not identified. Please login again.");
    if (!form.stationName || !form.amount || !form.receipt || !form.odometer) {
      return toast.error("Please fill all details & upload receipt");
    }
    if (form.paymentMode !== "Cash" && !form.transactionId) {
      return toast.error("Please enter the Payment Reference / UPI No.");
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("driver_id", driverRegNo);
    formData.append("station_name", form.stationName);
    formData.append("liters", form.liters);
    formData.append("price_per_liter", form.pricePerLiter);
    formData.append("total_amount", form.amount);
    formData.append("odometer", form.odometer);
    formData.append("payment_mode", form.paymentMode);
    formData.append("transaction_id", form.transactionId || "");
    formData.append("receipt_image", form.receipt);

    try {
      const response = await api.post("/refuel/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        await Swal.fire({
          icon: "success",
          title: "Refuel Added",
          text: "Expenses logged successfully!",
          confirmButtonColor: "#0d6efd",
          customClass: { popup: "rounded-4" },
        });

        setForm({
          stationName: "",
          liters: "",
          pricePerLiter: "",
          amount: "",
          odometer: "",
          paymentMode: "Cash",
          transactionId: "",
          receipt: null,
          receiptPreview: null,
        });
        fetchHistory();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to save refuel data"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- HELPER TO CONSTRUCT IMAGE URL SAFELY ---
  const getReceiptUrl = (filename) => {
    if (!filename) return "";
    // Combines env base url + uploads path + filename
    return `${IMAGE_BASE_URL}/uploads/refuel_receipt/${filename}`;
  };

  return (
    <div className="container-fluid p-0 bg-white min-vh-100 pb-4 position-relative">
      {/* Header */}
      <div className="bg-primary text-white p-4 rounded-bottom-4 shadow-sm mb-4 position-relative overflow-hidden">
        <Fuel
          size={140}
          className="position-absolute text-white opacity-10"
          style={{ right: -30, top: -20, transform: "rotate(15deg)" }}
        />
        <h2 className="fw-bold mb-1">Add Refuel</h2>
        <p className="mb-0 opacity-75 small">Log fuel expenses & upload bill</p>
      </div>

      <div className="px-3" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          {/* Station Details */}
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="form-floating mb-3">
              <input
                type="text"
                className="form-control fw-bold fs-5"
                id="stationName"
                name="stationName"
                placeholder="Station Name"
                value={form.stationName}
                onChange={handleInputChange}
              />
              <label htmlFor="stationName">
                <MapPin size={16} className="me-2 text-primary" /> Station Name
              </label>
            </div>
            <div className="row g-2">
              <div className="col-4">
                <div className="form-floating">
                  <input
                    type="number"
                    className="form-control fw-bold"
                    id="liters"
                    name="liters"
                    placeholder="Liters"
                    inputMode="decimal"
                    value={form.liters}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="liters" className="small text-muted">
                    Vol (L)
                  </label>
                </div>
              </div>
              <div className="col-4">
                <div className="form-floating">
                  <input
                    type="number"
                    className="form-control fw-bold"
                    id="pricePerLiter"
                    name="pricePerLiter"
                    placeholder="Rate"
                    inputMode="decimal"
                    value={form.pricePerLiter}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="pricePerLiter" className="small text-muted">
                    Rate/L
                  </label>
                </div>
              </div>
              <div className="col-4">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control fw-bold text-success bg-light"
                    id="amount"
                    placeholder="Total"
                    value={form.amount}
                    readOnly
                  />
                  <label
                    htmlFor="amount"
                    className="small text-success fw-bold"
                  >
                    Total ₹
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Odometer & Payment */}
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
            <div className="input-group mb-4">
              <span className="input-group-text bg-light border-end-0 rounded-start-4 ps-3">
                <Gauge size={22} className="text-secondary" />
              </span>
              <div className="form-floating flex-grow-1">
                <input
                  type="number"
                  className="form-control border-start-0 rounded-end-4 fw-bold fs-5"
                  id="odometer"
                  name="odometer"
                  placeholder="Odometer"
                  inputMode="numeric"
                  value={form.odometer}
                  onChange={handleInputChange}
                />
                <label htmlFor="odometer">Odometer (6 digits)</label>
              </div>
            </div>
            <div className="d-flex gap-2 overflow-auto pb-2 mb-2 no-scrollbar">
              {["Cash", "UPI", "Debit Card", "Credit Card"].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setForm({ ...form, paymentMode: mode })}
                  className={`btn rounded-pill px-3 py-2 fw-bold border transition-all ${
                    form.paymentMode === mode
                      ? "btn-dark shadow-sm"
                      : "btn-light text-muted border-0 bg-light"
                  }`}
                  style={{ whiteSpace: "nowrap", flex: "0 0 auto" }}
                >
                  {mode}
                </button>
              ))}
            </div>
            {form.paymentMode !== "Cash" && (
              <div className="animate-fade-in mt-2">
                <div className="form-floating">
                  <input
                    type="text"
                    className="form-control fw-bold border-warning"
                    id="transactionId"
                    name="transactionId"
                    placeholder="Txn ID"
                    value={form.transactionId}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="transactionId" className="text-warning">
                    <Hash size={16} className="me-1" /> Payment Ref No / UPI ID
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          <div
            className="card border-0 shadow-sm rounded-4 p-1 bg-white overflow-hidden"
            onClick={() => !compressing && fileInputRef.current.click()}
          >
            <input
              type="file"
              hidden
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
            />
            {form.receiptPreview ? (
              <div className="position-relative">
                <img
                  src={form.receiptPreview}
                  alt="Receipt"
                  className="img-fluid object-fit-cover"
                  style={{ height: "220px", width: "100%" }}
                />
                <div className="position-absolute bottom-0 w-100 p-3 bg-gradient-to-t from-black text-white text-center">
                  <small className="fw-bold">
                    <Camera size={16} className="me-1" /> Tap to retake photo
                  </small>
                </div>
              </div>
            ) : (
              <div className="py-5 bg-light d-flex flex-column align-items-center justify-content-center cursor-pointer hover-bg-gray">
                {compressing ? (
                  <div className="spinner-border text-primary mb-3"></div>
                ) : (
                  <div className="bg-white p-3 rounded-circle shadow-sm mb-3">
                    <Camera size={32} className="text-primary" />
                  </div>
                )}
                <span className="fw-bold text-dark fs-5">
                  {compressing ? "Compressing..." : "Upload Bill Photo"}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || compressing}
            className="btn btn-primary btn-lg rounded-pill fw-bold shadow-lg py-2 mt-2 d-flex align-items-center justify-content-center gap-2"
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <>
                <UploadCloud size={22} /> SAVE REFUELING
              </>
            )}
          </button>
        </form>

        {/* --- HISTORY LIST --- */}
        <div className="mt-5 mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3 px-1">
            <h5 className="fw-bold text-secondary mb-0 d-flex align-items-center gap-2">
              <History size={20} /> Recent Logs
            </h5>
            <span className="badge bg-white text-secondary border shadow-sm rounded-pill px-3 py-1">
              Last 10
            </span>
          </div>

          {historyLoading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5 text-muted opacity-50">
              No history available
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="card border-0 shadow-sm rounded-4 p-3 bg-white active-scale-down cursor-pointer position-relative overflow-hidden"
                >
                  <div
                    className={`position-absolute top-0 bottom-0 start-0 w-1 ${
                      log.status === "Approved" ? "bg-success" : "bg-warning"
                    }`}
                    style={{ width: "6px" }}
                  ></div>
                  <div className="d-flex align-items-center justify-content-between ps-2">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                          log.status === "Approved"
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning"
                        }`}
                        style={{ width: "45px", height: "45px" }}
                      >
                        <Fuel size={20} />
                      </div>
                      <div>
                        <h6
                          className="fw-bold mb-0 text-dark text-truncate"
                          style={{ maxWidth: "160px" }}
                        >
                          {log.station_name}
                        </h6>
                        <small
                          className="text-muted d-flex align-items-center gap-1"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {new Date(log.created_at).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short" }
                          )}
                          ,
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </div>
                    <div className="text-end">
                      <h6 className="fw-bold mb-0 text-dark">
                        ₹{log.total_amount}
                      </h6>
                      <span
                        className={`badge rounded-pill ${
                          log.status === "Approved"
                            ? "bg-success-subtle text-success"
                            : "bg-warning-subtle text-warning-emphasis"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ 1. BOTTOM SHEET TRANSACTION DETAILS ======== */}
      {selectedLog && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 9990,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setSelectedLog(null)}
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
              zIndex: 9995,
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
                <h5 className="fw-bold mb-0 text-dark">Transaction Details</h5>
                <small className="text-muted">Trip Expense</small>
              </div>
              <button
                className="btn btn-light rounded-circle p-2 bg-light border-0"
                onClick={() => setSelectedLog(null)}
              >
                <X size={20} className="text-dark" />
              </button>
            </div>

            <div className="px-4 pb-4">
              {/* 1. HERO CARD (Premium Gradient) */}
              <div
                className="p-4 rounded-4 mb-4 text-white shadow-sm position-relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #212529 0%, #343a40 100%)",
                }}
              >
                {/* Background pattern decorative */}
                <Fuel
                  size={120}
                  className="position-absolute text-white opacity-10"
                  style={{ right: -20, top: -20, transform: "rotate(20deg)" }}
                />

                <div className="d-flex justify-content-between align-items-start position-relative z-1">
                  <div>
                    <span className="opacity-75 small text-uppercase fw-bold ls-1">
                      Total Amount
                    </span>
                    <h1 className="display-5 fw-bold mb-0 mt-1">
                      ₹{selectedLog.total_amount}
                    </h1>
                  </div>
                  <span
                    className={`badge rounded-pill px-3 py-2 border ${
                      selectedLog.status === "Approved"
                        ? "bg-success text-white border-success"
                        : "bg-warning text-dark border-warning"
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {/* 2. COMPACT DETAILS GRID */}
              <h6
                className="fw-bold mb-3 text-secondary"
                style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}
              >
                DETAILS
              </h6>
              <div className="bg-light rounded-4 p-3 mb-4 border border-light-subtle">
                <div className="row g-3">
                  {/* Date */}
                  <div className="col-6">
                    <label
                      className="text-muted x-small fw-bold text-uppercase"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Date & Time
                    </label>
                    <div className="fw-bold text-dark text-truncate">
                      {new Date(selectedLog.created_at).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </div>
                    <small
                        className="text-muted"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {new Date(selectedLog.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true 
                        })}
                      </small>
                  </div>

                  {/* Station */}
                  <div className="col-6 ps-3 border-start">
                    <label
                      className="text-muted x-small fw-bold text-uppercase"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Station
                    </label>
                    <div className="fw-bold text-dark text-truncate">
                      {selectedLog.station_name}
                    </div>
                    <small
                      className="text-muted"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Odisha
                    </small>
                  </div>

                  <div className="col-12">
                    <hr className="my-1 opacity-10" />
                  </div>

                  {/* Volume & Price */}
                  <div className="col-6">
                    <label
                      className="text-muted x-small fw-bold text-uppercase"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Volume
                    </label>
                    <div className="fw-bold text-dark">
                      {selectedLog.liters} L
                    </div>
                  </div>
                  <div className="col-6 ps-3 border-start">
                    <label
                      className="text-muted x-small fw-bold text-uppercase"
                      style={{ fontSize: "0.65rem" }}
                    >
                      Price / L
                    </label>
                    <div className="fw-bold text-dark">
                      ₹
                      {(
                        selectedLog.price_per_liter ||
                        selectedLog.total_amount / selectedLog.liters
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. RECEIPT PREVIEW (Click to Expand) */}
              <h6
                className="fw-bold mb-3 text-secondary"
                style={{ fontSize: "0.8rem", letterSpacing: "0.5px" }}
              >
                RECEIPT SNAPSHOT
              </h6>
              <div
                className="rounded-4 overflow-hidden position-relative shadow-sm cursor-pointer border"
                style={{ height: "180px" }}
                onClick={() =>
                  setFullImage(getReceiptUrl(selectedLog.receipt_image))
                }
              >
                {/* Image fills the box (cover) */}
                <img
                  src={getReceiptUrl(selectedLog.receipt_image)}
                  alt="Receipt"
                  className="w-100 h-100 object-fit-cover hover-zoom transition-all"
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/600x400/png?text=No+Receipt";
                  }}
                />

                {/* Overlay Icon */}
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-10 d-flex align-items-center justify-content-center opacity-0 hover-opacity-100 transition-all">
                  <div className="bg-white rounded-circle p-3 shadow">
                    <Camera size={24} className="text-primary" />
                  </div>
                </div>

                {/* Text Hint */}
                <div className="position-absolute bottom-0 end-0 m-2">
                  <span
                    className="badge bg-black bg-opacity-75 rounded-pill px-2 py-1 backdrop-blur font-monospace"
                    style={{ fontSize: "10px" }}
                  >
                    Tap to view full
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                className="btn btn-dark w-100 rounded-pill py-3 fw-bold mt-4 shadow"
                onClick={() => setSelectedLog(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 2. FULL SCREEN IMAGE LIGHTBOX ============== */}
      {fullImage && (
        <div
          className="fixed-top w-100 h-100 bg-black d-flex align-items-center justify-content-center p-0"
          style={{ zIndex: 10000 }}
          onClick={() => setFullImage(null)}
        >
          {/* Close Button for Lightbox */}
          <button
            className="position-absolute top-0 end-0 m-4 btn btn-dark rounded-circle p-3 z-3 bg-opacity-50 border-0"
            onClick={() => setFullImage(null)}
          >
            <X size={24} className="text-white" />
          </button>

          <img
            src={fullImage}
            alt="Full Receipt"
            className="img-fluid"
            style={{
              maxHeight: "100vh",
              maxWidth: "100vw",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {/* Helper CSS for this page */}
      <style>{`
        .hover-zoom:hover { transform: scale(1.05); }
        .cursor-pointer { cursor: pointer; }
        .backdrop-blur { backdrop-filter: blur(4px); }
        .transition-all { transition: all 0.3s ease; }
        .hover-opacity-100:hover { opacity: 1 !important; }
        .ls-1 { letter-spacing: 1px; }
      `}</style>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .active-scale-down:active { transform: scale(0.98); transition: transform 0.1s; }
      `}</style>
    </div>
  );
};

export default RefuelPage;