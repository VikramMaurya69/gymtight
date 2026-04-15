// Advanced security utilities for GymTight Fitness Admin Panel

// Rate Limiter Class
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000, escalationFactor = 2) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.escalationFactor = escalationFactor;
    this.attempts = new Map();
    this.blockedIPs = new Set();
    this.statistics = {
      totalBlocked: 0,
      activeLimits: {},
      avgResponseTime: 0
    };
  }

  isBlocked(identifier) {
    if (this.blockedIPs.has(identifier)) {
      return true;
    }

    const attemptRecord = this.attempts.get(identifier);
    if (!attemptRecord) return false;

    const now = Date.now();
    const timePassed = now - attemptRecord.firstAttempt;
    
    if (timePassed > this.windowMs) {
      this.attempts.delete(identifier);
      return false;
    }

    return attemptRecord.count >= this.maxAttempts;
  }

  addAttempt(identifier, isFailure = true) {
    const now = Date.now();
    const attemptRecord = this.attempts.get(identifier) || { 
      count: 0, 
      firstAttempt: now,
      escalationLevel: 1
    };

    if (now - attemptRecord.firstAttempt > this.windowMs) {
      attemptRecord.count = 0;
      attemptRecord.firstAttempt = now;
    }

    if (isFailure) {
      attemptRecord.count++;
      
      if (attemptRecord.count >= this.maxAttempts) {
        this.blockedIPs.add(identifier);
        this.statistics.totalBlocked++;
        
        // Escalate the window for repeat offenders
        attemptRecord.escalationLevel *= this.escalationFactor;
        setTimeout(() => {
          this.blockedIPs.delete(identifier);
        }, this.windowMs * attemptRecord.escalationLevel);
      }
    } else {
      // Successful attempt, reduce count
      attemptRecord.count = Math.max(0, attemptRecord.count - 1);
    }

    this.attempts.set(identifier, attemptRecord);
    this.statistics.activeLimits[identifier] = attemptRecord;
  }

  blockIP(ip) {
    this.blockedIPs.add(ip);
    this.statistics.totalBlocked++;
  }

  getStatistics() {
    return {
      ...this.statistics,
      blockedIPs: Array.from(this.blockedIPs)
    };
  }

  configure(options) {
    this.maxAttempts = options.maxAttempts || this.maxAttempts;
    this.windowMs = options.windowMs || this.windowMs;
  }
}

// Security Logger Class
export class SecurityLogger {
  constructor() {
    this.logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    this.maxLogs = 1000;
  }

  log(type, message, data = {}) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      type,
      message,
      severity: data.severity || 'medium',
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
      ...data
    };

    this.logs.unshift(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    localStorage.setItem('security_logs', JSON.stringify(this.logs));
    
    if (logEntry.severity === 'high') {
      console.warn('High severity security event:', logEntry);
    }
  }

  getLogs(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.logs.filter(log => log.timestamp > cutoff);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('security_logs');
  }

  getClientIP() {
    return 'Unknown'; // In production, use a proper IP detection service
  }
}

// Security Monitor Class
export class SecurityMonitor {
  constructor() {
    this.isActive = false;
    this.threats = new Map();
    this.statistics = {
      activeThreats: 0,
      scansPerformed: 0,
      lastScan: null
    };
  }

  start() {
    this.isActive = true;
    this.performScan();
    
    // Scan every 5 minutes
    setInterval(() => {
      if (this.isActive) {
        this.performScan();
      }
    }, 5 * 60 * 1000);
  }

  stop() {
    this.isActive = false;
  }

  performScan() {
    this.statistics.scansPerformed++;
    this.statistics.lastScan = Date.now();
    
    // Check for suspicious patterns
    this.checkForSuspiciousActivity();
    this.statistics.activeThreats = this.threats.size;
  }

  checkForSuspiciousActivity() {
    // Check localStorage for tampering
    const securityLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    const recentFails = securityLogs.filter(log => 
      log.type === 'auth_failure' && 
      Date.now() - log.timestamp < 300000 // 5 minutes
    );

    if (recentFails.length > 10) {
      this.threats.set('rapid_auth_failures', {
        type: 'rapid_auth_failures',
        severity: 'high',
        count: recentFails.length,
        timestamp: Date.now()
      });
    }
  }

  getStatistics() {
    return {
      ...this.statistics,
      threats: Array.from(this.threats.values())
    };
  }
}

// Password strength validation utility
export const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noCommonPatterns: !(/123|abc|password|admin|qwerty/i.test(password)),
    noRepeatingChars: !/(.)\1{2,}/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  
  return {
    isValid: score >= 6 && requirements.minLength,
    score,
    requirements,
    strength: score < 3 ? 'weak' : score < 5 ? 'medium' : score < 7 ? 'strong' : 'excellent'
  };
};

// Enhanced email validation utility
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const isDomainSafe = !email.includes('tempmail') && !email.includes('10minutemail');
  
  return {
    isValid: isValid && isDomainSafe,
    format: isValid,
    domainSafe: isDomainSafe
  };
};

