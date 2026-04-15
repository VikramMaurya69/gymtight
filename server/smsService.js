/**
 * SMS Service using Twilio
 * Handles sending SMS messages for the admin panel
 */

const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn('âš ï¸  Twilio credentials not found. SMS service will not work.');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

class SMSService {
  /**
   * Send SMS message
   * @param {string} to - Recipient phone number (with country code)
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} - Twilio response
   */
  async sendSMS(to, message) {
    if (!client) {
      throw new Error('SMS service not configured. Please check Twilio credentials.');
    }

    try {
      const response = await client.messages.create({
        body: message,
        from: fromNumber,
        to: to
      });

      console.log(`âœ… SMS sent to ${to}: ${response.sid}`);
      return {
        success: true,
        sid: response.sid,
        status: response.status
      };
    } catch (error) {
      console.error('âŒ SMS sending failed:', error.message);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send welcome SMS to new member
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {string} gymName - Gym/branch name
   */
  async sendWelcomeSMS(phoneNumber, memberName, gymName = 'GymTight Fitness') {
    const message = `Welcome to ${gymName}, ${memberName}! Your membership is now active. Visit us to start your fitness journey!`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send payment reminder SMS
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {number} amount - Amount due
   * @param {string} dueDate - Due date
   */
  async sendPaymentReminder(phoneNumber, memberName, amount, dueDate) {
    const message = `Hi ${memberName}, your payment of â‚¹${amount} is due on ${dueDate}. Please make the payment to avoid service interruption.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send membership expiry reminder
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {string} expiryDate - Expiry date
   */
  async sendExpiryReminder(phoneNumber, memberName, expiryDate) {
    const message = `Hi ${memberName}, your membership expires on ${expiryDate}. Renew now to continue your fitness journey!`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send class booking confirmation
   * @param {string} phoneNumber - Member's phone number
   * @param {string} memberName - Member's name
   * @param {string} className - Class name
   * @param {string} dateTime - Class date and time
   */
  async sendClassBookingConfirmation(phoneNumber, memberName, className, dateTime) {
    const message = `Hi ${memberName}, your booking for ${className} on ${dateTime} is confirmed. See you there!`;
    return this.sendSMS(phoneNumber, message);
  }
}

module.exports = new SMSService();