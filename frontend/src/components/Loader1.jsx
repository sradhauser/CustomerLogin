import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Car } from 'lucide-react';

// Animation: Car drives from left to right
const drive = keyframes`
  0% { transform: translateX(-150px); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateX(150px); opacity: 0; }
`;

// Animation: Text pulses
const pulseText = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

// --- CONTAINER STYLES ---
const LoaderContainer = styled.div`
  /* Takes up available space */
  width: 100%;
  height: 100%;
  min-height: 80vh; 
  
  /* Centering Logic */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  /* White Background as requested */
  background: #ffffff;
  
  overflow: hidden;
`;

const RoadContainer = styled.div`
  width: 250px;
  height: 60px;
  position: relative;
  overflow: hidden;
  /* Road color: Changed to a light grey dashed line for visibility on white */
  border-bottom: 3px dashed #e5e7eb; 
  margin-bottom: 15px;
`;

const MovingCar = styled.div`
  position: absolute;
  bottom: 5px;
  left: 50%; 
  margin-left: -24px; 
  
  animation: ${drive} 2s linear infinite;
  
  /* Car color: Changed to your brand Orange (#fd7e14) to pop against white */
  color: #fd7e14; 
  
  svg {
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
  }
`;

const LoadingText = styled.p`
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  font-size: 14px;
  /* Text color: Changed to Dark Grey for readability on white */
  color: #374151; 
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
  animation: ${pulseText} 1.5s ease-in-out infinite;
`;

const CarLoader = () => {
  return (
    <LoaderContainer>
      <RoadContainer>
        <MovingCar>
          <Car size={48} strokeWidth={2} />
        </MovingCar>
      </RoadContainer>
      <LoadingText>Loading Trip Details...</LoadingText>
    </LoaderContainer>
  );
};

export default CarLoader;