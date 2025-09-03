import React from 'react';
import { useState, useEffect } from 'react';
import StorachaAuthService from '../utils/storachaAuth';

const StorachaStatus = ({ 
  isReady, 
  isLoading, 
  email, 
  authError, 
  onLogin, 
  onLogout 
}) => {
  const [emailInput, setEmailInput] = useState(email || '');
  const [realTimeConnectionStatus, setRealTimeConnectionStatus] = useState(false);
  
  // Real-time session validation
  useEffect(() => {
    const validateSession = () => {
      if (!isReady) {
        setRealTimeConnectionStatus(false);
        return;
      }
      
      const sessionValidation = StorachaAuthService.validateSessionIntegrity();
      const isActuallyConnected = sessionValidation.isValid && isReady;
      
      setRealTimeConnectionStatus(isActuallyConnected);
      
      // Only trigger logout for actual session expiry, not other validation issues
      if (!isActuallyConnected && isReady && sessionValidation.errorType === 'SESSION_EXPIRED') {
        console.log('Session expired, triggering logout');
        if (onLogout) {
          onLogout();
        }
      } else if (!isActuallyConnected && isReady) {
        if (sessionValidation.warningType === 'MISSING_SPACE') {
          console.log('Session valid but space setup required:', sessionValidation.warning);
          // This is just a warning - user is authenticated but needs to create/select a space
        } else {
          console.log('Session validation failed but not expired:', sessionValidation.error);
          // Don't trigger logout for non-expiry issues, just update status
        }
      }
    };
    
    // Validate immediately
    validateSession();
    
    // Set up periodic validation every 30 seconds
    const intervalId = setInterval(validateSession, 30000);
    
    return () => clearInterval(intervalId);
  }, [isReady, onLogout]);

  const handleLogin = () => {
    if (emailInput.trim()) {
      onLogin(emailInput.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && emailInput.trim()) {
      handleLogin();
    }
  };

  // Connection Status Indicator
  const StatusIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-yellow-400">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
          <span className="text-sm font-medium">Connecting to Storacha...</span>
        </div>
      );
    }

    if (realTimeConnectionStatus) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-green-400">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connected to Storacha</span>
            <span className="text-xs text-light-silver/60">({email})</span>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-light-silver/60 hover:text-light-silver transition-colors duration-200 underline"
          >
            Disconnect
          </button>
        </div>
      );
    }
    
    // Show disconnected state if session is invalid but isReady is still true
    if (isReady && !realTimeConnectionStatus) {
      return (
        <div className="flex items-center space-x-2 text-red-400">
          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
          <span className="text-sm font-medium">Not connected to Storacha</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-red-400">
        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
        <span className="text-sm font-medium">Not connected to Storacha</span>
      </div>
    );
  };

  // Error Display
  const ErrorDisplay = () => {
    if (!authError) return null;

    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-start space-x-2">
          <span className="text-red-400 text-sm">⚠️</span>
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Authentication Error</p>
            <p className="text-red-300 text-xs mt-1">{authError}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-light-silver flex items-center space-x-2">
          <span>🚀</span>
          <span>Storacha Connection</span>
        </h2>
        <StatusIndicator />
      </div>

      {/* Error Display */}
      <ErrorDisplay />

      {/* Login Form - Only show if not connected */}
      {!realTimeConnectionStatus && (
        <div className="space-y-4">
          <p className="text-light-silver/70 text-sm">
            Connect to Storacha for secure decentralized storage.
          </p>
          
          <div className="flex space-x-3">
            <input
              type="email"
              placeholder="Enter your email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-space-indigo/50 border border-electric-cyan/30 rounded-lg text-light-silver placeholder-light-silver/50 focus:outline-none focus:border-electric-cyan focus:ring-2 focus:ring-electric-cyan/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleLogin}
              disabled={isLoading || !emailInput.trim()}
              className="px-6 py-3 bg-electric-cyan text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 min-w-[140px] justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-space-indigo border-t-transparent"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect</span>
              )}
            </button>
          </div>
          
          {/* Instructions */}
          <div className="bg-space-indigo/30 border border-electric-cyan/10 rounded-lg p-3">
            <p className="text-xs text-light-silver/50 leading-relaxed">
              💡 <strong>How it works:</strong> Enter your email and click Connect to establish a secure connection to Storacha.
            </p>
          </div>
        </div>
      )}

      {/* Connected State Info */}
      {realTimeConnectionStatus && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✅</span>
              <span className="text-light-silver text-sm font-medium">Successfully connected to Storacha</span>
            </div>
            {email && (
              <p className="text-light-silver/70 text-xs mt-1">
                Connected as: <span className="text-electric-cyan">{email}</span>
              </p>
            )}
            <p className="text-light-silver/60 text-xs mt-1">
              You can now upload files securely to the decentralized network.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorachaStatus;