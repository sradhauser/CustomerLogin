import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { 
  Star, X, Clock, ShieldCheck, Smile, Car, 
  MapPin, AlertTriangle, CheckCircle 
} from 'lucide-react';

const TripFeedbackSheet = ({ isOpen, onClose, driverName, tripId }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('rating'); // 'rating' or 'success'

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setSelectedTags([]);
      setComment('');
      setStep('rating');
    }
  }, [isOpen]);

  // --- CONFIGURATION ---
  const positiveTags = [
    { label: "On Time", icon: <Clock size={16} /> },
    { label: "Safe Drive", icon: <ShieldCheck size={16} /> },
    { label: "Polite", icon: <Smile size={16} /> },
    { label: "Clean Car", icon: <Car size={16} /> },
  ];

  const negativeTags = [
    { label: "Late", icon: <Clock size={16} /> },
    { label: "Rash Driving", icon: <AlertTriangle size={16} /> },
    { label: "Rude", icon: <Smile size={16} /> },
    { label: "Bad Route", icon: <MapPin size={16} /> },
  ];

  const currentTags = rating >= 4 ? positiveTags : negativeTags;

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = () => {
    // API Call Simulation
    console.log(`Submitting for Trip ${tripId}:`, { rating, selectedTags, comment });
    setStep('success');
    
    // Auto close after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  // --- STYLES (Native Bottom Sheet Look) ---
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', // Dimmed background
      zIndex: 1040,
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' : 'hidden',
      transition: 'opacity 0.3s ease',
    },
    sheet: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#fff',
      borderTopLeftRadius: '24px',
      borderTopRightRadius: '24px',
      padding: '10px 20px 30px 20px',
      zIndex: 1050,
      transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', // Smooth slide effect
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    dragHandle: {
      width: '40px',
      height: '5px',
      backgroundColor: '#e0e0e0',
      borderRadius: '10px',
      margin: '0 auto 20px auto', // Centers the handle
    },
    starBtn: {
      background: 'none',
      border: 'none',
      padding: '5px',
      transition: 'transform 0.2s',
    },
    tag: {
      borderRadius: '50px',
      padding: '10px 16px',
      margin: '5px',
      fontSize: '14px',
      fontWeight: '500',
      border: '1px solid #f3f4f6',
      background: '#f9fafb',
      color: '#4b5563',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
    },
    tagActive: {
      background: '#eff6ff',
      borderColor: '#3b82f6',
      color: '#2563eb',
    },
    submitBtn: {
      width: '100%',
      padding: '16px',
      borderRadius: '16px',
      background: '#4f46e5',
      color: 'white',
      border: 'none',
      fontWeight: 'bold',
      marginTop: '20px',
    }
  };

  return (
    <>
      {/* Dark Overlay Background */}
      <div style={styles.overlay} onClick={onClose} />

      {/* The Sliding Bottom Sheet */}
      <div style={styles.sheet}>
        {/* Grey Handle Bar (Visual Cue for Bottom Sheet) */}
        <div style={styles.dragHandle} />

        {step === 'success' ? (
          <div className="text-center py-5 animate__animated animate__fadeIn">
            <CheckCircle size={60} className="text-success mb-3" />
            <h3>Thanks for the Feedback!</h3>
            <p className="text-muted">We've shared this with your driver.</p>
          </div>
        ) : (
          <div className="animate__animated animate__fadeIn">
            {/* Header: Driver Info */}
            <div className="text-center mb-4">
              <h5 className="fw-bold mb-1">How was your ride?</h5>
              <p className="text-muted small">with {driverName}</p>
            </div>

            {/* Stars */}
            <div className="d-flex justify-content-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  style={{
                    ...styles.starBtn,
                    transform: star <= (hover || rating) ? 'scale(1.15)' : 'scale(1)'
                  }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                >
                  <Star 
                    size={42} 
                    fill={star <= (hover || rating) ? "#fbbf24" : "transparent"} 
                    color={star <= (hover || rating) ? "#fbbf24" : "#cbd5e1"} 
                    strokeWidth={star <= (hover || rating) ? 0 : 1.5}
                  />
                </button>
              ))}
            </div>

            {/* Conditional Tags Section (Shows only after rating) */}
            {rating > 0 && (
              <div className="animate__animated animate__fadeInUp">
                <p className="text-center small fw-bold text-muted text-uppercase mb-3">
                  {rating >= 4 ? "What stood out?" : "What went wrong?"}
                </p>
                
                <div className="d-flex flex-wrap justify-content-center mb-3">
                  {currentTags.map((tag, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleTagToggle(tag.label)}
                      style={{
                        ...styles.tag,
                        ...(selectedTags.includes(tag.label) ? styles.tagActive : {})
                      }}
                    >
                      {tag.icon}
                      <span>{tag.label}</span>
                    </div>
                  ))}
                </div>

                {/* Optional Comment */}
                <textarea 
                  className="form-control bg-light border-0 mb-3" 
                  rows="2"
                  placeholder="Additional comments..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ borderRadius: '12px', fontSize: '14px' }}
                />

                <button style={styles.submitBtn} onClick={handleSubmit}>
                  Submit Feedback
                </button>
              </div>
            )}
            
            {/* Skip Button (Only if not rated) */}
            {rating === 0 && (
              <div className="text-center mt-3">
                <button className="btn btn-link text-muted text-decoration-none" onClick={onClose}>
                  Skip Feedback
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default TripFeedbackSheet;