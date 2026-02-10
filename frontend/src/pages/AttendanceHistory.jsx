import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import api from "../api/Api.js";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable"; // Install react-swipeable if not already

const AttendanceHistory = () => {
  const navigate = useNavigate();

  /* ================= 1. DATE LOGIC (UNCHANGED) ================= */
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const todayDateStr = new Date(today.getTime() - offset)
    .toISOString()
    .split("T")[0];

  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const currentYear = today.getFullYear();

  /* ================= STATE ================= */
  const [attendanceList, setAttendanceList] = useState([]);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const driverId = localStorage.getItem("driverRegNo");

  /* ================= API ================= */
  const fetchAttendance = async (initial = false) => {
    initial ? setLoading(true) : setCalendarLoading(true);
    try {
      const res = await api.get(
        `/attendanceHistory/${driverId}/${month}/${year}`
      );
      setAttendanceList(res.data?.data || []);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      initial ? setLoading(false) : setCalendarLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(true);
  }, []);

  useEffect(() => {
    fetchAttendance(false);
  }, [month, year]);

  /* ================= DATA PARSER ================= */
  const attendanceMap = useMemo(() => {
    return attendanceList.reduce((acc, item) => {
      if (!item.checkin_datetime) return acc;
      try {
        let dateKey = "";
        const rawDate = item.checkin_datetime;
        if (rawDate.includes("/")) {
          const datePart = rawDate.split(",")[0].trim();
          const [d, m, y] = datePart.split("/");
          dateKey = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else if (rawDate.includes("-")) {
          const dateObj = new Date(rawDate);
          if (!isNaN(dateObj)) {
            dateKey = dateObj.toISOString().split("T")[0];
          }
        }
        if (dateKey) {
          acc[dateKey] = true;
        }
      } catch (error) {
        console.error("Date Parse Error:", item.checkin_datetime);
      }
      return acc;
    }, {});
  }, [attendanceList]);

  /* ================= CALENDAR CALCULATIONS ================= */
  const selectedYear = parseInt(year);
  const selectedMonth = parseInt(month) - 1;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();

  /* ================= NAVIGATION ================= */
  const handleDayClick = (day, status) => {
    if (status === "P") {
      const d = String(day).padStart(2, "0");
      navigate(`/attendance-log/${d}/${month}/${year}`);
    }
  };

  // --- SWIPE LOGIC ---
  const changeMonth = (direction) => {
    let newMonth = parseInt(month) + direction;
    let newYear = parseInt(year);

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setMonth(String(newMonth).padStart(2, "0"));
    setYear(String(newYear));
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => changeMonth(1),
    onSwipedRight: () => changeMonth(-1),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  /* ================= SUMMARY LOGIC ================= */
  const totalPresent = Object.keys(attendanceMap).filter(
    (date) => date <= todayDateStr
  ).length;

  const totalDaysConsidered = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(
      2,
      "0"
    )}-${String(d).padStart(2, "0")}`;
    if (dateStr < todayDateStr) return true;
    if (dateStr === todayDateStr && attendanceMap[dateStr]) return true;
    return false;
  }).filter(Boolean).length;

  const totalAbsent = totalDaysConsidered - totalPresent;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-white">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-white pb-5">
      {/* 1. PREMIUM HEADER */}
      <div className="bg-primary text-white p-4 rounded-bottom-4 shadow-sm mb-4 position-relative overflow-hidden">
        <CalendarIcon
          size={140}
          className="position-absolute text-white opacity-10"
          style={{ right: -20, top: -10, transform: "rotate(15deg)" }}
        />
        <div className="position-relative z-1 mt-2">
          <h2 className="fw-bold mb-0">Attendance</h2>
          <p className="mb-0 opacity-75 small">Track your monthly activity</p>
        </div>
      </div>

      <div className="container px-3" style={{ maxWidth: "600px" }}>
        {/* 2. STATS CARDS (Top) */}
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
              <div className="card-body p-3 position-relative">
                <div className="position-absolute top-0 end-0 p-3 opacity-10">
                  <CheckCircle size={40} className="text-success" />
                </div>
                <div className="small fw-bold text-secondary text-uppercase ls-1">
                  Present
                </div>
                <div className="d-flex align-items-end mt-2">
                  <h2 className="fw-bold text-success mb-0 me-2">
                    {totalPresent}
                  </h2>
                  <small className="text-muted mb-1">Days</small>
                </div>
              </div>
              <div className="bg-success" style={{ height: "4px" }}></div>
            </div>
          </div>

          <div className="col-6">
            <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
              <div className="card-body p-3 position-relative">
                <div className="position-absolute top-0 end-0 p-3 opacity-10">
                  <XCircle size={40} className="text-danger" />
                </div>
                <div className="small fw-bold text-secondary text-uppercase ls-1">
                  Absent
                </div>
                <div className="d-flex align-items-end mt-2">
                  <h2 className="fw-bold text-danger mb-0 me-2">
                    {totalAbsent}
                  </h2>
                  <small className="text-muted mb-1">Days</small>
                </div>
              </div>
              <div className="bg-danger" style={{ height: "4px" }}></div>
            </div>
          </div>
        </div>

        {/* 3. CONTROLS (Month/Year Selects) */}
        <div className="card border-0 shadow-sm rounded-4 mb-3 bg-white">
          <div className="card-body p-2">
            <div className="row g-2">
              {/* Month Select */}
              <div className="col-7">
                <div className="position-relative">
                  <select
                    className="form-select border-0 bg-light fw-bold text-dark py-3 ps-3 rounded-3"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{ appearance: "none", cursor: "pointer" }}
                  >
                    {monthNames.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, "0")}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted pointer-events-none"
                  />
                </div>
              </div>

              {/* Year Select */}
              <div className="col-5">
                <div className="position-relative">
                  <select
                    className="form-select border-0 bg-light fw-bold text-dark py-3 ps-3 rounded-3 text-center"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ appearance: "none", cursor: "pointer" }}
                  >
                    <option value={currentYear}>{currentYear}</option>
                    <option value={currentYear - 1}>{currentYear - 1}</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CALENDAR GRID (Swipeable) */}
        <div
          className="card border-0 shadow-sm rounded-4 position-relative overflow-hidden bg-white"
          {...handlers}
        >
          <div className="card-body p-3">
            {calendarLoading && (
              <div
                className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex align-items-center justify-content-center"
                style={{ zIndex: 10 }}
              >
                <div className="spinner-border text-primary spinner-border-sm"></div>
              </div>
            )}

            {/* Weekdays Header */}
            <div
              className="d-grid text-center mb-2 pb-2 border-bottom"
              style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
            >
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div
                  key={i}
                  className={`small fw-bold py-1 ${
                    i === 0 || i === 6 ? "text-danger" : "text-secondary"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div
              className="d-grid gap-2"
              style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
            >
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${selectedYear}-${String(
                  selectedMonth + 1
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                const isFuture = dateStr > todayDateStr;
                const isToday = dateStr === todayDateStr;

                let status = null;
                // Strict Logic check
                if (dateStr < todayDateStr) {
                  status = attendanceMap[dateStr] ? "P" : "A";
                }
                if (isToday) {
                  status = attendanceMap[dateStr] ? "P" : null;
                }

                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day, status)}
                    className={`d-flex flex-column align-items-center justify-content-center rounded-3 py-1 position-relative ${
                      isToday
                        ? "bg-primary bg-opacity-10 border border-primary border-opacity-25"
                        : ""
                    } ${
                      status === "P" ? "cursor-pointer active-scale-down" : ""
                    }`}
                    style={{
                      minHeight: "60px",
                      opacity: isFuture ? 0.3 : 1,
                    }}
                  >
                    <span
                      className={`fw-bold small ${
                        isToday ? "text-primary" : "text-dark"
                      }`}
                      style={{ fontSize: "0.9rem" }}
                    >
                      {day}
                    </span>

                    {/* STATUS INDICATORS (Using 'P'/'A' Badge style as requested) */}
                    <div style={{ height: "18px", marginTop: "2px" }}>
                      {status === "P" && (
                        <span
                          className="badge bg-success rounded-pill px-1 lh-1"
                          style={{
                            fontSize: "9px",
                            paddingTop: "3px",
                            paddingBottom: "2px",
                          }}
                        >
                          P
                        </span>
                      )}
                      {status === "A" && (
                        <span
                          className="badge bg-danger rounded-pill px-1 lh-1"
                          style={{
                            fontSize: "9px",
                            paddingTop: "3px",
                            paddingBottom: "2px",
                          }}
                        >
                          A
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-top d-flex justify-content-center gap-4 text-muted x-small">
              <div className="d-flex align-items-center gap-1">
                <span
                  className="badge bg-success rounded-pill px-1"
                  style={{ fontSize: "9px" }}
                >
                  P
                </span>{" "}
                Present
              </div>
              <div className="d-flex align-items-center gap-1">
                <span
                  className="badge bg-danger rounded-pill px-1"
                  style={{ fontSize: "9px" }}
                >
                  A
                </span>{" "}
                Absent
              </div>
              <div className="d-flex align-items-center gap-1">
                <div
                  className="bg-primary bg-opacity-10 border border-primary rounded"
                  style={{ width: "12px", height: "12px" }}
                ></div>{" "}
                Today
              </div>
            </div>
            <div className="mt-3 bg-light rounded-3 p-2 text-center border border-light-subtle">
              <small
                className="text-muted d-block"
                style={{ fontSize: "0.75rem", lineHeight: "1.4" }}
              >
                <span className="fw-bold text-dark">Note:</span> Tap on any{" "}
                <span className="text-success fw-bold">Present (P)</span> day to
                view full Punch In/Out & Vehicle Duty details.
              </small>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .ls-1 { letter-spacing: 0.5px; }
        .cursor-pointer { cursor: pointer; }
        .active-scale-down:active { transform: scale(0.95); transition: 0.1s; }
        .x-small { font-size: 0.75rem; }
        .pointer-events-none { pointer-events: none; }
      `}</style>
    </div>
  );
};

export default AttendanceHistory;