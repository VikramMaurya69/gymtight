// Security and Data Sanitization Utilities
// Use these functions to protect against XSS, injection attacks, and data leaks

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - Raw HTML string
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHTML = (html) => {
  if (!html) return '';
  
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
};

/**
 * Sanitize user input for display
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize email address
 * @param {string} email - Email address
 * @returns {string|null} - Sanitized email or null if invalid
 */
export const sanitizeEmail = (email) => {
  if (!email) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  return emailRegex.test(trimmed) ? trimmed : null;
};

/**
 * Validate and sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string|null} - Sanitized phone or null if invalid
 */
export const sanitizePhone = (phone) => {
  if (!phone) return null;
  
  // Remove all non-numeric characters except + at start
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Basic validation: 10-15 digits
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return cleaned;
  }
  
  return null;
};

/**
 * Sanitize file name to prevent path traversal
 * @param {string} fileName - File name
 * @returns {string} - Sanitized file name
 */
export const sanitizeFileName = (fileName) => {
  if (!fileName) return '';
  
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '_') // Prevent path traversal
    .slice(0, 255); // Limit length
};

/**
 * Validate and sanitize numeric input
 * @param {any} value - Input value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number|null} - Sanitized number or null if invalid
 */
export const sanitizeNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseFloat(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  
  if (num < min || num > max) {
    return null;
  }
  
  return num;
};

/**
 * Sanitize URL to prevent javascript: and data: URLs
 * @param {string} url - URL string
 * @returns {string|null} - Sanitized URL or null if invalid
 */
export const sanitizeURL = (url) => {
  if (!url) return null;
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(trimmed)) {
    return null;
  }
  
  // Only allow http, https, and relative URLs
  const validURL = /^(https?:\/\/|\/)/i;
  if (!validURL.test(trimmed)) {
    return null;
  }
  
  return trimmed;
};

/**
 * Sanitize SQL-like input (for display/logging, NOT for queries)
 * @param {string} input - Input string
 * @returns {string} - Sanitized string
 */
export const sanitizeSQLDisplay = (input) => {
  if (!input) return '';
  
  return String(input)
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
};

/**
 * Mask sensitive data for display
 * @param {string} value - Sensitive value (e.g., credit card, password)
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} - Masked value
 */
export const maskSensitiveData = (value, visibleChars = 4) => {
  if (!value) return '';
  
  const str = String(value);
  if (str.length <= visibleChars) {
    return '*'.repeat(str.length);
  }
  
  const masked = '*'.repeat(str.length - visibleChars);
  const visible = str.slice(-visibleChars);
  
  return masked + visible;
};

/**
 * Remove sensitive data from objects before logging
 * @param {object} obj - Object to clean
 * @param {array} sensitiveKeys - Keys to remove
 * @returns {object} - Cleaned object
 */
export const removeSensitiveData = (obj, sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = { ...obj };
  
  for (const key of sensitiveKeys) {
    if (key in cleaned) {
      cleaned[key] = '[REDACTED]';
    }
  }
  
  return cleaned;
};

/**
 * Validate date input
 * @param {string} dateString - Date string
 * @returns {Date|null} - Valid Date object or null
 */
export const sanitizeDate = (dateString) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Check if date is within reasonable range (1900 - 2100)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return null;
  }
  
  return date;
};

/**
 * Validate and limit text length
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Truncated text
 */
export const limitTextLength = (text, maxLength = 1000) => {
  if (!text) return '';
  
  const str = String(text);
  return str.length > maxLength ? str.slice(0, maxLength) : str;
};

/**
 * Deep clone object to prevent prototype pollution
 * @param {object} obj - Object to clone
 * @returns {object} - Cloned object
 */
export const safeClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Rate limiting helper for client-side
 * @param {function} func - Function to rate limit
 * @param {number} limit - Number of calls allowed
 * @param {number} interval - Time window in ms
 * @returns {function} - Rate-limited function
 */
export const rateLimit = (func, limit = 5, interval = 60000) => {
  const calls = [];
  
  return function (...args) {
    const now = Date.now();
    
    // Remove calls outside the interval
    while (calls.length > 0 && calls[0] < now - interval) {
      calls.shift();
    }
    
    if (calls.length < limit) {
      calls.push(now);
      return func.apply(this, args);
    } else {
      console.warn('Rate limit exceeded');
      throw new Error('Too many requests. Please try again later.');
    }
  };
};

/**
 * Validate file upload
 * @param {File} file - File object
 * @param {array} allowedTypes - Allowed MIME types
 * @param {number} maxSize - Max file size in bytes (default 5MB)
 * @returns {object} - Validation result
 */
export const validateFileUpload = (file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], maxSize = 5 * 1024 * 1024) => {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit` 
    };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  // Validate file name
  const sanitizedName = sanitizeFileName(file.name);
  if (!sanitizedName) {
    return { valid: false, error: 'Invalid file name' };
  }
  
  return { valid: true, sanitizedName };
};

/**
 * Secure localStorage wrapper
 */
export const secureStorage = {
  set: (key, value) => {
    try {
      const sanitizedKey = sanitizeInput(key);
      const data = JSON.stringify(value);
      localStorage.setItem(sanitizedKey, data);
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  get: (key) => {
    try {
      const sanitizedKey = sanitizeInput(key);
      const data = localStorage.getItem(sanitizedKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  },
  
  remove: (key) => {
    try {
      const sanitizedKey = sanitizeInput(key);
      localStorage.removeItem(sanitizedKey);
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  
  clear: () => {
    localStorage.clear();
  }
};

/**
 * Validate permission array
 * @param {array} permissions - Array of permission strings
 * @param {array} validPermissions - Array of valid permission IDs
 * @returns {array} - Filtered valid permissions
 */
export const validatePermissions = (permissions, validPermissions) => {
  if (!Array.isArray(permissions)) return [];
  
  return permissions.filter(p => 
    typeof p === 'string' && validPermissions.includes(p)
  );
};

export default {
  sanitizeHTML,
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeFileName,
  sanitizeNumber,
  sanitizeURL,
  sanitizeSQLDisplay,
  maskSensitiveData,
  removeSensitiveData,
  sanitizeDate,
  limitTextLength,
  safeClone,
  rateLimit,
  validateFileUpload,
  secureStorage,
  validatePermissions
};
