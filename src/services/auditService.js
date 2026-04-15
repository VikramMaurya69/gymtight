/**
 * Audit Logging Service
 * Logs all critical actions for compliance and security monitoring
 */

import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from './sqlFirestoreCompat';
import { removeSensitiveData } from '../utils/sanitization';

// Action types for audit logs
export const AUDIT_ACTIONS = {
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',
  PERMISSIONS_UPDATED: 'permissions_updated',
  
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_EXPIRED: 'session_expired',
  
  // Members
  MEMBER_CREATED: 'member_created',
  MEMBER_UPDATED: 'member_updated',
  MEMBER_DELETED: 'member_deleted',
  
  // Trainers
  TRAINER_CREATED: 'trainer_created',
  TRAINER_UPDATED: 'trainer_updated',
  TRAINER_DELETED: 'trainer_deleted',
  
  // Packages
  PACKAGE_CREATED: 'package_created',
  PACKAGE_UPDATED: 'package_updated',
  PACKAGE_DELETED: 'package_deleted',
  
  // Subscriptions
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_DELETED: 'subscription_deleted',
  
  // Attendance
  ATTENDANCE_MARKED: 'attendance_marked',
  ATTENDANCE_UPDATED: 'attendance_updated',
  
  // Fingerprint
  FINGERPRINT_REGISTERED: 'fingerprint_registered',
  FINGERPRINT_DELETED: 'fingerprint_deleted',
  DEVICE_CONNECTED: 'device_connected',
  DEVICE_DISCONNECTED: 'device_disconnected',
  
  // Security
  ACCESS_DENIED: 'access_denied',
  SECURITY_ALERT: 'security_alert',
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET: 'password_reset'
};

// Severity levels
export const AUDIT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

class AuditService {
  /**
   * Log an audit event
   * @param {string} action - Action type from AUDIT_ACTIONS
   * @param {string} severity - Severity level from AUDIT_SEVERITY
   * @param {Object} details - Additional details about the action
   * @param {string} targetResource - Resource being acted upon (e.g., 'member:123')
   */
  async logAction(action, severity = AUDIT_SEVERITY.INFO, details = {}, targetResource = null) {
    try {
      const user = auth.currentUser;
      
      // Get IP address (client-side approximation)
      const ipInfo = await this.getClientInfo();
      
      // Sanitize details to remove sensitive data
      const sanitizedDetails = removeSensitiveData(details);
      
      const logEntry = {
        action,
        severity,
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        targetResource,
        details: sanitizedDetails,
        ipAddress: ipInfo.ip,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'audit_logs'), logEntry);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ Audit Log:', logEntry);
      }
      
      // In production, you might also send critical logs to external monitoring
      if (severity === AUDIT_SEVERITY.CRITICAL || severity === AUDIT_SEVERITY.ERROR) {
        this.sendAlertToMonitoring(logEntry);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failure shouldn't break the app
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Log user authentication events
   */
  async logLogin(success, email, error = null) {
    await this.logAction(
      success ? AUDIT_ACTIONS.LOGIN_SUCCESS : AUDIT_ACTIONS.LOGIN_FAILED,
      success ? AUDIT_SEVERITY.INFO : AUDIT_SEVERITY.WARNING,
      { email, error: error?.message }
    );
  }
  
  async logLogout(email) {
    await this.logAction(
      AUDIT_ACTIONS.LOGOUT,
      AUDIT_SEVERITY.INFO,
      { email }
    );
  }
  
  async logSessionExpired(email) {
    await this.logAction(
      AUDIT_ACTIONS.SESSION_EXPIRED,
      AUDIT_SEVERITY.INFO,
      { email }
    );
  }
  
  /**
   * Log CRUD operations
   */
  async logCreate(resourceType, resourceId, data) {
    const action = `${resourceType}_created`;
    await this.logAction(
      action,
      AUDIT_SEVERITY.INFO,
      { data },
      `${resourceType}:${resourceId}`
    );
  }
  
  async logUpdate(resourceType, resourceId, changes) {
    const action = `${resourceType}_updated`;
    await this.logAction(
      action,
      AUDIT_SEVERITY.INFO,
      { changes },
      `${resourceType}:${resourceId}`
    );
  }
  
  async logDelete(resourceType, resourceId) {
    const action = `${resourceType}_deleted`;
    await this.logAction(
      action,
      AUDIT_SEVERITY.WARNING,
      {},
      `${resourceType}:${resourceId}`
    );
  }
  
  /**
   * Log access control events
   */
  async logAccessDenied(resource, requiredPermission) {
    await this.logAction(
      AUDIT_ACTIONS.ACCESS_DENIED,
      AUDIT_SEVERITY.WARNING,
      { resource, requiredPermission }
    );
  }
  
  async logPermissionsUpdated(targetUserId, newPermissions) {
    await this.logAction(
      AUDIT_ACTIONS.PERMISSIONS_UPDATED,
      AUDIT_SEVERITY.INFO,
      { targetUserId, newPermissions },
      `user:${targetUserId}`
    );
  }
  
  /**
   * Get client information (IP, location, etc.)
   */
  async getClientInfo() {
    try {
      // In production, you might use a service like ipify or ipapi
      // For now, return placeholder
      return {
        ip: 'Unknown', // Use a service like https://api.ipify.org?format=json
        location: 'Unknown'
      };
    } catch (error) {
      return {
        ip: 'Unknown',
        location: 'Unknown'
      };
    }
  }
  
  /**
   * Send critical alerts to external monitoring service
   * (e.g., Sentry, DataDog, CloudWatch)
   */
  sendAlertToMonitoring(logEntry) {
    // Implement external monitoring integration here
    // For now, just console log
    if (process.env.NODE_ENV === 'production') {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ CRITICAL AUDIT LOG:', logEntry);
      // Example: Sentry.captureMessage(JSON.stringify(logEntry), 'error');
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Export constants
export { AUDIT_ACTIONS, AUDIT_SEVERITY };


