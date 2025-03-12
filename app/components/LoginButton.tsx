'use client';

import React, { useState, useEffect } from 'react';
import { handleDiscogsAuth, handleLogout, checkAuthStatus } from '../utils/discogs-client';

interface LoginButtonProps {
  className?: string;
}

const LoginButton: React.FC<LoginButtonProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Check authentication status on mount and when URL changes
  useEffect(() => {
    let isMounted = true;
    
    async function checkAuth() {
      try {
        setCheckError(null);
        const authStatus = await checkAuthStatus();
        if (isMounted) {
          setIsLoggedIn(authStatus);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (isMounted) {
          setCheckError('Unable to check login status');
        }
      }
    }

    // Check auth immediately 
    checkAuth();
    
    // Check when URL parameters change (potential callback)
    const handleRouteChange = () => {
      checkAuth();
    };
    
    // Check when window gets focus (user returns from Discogs)
    window.addEventListener('focus', handleRouteChange);
    
    // Set up less frequent check (every 30 seconds instead of 5)
    const intervalId = setInterval(checkAuth, 30000);
    
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleRouteChange);
      clearInterval(intervalId);
    };
  }, []);
  
  const initiateLogin = async () => {
    setIsLoading(true);
    setCheckError(null);
    try {
      await handleDiscogsAuth();
      // Note: We'll redirect to Discogs, so no need to update state here
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      setCheckError('Failed to start login process');
    }
  };
  
  const initiateLogout = async () => {
    setIsLoading(true);
    setCheckError(null);
    try {
      await handleLogout();
      
      // Immediately update UI state
      setIsLoggedIn(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoading(false);
      setCheckError('Failed to log out');
    }
  };
  
  // Error display component
  const ErrorMessage = checkError ? (
    <div className="text-red-500 text-xs mt-1">{checkError}</div>
  ) : null;
  
  return (
    <>
      {isLoggedIn ? (
        <button
          onClick={initiateLogout}
          disabled={isLoading}
          className={`btn-secondary px-4 py-2 text-sm rounded-md transition-colors duration-150 flex items-center ${className}`}
          aria-label="Sign out from Discogs"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-minimal-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          {isLoading ? 'Signing out...' : 'Sign out'}
        </button>
      ) : (
        <button
          onClick={initiateLogin}
          disabled={isLoading}
          className={`btn-primary px-4 py-2 text-sm rounded-md shadow-sm hover:shadow transition-all duration-150 flex items-center ${className}`}
          aria-label="Connect with Discogs"
        >
          {isLoading ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-minimal-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          )}
          {isLoading ? 'Connecting...' : 'Connect with Discogs'}
        </button>
      )}
      {ErrorMessage}
    </>
  );
};

export default LoginButton; 