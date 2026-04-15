import React, { useState, useEffect } from 'react';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from '../../services/sqlAuthCompat';
import { sanitizeInput, RateLimiter } from '../../utils/security';
import SecurityHeader from '../UI/SecurityHeader';
import { Eye, EyeOff } from 'lucide-react';

const GymLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [rateLimiter] = useState(() => new RateLimiter(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

  // Check rate limiting and update block status
  useEffect(() => {
    if (isBlocked && blockTimeLeft > 0) {
      const timer = setInterval(() => {
        setBlockTimeLeft(prev => {
          if (prev <= 1000) {
            setIsBlocked(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isBlocked, blockTimeLeft]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);
    
    // Validate inputs
    if (!sanitizedEmail || !sanitizedPassword) {
      setError('Please enter both email/username and password.');
      return;
    }
    
    // Check rate limiting
    if (rateLimiter.isBlocked(sanitizedEmail)) {
      setIsBlocked(true);
      setError('Too many failed attempts. Please try again later.');
      return;
    }
    
    if (isBlocked) {
      setError('Account temporarily locked. Please try again later.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      
      // Record successful attempt
      rateLimiter.addAttempt(sanitizedEmail, false);
      
      // User login is now handled by RBAC context
      setError('');
      // Reset attempts on successful login
      setLoginAttempts(0);
      setIsBlocked(false);
    } catch (err) {
      // Record failed attempt
      rateLimiter.addAttempt(sanitizedEmail, true);
      const attemptCount = loginAttempts + 1;
      setLoginAttempts(attemptCount);
      
      // Check if now blocked after this attempt
      if (rateLimiter.isBlocked(sanitizedEmail)) {
        setIsBlocked(true);
      }
      
      // Provide specific error messages
      let errorMessage = 'Login failed. ';
      if (err.code === 'auth/user-not-found') {
        errorMessage += 'No account found with this email address or username.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage += 'Incorrect password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage += 'Invalid email address format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage += 'This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage += 'Too many failed attempts. Please try again later.';
      } else {
        errorMessage += 'Please check your credentials and try again.';
      }
      
      if (attemptCount >= 3) {
        errorMessage += ` (${attemptCount}/5 attempts)`;
      }
      
      setError(errorMessage);
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const sanitizedEmail = sanitizeInput(email);
    
    if (!sanitizedEmail) {
      setError('Please enter your email address or username first.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, sanitizedEmail);
      setResetMessage('Password reset email sent! Check your inbox and spam folder.');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <form className="bg-white rounded-2xl shadow-2xl p-8 w-full" onSubmit={handleSubmit}>
      <SecurityHeader 
        loginAttempts={loginAttempts}
        isBlocked={isBlocked}
        blockTimeLeft={blockTimeLeft}
      />
      <input
        type="text"
        placeholder="Enter your email address or username"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4 transition-all"
        autoComplete="username"
        autoFocus
        disabled={loading}
      />
      <div className="relative mb-4">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          autoComplete="current-password"
          disabled={loading}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1"
          onClick={() => setShowPassword(!showPassword)}
          disabled={loading}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {resetMessage && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{resetMessage}</div>}
      <button type="submit" className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-3 text-sm" disabled={loading || isBlocked}>
        {loading ? 'Logging in...' : isBlocked ? 'Account Locked' : 'Login'}
      </button>
      <button 
        type="button" 
        className="w-full px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm" 
        onClick={handleForgotPassword}
        disabled={loading || isBlocked}
      >
        Forgot Password?
      </button>
    </form>
  );
};

export default GymLoginForm;



