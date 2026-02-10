import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { MapPin, Navigation } from 'lucide-react';
import TripFeedbackSheet from './feedback'; // Import the sheet you created

const TestFeedback = () => {
  const [showModal, setShowModal] = useState(false);

  // Styles to make it look like a fake Map App background
  const styles = {
    container: {
      height: '100vh',
      width: '100%',
      backgroundColor: '#ffffff', // Grey map background
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fakeMap: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0.3,
      backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)',
      backgroundSize: '30px 30px', // Dots pattern to look like a map grid
      zIndex: 0,
    },
    testButton: {
      zIndex: 10,
      padding: '15px 30px',
      fontSize: '18px',
      fontWeight: 'bold',
      borderRadius: '50px',
      boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
    }
  };

  return (
    <div style={styles.container}>
      {/* --- FAKE BACKGROUND (Simulating Google Maps) --- */}
      <div style={styles.fakeMap}></div>
      
      {/* Fake UI Elements to make it look real */}
      <div style={{position: 'absolute', top: 20, left: 20, zIndex: 1}}>
        <div className="bg-white p-2 rounded-circle shadow-sm">
          <Navigation size={24} color="#2563eb" />
        </div>
      </div>

      {/* --- THE TRIGGER BUTTON --- */}
      <div className="text-center" style={{zIndex: 5}}>
        <h2 className="mb-4 text-dark fw-bold">Test Mode</h2>
        <p className="text-muted mb-4">Click below to simulate "Trip End"</p>
        
        <button 
          className="btn btn-primary" 
          style={styles.testButton}
          onClick={() => setShowModal(true)}
        >
          End Trip & Show Feedback
        </button>
      </div>

      {/* --- THE COMPONENT YOU WANT TO TEST --- */}
      <TripFeedbackSheet 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        driverName="Ravi Sharma"
        tripId="TEST-1234" 
      />
    </div>
  );
};

export default TestFeedback;