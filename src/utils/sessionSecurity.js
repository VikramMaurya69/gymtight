// Session security and monitoring utilities
export const createSessionManager = () => {
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  let sessionTimer = null;
  let lastActivity = Date.now();

  const updateActivity = () => {
    lastActivity = Date.now();
  };

  const isSessionValid = () => {
    return Date.now() - lastActivity < SESSION_TIMEOUT;
  };

  const startSessionMonitoring = (onSessionExpire) => {
    // Track user activity
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activities.forEach(activity => {
      document.addEventListener(activity, updateActivity, true);
    });

    // Check session validity every minute
    sessionTimer = setInterval(() => {
      if (!isSessionValid()) {
        onSessionExpire();
      }
    }, 60000);
  };

  const stopSessionMonitoring = () => {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  };

  const getTimeRemaining = () => {
    const timeLeft = SESSION_TIMEOUT - (Date.now() - lastActivity);
    return Math.max(0, timeLeft);
  };

  const getSessionInfo = () => {
    return {
      isExpired: !isSessionValid(),
      timeRemaining: getTimeRemaining(),
      lastActivity: new Date(lastActivity).toISOString()
    };
  };

  return {
    updateActivity,
    isSessionValid,
    startSessionMonitoring,
    stopSessionMonitoring,
    getTimeRemaining,
    getSessionInfo
  };
};

// Create and export a singleton session manager instance
export const sessionManager = createSessionManager();

// Security headers for production deployment
export const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';"
  };
};

// Device fingerprinting for additional security
export const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL(),
    timestamp: Date.now()
  };
  
  return btoa(JSON.stringify(fingerprint));
};
