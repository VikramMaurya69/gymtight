import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GymLogo from './components/UI/GymLogo';
import GymLoginForm from './components/Auth/GymLoginForm';
import Layout from './components/Layout/Layout';
import SessionWarningModal from './components/UI/SessionWarningModal';
import { auth } from './services/firebase';
import { createSessionManager, getDeviceFingerprint } from './utils/sessionSecurity';
import { sessionTimeout } from './utils/sessionTimeout';
import { RBACProvider, useRBAC } from './contexts/RBACContext';
import { BranchProvider } from './contexts/BranchContext';
import { AlertTriangle } from 'lucide-react';
import Renew from './pages/Renew';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MembershipAlerts from './pages/MembershipAlerts';
import Counselors from './pages/Counselors';
import Trainers from './pages/Trainers';
import Attendance from './pages/Attendance';
import UserManagement from './pages/UserManagement';
import Packages from './pages/Packages';
import Enquiries from './pages/Enquiries';
import TrainerPayments from './pages/TrainerPayments';
import SMS from './pages/SMS';
import WhatsApp from './pages/WhatsApp';
import Banners from './pages/Banners';
import Messages from './pages/Messages';

// RBAC-aware component wrapper
function AuthenticatedApp() {
  const {
    loading: rbacLoading,
    user,
    isAuthenticated,
    isAuthorized,
    role,
    error: rbacError
  } = useRBAC();

  const [sessionManager] = useState(() => createSessionManager());
  const [deviceFingerprint] = useState(() => getDeviceFingerprint());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const getSessionDuration = useCallback(() => {
    const loginTime = localStorage.getItem('login_timestamp');
    if (loginTime) {
      return Date.now() - parseInt(loginTime);
    }
    return 0;
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // Stop session monitoring
      sessionManager.stopSessionMonitoring();

      // Log security event
      console.log('User logged out:', {
        email: user?.email,
        deviceFingerprint,
        timestamp: new Date().toISOString(),
        sessionDuration: getSessionDuration()
      });

      // Clear login timestamp
      localStorage.removeItem('login_timestamp');

      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [sessionManager, user?.email, deviceFingerprint, getSessionDuration]);

  useEffect(() => {
    if (user) {
      // Set login timestamp for session tracking
      localStorage.setItem('login_timestamp', Date.now().toString());

      // Initialize new session timeout system
      sessionTimeout.init(
        // On warning callback
        () => {
          console.log('Session warning shown');
          setShowSessionWarning(true);
        },
        // On timeout callback
        () => {
          console.log('Session expired due to inactivity');
          handleLogout();
        }
      );

      // Start session monitoring for authenticated users
      sessionManager.startSessionMonitoring(() => {
        console.log('Session expired due to inactivity');
        // Call logout directly to avoid dependency issues
        auth.signOut().then(() => {
          sessionManager.stopSessionMonitoring();
          localStorage.removeItem('login_timestamp');
        }).catch(error => {
          console.error('Logout error:', error);
        });
      });

      // Log security event (in production, send to monitoring service)
      console.log('User authenticated:', {
        email: user.email,
        deviceFingerprint,
        timestamp: new Date().toISOString(),
        role: role
      });
    } else {
      // Stop session monitoring when user logs out
      sessionManager.stopSessionMonitoring();
      sessionTimeout.stop();
    }

    return () => {
      sessionManager.stopSessionMonitoring();
      sessionTimeout.stop();
    };
  }, [user, sessionManager, deviceFingerprint, role]);

  // Show loading state
  if (rbacLoading) {
    return (
      <div className="gym-login-bg">
        <div className="gym-login-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Verifying access permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authorization error
  if (rbacError || (isAuthenticated && !isAuthorized)) {
    return (
      <div className="gym-login-bg">
        <div className="gym-login-container">
          <div className="access-denied-container">
            <div className="access-denied-content">
              <AlertTriangle size={48} color="#ef4444" />
              <h2>Access Denied</h2>
              <p>{rbacError || 'You do not have permission to access this admin panel.'}</p>
              <p>Please contact the gym owner at <strong>griptightfitness@gmail.com</strong> for access.</p>
              <button onClick={handleLogout} className="logout-btn">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show authenticated app
  if (isAuthenticated && isAuthorized) {
    return (
      <BranchProvider>
        <Layout user={user} role={role} onLogout={handleLogout}>
          <Routes>
            <Route path="/members" element={<Members />} />
            <Route path="/membership-alerts" element={<MembershipAlerts />} />
            <Route path="/counselors" element={<Counselors />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/trainers" element={<Trainers />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/enquiries" element={<Enquiries />} />
            <Route path="/trainer-payments" element={<TrainerPayments />} />
            <Route path="/sms" element={<SMS />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/banners" element={<Banners />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/renew/:memberId" element={<Renew />} />
            <Route path="/" element={<Dashboard user={user} />} />
          </Routes>
        </Layout>
        <SessionWarningModal
          isOpen={showSessionWarning}
          onContinue={() => {
            setShowSessionWarning(false);
            sessionTimeout.resetTimer();
          }}
          onLogout={handleLogout}
        />
      </BranchProvider>
    );
  }

  // Show login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <GymLogo />
        </div>
        <GymLoginForm />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <RBACProvider>
        <AuthenticatedApp />
      </RBACProvider>
    </Router>
  );
}

export default App;
