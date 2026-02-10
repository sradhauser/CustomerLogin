import React from "react";
import { MapPin } from "lucide-react"; // Changed Car to MapPin for Customer context
import patraLogo from "../assets/logo.png"; // Ensure you have this

const Loader = ({ message = "Welcome to Patra Travels" }) => {
    return (
        <div className="native-splash-overlay">
            <style>{`
                .native-splash-overlay {
                    position: fixed;
                    inset: 0;
                    /* Premium Gradient */
                    background: linear-gradient(135deg, #ff7e46 0%, #2f80ed 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    overflow: hidden;
                    user-select: none; /* Prevents text selection for app feel */
                }

                /* --- ANIMATED RINGS --- */
                .pulse-ring {
                    position: absolute;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    animation: ripple 2.5s linear infinite;
                }
                .pulse-ring:nth-child(2) { animation-delay: 0.5s; }
                .pulse-ring:nth-child(3) { animation-delay: 1s; }

                /* --- LOGO CONTAINER --- */
                .logo-wrapper {
                    position: relative;
                    width: 140px;
                    height: 140px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
                    animation: float 3s ease-in-out infinite;
                    z-index: 10;
                }

                .app-logo {
                    width: 90px;
                    height: auto;
                    object-fit: contain;
                }

                /* --- TEXT STYLING --- */
                .brand-text {
                    margin-top: 40px;
                    color: white;
                    font-family: 'Inter', sans-serif;
                    font-weight: 800;
                    font-size: 24px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 10;
                    animation: fadeIn 1s ease-out;
                }

                .loading-msg {
                    margin-top: 10px;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    z-index: 10;
                }

                /* --- PROGRESS BAR --- */
                .progress-container {
                    margin-top: 30px;
                    width: 150px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                    overflow: hidden;
                    z-index: 10;
                }

                .progress-bar {
                    width: 100%;
                    height: 100%;
                    background: white;
                    transform-origin: left;
                    animation: loadProgress 2s ease-in-out infinite;
                }

                /* --- KEYFRAMES --- */
                @keyframes ripple {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }

                @keyframes loadProgress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(100%); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>

            <div className="logo-wrapper">
                {/* Fallback to Icon if image missing, else use img */}
                {patraLogo ? (
                    <img src={patraLogo} alt="Logo" className="app-logo" />
                ) : (
                    <MapPin size={60} color="#ff7e46" strokeWidth={2.5} />
                )}
            </div>

            <div className="brand-text">Patra Travels</div>
            <div className="loading-msg">{message}</div>

            <div className="progress-container">
                <div className="progress-bar"></div>
            </div>
        </div>
    );
};

export default Loader;