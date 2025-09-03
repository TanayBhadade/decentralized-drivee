/**
 * Storacha Authentication Service
 * Handles authentication state persistence, session management, and token validation
 */

const STORAGE_KEYS = {
  STORACHA_EMAIL: 'storacha_email',
  STORACHA_SESSION: 'storacha_session',
  STORACHA_SPACE_DID: 'storacha_space_did',
  SESSION_TIMESTAMP: 'storacha_session_timestamp'
};

// Session expiry time (24 hours)
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Error types for better error handling
export const StorachaAuthErrors = {
  STORAGE_NOT_AVAILABLE: 'STORAGE_NOT_AVAILABLE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_CORRUPTED: 'SESSION_CORRUPTED',
  INVALID_SESSION_DATA: 'INVALID_SESSION_DATA',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED'
};

class StorachaAuthError extends Error {
  constructor(message, type, originalError = null) {
    super(message);
    this.name = 'StorachaAuthError';
    this.type = type;
    this.originalError = originalError;
  }
}

export class StorachaAuthService {
  static SESSION_KEY = 'storacha_session';
  static EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer
  static ENCRYPTION_KEY = 'storacha_enc_key';
  
  // Simple encryption/decryption for sensitive data
  static encryptData(data) {
    try {
      // Use a simple XOR cipher with a rotating key for basic obfuscation
      const key = this.getOrCreateEncryptionKey();
      const jsonString = JSON.stringify(data);
      let encrypted = '';
      
      for (let i = 0; i < jsonString.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const dataChar = jsonString.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.warn('Encryption failed, storing data unencrypted:', error);
      return JSON.stringify(data);
    }
  }
  
  static decryptData(encryptedData) {
    try {
      const key = this.getOrCreateEncryptionKey();
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encChar ^ keyChar);
      }
      
      return JSON.parse(decrypted);
    } catch (error) {
      // Fallback: try to parse as unencrypted JSON
      try {
        return JSON.parse(encryptedData);
      } catch (parseError) {
        throw new StorachaAuthError(
           StorachaAuthErrors.SESSION_CORRUPTED,
           'Failed to decrypt session data'
         );
      }
    }
  }
  
  static getOrCreateEncryptionKey() {
    let key = sessionStorage.getItem(this.ENCRYPTION_KEY);
    if (!key) {
      // Generate a simple key based on browser fingerprint
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        Date.now().toString(36)
      ].join('|');
      
      key = btoa(fingerprint).substring(0, 32);
      sessionStorage.setItem(this.ENCRYPTION_KEY, key);
    }
    return key;
  }
  /**
   * Save authentication session to localStorage
   * @param {string} email - User's email
   * @param {string} spaceDid - Storacha space DID
   * @param {Object} sessionData - Additional session data
   * @throws {StorachaAuthError} When storage is not available or save fails
   */
  static saveSession(email, spaceDid, sessionData = {}) {
    try {
      // Check if localStorage is available
      if (typeof Storage === 'undefined' || !localStorage) {
        throw new StorachaAuthError(
          'Local storage is not available',
          StorachaAuthErrors.STORAGE_NOT_AVAILABLE
        );
      }

      // Validate input parameters
      if (!email) {
        throw new StorachaAuthError(
          'Email is required',
          StorachaAuthErrors.INVALID_SESSION_DATA
        );
      }

      const timestamp = Date.now();
      
      // Create session object with all data
      const sessionWithTimestamp = {
        email,
        spaceDid,
        timestamp,
        sessionData,
        version: '1.0'
      };
      
      // Encrypt sensitive session data
      const encryptedSession = this.encryptData(sessionWithTimestamp);
      localStorage.setItem(this.SESSION_KEY, encryptedSession);
      
      // Clear any existing encryption key on new session save for security
      sessionStorage.removeItem(this.ENCRYPTION_KEY);
      
      console.log('Storacha session saved successfully');
      return true;
    } catch (error) {
      if (error instanceof StorachaAuthError) {
        throw error;
      }
      
      console.error('Failed to save Storacha session:', error);
      throw new StorachaAuthError(
        'Failed to save session to storage',
        StorachaAuthErrors.STORAGE_NOT_AVAILABLE,
        error
      );
    }
  }

  /**
   * Retrieve authentication session from localStorage
   * @returns {Object|null} Session data or null if not found/expired
   * @throws {StorachaAuthError} When session is corrupted or storage unavailable
   */
  static getSession() {
    try {
      // Check if localStorage is available
      if (typeof Storage === 'undefined' || !localStorage) {
        console.warn('Local storage is not available');
        return null; // Don't throw error, just return null
      }

      const encryptedSessionData = localStorage.getItem(this.SESSION_KEY);
      if (!encryptedSessionData) {
        return null;
      }

      let parsedSession;
      try {
        // Decrypt session data
        parsedSession = this.decryptData(encryptedSessionData);
      } catch (decryptError) {
        // If decryption fails, clear the corrupted session but don't throw
        console.warn('Session decryption failed, clearing session:', decryptError.message);
        this.clearSession();
        return null;
      }

      // Check if session has expired
      if (parsedSession.timestamp) {
        const sessionAge = Date.now() - parsedSession.timestamp;
        if (sessionAge > SESSION_EXPIRY_MS) {
          console.log('Session has expired, clearing session');
          this.clearSession();
          return null; // Don't throw error, just return null
        }
      }

      return {
        email: parsedSession.email,
        spaceDid: parsedSession.spaceDid,
        timestamp: parsedSession.timestamp,
        sessionData: parsedSession.sessionData || {},
        isValid: true
      };
    } catch (error) {
      console.error('Failed to retrieve Storacha session:', error);
      // Don't clear session on unexpected errors, just return null
      return null;
    }
  }

  /**
   * Check if user has a valid session
   * @returns {boolean} True if session exists and is valid
   */
  static hasValidSession() {
    const session = this.getSession();
    return session !== null && session.isValid;
  }

  /**
   * Clear all authentication data from localStorage
   */
  static clearSession() {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      sessionStorage.removeItem(this.ENCRYPTION_KEY);
      console.log('Storacha session cleared');
    } catch (error) {
      console.error('Failed to clear Storacha session:', error);
    }
  }

  /**
   * Update session timestamp to extend session
   */
  static refreshSession() {
    try {
      const session = this.getSession();
      if (session) {
        localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh Storacha session:', error);
      return false;
    }
  }

  /**
   * Get session expiry information
   * @returns {Object} Expiry information
   */
  static getSessionExpiry() {
    const session = this.getSession();
    if (!session) {
      return { expired: true, timeLeft: 0 };
    }

    const timeLeft = SESSION_EXPIRY_MS - (Date.now() - session.timestamp);
    return {
      expired: timeLeft <= 0,
      timeLeft: Math.max(0, timeLeft),
      expiresAt: new Date(session.timestamp + SESSION_EXPIRY_MS)
    };
  }

  /**
   * Validate session and return user info
   * @returns {Object|null} User info if session is valid
   */
  static validateAndGetUser() {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    // Refresh session on successful validation
    this.refreshSession();

    return {
      email: session.email,
      spaceDid: session.spaceDid,
      sessionData: session.sessionData
    };
  }

  /**
   * Validate session integrity and structure
   * @returns {Object} Validation result with details
   */
  static validateSessionIntegrity() {
    try {
      const session = this.getSession();
      
      if (!session) {
        return {
          isValid: false,
          error: 'No session found',
          errorType: 'NO_SESSION'
        };
      }
      
      // If session exists but is not marked as valid, it means there was an issue
      if (!session.isValid) {
        return {
          isValid: false,
          error: 'Session is not valid',
          errorType: 'INVALID_SESSION'
        };
      }

      // Check required fields - spaceDid is optional if user is authenticated but hasn't created/selected a space yet
      const requiredFields = ['email', 'timestamp'];
      const missingFields = requiredFields.filter(field => !session[field]);
      
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          errorType: 'MISSING_FIELDS',
          missingFields
        };
      }
      
      // Check if spaceDid is missing (this is a warning, not an error)
      if (!session.spaceDid) {
        const sessionAge = Date.now() - session.timestamp;
        return {
          isValid: true,
          session,
          sessionAge,
          timeUntilExpiry: SESSION_EXPIRY_MS - sessionAge,
          warning: 'Space DID not found - user may need to create or select a space',
          warningType: 'MISSING_SPACE',
          requiresSpaceSetup: true
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(session.email)) {
        return {
          isValid: false,
          error: 'Invalid email format',
          errorType: 'INVALID_EMAIL'
        };
      }

      // Validate timestamp
      if (isNaN(session.timestamp) || session.timestamp <= 0) {
        return {
          isValid: false,
          error: 'Invalid timestamp',
          errorType: 'INVALID_TIMESTAMP'
        };
      }

      // Check if session is expired
      const sessionAge = Date.now() - session.timestamp;
      if (sessionAge > SESSION_EXPIRY_MS) {
        return {
          isValid: false,
          error: 'Session has expired',
          errorType: 'SESSION_EXPIRED',
          expiredSince: sessionAge - SESSION_EXPIRY_MS
        };
      }

      // Validate space DID format (basic check)
      if (!session.spaceDid || session.spaceDid.length < 10) {
        return {
          isValid: false,
          error: 'Invalid space DID format',
          errorType: 'INVALID_SPACE_DID'
        };
      }

      return {
        isValid: true,
        session,
        sessionAge,
        timeUntilExpiry: SESSION_EXPIRY_MS - sessionAge
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        errorType: 'VALIDATION_ERROR',
        originalError: error
      };
    }
  }

  /**
   * Check if session will expire soon
   * @param {number} warningThresholdMs - Warning threshold in milliseconds (default: 1 hour)
   * @returns {Object} Warning information
   */
  static getExpiryWarning(warningThresholdMs = 60 * 60 * 1000) {
    const validation = this.validateSessionIntegrity();
    
    if (!validation.isValid) {
      return {
        shouldWarn: false,
        expired: true,
        error: validation.error
      };
    }

    // Handle case where session is valid but has warnings (like MISSING_SPACE)
    if (validation.warning) {
      const timeUntilExpiry = validation.timeUntilExpiry;
      const shouldWarn = timeUntilExpiry <= warningThresholdMs;
      
      return {
        shouldWarn,
        expired: false,
        timeUntilExpiry,
        warningThreshold: warningThresholdMs,
        expiresAt: new Date(validation.session.timestamp + SESSION_EXPIRY_MS),
        warning: validation.warning,
        message: shouldWarn 
          ? `Session will expire in ${Math.round(timeUntilExpiry / (60 * 1000))} minutes`
          : null
      };
    }

    const timeUntilExpiry = validation.timeUntilExpiry;
    const shouldWarn = timeUntilExpiry <= warningThresholdMs;

    return {
      shouldWarn,
      expired: false,
      timeUntilExpiry,
      warningThreshold: warningThresholdMs,
      expiresAt: new Date(validation.session.timestamp + SESSION_EXPIRY_MS),
      message: shouldWarn 
        ? `Session will expire in ${Math.round(timeUntilExpiry / (60 * 1000))} minutes`
        : null
    };
  }

  /**
   * Perform comprehensive session health check
   * @returns {Object} Complete health check result
   */
  static performHealthCheck() {
    const integrity = this.validateSessionIntegrity();
    const expiry = this.getExpiryWarning();
    
    // Check storage availability
    let storageAvailable = true;
    try {
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
    } catch (error) {
      storageAvailable = false;
    }

    return {
      timestamp: Date.now(),
      integrity,
      expiry,
      storageAvailable,
      overall: {
        healthy: integrity.isValid && !expiry.expired && storageAvailable,
        issues: [
          ...(!integrity.isValid ? [`Session integrity: ${integrity.error}`] : []),
          ...(!storageAvailable ? ['Storage not available'] : []),
          ...(expiry.expired ? ['Session expired'] : []),
          ...(expiry.shouldWarn ? ['Session expiring soon'] : [])
        ]
      }
    };
  }

  /**
   * Auto-refresh session if it's close to expiry
   * @param {number} refreshThresholdMs - Threshold for auto-refresh (default: 2 hours)
   * @returns {boolean} True if session was refreshed
   */
  static autoRefreshIfNeeded(refreshThresholdMs = 2 * 60 * 60 * 1000) {
    try {
      const session = this.getSession();
      if (!session) return false;
      
      const validation = this.validateSessionIntegrity();
      if (!validation.isValid) {
        return false;
      }

      if (validation.timeUntilExpiry <= refreshThresholdMs) {
        // Update timestamp to extend session
        const refreshedSession = {
          ...session,
          timestamp: Date.now(),
          refreshCount: (session.refreshCount || 0) + 1
        };
        
        // Limit the number of auto-refreshes for security
        if (refreshedSession.refreshCount > 10) {
          console.warn('Maximum refresh count reached, forcing re-authentication');
          this.clearSession();
          return false;
        }
        
        this.saveSession(refreshedSession.email, refreshedSession.spaceDid, refreshedSession.sessionData);
        console.log('Session auto-refreshed');
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Auto-refresh failed:', error);
      return false;
    }
  }

  /**
   * Secure cleanup of all session data
   * @returns {boolean} True if cleanup was successful
   */
  static secureCleanup() {
    try {
      // Clear all Storacha-related data from storage
      this.clearSession();
      
      // Clear any cached encryption keys
      sessionStorage.removeItem(this.ENCRYPTION_KEY);
      
      // Clear any temporary data that might contain sensitive info
      const tempKeys = ['storacha_temp', 'storacha_cache', 'storacha_backup'];
      tempKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('Secure cleanup completed');
      return true;
    } catch (error) {
      console.warn('Secure cleanup failed:', error);
      return false;
    }
  }

  /**
   * Enhanced session integrity validation
   * @param {Object} session - Session object to validate
   * @returns {Object} Validation result
   */
  static validateSessionData(session) {
    if (!session || typeof session !== 'object') {
      return { valid: false, errorType: 'INVALID_SESSION_DATA' };
    }
    
    // Check required fields
    const requiredFields = ['email', 'spaceDid', 'timestamp'];
    for (const field of requiredFields) {
      if (!session[field]) {
        return { valid: false, errorType: 'MISSING_REQUIRED_FIELD', field };
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(session.email)) {
      return { valid: false, errorType: 'INVALID_EMAIL_FORMAT' };
    }
    
    // Validate timestamp
    if (typeof session.timestamp !== 'number' || session.timestamp <= 0) {
      return { valid: false, errorType: 'INVALID_TIMESTAMP' };
    }
    
    // Check if session is expired
    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > SESSION_EXPIRY_MS) {
      return { valid: false, errorType: 'SESSION_EXPIRED' };
    }
    
    // Validate spaceDid format (basic check)
    if (typeof session.spaceDid !== 'string' || session.spaceDid.length < 10) {
      return { valid: false, errorType: 'INVALID_SPACE_DID' };
    }
    
    return { valid: true };
  }
}

export default StorachaAuthService;