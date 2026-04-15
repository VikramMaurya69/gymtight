/**
 * Session Timeout Manager
 * Handles automatic logout after 30 minutes of inactivity
 */

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

class SessionTimeoutManager {
  constructor() {
    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.onWarning = null;
    this.onTimeout = null;
    this.isActive = false;
  }

  /**
   * Initialize the session timeout manager
   * @param {Function} onWarningCallback - Called when warning is shown
   * @param {Function} onTimeoutCallback - Called when session expires
   */
  init(onWarningCallback, onTimeoutCallback) {
    this.onWarning = onWarningCallback;
    this.onTimeout = onTimeoutCallback;
    this.start();
    this.setupActivityListeners();
  }

  /**
   * Start or restart the timeout timer
   */
  start() {
    this.clearTimers();
    this.isActive = true;

    // Set warning timer (28 minutes)
    this.warningTimeoutId = setTimeout(() => {
      if (this.onWarning) {
        this.onWarning();
      }
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timer (30 minutes)
    this.timeoutId = setTimeout(() => {
      if (this.onTimeout) {
        this.onTimeout();
      }
    }, SESSION_TIMEOUT);
  }

  /**
   * Reset the timer on user activity
   */
  resetTimer() {
    if (this.isActive) {
      this.start();
    }
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
  }

  /**
   * Stop the session timeout manager
   */
  stop() {
    this.isActive = false;
    this.clearTimers();
    this.removeActivityListeners();
  }

  /**
   * Setup listeners for user activity
   */
  setupActivityListeners() {
    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle the reset to avoid too many timer resets
    let throttleTimer = null;
    this.activityHandler = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          this.resetTimer();
          throttleTimer = null;
        }, 1000); // Reset at most once per second
      }
    };

    events.forEach(event => {
      document.addEventListener(event, this.activityHandler, true);
    });
  }

  /**
   * Remove activity listeners
   */
  removeActivityListeners() {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    if (this.activityHandler) {
      events.forEach(event => {
        document.removeEventListener(event, this.activityHandler, true);
      });
    }
  }

  /**
   * Get remaining time until timeout
   * @returns {number} Time in milliseconds
   */
  getRemainingTime() {
    // This is an approximation since we don't track exact start time
    return SESSION_TIMEOUT;
  }
}

// Export singleton instance
export const sessionTimeout = new SessionTimeoutManager();

// Export timeout constants for use in UI
export const SESSION_TIMEOUT_MINUTES = 30;
export const WARNING_MINUTES = 2;
