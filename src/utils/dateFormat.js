/**
 * Format date to DD-MM-YYYY
 * @param {Date|string|null} dateValue - Date to format
 * @returns {string} - Formatted date string or 'N/A' or 'Invalid Date'
 */
export const formatDateToDDMMYYYY = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format date with time to DD-MM-YYYY HH:MM
 * @param {Date|string|null} dateValue - Date to format
 * @returns {string} - Formatted datetime string
 */
export const formatDateTimeToDDMMYYYY = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return 'Invalid Date';
  }
};
