import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SecurityLogger } from '../../utils/security';
import { LogOut } from 'lucide-react';

const LogoutButton = ({ user, onLogout, className = '', isCollapsed = false, isMobile = false }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleLogoutClick = () => {
    setShowConfirmation(true);
  };

  const confirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Log security event
      const logger = new SecurityLogger();
      logger.log('user_logout', 'User initiated logout', {
        user: user?.email,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        sessionDuration: getSessionDuration()
      });

      // Clear sensitive data from localStorage
      clearSecureData();

      // Small delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call the logout function
      await onLogout();

    } catch (error) {
      console.error('Logout error:', error);
      
      // Log logout error
      const logger = new SecurityLogger();
      logger.log('logout_error', 'Logout failed', {
        user: user?.email,
        error: error.message,
        severity: 'medium'
      });
      
      // Still attempt to logout even if logging fails
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      setShowConfirmation(false);
    }
  };

  const cancelLogout = () => {
    setShowConfirmation(false);
  };

  const getSessionDuration = () => {
    const loginTime = localStorage.getItem('login_timestamp');
    if (loginTime) {
      return Date.now() - parseInt(loginTime);
    }
    return 0;
  };

  const clearSecureData = () => {
    try {
      // Clear sensitive session data
      const keysToRemove = [
        'login_timestamp',
        'session_id',
        'device_fingerprint',
        'last_activity'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear any cached security data but keep security logs
      // (logs are important for audit purposes)
      
    } catch (error) {
      console.warn('Failed to clear some session data:', error);
    }
  };

  const confirmationModal = showConfirmation ? createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={cancelLogout}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <LogOut className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Confirm Logout</h3>
            <p className="text-sm text-gray-600">Are you sure you want to log out?</p>
          </div>
        </div>
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 flex items-center gap-2">
                <span>Warning:</span>
            <span>Any unsaved changes will be lost.</span>
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button 
            onClick={cancelLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={confirmLogout} 
            disabled={isLoggingOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Yes, Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {confirmationModal}
      <button 
        onClick={handleLogoutClick}
        className={`w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors ${className} ${isCollapsed ? 'justify-center' : ''}`}
        disabled={isLoggingOut}
        title="Secure Logout"
      >
        <LogOut size={20} className="flex-shrink-0" />
        {!isCollapsed && <span className="font-medium">Logout</span>}
      </button>
    </>
  );
};

export default LogoutButton;



