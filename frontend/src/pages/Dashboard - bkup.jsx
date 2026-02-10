import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Car,
  Smartphone,
  PhoneCall,
  Mail,
  Loader2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";
import Swal from "sweetalert2";
import api, { IMAGE_BASE_URL } from "../api/Api.js";
import { socket } from "../api/socket";

// --- IMAGE COMPRESSION UTILITY (Target ~100KB) ---
const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Reduced max width for smaller file size
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        const newWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        const newHeight =
          img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Quality 0.5 usually results in <100KB for 800px images
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
          0.5
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem("driverToken"));

  // Refs for auto-opening camera
  const odoCameraRef = useRef(null);

  // UI & Logic States
  const [gpsData, setGpsData] = useState(null);
  const [locationAddress, setLocationAddress] = useState(""); // New state for address

  // Attendance Image (Selfie)
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  // Duty Images (Odometer)
  const [odoImage, setOdoImage] = useState(null);
  const [odoPreview, setOdoPreview] = useState(null);
  // const [startOdoVal, setStartOdoVal] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [todayTrips, setTodayTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Logic Variables
  const [attendanceList, setAttendanceList] = useState([]);
  const [isLoadingDuty, setIsLoadingDuty] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [dutyStatus, setDutyStatus] = useState(0);

  // Derived States for Attendance
  const hasAttendance = attendanceList.length > 0;
  const isOnline = hasAttendance && Number(attendanceList[0]?.ck_sts) === 1; // Punched In
  const isCheckedOut = hasAttendance && Number(attendanceList[0]?.ck_sts) === 2; // Punched Out

  // Dates
  const today = new Date();
  const currentDate = today.toISOString().split("T")[0];
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const currentYear = today.getFullYear();

  const [notes, setNotes] = useState(""); // Used for Odometer reading now

  // Checklist State: { [itemId]: { value: 1/0, image: File } }
  const [checklistData, setChecklistData] = useState({});

  const [date, setDate] = useState(String(currentDate));
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(currentYear));

  // Modals / Form Visibility
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showDutyForm, setShowDutyForm] = useState(false);
  const [dutyType, setDutyType] = useState(""); // "START" or "END"

  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    driverId: "",
    email: "",
    driver_photo: null,
  });

  const driverId = localStorage.getItem("driverRegNo");
  const [checklistItems, setChecklistItems] = useState([]);
  const fetchItemsDetails = async () => {
    try {
      const res = await api.get("/sendItems");
      const rawData = res.data?.data || [];

      const formattedList = rawData.map((item) => ({
        id: item.id,
        name: item.item_names,
        needsPhoto: [1, 2, 3].includes(Number(item.id)),
      }));

      setChecklistItems(formattedList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Checklist");
    }
  };

  const fetchAssignedTrip = async () => {
    try {
      setLoadingTrips(true);
      const regNo = localStorage.getItem("driverRegNo");
      if (!regNo) {
        setTodayTrips([]);
        return;
      }
      const res = await api.get(`/driver/assigned-trip?driver_regno=${regNo}`);
      const tripData = Array.isArray(res.data) ? res.data : [res.data];
      if (tripData.length > 0 && tripData[0].drv_tripid) {
        setTodayTrips(tripData);
      } else {
        setTodayTrips([]);
      }
    } catch (err) {
      setTodayTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  };

  // 3. Call fetchItemsDetails on load
  useEffect(() => {
    fetchItemsDetails();
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchProfileDetails();
    fetchAttendance();

    const regNo = localStorage.getItem("driverRegNo");
    if (regNo) {
      fetchAssignedTrip();
      socket.emit("join_app_session", regNo);
    } else {
      setTimeout(() => fetchAssignedTrip(), 500);
    }

    const handleNewTrip = (data) => {
      new Audio("/sounds/trip_alert.mp3").play().catch(() => {});
      toast.success(`NEW TRIP: ${data.message || "Check your dashboard"}`, {
        duration: 8000,
        position: "top-center",
      });
      fetchAssignedTrip();
    };
    socket.on("new_trip_alert", handleNewTrip);
    return () => socket.off("new_trip_alert", handleNewTrip);
  }, [token]);

  const fetchProfileDetails = async () => {
    try {
      const res = await api.get("/auth/profile");
      setProfile(res.data);
    } catch (err) {
      toast.error("Profile sync failed");
    }
  };

  const fetchAttendance = async () => {
    try {
      const dayOnly = date.includes("-") ? date.split("-")[2] : date;
      const res = await api.get(
        `/attendanceCheckDate/${driverId}/${dayOnly}/${month}/${year}`
      );
      // console.log("DASHBOARD DATA:", res.data?.data);
      setAttendanceList(res.data?.data || []);
    } catch {
      toast.error("Failed to load attendance");
    }
  };

  const fetchLocationName = async (latitude, longitude) => {
    // 1. Check if coordinates exist
    // console.log("📍 Fetching Location for:", latitude, longitude);
    if (!latitude || !longitude) return "Invalid Coordinates";

    // 2. Check API Key
    const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
    // console.log(
    //   "🔑 API Key Status:",
    //   API_KEY ? "Loaded" : "MISSING (Check .env)"
    // );

    if (!API_KEY) return "Unknown Location (No Key)";

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`
      );
      const data = await res.json();

      // 3. Check what Google actually replied
      // console.log("📡 Google API Response:", data);

      if (data.status === "OK" && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.error("❌ Geocoding Failed:", data.status, data.error_message);
        return "Unknown Location";
      }
    } catch (err) {
      console.error("❌ Network Error:", err);
      return "Unknown Location";
    }
  };

  // --- ACTION HANDLERS ---
  // New function to fetch GPS
  // const getGpsLocation = () => {
  //   setGpsData(null); // Clear previous data
  //   setLocationAddress("");

  //   toast.loading("📍 Fetching Location...", { id: "gps" });

  //   if (!navigator.geolocation) {
  //     return toast.error("GPS not supported.");
  //   }

  //   navigator.geolocation.getCurrentPosition(
  //     async (position) => {
  //       toast.dismiss("gps");
  //       const lat = position.coords.latitude;
  //       const lng = position.coords.longitude;

  //       setGpsData({
  //         latitude: lat,
  //         longitude: lng,
  //         accuracy: position.coords.accuracy,
  //       });

  //       // Fetch address
  //       const address = await fetchLocationName(lat, lng);
  //       setLocationAddress(address);
  //       toast.success("Location Verified!");
  //     },
  //     (error) => {
  //       toast.dismiss("gps");
  //       toast.error("Location access denied or failed.");
  //       console.error(error);
  //     },
  //     { enableHighAccuracy: true, timeout: 10000 }
  //   );
  // };

  const getGpsLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Save data
        setGpsData({ latitude, longitude, accuracy });

        // Fetch address in background
        try {
          const addr = await fetchLocationName(latitude, longitude);
          setLocationAddress(addr);
        } catch (e) {
          setLocationAddress("Unknown Location");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("GPS Error", error);
        setIsLocating(false);
        toast.error("GPS Signal Weak. Please stand outside.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // --- HELPER: Get Date/Time for Display ---
  const getCurrentTimeDetails = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString("en-GB"), // 05/01/2026
      time: now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }), // 10:30 AM
    };
  };
  const handlePunchAction = (type) => {
    // 1. Reset UI
    setImage(null);
    setPreview(null);
    setGpsData(null);
    setLocationAddress("");

    // 2. Start GPS NOW (While user opens camera)
    getGpsLocation();

    // 3. Open Camera (Native Input)
    setTimeout(() => {
      document.getElementById("attendanceCamera").click();
    }, 100);
  };

  // const fetchDutyStatus = async () => {
  //   setIsLoadingDuty(true);
  //   const currentRegNo = localStorage.getItem("driverRegNo");

  //   if (!currentRegNo) {
  //     console.warn("No driver found ");
  //     setIsLoadingDuty(false); // Stop loading if no ID
  //     return;
  //   }

  //   // 1. ROBUST DATE: Get YYYY-MM-DD from the phone's local time
  //   const localDate = new Date().toLocaleDateString("en-CA");

  //   try {
  //     // 2. Pass the date in the URL as a query parameter
  //     const res = await api.get(
  //       `/duty/status/${currentRegNo}?date=${localDate}`
  //     );

  //     const statusFromApi = res.data?.dutyStatus;
  //     const start_odovalue = res.data?.start_odo_val || 0;
  //     // Default to 0 (Not Started) if undefined or null
  //     const finalStatus =
  //       statusFromApi !== undefined && statusFromApi !== null
  //         ? Number(statusFromApi)
  //         : 0;

  //     setDutyStatus(finalStatus);
  //     setStartOdoVal(start_odovalue);

  //     // Set internal type logic
  //     if (finalStatus === 1) {
  //       setDutyType("END");
  //     } else {
  //       setDutyType("START");
  //     }
  //   } catch (err) {
  //     console.error("Fetch duty status error:", err);
  //     // On error, we assume status 0 so the user isn't stuck
  //     setDutyStatus(0);
  //     setDutyType("START");
  //   } finally {
  //     // 3. STOP LOADING regardless of success or error
  //     setIsLoadingDuty(false);
  //   }
  // };
  const fetchDutyStatus = async () => {
    setIsLoadingDuty(true);
    const currentRegNo = localStorage.getItem("driverRegNo");

    if (!currentRegNo) {
      console.warn("No driver found ");
      setIsLoadingDuty(false);
      return;
    }

    const localDate = new Date().toLocaleDateString("en-CA");

    try {
      const res = await api.get(
        `/duty/status/${currentRegNo}?date=${localDate}`
      );

      const statusFromApi = res.data?.dutyStatus;
      let start_odovalue = res.data?.start_odo_val || 0; // Default from main API

      const finalStatus =
        statusFromApi !== undefined && statusFromApi !== null
          ? Number(statusFromApi)
          : 0;

      // if (finalStatus === 1) {
      //   try {
      //     // Call the new separate API that ignores dates
      //     const resOdo = await api.get(`/duty/active-odo/${currentRegNo}`);

      //     // If this API returns a value, use it! It's more accurate for validation.
      //     if (resOdo.data?.start_odo) {
      //       //  console.log("🔥 Fixed Start Odo:", resOdo.data.start_odo);
      //       start_odovalue = resOdo.data.start_odo;
      //     }
      //   } catch (err) {
      //     console.error("Active Odo Check Failed, using fallback", err);
      //   }
      // }
      // -----------------------------------------------------------

      setDutyStatus(finalStatus);
      // setStartOdoVal(start_odovalue);

      if (finalStatus === 1) {
        setDutyType("END");
      } else {
        setDutyType("START");
      }
    } catch (err) {
      console.error("Fetch duty status error:", err);
      setDutyStatus(0);
      setDutyType("START");
    } finally {
      setIsLoadingDuty(false);
    }
  };

  // Ensure this useEffect is present to trigger it
  useEffect(() => {
    // Only fetch if we have a valid driver identifier
    if (driverId) {
      fetchDutyStatus();
    }
  }, [driverId]);

  // // 2. START / END DUTY (Odometer + Checklist)
  // const handleDutyAction = (type) => {
  //   setDutyType(type);
  //   setShowDutyForm(true);
  //   setShowAttendanceForm(false);

  //   // Reset Duty Form State
  //   setOdoImage(null);
  //   setOdoPreview(null);
  //   setNotes(""); // Odometer Value
  //   setChecklistData({});

  //   // Auto open Odometer Camera
  //   setTimeout(() => {
  //     if (odoCameraRef.current) odoCameraRef.current.click();
  //   }, 500);
  // };
  const handleDutyAction = (type) => {
    setDutyType(type);

    // 1. DO NOT Show Form Yet
    // setShowDutyForm(true); <--- REMOVED
    setShowAttendanceForm(false);

    // 2. Reset Data
    setOdoImage(null);
    setOdoPreview(null);
    setNotes("");
    setChecklistData({});

    // 3. Open Camera
    setTimeout(() => {
      if (odoCameraRef.current) odoCameraRef.current.click();
    }, 200);
  };

  // --- IMAGE HANDLERS ---
  // const handleSelfieCapture = async (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     const toastId = toast.loading("Processing Selfie...");
  //     try {
  //       // 1. Compress and Set Image
  //       const compressed = await compressImage(file);
  //       setImage(compressed);
  //       setPreview(URL.createObjectURL(compressed));
  //       toast.dismiss(toastId);

  //       // 2. TRIGGER GPS NOW (While user looks at preview)
  //       getGpsLocation();
  //     } catch (err) {
  //       toast.dismiss(toastId);
  //       toast.error("Error processing image");
  //     }
  //   } else {
  //     // If user cancels camera, close the form or handle accordingly
  //     setShowAttendanceForm(true);
  //   }
  // };

  // --- CAPTURE: UI Only After Photo ---
  const handleSelfieCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const toastId = toast.loading("Processing Selfie...");
      try {
        const compressed = await compressImage(file);
        setImage(compressed);
        setPreview(URL.createObjectURL(compressed));

        // 4. NOW show the preview layout
        setShowAttendanceForm(true);

        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Error processing image");
      }
    }
  };

  // const handleOdoCapture = async (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     const toastId = toast.loading("Compressing Odometer...");
  //     try {
  //       const compressed = await compressImage(file);
  //       setOdoImage(compressed);
  //       setOdoPreview(URL.createObjectURL(compressed));
  //       toast.dismiss(toastId);
  //     } catch (err) {
  //       toast.dismiss(toastId);
  //       toast.error("Error processing image");
  //     }
  //   }
  // };
  const handleOdoCapture = async (e) => {
    const file = e.target.files[0];

    if (file) {
      const toastId = toast.loading("Processing Odometer...");
      try {
        const compressed = await compressImage(file);
        setOdoImage(compressed);
        setOdoPreview(URL.createObjectURL(compressed));

        // 4. NOW Show the Form (Because photo exists)
        setShowDutyForm(true);

        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Error processing image");
      }
    } else {
      // User Cancelled Camera: Do nothing.
      // Form remains hidden.
    }
  };

  const handleChecklistPhoto = async (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const toastId = toast.loading("Compressing...");
      try {
        const compressed = await compressImage(file);
        setChecklistData((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            image: compressed,
            imagePreview: URL.createObjectURL(compressed),
          },
        }));
        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("Error processing image");
      }
    }
  };

  const handleChecklistValue = (id, val) => {
    setChecklistData((prev) => ({
      ...prev,
      [id]: { ...prev[id], value: val },
    }));
  };

  // --- SUBMIT FUNCTIONS (PUNCH IN/OUT) ---
  const handleAttendanceSubmit = async () => {
    // A. Validation with gentle haptic style feedback
    if (!image) {
      return toast.error("📸 Please take a selfie to continue");
    }

    // B. GPS Wait Lock – driver friendly messages
    if (!gpsData) {
      if (isLocating) {
        return toast.info("📍 Fetching accurate location, please wait...");
      } else {
        getGpsLocation();
        return toast.warning("📡 Location missing – retrying GPS...");
      }
    }

    setSubmitting(true);

    // C. Styled Swal loading – modern card feel
    // Swal.fire({
    //   title: "🚚 Punch In",
    //   html: `
    //   <div style="font-size:15px;color:#555">
    //     Verifying your location<br/>
    //     Syncing attendance...
    //   </div>
    // `,
    //   background: "#f0f7ff",
    //   color: "#2563eb",
    //   allowOutsideClick: false,
    //   showConfirmButton: false,
    //   didOpen: () => {
    //     Swal.showLoading();
    //   },
    //   customClass: {
    //     popup: "swal2-rounded",
    //   },
    // });

    try {
      const formData = new FormData();

      formData.append("selfie", image);
      formData.append("latitude", gpsData.latitude);
      formData.append("longitude", gpsData.longitude);
      formData.append("locationName", locationAddress || "Unknown");
      formData.append("accuracy", gpsData.accuracy);

      const btnParam = !attendanceList?.length
        ? 0
        : isOnline
        ? attendanceList[0]?.drv_atid
        : 0;

      formData.append("btnParameter", btnParam);

      const res = await api.post("/attendance", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // D. Success dialog – looks like Android material card
      await Swal.fire({
        icon: "success",
        title: "✅ Attendance Marked",
        text: res.data.message,
        background: "#ecfeff",
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: "native-android-alert",
        },
      });

      // E. Smooth state update
      setShowAttendanceForm(false);
      setImage(null);
      setPreview(null);
      fetchAttendance();

      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);

      // F. Error dialog – bold but friendly
      Swal.fire({
        icon: "error",
        title: "⚠ Punch Failed",
        html: `
        <div style="font-size:14px">
          ${
            err.response?.data?.message || "Connection error. Please try again."
          }
        </div>
      `,
        background: "#fff1f2",
        confirmButtonText: "Retry",
        confirmButtonColor: "#dc2626",
        showClass: {
          popup: "swal2-animate-shake",
        },
      });
    }
  };
  // B. DUTY SUBMIT (Start/End Duty)
  const handleDutySubmit = async () => {
    // A. Simple Validations
    if (!odoImage) {
      navigator.vibrate?.(80);
      return toast.error("📸 Odometer photo required");
    }

    if (!notes) {
      navigator.vibrate?.(80);
      return toast.error("⌨ Enter odometer reading");
    }

    // ---------------------------------------------------------
    // B. LOGIC: Check End Reading > Start Reading
    // ... inside handleDutySubmit ...
    // if (dutyType === "END") {
    //   const currentInput = parseFloat(notes);
    //   const startDbValue = parseFloat(startOdoVal);

    //   // Now startDbValue will be 1200 (from new API), so this check passes!
    //   if (startDbValue > 0 && currentInput <= startDbValue) {
    //     navigator.vibrate?.(200);
    //     return toast.error(
    //       `Reading must be greater than start value (${startDbValue})`
    //     );
    //   }
    // }

    // C. Checklist Validation
    for (let item of checklistItems) {
      const data = checklistData[item.id];
      if (data?.value === undefined) {
        navigator.vibrate?.(80);
        return toast.warning(`Please verify: ${item.name}`);
      }
    }

    setSubmitting(true);

    // // Loading Alert
    // Swal.fire({
    //   title: dutyType === "START" ? "🚚 Starting..." : "🏁 Ending...",
    //   text: "Please wait...",
    //   allowOutsideClick: false,
    //   showConfirmButton: false,
    //   didOpen: () => Swal.showLoading(),
    // });

    try {
      const buttonParameter = dutyType === "START" ? 1 : 2;
      const formData = new FormData();

      // Append Data
      formData.append("odometer_image", odoImage);
      formData.append("odometerValue", notes);

      const checklistPayload = {};
      checklistItems.forEach((item) => {
        const data = checklistData[item.id];
        checklistPayload[item.id] = { name: item.name, value: data.value };
        if (data?.image) {
          formData.append(`checklist_image_${item.id}`, data.image);
          checklistPayload[item.id].image = data.image.name;
        }
      });

      formData.append("ci_itemchkstatus", JSON.stringify(checklistPayload));
      formData.append("buttonParameter", buttonParameter);
      formData.append("driverId", driverId);

      // API Call
      const endpoint = "/duty/duty";
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigator.vibrate?.(120);

      // ---------------------------------------------------------
      // D. SUCCESS -> SWEET ALERT (As requested)
      // ---------------------------------------------------------
      await Swal.fire({
        icon: "success",
        title: buttonParameter === 1 ? "🟢 Duty Started" : "🔴 Duty Ended",
        text: res.data.message || `Duty ${dutyType} Successfully`,
        background: "#ecfeff",
        timer: 1700,
        showConfirmButton: false,
        customClass: { popup: "swal2-rounded" },
      });

      setDutyStatus(buttonParameter);
      setShowDutyForm(false);
    } catch (err) {
      navigator.vibrate?.(200);
      // Close the loading swal
      Swal.close();
      toast.error(err.response?.data?.message || "Sync Failed. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- STYLES ---
  const styles = {
    mainWrapper: {
      minHeight: "100dvh",
      background: "#ffffffff",
      display: "flex",
      justifyContent: "center",
    },
    appContainer: {
      width: "100%",
      maxWidth: "480px",
      background: "#ffffffff",
      minHeight: "100dvh",
      position: "relative",
      paddingBottom: "140px",
    },
    nativeCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px", // Rounded corners like modern Android
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)", // Soft elevation
      overflow: "hidden",
    },
    profileImg: {
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "2px solid #ff6600ff",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
    profileInitial: {
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      backgroundColor: "#e0f7fa",
      color: "#006064",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "22px",
      border: "2px solid #fff",
      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    },
    statBox: {
      backgroundColor: "#f8f9fa",
      borderRadius: "12px",
      padding: "12px",
      height: "100%",
      position: "relative",
      border: "1px solid rgba(0,0,0,0.03)",
    },
    label: {
      fontSize: "0.90rem",
      color: "#0059ffff",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      fontWeight: "600",
      marginBottom: "4px",
    },

    pill: {
      fontSize: "0.85rem",
      fontWeight: "700",
      padding: "2px 8px",
      borderRadius: "10px",
      display: "inline-block",
    },
    stickyFooter: {
      position: "fixed",
      bottom: "64px", // space for bottom nav
      left: "50%",
      transform: "translateX(-50%)",

      width: "100%",
      maxWidth: "420px",

      background: "#ffffff",
      padding: "14px",

      borderRadius: "25px",

      zIndex: 1000,
    },
    btnGradient: {
      width: "100%",
      height: "40px",

      background: "linear-gradient(135deg, #2563eb, #1e40af)",
      border: "none",
      color: "#ffffff",

      borderRadius: "999px",
      fontSize: "16px",
      fontWeight: "600",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
    btnDanger: {
      width: "100%",
      height: "40px",

      background: "linear-gradient(135deg, #ef4444, #b91c1c)",
      border: "none",
      color: "#ffffff",

      borderRadius: "999px",
      fontSize: "16px",
      fontWeight: "600",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
    uploadBox: {
      background: "#f8fafc",
      border: "2px dashed #cbd5e1",
      borderRadius: "12px",
      height: "150px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      overflow: "hidden",
      position: "relative",
    },
    imgPreview: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
  };
  {
    isLoadingDuty && (
      <div className="text-center py-3">
        <Loader2 className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div style={styles.mainWrapper}>
      <div style={styles.appContainer}>
        <div className="px-2 pt-2">
          <div className="card border-0 mb-3" style={styles.nativeCard}>
            <div className="card-body p-3">
              {/* --- HEADER SECTION: Photo & Name --- */}
              <div className="d-flex align-items-center mb-3">
                <div className="me-3">
                  {profile.driver_photo ? (
                    <img
                      src={`${IMAGE_BASE_URL}${profile.driver_photo}`}
                      alt="Driver"
                      style={styles.profileImg}
                    />
                  ) : (
                    <div style={styles.profileInitial}>
                      {profile.fullName
                        ? profile.fullName.charAt(0).toUpperCase()
                        : "D"}
                    </div>
                  )}
                </div>

                <div className="flex-grow-1 overflow-hidden">
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>
                    Welcome,
                  </span>
                  <h6
                    className="mb-0 text-info fw-bold text-truncate"
                    style={{ fontSize: "1.1rem" }}
                  >
                    {profile.fullName || "Unknown Driver"}
                  </h6>
                  <div
                    className="text-dark small fw-bold text-truncate"
                    style={{ fontSize: "1rem" }}
                  >
                    {getCurrentTimeDetails().date}
                  </div>
                </div>
              </div>

              {/* --- STATS SECTION: Grid Layout --- */}
              <div className="row g-2">
                {/* Operation Stat */}
                <div className="col-6">
                  <div style={styles.statBox}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div style={styles.label}>Operations No.</div>
                    </div>
                    <div
                      style={styles.pill}
                      className="bg-danger-subtle text-dark"
                    >
                      8337911112
                    </div>
                  </div>
                </div>

                {/* Refuel Stat */}
                <div className="col-6">
                  <div style={styles.statBox}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div style={styles.label}>Refuels No.</div>
                      </div>
                    </div>
                    <div
                      style={styles.pill}
                      className="bg-warning-subtle text-dark"
                    >
                      8337911115
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Don't show while fetching status (prevents flicker)
           // 2. User MUST be Punched In (Attendance) to start driving
           // 3. User must NOT have an start duty (0=New)*/}
          {!isLoadingDuty && isOnline && dutyStatus === 0 && (
            <div className="mb-4 animate__animated animate__fadeIn">
              <button
                className="btn btn-success w-100 py-2 rounded-4 fw-bold shadow-sm d-flex align-items-center justify-content-center"
                onClick={() => handleDutyAction("START")}
              >
                <Car className="me-2" /> START DUTY
              </button>
            </div>
          )}

          {/* === DUTY FORM (Start or End) === */}
          {showDutyForm && (
            <div
              className="card mb-4 border-0 shadow-sm animate__animated animate__fadeInUp"
              style={{ borderRadius: "20px" }}
            >
              <div className="card-header bg-white border-0 pt-4 px-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold m-0 text-primary">
                    {dutyType === "START"
                      ? "Start Duty Checklist"
                      : "End Duty Checklist"}
                  </h5>
                  <button
                    className="btn btn-sm btn-light rounded-circle"
                    onClick={() => setShowDutyForm(false)}
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
              <div className="card-body px-4 pb-4">
                {/* 1. Odometer Section */}
                <label className="fw-bold small text-muted mb-2">
                  1. Odometer{" "}
                </label>
                <div
                  style={styles.uploadBox}
                  className="mb-3"
                  onClick={() => document.getElementById("odoCamera").click()}
                >
                  {odoPreview ? (
                    <img src={odoPreview} alt="odo" style={styles.imgPreview} />
                  ) : (
                    <div className="text-center text-secondary">
                      <Camera size={30} className="mb-2" />
                      <div className="small fw-bold">
                        Tap to Capture Odometer
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-floating mb-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-control bg-light border-0 fw-bold"
                    placeholder="Val"
                    value={notes}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setNotes(value);
                    }}
                  />
                  <label>Odometer Reading (KM)</label>
                </div>

                {/* 2. Checklist Section */}
                <h6 className="fw-bold border-bottom pb-2 mb-3">
                  2. Vehicle Checklist
                </h6>
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="mb-3 pb-3 border-bottom border-light"
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span
                        className="small fw-bold"
                        style={{ maxWidth: "60%" }}
                      >
                        {item.name}
                      </span>
                      <div className="btn-group btn-group-sm">
                        <button
                          className={`btn ${
                            checklistData[item.id]?.value === 1
                              ? "btn-success"
                              : "btn-outline-secondary"
                          }`}
                          onClick={() => handleChecklistValue(item.id, 1)}
                        >
                          Yes
                        </button>
                        <button
                          className={`btn ${
                            checklistData[item.id]?.value === 0
                              ? "btn-danger"
                              : "btn-outline-secondary"
                          }`}
                          onClick={() => handleChecklistValue(item.id, 0)}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {/* Show Upload Button is selected AND item needs photo */}
                    {item.needsPhoto && checklistData[item.id] && (
                      <div className="mt-2">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          id={`check_img_${item.id}`}
                          onChange={(e) => handleChecklistPhoto(item.id, e)}
                        />
                        <button
                          className="btn btn-sm btn-light border w-100 text-primary d-flex align-items-center justify-content-center"
                          onClick={() =>
                            document
                              .getElementById(`check_img_${item.id}`)
                              .click()
                          }
                        >
                          {checklistData[item.id]?.image ? (
                            <>
                              <CheckCircle2 size={14} className="me-2" /> Photo
                              Uploaded
                            </>
                          ) : (
                            <>
                              <Camera size={14} className="me-2" /> Upload Photo
                            </>
                          )}
                        </button>
                        {checklistData[item.id]?.imagePreview && (
                          <div
                            className="mt-2 rounded overflow-hidden"
                            style={{ height: "60px", width: "60px" }}
                          >
                            <img
                              src={checklistData[item.id]?.imagePreview}
                              className="w-100 h-100 object-fit-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  className={`btn w-100 py-2 rounded-4 fw-bold mt-2 ${
                    dutyType === "START" ? "btn-primary" : "btn-danger"
                  }`}
                  onClick={handleDutySubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" />
                  ) : dutyType === "START" ? (
                    "CONFIRM START DUTY"
                  ) : (
                    "CONFIRM END DUTY"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* === TRIPS LIST === */}
          {/* <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
            <span className="small fw-bolder text-info text-uppercase ls-1">
              Today's Trips
            </span>
          </div> */}

          <div className="trip-list mb-2 px-1">
            <div className="d-flex align-items-center justify-content-between mb-3 px-1">
              <h6
                className="fw-bold mb-0 text-info"
                style={{ letterSpacing: "0.5px" }}
              >
                TODAY'S TRIPS
              </h6>
              <span
                className="badge rounded-pill bg-primary bg-opacity-10 text-primary px-3 py-2"
                style={{ fontSize: "0.7rem" }}
              >
                {todayTrips.length} TRIPS
              </span>
            </div>

            {loadingTrips ? (
              <div className="d-flex flex-column align-items-center py-5">
                <div
                  className="spinner-border text-primary"
                  role="status"
                  style={{ width: "1.5rem", height: "1.5rem" }}
                ></div>
                <span className="mt-2 small text-muted">Fetching trips...</span>
              </div>
            ) : todayTrips.length > 0 ? (
              todayTrips.map((trip) => (
                <div
                  key={trip.drv_tripid}
                  className="card border-0 mb-3 shadow-sm position-relative overflow-hidden"
                  onClick={() => navigate(`/my-trips/${trip.drv_tripid}`)}
                  style={{
                    borderRadius: "16px",
                    transition: "transform 0.2s ease",
                    borderLeft: "5px solid #fd7e14", // Brand accent strip
                  }}
                >
                  <div className="card-body p-3">
                    {/* Header: ID and Time */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span
                          className="text-muted fw-bold"
                          style={{ fontSize: "0.7rem", letterSpacing: "1px" }}
                        >
                          TRIP ID: #{trip.drv_tripid}
                        </span>
                      </div>
                      <div className="text-end">
                        <div
                          className="fw-bold text-dark"
                          style={{ fontSize: "1.1rem" }}
                        >
                          {trip.tstart_datetime
                            ? new Date(trip.tstart_datetime).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "--:--"}
                        </div>
                        <small
                          className="text-muted d-block"
                          style={{ fontSize: "0.65rem", marginTop: "-4px" }}
                        >
                          Report Time
                        </small>
                      </div>
                    </div>

                    {/* Location with Timeline UI */}
                    <div className="d-flex align-items-start mb-3">
                      <div className="d-flex flex-column align-items-center me-3">
                        <div
                          className="rounded-circle bg-primary"
                          style={{
                            width: "10px",
                            height: "10px",
                            marginTop: "6px",
                          }}
                        ></div>
                        <div
                          style={{
                            width: "2px",
                            height: "25px",
                            background:
                              "repeating-linear-gradient(to bottom, #ccc, #ccc 2px, transparent 2px, transparent 4px)",
                          }}
                        ></div>
                        <div
                          className="rounded-circle border border-secondary"
                          style={{ width: "10px", height: "10px" }}
                        ></div>
                      </div>

                      <div className="flex-grow-1">
                        <div
                          className="fw-bold text-dark text-truncate"
                          style={{ fontSize: "0.95rem", maxWidth: "200px" }}
                        >
                          {trip.tsgps_locname || "Pickup Point"}
                        </div>
                        <div className="small text-muted">
                          Primary Pickup Location
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                      <div
                        className="d-flex align-items-center text-success fw-semibold"
                        style={{ fontSize: "0.75rem" }}
                      >
                        <span
                          className="p-1 bg-success rounded-circle me-2 animate-pulse"
                          style={{ width: "6px", height: "6px" }}
                        ></span>
                        Ready for dispatch
                      </div>
                      <div
                        className="text-primary fw-bold"
                        style={{ fontSize: "0.75rem" }}
                      >
                        VIEW DETAILS{" "}
                        <i className="bi bi-chevron-right ms-1"></i>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-5 bg-white rounded-4 shadow-sm border-0">
                <div className="bg-light d-inline-block p-3 rounded-circle mb-3">
                  <i
                    className="bi bi-car-front-fill text-muted"
                    style={{ fontSize: "2rem" }}
                  ></i>
                </div>
                <h6 className="fw-bold text-dark">No Trips Assigned</h6>
                <p className="small text-muted px-4">
                  Your schedule is empty for today. New assignments will appear
                  here.
                </p>
              </div>
            )}

            <style>
              {`
                  .animate-pulse {
                    animation: pulse-animation 2s infinite;
                  }
                  @keyframes pulse-animation {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                  }
                `}
            </style>
          </div>

          {/* Show END DUTY only if:
              1. Not Loading
              2. User is CHECKED OUT (Punched Out)
              3. Duty is still STARTED (1) 
          */}
          {!isLoadingDuty &&
            isCheckedOut &&
            dutyStatus === 1 &&
            !showDutyForm && (
              <div className="mb-4 animate__animated animate__fadeIn">
                <button
                  className="btn btn-danger w-100 py-2 rounded-4 fw-bold border-2 d-flex align-items-center justify-content-center"
                  onClick={() => handleDutyAction("END")}
                >
                  <AlertCircle className="me-2" /> END DUTY
                </button>
              </div>
            )}
        </div>
      </div>

      {/* === STICKY FOOTER (Punch In / Out) === */}
      {/* Show Footer only if NOT submitting duty form to avoid clutter, or always show */}
      {/* === STICKY FOOTER === */}
      {!showDutyForm && (
        <div style={styles.stickyFooter}>
          {/* ================= PUNCH IN LOGIC ================= */}
          {!hasAttendance && (
            <>
              {showAttendanceForm && preview ? (
                /* --- PREVIEW LAYOUT (Only shown AFTER photo) --- */
                <div className="animate__animated animate__fadeInUp">
                  {/* 1. The Image Card */}
                  <div className="card border-0 shadow-sm mb-2 overflow-hidden rounded-4">
                    <div
                      style={{
                        height: "200px",
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      <img
                        src={preview}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        alt="Preview"
                      />
                    </div>
                  </div>

                  {/* 2. Info Row (Date, Time, Location) */}
                  <div className="bg-light rounded-3 p-2 mb-3 border">
                    <div className="d-flex justify-content-between mb-1 border-bottom pb-1">
                      <span className="small fw-bold text-muted">
                        Date:{" "}
                        <span className="text-dark">
                          {getCurrentTimeDetails().date}
                        </span>
                      </span>
                      <span className="small fw-bold text-muted">
                        Time:{" "}
                        <span className="text-dark">
                          {getCurrentTimeDetails().time}
                        </span>
                      </span>
                    </div>
                    <div className="d-flex align-items-center text-primary small fw-bold">
                      <MapPin size={14} className="me-1" />
                      <span className="text-truncate">
                        {locationAddress || "Locating..."}
                      </span>
                    </div>
                  </div>

                  {/* 3. Actions */}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-light flex-grow-1 text-muted fw-bold"
                      onClick={() => {
                        setShowAttendanceForm(false);
                        setPreview(null);
                        setImage(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary flex-grow-1 fw-bold text-white shadow-sm"
                      onClick={handleAttendanceSubmit}
                      disabled={submitting || !locationAddress}
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "SUBMIT"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* --- DEFAULT BUTTON (Shown initially) --- */
                <button
                  style={styles.btnGradient}
                  onClick={() => handlePunchAction("IN")}
                >
                  <Camera size={18} className="me-2" /> PUNCH IN (Attendance)
                </button>
              )}
            </>
          )}

          {/* ================= PUNCH OUT LOGIC ================= */}
          {isOnline &&
            (dutyStatus === 1 || dutyStatus === 2 || dutyStatus === 0) && (
              <>
                {showAttendanceForm && preview ? (
                  /* --- PREVIEW LAYOUT (Punch Out) --- */
                  <div className="animate__animated animate__fadeInUp">
                    {/* Image */}
                    <div className="card border-0 shadow-sm mb-2 overflow-hidden rounded-4">
                      <div
                        style={{
                          height: "200px",
                          width: "100%",
                          position: "relative",
                        }}
                      >
                        <img
                          src={preview}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          alt="Preview"
                        />
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="bg-light rounded-3 p-2 mb-3 border">
                      <div className="d-flex justify-content-between mb-1 border-bottom pb-1">
                        <span className="small fw-bold text-muted">
                          Date:{" "}
                          <span className="text-dark">
                            {getCurrentTimeDetails().date}
                          </span>
                        </span>
                        <span className="small fw-bold text-muted">
                          Time:{" "}
                          <span className="text-dark">
                            {getCurrentTimeDetails().time}
                          </span>
                        </span>
                      </div>
                      <div className="d-flex align-items-center text-primary small fw-bold">
                        <MapPin size={14} className="me-1" />
                        <span className="text-truncate">
                          {locationAddress || "Locating..."}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-light flex-grow-1 text-muted fw-bold"
                        onClick={() => {
                          setShowAttendanceForm(false);
                          setPreview(null);
                          setImage(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-danger flex-grow-1 fw-bold text-white shadow-sm"
                        onClick={handleAttendanceSubmit}
                        disabled={submitting || !locationAddress}
                      >
                        {submitting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          "SUBMIT"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- DEFAULT BUTTON --- */
                  <button
                    style={styles.btnDanger}
                    onClick={() => handlePunchAction("OUT")}
                  >
                    <Camera size={18} className="me-2" /> PUNCH OUT (Attendance)
                  </button>
                )}
              </>
            )}
        </div>
      )}

      {/* HIDDEN INPUTS */}
      {/* 1. Attendance Camera */}
      <input
        type="file"
        accept="image/*"
        capture="user"
        id="attendanceCamera"
        hidden
        onChange={handleSelfieCapture}
      />

      {/* 2. Odometer Camera */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        id="odoCamera"
        hidden
        ref={odoCameraRef}
        onChange={handleOdoCapture}
      />
    </div>
  );
};

export default DashboardPage;