/**
 * Validation utilities for form inputs
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateEmail = (email) => {
  if (!email) return false;
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * Get email validation error message
 * @param {string} email - Email address to validate
 * @returns {string} - Error message or empty string if valid
 */
export const getEmailError = (email) => {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  return '';
};

/**
 * Validate Indian phone number format
 * Accepts: 10 digits, +91 prefix optional, spaces/hyphens optional
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePhone = (phone) => {
  if (!phone) return false;
  
  // Remove all spaces, hyphens, and plus signs
  const cleaned = phone.replace(/[\s\-+]/g, '');
  
  // Check if it's a valid Indian phone number
  // Should be 10 digits or 12 digits with 91 prefix
  const phoneRegex = /^(?:91)?[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Get phone validation error message
 * @param {string} phone - Phone number to validate
 * @returns {string} - Error message or empty string if valid
 */
export const getPhoneError = (phone) => {
  if (!phone || phone.trim() === '') {
    return 'Phone number is required';
  }
  if (!validatePhone(phone)) {
    return 'Please enter a valid 10-digit Indian phone number';
  }
  return '';
};

/**
 * Format phone number to standard format
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[\s\-+]/g, '');
  
  // If starts with 91, format as +91 XXXXX XXXXX
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
  }
  
  // If 10 digits, format as XXXXX XXXXX
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  
  return phone;
};

/**
 * Validate positive number (for amounts, ages, etc.)
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (optional)
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePositiveNumber = (value, min = 0, max = null) => {
  const num = parseFloat(value);
  
  if (isNaN(num)) return false;
  if (num < min) return false;
  if (max !== null && num > max) return false;
  
  return true;
};

/**
 * Get number validation error message
 * @param {string|number} value - Value to validate
 * @param {string} fieldName - Name of the field (for error message)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value (optional)
 * @returns {string} - Error message or empty string if valid
 */
export const getNumberError = (value, fieldName = 'Value', min = 0, max = null) => {
  if (value === '' || value === null || value === undefined) {
    return `${fieldName} is required`;
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  
  if (max !== null && num > max) {
    return `${fieldName} must not exceed ${max}`;
  }
  
  return '';
};

/**
 * Validate integer (for counts, IDs, etc.)
 * @param {string|number} value - Value to validate
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (optional)
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateInteger = (value, min = 0, max = null) => {
  const num = parseInt(value, 10);
  
  if (isNaN(num) || num !== parseFloat(value)) return false;
  if (num < min) return false;
  if (max !== null && num > max) return false;
  
  return true;
};

/**
 * Validate Aadhaar number (12 digits)
 * @param {string} aadhaar - Aadhaar number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateAadhaar = (aadhaar) => {
  if (!aadhaar) return false;
  
  const cleaned = aadhaar.replace(/[\s-]/g, '');
  const aadhaarRegex = /^\d{12}$/;
  
  return aadhaarRegex.test(cleaned);
};

/**
 * Get Aadhaar validation error message
 * @param {string} aadhaar - Aadhaar number to validate
 * @returns {string} - Error message or empty string if valid
 */
export const getAadhaarError = (aadhaar) => {
  if (!aadhaar || aadhaar.trim() === '') {
    return 'Aadhaar number is required';
  }
  if (!validateAadhaar(aadhaar)) {
    return 'Please enter a valid 12-digit Aadhaar number';
  }
  return '';
};

/**
 * Validate required field (not empty)
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @returns {string} - Error message or empty string if valid
 */
export const getRequiredError = (value, fieldName = 'This field') => {
  if (!value || value.toString().trim() === '') {
    return `${fieldName} is required`;
  }
  return '';
};

/**
 * Validate text length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateLength = (value, minLength = 0, maxLength = Infinity) => {
  if (!value) return minLength === 0;
  
  const length = value.toString().trim().length;
  return length >= minLength && length <= maxLength;
};

/**
 * Get length validation error message
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {string} - Error message or empty string if valid
 */
export const getLengthError = (value, fieldName = 'This field', minLength = 0, maxLength = Infinity) => {
  if (!value || value.toString().trim() === '') {
    if (minLength > 0) {
      return `${fieldName} is required`;
    }
    return '';
  }
  
  const length = value.toString().trim().length;
  
  if (length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  
  if (length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  
  return '';
};

/**
 * Validate PAN card number (Indian)
 * Format: AAAAA9999A
 * @param {string} pan - PAN number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePAN = (pan) => {
  if (!pan) return false;
  
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
};

/**
 * Validate date (not in future for birth dates, etc.)
 * @param {string|Date} date - Date to validate
 * @param {boolean} allowFuture - Allow future dates
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateDate = (date, allowFuture = false) => {
  if (!date) return false;
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return false;
  
  if (!allowFuture && dateObj > new Date()) return false;
  
  return true;
};

/**
 * Validate age (based on birth date)
 * @param {string|Date} birthDate - Birth date
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateAge = (birthDate, minAge = 0, maxAge = 120) => {
  if (!birthDate) return false;
  
  const birthDateObj = birthDate instanceof Date ? birthDate : new Date(birthDate);
  
  if (isNaN(birthDateObj.getTime())) return false;
  
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age >= minAge && age <= maxAge;
};
