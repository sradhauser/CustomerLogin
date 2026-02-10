import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const PrivateRoute = ({ children }) => {
    // FIX: Check for 'customerToken' (or generic 'token') instead of 'driverToken'
    const token = localStorage.getItem('customerToken') || localStorage.getItem('token');
    
    const location = useLocation();

    if (!token) {
        // Only show toast if they are actually trying to access a restricted area
        // and prevent double-toasting if already on login
        const isPublic = ["/login", "/mpin-login"].includes(location.pathname);
        
        if (!isPublic) {
            toast.error('Access Denied. Please Login.');
        }

        // Redirect to login, but save the location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default PrivateRoute;