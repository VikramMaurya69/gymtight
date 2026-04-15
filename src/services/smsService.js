/**
 * SMS Service for Admin Panel
 * Handles SMS sending through the backend API
 */

// Normalize base URL to avoid double '/api' and trailing slashes
const RAW_BASE_URL = (process.env.REACT_APP_BRIDGE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_BASE_URL = RAW_BASE_URL.endsWith('/api') ? RAW_BASE_URL : `${RAW_BASE_URL}/api`;

class SMSService {
  /**
   * Send generic SMS
   * @param {string} to - Recipient phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} - API response
   */
  async sendSMS(to, message) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send SMS');
      }

      return data;
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  /**
   * Send welcome SMS to new member
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {string} gymName - Gym name (optional)
   */
  async sendWelcomeSMS(phoneNumber, memberName, gymName = 'GymTight Fitness') {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, memberName, gymName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send welcome SMS');
      }

      return data;
    } catch (error) {
      console.error('Welcome SMS failed:', error);
      throw error;
    }
  }

  /**
   * Send payment reminder SMS
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {number} amount - Amount due
   * @param {string} dueDate - Due date
   */
  async sendPaymentReminder(phoneNumber, memberName, amount, dueDate) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/payment-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, memberName, amount, dueDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send payment reminder');
      }

      return data;
    } catch (error) {
      console.error('Payment reminder SMS failed:', error);
      throw error;
    }
  }

  /**
   * Send membership expiry reminder
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {string} expiryDate - Expiry date
   */
  async sendExpiryReminder(phoneNumber, memberName, expiryDate) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/expiry-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, memberName, expiryDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send expiry reminder');
      }

      return data;
    } catch (error) {
      console.error('Expiry reminder SMS failed:', error);
      throw error;
    }
  }

  /**
   * Send class booking confirmation
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {string} className - Class name
   * @param {string} dateTime - Class date and time
   */
  async sendClassBookingConfirmation(phoneNumber, memberName, className, dateTime) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms/class-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, memberName, className, dateTime }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send booking confirmation');
      }

      return data;
    } catch (error) {
      console.error('Class booking SMS failed:', error);
      throw error;
    }
  }
}

export const smsService = new SMSService();

