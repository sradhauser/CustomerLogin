import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle,
  Loader2,
  FileText,
  CreditCard,
  UserCheck,
  ShieldCheck,
  Eye,
  X,
  Edit2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import imageCompression from "browser-image-compression";
import api, { IMAGE_BASE_URL } from "../api/Api.js";

// --- STRICT VALIDATION LOGIC (UNCHANGED) ---
const validateField = (name, value) => {
  if (!value) return true;
  const patterns = {
    aadhar_no: /^\d{12}$/,
    pan_no: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    voter_no: /^[A-Z]{3}[0-9]{7}$/,
    dl_no: /^[A-Z]{2}[0-9]{13}$/,
  };
  return patterns[name] ? patterns[name].test(value) : true;
};

// --- PREVIEW MODAL (BOOTSTRAP STYLE) ---
const ImageModal = ({ isOpen, url, title, onClose }) => {
  if (!isOpen) return null;
  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow bg-transparent">
          <div className="modal-header border-0 p-2">
            <h6 className="modal-title text-white fw-bold">{title}</h6>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body p-0 text-center">
            <img
              src={url}
              alt="Document"
              className="img-fluid rounded-3 shadow-lg"
              style={{ maxHeight: "80vh" }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SINGLE DOCUMENT ITEM COMPONENT (BOOTSTRAP CARD) ---
const DocItem = ({
  title,
  icon: Icon,
  prefix,
  placeholder,
  hasExpiry,
  form,
  handleFile,
  handleInputChange,
  onPreview,
}) => {
  const inputRef = useRef(null);
  const dateRef = useRef(null);
  const [isEditable, setIsEditable] = useState(false);

  const isUploadedLocally = !!form[`${prefix}_file`];
  const isExistingInDb = !!form[`${prefix}_db_url`];
  const progress = form[`${prefix}_progress`];
  const value = form[`${prefix}_no`] || "";
  const isValid = validateField(`${prefix}_no`, value);
  const hasAnyDoc = isUploadedLocally || isExistingInDb;

  // Date Formatter
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "Select Date";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const handleEditClick = () => {
    setIsEditable(true);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const handleInputBlur = () => {
    setIsEditable(false);
  };

  const handleView = () => {
    const url = isUploadedLocally
      ? URL.createObjectURL(form[`${prefix}_file`])
      : `${IMAGE_BASE_URL}${form[`${prefix}_db_url`]}`;
    onPreview(url, title);
  };

  return (
    <div
      className={`card border-0 shadow-sm rounded-4 mb-3 overflow-hidden ${
        hasAnyDoc ? "bg-info bg-opacity-10 border border-success" : "bg-white"
      }`}
    >
      <div className="card-body p-3">
        <div className="d-flex align-items-center">
          {/* ICON BADGE */}
          <div className="flex-shrink-0 me-3">
            <div className="bg-light p-3 rounded-circle text-primary border shadow-sm">
              <Icon size={24} />
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-grow-1 overflow-hidden">
            <div className="d-flex align-items-center mb-1">
              <span className="fw-bold text-uppercase small text-primary me-2">
                {title}
              </span>
              {hasAnyDoc && isValid && (
                <span
                  className="badge  text-success rounded-pill px-2 py-1 d-flex align-items-center"
                  style={{ fontSize: "0.6rem" }}
                >
                  <CheckCircle size={10} className="me-1" /> Verified
                </span>
              )}
            </div>

            {/* Input Field */}
            <div
              className={`d-flex align-items-center border-bottom pb-1 ${
                isEditable
                  ? "border-primary"
                  : "border-secondary border-opacity-25"
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                className="form-control border-0 p-0 shadow-none bg-transparent fw-bold text-dark"
                style={{ fontSize: "0.95rem", letterSpacing: "0.5px" }}
                placeholder={placeholder}
                value={value}
                readOnly={!isEditable}
                onBlur={handleInputBlur}
                maxLength={
                  prefix === "aadhar" ? 12 : prefix === "pan" ? 10 : 15
                }
                onChange={(e) =>
                  handleInputChange(`${prefix}_no`, e.target.value, prefix)
                }
              />
              <button
                className="btn btn-link p-0 text-muted"
                onClick={handleEditClick}
                title="Edit Number"
              >
                <Edit2 size={16} />
              </button>
            </div>

            {/* Expiry Date (Only for DL) */}
            {hasExpiry && (
              <div className="mt-2 d-flex align-items-center">
                <span
                  className="text-danger fw-bold x-small me-2"
                  style={{ fontSize: "0.7rem" }}
                >
                  EXPIRY:
                </span>
                <div
                  className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 cursor-pointer position-relative"
                  onClick={() => dateRef.current.showPicker()}
                  style={{ cursor: "pointer" }}
                >
                  {formatDateDisplay(form.dl_expiry)}
                  <input
                    ref={dateRef}
                    type="date"
                    className="position-absolute top-0 start-0 opacity-0 w-100 h-100"
                    value={form.dl_expiry}
                    onChange={(e) =>
                      handleInputChange("dl_expiry", e.target.value)
                    }
                  />
                </div>
              </div>
            )}

            {/* Validation Error Message */}
            {!isValid && value && (
              <div
                className="text-danger fw-bold mt-1"
                style={{ fontSize: "0.7rem" }}
              >
                Incorrect format
              </div>
            )}
          </div>

          {/* ACTIONS (Upload / View Logic Changed Here) */}
          <div className="d-flex flex-column gap-2 ms-2">
            {hasAnyDoc ? (
              // --- IF DOC EXISTS: SHOW VIEW BUTTON ONLY ---
              <button
                className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center border"
                style={{ width: "40px", height: "40px" }}
                title="View Document"
                onClick={handleView}
              >
                <Eye size={18} className="text-success" />
              </button>
            ) : (
              // --- IF NO DOC: SHOW UPLOAD BUTTON ONLY ---
              <label
                className={`btn rounded-circle shadow-sm d-flex align-items-center justify-content-center border cursor-pointer ${
                  isUploadedLocally
                    ? "btn-primary text-white"
                    : "btn-light text-primary"
                }`}
                style={{ width: "40px", height: "40px", cursor: "pointer" }}
                title="Upload Document"
              >
                <input
                  type="file"
                  hidden
                  onChange={(e) => handleFile(e, prefix)}
                  accept=".jpg,.jpeg,.png,.pdf"
                />
                {progress > 0 && progress < 100 ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UploadCloud size={18} />
                )}
              </label>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && progress < 100 && (
          <div className="progress mt-2" style={{ height: "3px" }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentsPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, url: "", title: "" });

  const [form, setForm] = useState({
    aadhar_no: "",
    aadhar_file: null,
    aadhar_progress: 0,
    aadhar_db_url: "",
    pan_no: "",
    pan_file: null,
    pan_progress: 0,
    pan_db_url: "",
    voter_no: "",
    voter_file: null,
    voter_progress: 0,
    voter_db_url: "",
    dl_no: "",
    dl_file: null,
    dl_expiry: "",
    dl_progress: 0,
    dl_db_url: "",
  });

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data } = await api.get("/auth/get-driver-documents");
        // console.log("Fetched Documents:", data);
        if (data.success) {
          const updatedForm = { ...form };
          const map = { 7: "voter", 8: "pan", 9: "aadhar", 35: "dl" };
          data.documents.forEach((doc) => {
            const p = map[doc.idnt_type];
            // console.log("Mapping doc type", doc.idnt_type, "to", p);
            if (p) {
              updatedForm[`${p}_no`] = doc.idnt_no || "";
              updatedForm[`${p}_db_url`] = doc.idnt_copy || "";
              if (p === "dl")
                updatedForm.dl_expiry = doc.idnt_expdt?.split("T")[0] || "";
            }
          });
          setForm(updatedForm);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const handleInputChange = (field, value, prefix) => {
    let cleanValue = value;
    if (prefix === "aadhar") cleanValue = value.replace(/\D/g, "");
    else if (prefix) cleanValue = value.toUpperCase(); // For non-date fields
    else cleanValue = value; // For date field (no prefix passed)

    setForm((prev) => ({ ...prev, [field]: cleanValue }));
  };

  // --- NEW: COMPRESSED UPLOAD LOGIC ---
  const handleFile = async (e, prefix) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024)
      return toast.error("File exceeds 5MB limit");

    // Start Fake Progress Bar for Feedback
    setForm((prev) => ({ ...prev, [`${prefix}_progress`]: 10 }));

    try {
      // Compress Image Logic
      const options = {
        maxSizeMB: 0.1, // Compress to ~100KB
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };

      let uploadFile = file;
      // Only compress images, skip PDFs
      if (file.type.startsWith("image/")) {
        uploadFile = await imageCompression(file, options);
      }

      // Simulate upload progress
      let p = 10;
      const interval = setInterval(() => {
        p += 20;
        if (p > 90) clearInterval(interval);
        else setForm((prev) => ({ ...prev, [`${prefix}_progress`]: p }));
      }, 50);

      // Set Compressed File
      setTimeout(() => {
        clearInterval(interval);
        setForm((prev) => ({
          ...prev,
          [`${prefix}_file`]: uploadFile,
          [`${prefix}_progress`]: 100,
        }));
        toast.success("Document processed & attached");
      }, 600);
    } catch (error) {
      toast.error("Error processing file");
      setForm((prev) => ({ ...prev, [`${prefix}_progress`]: 0 }));
    }
  };

  const handleSubmit = async () => {
    // Small haptic touch on click
    navigator.vibrate?.(50);

    // A. Validation
    if (form.aadhar_no && !validateField("aadhar_no", form.aadhar_no)) {
      return toast.error("Invalid Aadhaar (12 digits required)");
    }

    if (form.pan_no && !validateField("pan_no", form.pan_no)) {
      return toast.error("Invalid PAN format");
    }

    setIsSubmitting(true);

    // B. Premium loading alert
    Swal.fire({
      title: "📤 Uploading Documents...",
      html: `
      <div style="font-size:14px;color:#555">
        Verifying details & photos<br/>
        Please wait...
      </div>
    `,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: "#fef3e8",
      color: "#2563eb",
      customClass: { popup: "swal2-rounded" },
      didOpen: () => Swal.showLoading(),
    });

    // C. Prepare FormData
    const formData = new FormData();

    ["aadhar", "pan", "voter", "dl"].forEach((key) => {
      const noKey = `${key}_no`;
      const fileKey = `${key}_file`;

      if (form[noKey]) {
        formData.append(noKey, form[noKey]);
      }

      if (form[fileKey]) {
        formData.append(fileKey, form[fileKey]);
      }
    });

    if (form.dl_expiry) {
      formData.append("dl_expiry", form.dl_expiry);
    }

    try {
      const res = await api.post("/auth/update-all-documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigator.vibrate?.(120);

      // D. Native success alert before navigation
      await Swal.fire({
        icon: "success",
        title: " Upload Successful",
        text: res.data?.message || "Documents Synced Successfully!",
        timer: 1600,
        showConfirmButton: false,
        background: "#ecfdf5",
        customClass: { popup: "swal2-rounded" },
      });

      navigate("/dashboard");
    } catch (err) {
      navigator.vibrate?.(200);

      console.error("Document upload error:", err);

      // E. Premium native error alert
      await Swal.fire({
        icon: "error",
        title: "⚠ Sync Failed",
        html: `
        <div style="font-size:14px;color:#444">
          ${err.response?.data?.message || "Update failed. Please try again."}
        </div>
      `,
        timer: 2000,
        showConfirmButton: false,
        background: "#fff1f2",
        customClass: { popup: "swal2-rounded" },
      });

      toast.error("Update failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-white">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div
      className="container-fluid p-0 bg-white min-dvh-100"
      style={{ paddingBottom: "100px" }}
    >
      <div className="bg-info text-white p-4 rounded-bottom-4 shadow-sm mb-4 position-relative overflow-hidden">
        <FileText
          size={140}
          className="position-absolute text-white opacity-10"
          style={{ right: -30, top: -20, transform: "rotate(15deg)" }}
        />
        <h2 className="fw-bold mb-1">My Documents</h2>
        <p className="mb-0 opacity-75 small">Upload & Verify your Identity</p>
      </div>

      {/* Main Content Wrapper (Added px-3 for side spacing) */}
      <div className="mx-auto px-2" style={{ maxWidth: "600px" }}>
        {/* Info Alert */}
        <div
          className="alert alert-danger d-flex align-items-center shadow-sm rounded-4 border-0 mb-3"
          role="alert"
        >
          <Info size={24} className="me-3 flex-shrink-0" />
          <div style={{ fontSize: "0.8rem", lineHeight: "1.4" }}>
            <span className="fw-bold">Upload Guidelines:</span> Max 5MB per
            file. Supports JPG, PNG, PDF. <br /> Aadhaar must contain 12 digits.
          </div>
        </div>

        {/* Document Items */}
        <DocItem
          title="Aadhaar Card"
          icon={FileText}
          prefix="aadhar"
          placeholder="1234 5678 9012"
          form={form}
          handleFile={handleFile}
          handleInputChange={handleInputChange}
          onPreview={(url, title) => setModal({ open: true, url, title })}
        />

        {/* ... Rest of your DocItems (PAN, Voter, DL) ... */}

        <DocItem
          title="PAN Card"
          icon={CreditCard}
          prefix="pan"
          placeholder="ABCDE1234F"
          form={form}
          handleFile={handleFile}
          handleInputChange={handleInputChange}
          onPreview={(url, title) => setModal({ open: true, url, title })}
        />

        {/* ... (Keep the rest of your existing code the same) ... */}

        <DocItem
          title="Voter Card"
          icon={UserCheck}
          prefix="voter"
          placeholder="ABC1234567"
          form={form}
          handleFile={handleFile}
          handleInputChange={handleInputChange}
          onPreview={(url, title) => setModal({ open: true, url, title })}
        />
        <DocItem
          title="Driving License"
          icon={ShieldCheck}
          prefix="dl"
          placeholder="OD0000000000000"
          hasExpiry
          form={form}
          handleFile={handleFile}
          handleInputChange={handleInputChange}
          onPreview={(url, title) => setModal({ open: true, url, title })}
        />

        {/* Submit Button */}
        <button
          className="btn btn-primary w-100 py-3 rounded-4 fw-bold shadow-lg d-flex align-items-center justify-content-center mt-4 mb-2"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ fontSize: "1rem", letterSpacing: "0.5px" }}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin me-2" size={24} />
          ) : (
            "SYNC ALL DOCUMENTS"
          )}
        </button>
      </div>

      {/* Preview Modal */}
      <ImageModal
        isOpen={modal.open}
        url={modal.url}
        title={modal.title}
        onClose={() => setModal({ open: false, url: "", title: "" })}
      />
    </div>
  );
};

export default DocumentsPage;