// Advanced input sanitization utility
export const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS tags
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, ''); // Remove script keywords
};

// SQL injection prevention
export const sanitizeSQL = (input) => {
  return input
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/gi, '') // Remove SQL keywords
    .trim();
};

// Enhanced rate limiting with adaptive thresholds
export const createAdvancedRateLimiter = (config = {}) => {
  const {
    maxAttempts = 5,
    windowMs = 15 * 60 * 1000, // 15 minutes
    escalationThreshold = 3,
    maxEscalationLevel = 3
  } = config;
  
  const attempts = new Map();
  const suspiciousIPs = new Set();
  
  return {
    isAllowed: (identifier, userAgent = '', ip = '') => {
      const now = Date.now();
      const userKey = `${identifier}_${ip}`;
      const userAttempts = attempts.get(userKey) || { 
        count: 0, 
        resetTime: now + windowMs,
        escalationLevel: 0,
        suspicious: false
      };
      
      // Check for suspicious patterns
      const isSuspicious = suspiciousIPs.has(ip) || 
                          userAgent.length < 20 || 
                          !userAgent.includes('Mozilla');
      
      if (now > userAttempts.resetTime) {
        userAttempts.count = 0;
        userAttempts.resetTime = now + windowMs;
        if (!isSuspicious) {
          userAttempts.escalationLevel = Math.max(0, userAttempts.escalationLevel - 1);
        }
      }
      
      const currentMaxAttempts = maxAttempts - (userAttempts.escalationLevel * escalationThreshold);
      
      if (userAttempts.count >= currentMaxAttempts || isSuspicious) {
        if (isSuspicious) {
          suspiciousIPs.add(ip);
        }
        return { 
          allowed: false, 
          timeLeft: userAttempts.resetTime - now,
          escalationLevel: userAttempts.escalationLevel,
          suspicious: isSuspicious
        };
      }
      
      return { 
        allowed: true, 
        timeLeft: 0,
        escalationLevel: userAttempts.escalationLevel,
        suspicious: false
      };
    },
    
    recordAttempt: (identifier, success = false, userAgent = '', ip = '') => {
      const now = Date.now();
      const userKey = `${identifier}_${ip}`;
      const userAttempts = attempts.get(userKey) || { 
        count: 0, 
        resetTime: now + windowMs,
        escalationLevel: 0,
        suspicious: false
      };
      
      if (now > userAttempts.resetTime) {
        userAttempts.count = success ? 0 : 1;
        userAttempts.resetTime = now + windowMs;
      } else {
        if (!success) {
          userAttempts.count++;
          
          // Escalate if multiple failed attempts
          if (userAttempts.count >= escalationThreshold && 
              userAttempts.escalationLevel < maxEscalationLevel) {
            userAttempts.escalationLevel++;
          }
        } else {
          userAttempts.count = 0;
        }
      }
      
      attempts.set(userKey, userAttempts);
      return userAttempts;
    },
    
    getSuspiciousIPs: () => Array.from(suspiciousIPs),
    clearSuspiciousIP: (ip) => suspiciousIPs.delete(ip)
  };
};

// Security event logger
export const createSecurityLogger = () => {
  const events = [];
  
  return {
    log: (event, severity = 'info', details = {}) => {
      const logEntry = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        event,
        severity, // 'info', 'warning', 'error', 'critical'
        details,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      events.unshift(logEntry);
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(1000);
      }
      
      // In production, send to monitoring service
      console.log(`[SECURITY ${severity.toUpperCase()}]`, logEntry);
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem('security_events', JSON.stringify(events.slice(0, 100)));
      } catch (e) {
        console.warn('Could not store security events');
      }
    },
    
    getEvents: (severity = null, limit = 50) => {
      const filtered = severity ? 
        events.filter(e => e.severity === severity) : 
        events;
      return filtered.slice(0, limit);
    },
    
    getEventStats: () => {
      const stats = events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {});
      
      return {
        total: events.length,
        ...stats,
        lastEvent: events[0]?.timestamp
      };
    }
  };
};

// Content Security Policy generator
export const generateCSP = () => {
  return {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' https://apis.google.com",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'img-src': "'self' data: https:",
    'font-src': "'self' https://fonts.gstatic.com",
    'connect-src': "'self' https://*.firebaseapp.com https://*.googleapis.com",
    'frame-src': "'none'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'"
  };
};

// Honeypot for bot detection
export const createHoneypot = () => {
  return {
    createField: () => {
      const field = document.createElement('input');
      field.type = 'text';
      field.name = 'website'; // Common honeypot name
      field.style.position = 'absolute';
      field.style.left = '-9999px';
      field.style.visibility = 'hidden';
      field.tabIndex = -1;
      field.autoComplete = 'off';
      return field;
    },
    
    isBot: (formData) => {
      return formData.website && formData.website.length > 0;
    }
  };
};
