import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

const SessionWarningModal = ({ isOpen, onContinue, onLogout }) => {
  const [countdown, setCountdown] = useState(120); // 2 minutes in seconds

  useEffect(() => {
    if (!isOpen) {
      setCountdown(120);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout(); // Auto logout when countdown reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onLogout]);

  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={48} className="text-amber-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Session Expiring Soon</h2>
        
        <p className="text-gray-600 text-center mb-6">
          Your session will expire due to inactivity. You will be logged out automatically in:
        </p>
        
        <div className="flex items-center justify-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <Clock size={24} className="text-amber-600" />
          <span className="text-3xl font-bold text-amber-900">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            onClick={onContinue}
          >
            Continue Session
          </button>
          <button 
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            onClick={onLogout}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;


