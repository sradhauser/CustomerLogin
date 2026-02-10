import React, { useEffect, useState } from "react";
import api from "../api/Api.js"; 
import { 
  MapPin, Phone, Mail, Clock, CheckCircle, AlertTriangle, 
  ChevronLeft, ChevronRight, User, CarFront
} from "lucide-react";

const SOSAdminPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Driver"); // 'Driver' or 'Customer'
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Function to fetch data
  const fetchAlerts = async () => {
    try {
      const response = await api.get("/sos/all"); // Make sure this matches your new Admin Route
      if (response.data.success) {
        setAlerts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); 
    return () => clearInterval(interval);
  }, []);

  // Filter alerts based on Active Tab
  const filteredAlerts = alerts.filter(alert => alert.type === activeTab);

  // Pagination Logic (Applied to filtered list)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle Status Update
  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Pending" ? "Resolved" : "Pending";
    try {
      await api.put(`/admin/sos/update-status/${id}`, { status: newStatus });
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.sos_id === id ? { ...alert, status: newStatus } : alert
        )
      );
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const openMap = (lat, lng) => {
    window.open(`http://maps.google.com/maps?q=$${lat},${lng}`, "_blank");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="text-red-600" size={24} /> 
              </div>
              Emergency Response Center
            </h1>
            <p className="text-gray-500 text-sm mt-1 ml-1">Monitor live SOS alerts from drivers and customers</p>
          </div>
          
          <button 
            onClick={fetchAlerts}
            className="mt-4 md:mt-0 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition shadow-lg shadow-gray-200"
          >
            Refresh Data
          </button>
        </div>

        {/* SLIDE TABS (Driver vs Customer) */}
        <div className="flex bg-gray-200 p-1 rounded-lg mb-6 max-w-md mx-auto">
          <button
            onClick={() => { setActiveTab("Driver"); setCurrentPage(1); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
              activeTab === "Driver" 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CarFront size={18} /> Driver SOS
            <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${activeTab === "Driver" ? "bg-gray-100" : "bg-gray-300 text-gray-600"}`}>
              {alerts.filter(a => a.type === "Driver").length}
            </span>
          </button>
          
          <button
            onClick={() => { setActiveTab("Customer"); setCurrentPage(1); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 ${
              activeTab === "Customer" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User size={18} /> Customer SOS
            <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${activeTab === "Customer" ? "bg-blue-50" : "bg-gray-300 text-gray-600"}`}>
              {alerts.filter(a => a.type === "Customer").length}
            </span>
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white shadow-lg shadow-gray-100 rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Fetching emergency data...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/4">
                        {activeTab} Details
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/4">
                        Contact Info
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/3">
                        Location & Time
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-24">
                        Action
                      </th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-32">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentAlerts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <div className="flex flex-col items-center justify-center text-gray-300">
                            <CheckCircle size={48} className="mb-2 opacity-20" />
                            <p className="text-sm">No Active {activeTab} SOS Alerts</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      currentAlerts.map((alert) => (
                        <tr key={alert.sos_id} className={`group hover:bg-blue-50/30 transition duration-150 ${alert.status === 'Pending' ? 'bg-red-50/30' : ''}`}>
                          
                          {/* User Info */}
                          <td className="p-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 p-2 rounded-full ${activeTab === 'Driver' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {activeTab === 'Driver' ? <CarFront size={16} /> : <User size={16} />}
                              </div>
                              <div>
                                <div className="font-bold text-gray-800 text-sm">
                                  {alert.name}
                                </div>
                                <div className="text-xs font-mono text-gray-500 mt-1 bg-gray-100 px-2 py-0.5 rounded inline-block">
                                  ID: {alert.user_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="p-4 align-top">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" /> 
                                <a href={`tel:${alert.phone}`} className="text-sm font-medium text-blue-600 hover:underline">
                                  {alert.phone}
                                </a>
                              </div>
                              {/* If you have email in backend, uncomment below */}
                              {/* <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <Mail size={14} /> {alert.email || "No Email"}
                              </div> */}
                            </div>
                          </td>

                          {/* Location & Time */}
                          <td className="p-4 align-top">
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                <span className="text-sm text-gray-700 line-clamp-2 leading-relaxed" title={alert.location}>
                                  {alert.location || "Fetching precise location..."}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 pl-5">
                                <Clock size={12} /> {formatDate(alert.time)}
                              </div>
                            </div>
                          </td>

                          {/* Map Button */}
                          <td className="p-4 text-center align-middle">
                            <button
                              onClick={() => openMap(alert.lat, alert.lng)}
                              className="p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 text-gray-500 shadow-sm transition-all transform active:scale-95"
                              title="Locate on Map"
                            >
                              <MapPin size={18} />
                            </button>
                          </td>

                          {/* Status Toggle */}
                          <td className="p-4 text-center align-middle">
                            <button
                              onClick={() => toggleStatus(alert.sos_id, alert.status)}
                              className={`w-full py-1.5 px-3 rounded-md text-xs font-bold border shadow-sm transition-all flex items-center justify-center gap-2
                                ${alert.status === "Pending" 
                                  ? "bg-white text-red-600 border-red-200 hover:bg-red-50" 
                                  : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                }`}
                            >
                              {alert.status === "Pending" ? (
                                <>
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  Active
                                </>
                              ) : (
                                <><CheckCircle size={14} /> Resolved</>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination (Only show if needed) */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50 text-gray-600 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50 text-gray-600 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SOSAdminPanel;