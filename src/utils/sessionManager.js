/**
 * Session Management Utilities
 * Handles session validation, cleanup, and storage management
 */

const SESSION_KEYS = [
  'sb-zutwyyepahbbvrcbsbke-auth-token',
  'rememberMe'
];

/**
 * Validates if a stored session is still valid
 */
export const validateSession = async () => {
  try {
    const sessionData = localStorage.getItem(SESSION_KEYS[0]) || sessionStorage.getItem(SESSION_KEYS[0]);
    
    if (!sessionData) {
      return { isValid: false, reason: 'no_session' };
    }

    const parsed = JSON.parse(sessionData);
    
    // Check if session has required structure
    if (!parsed || !parsed.access_token || !parsed.refresh_token) {
      return { isValid: false, reason: 'invalid_structure' };
    }

    // Check if session is expired
    if (parsed.expires_at) {
      const expiryTime = parsed.expires_at * 1000; // Convert to milliseconds
      if (Date.now() >= expiryTime) {
        return { isValid: false, reason: 'expired' };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Session validation error:', error);
    return { isValid: false, reason: 'validation_error', error };
  }
};

/**
 * Clears all authentication-related data from storage
 */
export const clearAllSessions = () => {
  try {
    // Clear from both storages
    SESSION_KEYS.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Clear any Supabase-related items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-zutwyyepahbbvrcbsbke')) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-zutwyyepahbbvrcbsbke')) {
        sessionStorage.removeItem(key);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Clear sessions error:', error);
    return { success: false, error };
  }
};

/**
 * Gets information about the current session
 */
export const getSessionInfo = () => {
  try {
    const inLocalStorage = !!localStorage.getItem(SESSION_KEYS[0]);
    const inSessionStorage = !!sessionStorage.getItem(SESSION_KEYS[0]);
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    return {
      exists: inLocalStorage || inSessionStorage,
      isPersistent: inLocalStorage,
      isTemporary: inSessionStorage,
      rememberMe,
      storage: inLocalStorage ? 'localStorage' : inSessionStorage ? 'sessionStorage' : 'none'
    };
  } catch (error) {
    console.error('Get session info error:', error);
    return { exists: false, error };
  }
};

/**
 * Migrates session between storage types based on remember me preference
 */
export const migrateSession = (rememberMe) => {
  try {
    const sessionKey = SESSION_KEYS[0];
    
    if (rememberMe) {
      // Move from sessionStorage to localStorage
      const sessionData = sessionStorage.getItem(sessionKey);
      if (sessionData) {
        localStorage.setItem(sessionKey, sessionData);
        sessionStorage.removeItem(sessionKey);
      }
    } else {
      // Move from localStorage to sessionStorage
      const sessionData = localStorage.getItem(sessionKey);
      if (sessionData) {
        sessionStorage.setItem(sessionKey, sessionData);
        localStorage.removeItem(sessionKey);
      }
    }

    // Update preference
    localStorage.setItem('rememberMe', String(rememberMe));

    return { success: true };
  } catch (error) {
    console.error('Session migration error:', error);
    return { success: false, error };
  }
};

/**
 * Checks for session corruption and attempts recovery
 */
export const checkAndRecoverSession = async () => {
  try {
    const validation = await validateSession();
    
    if (!validation.isValid) {
      // Session is invalid, clear it
      clearAllSessions();
      return { recovered: false, reason: validation.reason };
    }

    return { recovered: true };
  } catch (error) {
    console.error('Session recovery error:', error);
    clearAllSessions();
    return { recovered: false, error };
  }
};
