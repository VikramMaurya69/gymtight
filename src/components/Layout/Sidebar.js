import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  BarChart3,
  Calendar,
  Users,
  Dumbbell,
  HelpCircle,
  Package,
  Clock,
  MessageSquare,
  MessageCircle,
  Settings,
  AlertCircle,
  DollarSign,
  Image,
  Layers
} from 'lucide-react';
import { useRBAC, PERMISSIONS } from '../../contexts/RBACContext';
import { Link, useLocation } from 'react-router-dom';
import LogoutButton from '../Auth/LogoutButton';

const Sidebar = ({ 
  user, 
  role,
  onLogout, 
  isCollapsed, 
  onToggleCollapse, 
  isMobileMenuOpen, 
  onMobileMenuToggle 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { hasPermission } = useRBAC();
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && isMobileMenuOpen) {
        onMobileMenuToggle(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobileMenuOpen, onMobileMenuToggle]);

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', path: '/', requiredPermission: PERMISSIONS.VIEW_DASHBOARD },
    { id: 'attendance', icon: Calendar, label: 'Attendance', path: '/attendance', requiredPermission: PERMISSIONS.VIEW_ATTENDANCE },
    { id: 'members', icon: Users, label: 'Members', path: '/members', requiredPermission: PERMISSIONS.VIEW_MEMBERS },
    { id: 'membership-alerts', icon: AlertCircle, label: 'Membership Alerts', path: '/membership-alerts', requiredPermission: PERMISSIONS.VIEW_MEMBERS },
    { id: 'counselors', icon: Users, label: 'Counselors', path: '/counselors', requiredPermission: PERMISSIONS.VIEW_MEMBERS },
    { id: 'trainers', icon: Dumbbell, label: 'Trainers', path: '/trainers', requiredPermission: PERMISSIONS.VIEW_TRAINERS },
    { id: 'packages', icon: Package, label: 'Packages', path: '/packages', requiredPermission: PERMISSIONS.MANAGE_PACKAGES },
    { id: 'enquiries', icon: HelpCircle, label: 'Enquiries', path: '/enquiries', requiredPermission: PERMISSIONS.VIEW_MEMBERS }
  ];

  const communicationItems = [
    { id: 'sms', icon: MessageSquare, label: 'SMS', path: '/sms', requiredPermission: PERMISSIONS.SEND_SMS },
    { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', path: '/whatsapp', requiredPermission: PERMISSIONS.MANAGE_WHATSAPP }
  ];

  const marketingItems = [
    { id: 'banners', icon: Image, label: 'App Banners', path: '/banners', requiredPermission: PERMISSIONS.MANAGE_BANNERS },
    { id: 'messages', icon: Layers, label: 'App Messages', path: '/messages', requiredPermission: PERMISSIONS.MANAGE_MESSAGES }
  ];

  const adminItems = [
    { id: 'user-management', icon: Settings, label: 'User Management', path: '/user-management', requiredPermission: PERMISSIONS.MANAGE_USERS },
    { id: 'trainer-payments', icon: DollarSign, label: 'Trainer Payments', path: '/trainer-payments', requiredPermission: PERMISSIONS.MANAGE_USERS }
  ];

  const getFilteredItems = (items) => {
    return items.filter(item => {
      if (!item.requiredPermission) return true;
      return hasPermission(item.requiredPermission);
    });
  };

  const toggleSidebar = () => {
    if (isMobile) {
      onMobileMenuToggle(!isMobileMenuOpen);
    } else {
      onToggleCollapse(!isCollapsed);
    }
  };

  const renderMenuItem = (item) => {
    const isActive = location.pathname === item.path;
    return (
      <li key={item.id}>
        <Link 
          to={item.path} 
          onClick={isMobile ? () => onMobileMenuToggle(false) : undefined}
          className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isActive 
              ? 'bg-primary text-white shadow-md shadow-primary/20' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
          }`}
        >
          <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary'} />
          {!isCollapsed && <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity"
          onClick={() => onMobileMenuToggle(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col shadow-xl ${
        isCollapsed && !isMobile ? 'w-[70px]' : 'w-[280px]'
      } ${
        isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 h-[70px]">
          {(!isCollapsed || isMobile) && (
            <div className="flex items-center gap-2">
              {!logoError ? (
                <img 
                  src="/logo.png" 
                  alt="GymTight Fitness" 
                  className="h-8 w-auto"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">V</div>
              )}
              <span className="text-lg font-bold text-gray-900 tracking-tight">GymTight Fitness</span>
            </div>
          )}
          
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isMobile ? <X size={20} /> : (isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />)}
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-200">
          <ul className="space-y-1 mb-6">
            {(!isCollapsed || isMobile) && <span className="block px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</span>}
            {getFilteredItems(menuItems).map(renderMenuItem)}
          </ul>
          
          {getFilteredItems(communicationItems).length > 0 && (
            <ul className="space-y-1 mb-6">
              {(!isCollapsed || isMobile) && <span className="block px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Communication</span>}
              {getFilteredItems(communicationItems).map(renderMenuItem)}
            </ul>
          )}

          {getFilteredItems(marketingItems).length > 0 && (
            <ul className="space-y-1 mb-6">
              {(!isCollapsed || isMobile) && <span className="block px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Marketing</span>}
              {getFilteredItems(marketingItems).map(renderMenuItem)}
            </ul>
          )}

          {getFilteredItems(adminItems).length > 0 && (
            <ul className="space-y-1 mb-6">
              {(!isCollapsed || isMobile) && <span className="block px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</span>}
              {getFilteredItems(adminItems).map(renderMenuItem)}
            </ul>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <LogoutButton onLogout={onLogout} isCollapsed={isCollapsed && !isMobile} />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;


