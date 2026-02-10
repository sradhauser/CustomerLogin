import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "../api/Api.js";

// FIXED: Removed the '0' typo and fixed template literal syntax
const getMapLink = (lat, lon) => {
  if (!lat || !lon) return null;
  // Use backticks and ${} for proper template literals
  return `https://www.google.com/maps?q=${lat},${lon}`;
};


const getServerBaseUrl = () => {
  // Use your server IP or localhost specifically
  return `http://192.168.0.37:5000`; 
};

function AdminViewDetails() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get("/admin/attendance");
      const records = res.data.data || [];
      setAttendanceList(records);
    } catch (err) {
      toast.error("Failed to load attendance records.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: "N/A", time: "" };
    
    if (dateString.includes(',')) {
        const [date, time] = dateString.split(', ');
        return { date: date.trim(), time: time.trim() };
    }

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { date: "Invalid Format", time: "" };
    
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) return <div style={styles.loaderContainer}><div style={styles.spinner}></div></div>;

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h2 style={styles.title}>Attendance Records</h2>
            <p style={styles.subtitle}>Review driver logs and verify locations</p>
          </div>
          <div style={styles.statsCard}>
            <span style={styles.statsLabel}>Total Records</span>
            <span style={styles.statsValue}>{attendanceList.length}</span>
          </div>
        </header>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Driver Name</th>
                <th style={styles.th}>Date & Time</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Selfie</th>
              </tr>
            </thead>
            <tbody>
              {attendanceList.map((record) => {
                // record is ONLY defined here, inside the map function
                const { date, time } = formatDateTime(record.created_at);
                const imageUrl = record.selfie_path ? `${getServerBaseUrl()}/${record.selfie_path}` : null;
                
                return (
                  <tr key={record.attendance_id} style={styles.tr}>
                    <td style={styles.td}>#{record.attendance_id}</td>
                    <td style={styles.td}><div style={styles.driverName}>{record.driver_fstname}</div></td>
                    <td style={styles.td}>
                      <div style={styles.dateTime}>
                        <span style={styles.dateText}>{date}</span>
                        <span style={styles.timeLabel}>{time}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {record.latitude ? (
                        <a href={getMapLink(record.latitude, record.longitude)} target="_blank" rel="noreferrer" style={styles.linkButton}>
                          📍 View Map
                        </a>
                      ) : <span style={styles.na}>N/A</span>}
                    </td>
                    <td style={styles.td}>
                      {record.selfie_path ? (
                        <a href={imageUrl} target="_blank" rel="noreferrer" style={styles.photoLink}>
                          <img 
                            src={imageUrl} 
                            alt="Preview" 
                            style={styles.thumbnail} 
                            onError={(e) => { e.target.src = "https://via.placeholder.com/40?text=Error"; }}
                          />
                          <span>View Full</span>
                        </a>
                      ) : <span style={styles.na}>No Photo</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {attendanceList.length === 0 && <div style={styles.empty}>No records found.</div>}
        </div>
      </div>
    </div>
  );
}

// ... styles remain the same ...
const styles = {
  pageWrapper: { backgroundColor: "#f8f9fc", minHeight: "100vh", padding: "40px 20px" },
  container: { maxWidth: "1000px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "30px" },
  title: { fontSize: "26px", color: "#1e293b", margin: 0, fontWeight: "700" },
  subtitle: { color: "#64748b", margin: "5px 0 0", fontSize: "14px" },
  statsCard: { backgroundColor: "white", padding: "10px 20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" },
  statsLabel: { display: "block", fontSize: "10px", color: "#94a3b8", fontWeight: "800", textTransform: "uppercase" },
  statsValue: { fontSize: "22px", fontWeight: "800", color: "#4361ee" },
  tableWrapper: { backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  tableHeadRow: { backgroundColor: "#f8fafc", borderBottom: "2px solid #f1f5f9" },
  th: { padding: "18px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "0.2s" },
  td: { padding: "16px", verticalAlign: "middle", color: "#334155", fontSize: "14px" },
  driverName: { fontWeight: "700", color: "#1e293b" },
  dateTime: { display: "flex", flexDirection: "column" },
  dateText: { fontWeight: "500" },
  timeLabel: { fontSize: "12px", color: "#94a3b8" },
  linkButton: { display: "inline-block", padding: "8px 14px", backgroundColor: "#f0f7ff", color: "#007bff", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: "600" },
  photoLink: { display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "#4361ee", fontSize: "13px", fontWeight: "600" },
  thumbnail: { width: "42px", height: "42px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e2e8f0" },
  na: { color: "#cbd5e1", fontStyle: "italic" },
  empty: { padding: "40px", textAlign: "center", color: "#94a3b8" },
  loaderContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" },
  spinner: { width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #4361ee", borderRadius: "50%", animation: "spin 1s linear infinite" }
};

export default AdminViewDetails;