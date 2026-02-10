import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="loader-content">
        <section className="dots-container">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </section>
        <div className="loading-text">Loading....</div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Ensures the loader takes up the full screen and centers content */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa; /* Matches your dashboard background */
  z-index: 9999; /* Keeps it on top of everything */

  .loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .dots-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dot {
    height: 16px;
    width: 16px;
    margin-right: 14px;
    border-radius: 50%;
    background-color: #b3d4fc; /* Light Blue start */
    animation: pulse 1.5s infinite ease-in-out;
  }

  .dot:last-child {
    margin-right: 0;
  }

  /* Staggered animation delays for the wave effect */
  .dot:nth-child(1) { animation-delay: -0.4s; }
  .dot:nth-child(2) { animation-delay: -0.2s; }
  .dot:nth-child(3) { animation-delay: 0s; }
  .dot:nth-child(4) { animation-delay: 0.2s; }
  .dot:nth-child(5) { animation-delay: 0.4s; }

  .loading-text {
    font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: fadeInOut 2s infinite ease-in-out;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      background-color: #e0f2fe; /* Very Light Blue */
      box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); /* Primary Blue Shadow */
    }

    50% {
      transform: scale(1.3);
      background-color: #2563eb; /* Primary Blue (Your Dashboard Theme) */
      box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); /* Ripple fades out */
    }

    100% {
      transform: scale(0.8);
      background-color: #e0f2fe;
      box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
    }
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

export default Loader;