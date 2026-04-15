import React from 'react';

const SecurityHeader = ({ loginAttempts, isBlocked, blockTimeLeft }) => {
  if (!loginAttempts && !isBlocked) return null;

  const formatTime = (ms) => {
    const minutes = Math.ceil(ms / 60000);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  };

  return (
    <div className="mb-4">
      {isBlocked ? (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          Account temporarily locked for {formatTime(blockTimeLeft)}
        </div>
      ) : loginAttempts >= 3 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          {loginAttempts}/5 failed attempts. Account will be locked after 5 attempts.
        </div>
      ) : null}
    </div>
  );
};

export default SecurityHeader;


