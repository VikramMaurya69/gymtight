import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRBAC } from '../contexts/RBACContext';
import { userManagementService } from '../services/userManagementService';
import { useBranch } from '../contexts/BranchContext';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  UserPlus,
  Trash2,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  Edit3,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Phone,
  Briefcase
} from 'lucide-react';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitization';
import { validateEmail, validatePhone, getEmailError, getPhoneError } from '../utils/validation';

// Define available permissions
const AVAILABLE_PERMISSIONS = [
  { id: 'view_dashboard', label: 'View Dashboard', category: 'General' },
  { id: 'view_members', label: 'View Members', category: 'Members' },
  { id: 'add_members', label: 'Add Members', category: 'Members' },
  { id: 'edit_members', label: 'Edit Members', category: 'Members' },
  { id: 'delete_members', label: 'Delete Members', category: 'Members' },
  { id: 'view_trainers', label: 'View Trainers', category: 'Trainers' },
  { id: 'add_trainers', label: 'Add Trainers', category: 'Trainers' },
  { id: 'edit_trainers', label: 'Edit Trainers', category: 'Trainers' },
  { id: 'delete_trainers', label: 'Delete Trainers', category: 'Trainers' },
  { id: 'view_packages', label: 'View Packages', category: 'Packages' },
  { id: 'add_packages', label: 'Add Packages', category: 'Packages' },
  { id: 'edit_packages', label: 'Edit Packages', category: 'Packages' },
  { id: 'delete_packages', label: 'Delete Packages', category: 'Packages' },
  { id: 'view_subscriptions', label: 'View Subscriptions', category: 'Subscriptions' },
  { id: 'manage_subscriptions', label: 'Manage Subscriptions', category: 'Subscriptions' },
  { id: 'view_attendance', label: 'View Attendance', category: 'Attendance' },
  { id: 'manage_attendance', label: 'Manage Attendance', category: 'Attendance' },
  { id: 'view_fingerprint', label: 'View Fingerprint', category: 'Security' },
  { id: 'register_fingerprint', label: 'Register Fingerprint', category: 'Security' },
  { id: 'view_reports', label: 'View Reports', category: 'Reports' },
  { id: 'export_data', label: 'Export Data', category: 'Reports' }
];

const UserManagement = () => {
  const { 
    isOwner, 
    error,
    clearError 
  } = useRBAC();
  
  const { currentBranch } = useBranch();
  
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingManager, setEditingManager] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [userType, setUserType] = useState('all'); // all, manager, counselor, staff
  const [newManager, setNewManager] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'manager',
    userType: 'manager', // manager, counselor, staff
    phone: '',
    department: ''
  });
  const [selectedPermissions, setSelectedPermissions] = useState([
    'view_dashboard',
    'view_members',
    'view_trainers',
    'view_attendance'
  ]);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const loadingRef = useRef(false);

  // Define loadManagers function without useCallback to avoid dependency issues
  const loadManagers = async () => {
    if (loadingRef.current) return; // Prevent multiple simultaneous calls
    
    try {
      loadingRef.current = true;
      setLoading(true);
      clearError();
      
      const result = await userManagementService.getAllManagers();
      
      if (result.success) {
        setManagers(result.data);
        
        // Clear any previous alerts on successful load
        setAlert(null);
      } else {
        setAlert({
          type: 'error',
          message: result.error
        });
        // Set empty array to show "No managers" state
        setManagers([]);
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to load managers: ' + error.message
      });
      // Set empty array to show "No managers" state
      setManagers([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Redirect if not owner
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      if (!isMounted) return;
      
      if (!isOwner()) {
        if (isMounted) {
          setAlert({
            type: 'error',
            message: 'Access denied. Only gym owners can manage users.'
          });
        }
        return;
      }
      
      if (isMounted) {
        await loadManagers();
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once

  const togglePermission = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const toggleAllInCategory = (category) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p));
    
    if (allSelected) {
      // Unselect all in category
      setSelectedPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)));
    } else {
      // Select all in category
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryPermissions])]);
    }
  };

  const handleAddManager = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newManager.email || !newManager.displayName) {
      setAlert({
        type: 'error',
        message: 'Please fill in all required fields (Email and Name)'
      });
      return;
    }

    // Validate email format
    const emailError = getEmailError(newManager.email);
    if (emailError) {
      setAlert({
        type: 'error',
        message: emailError
      });
      return;
    }

    // Validate phone if provided
    if (newManager.phone) {
      const phoneError = getPhoneError(newManager.phone);
      if (phoneError) {
        setAlert({
          type: 'error',
          message: phoneError
        });
        return;
      }
    }

    try {
      setActionLoading('add');
      
      // Check if email is already in use
      const emailInUse = await userManagementService.isEmailInUse(newManager.email);
      if (emailInUse) {
        setAlert({
          type: 'error',
          message: 'This email is already registered. Please use a different email.'
        });
        return;
      }
      
      // Create manager with Firebase Auth + Firestore + Email
      const result = await userManagementService.createManager({
        email: newManager.email,
        displayName: newManager.displayName,
        password: newManager.password,
        role: newManager.role,
        userType: newManager.userType || 'manager',
        phone: newManager.phone,
        department: newManager.department,
        branchId: currentBranch?.id,
        permissions: selectedPermissions,
        sendEmail: true
      });

      setAlert({
        type: 'success',
        message: result.message
      });

      resetForm();
      setShowAddModal(false);
      loadManagers();
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditManager = (manager) => {
    setEditingManager(manager);
    setNewManager({
      email: manager.email || '',
      displayName: manager.displayName || '',
      password: '',
      role: manager.role || 'manager',
      userType: manager.userType || 'manager',
      phone: manager.phone || '',
      department: manager.department || ''
    });
    setSelectedPermissions(manager.permissions || []);
    setShowEditModal(true);
  };

  const handleUpdateManager = async (e) => {
    e.preventDefault();
    
    // Validate phone if provided
    if (newManager.phone) {
      const phoneError = getPhoneError(newManager.phone);
      if (phoneError) {
        setAlert({
          type: 'error',
          message: phoneError
        });
        return;
      }
    }
    
    if (!editingManager) return;

    try {
      setActionLoading('update');
      
      const updateData = {
        displayName: newManager.displayName,
        role: newManager.role,
        userType: newManager.userType || 'manager',
        phone: newManager.phone,
        department: newManager.department,
        permissions: selectedPermissions
      };

      const result = await userManagementService.updateManager(editingManager.uid, updateData);

      setAlert({
        type: 'success',
        message: 'Manager updated successfully!'
      });

      resetForm();
      setShowEditModal(false);
      setEditingManager(null);
      loadManagers();
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setNewManager({
      email: '',
      displayName: '',
      password: '',
      role: 'manager',
      userType: 'manager',
      phone: '',
      department: ''
    });
    setSelectedPermissions([
      'view_dashboard',
      'view_members',
      'view_trainers',
      'view_attendance'
    ]);
    setEditingManager(null);
  };

  const handleResetPassword = async (email, displayName) => {
    const confirmed = window.confirm(
      `Send password reset email to "${displayName}" (${email})?\n\nThey will receive an email with a link to reset their password.`
    );
    
    if (!confirmed) return;

    try {
      setActionLoading(email);
      const result = await userManagementService.sendPasswordResetLink(email);
      
      setAlert({
        type: 'success',
        message: `Password reset email sent to ${email}`
      });
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to send password reset: ' + error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (managerId, newStatus) => {
    try {
      setActionLoading(managerId);
      const result = await userManagementService.updateManagerStatus(managerId, newStatus);
      
      setAlert({
        type: 'success',
        message: result.message
      });
      
      loadManagers();
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to update manager status: ' + error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveManager = async (managerId, managerEmail) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove manager "${managerEmail}"? This action cannot be undone and will disable their account access.`
    );
    
    if (!confirmed) return;

    try {
      setActionLoading(managerId);
      
      const result = await userManagementService.removeManager(managerId);
      
      setAlert({
        type: 'success',
        message: result.message
      });
      
      // Immediately reload managers to reflect the change
      await loadManagers();
      
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to remove manager: ' + error.message
      });
    } finally {
      setActionLoading(null);
    }
  };

  const generatePassword = () => {
    const password = userManagementService.generateSecurePassword();
    setNewManager({ ...newManager, password });
    setAlert({
      type: 'info',
      message: 'Secure password generated! You can modify it if needed.'
    });
  };

  const closeAlert = () => {
    setAlert(null);
    clearError();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOwner()) {
    return (
      <div className="user-management-container">
        <div className="access-denied">
          <AlertTriangle size={48} />
          <h2>Access Denied</h2>
          <p>Only gym owners can access user management.</p>
        </div>
      </div>
    );
  }

  // Filter managers based on user type
  const filteredManagers = userType === 'all' 
    ? managers 
    : managers.filter(m => (m.userType || 'manager') === userType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage admin panel access and permissions</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button 
            className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={loadManagers}
            disabled={loading}
            title="Refresh managers list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Alert */}
      {(alert || error) && (
        <div className={`mb-4 ${alert?.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4 flex items-center justify-between`}>
          <span className={alert?.type === 'success' ? 'text-green-800' : 'text-red-800'}>{alert?.message || error}</span>
          <button onClick={closeAlert} className={`${alert?.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* User Type Filter Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All Users', icon: Users },
            { id: 'manager', label: 'Managers', icon: ShieldCheck },
            { id: 'counselor', label: 'Counselors', icon: Briefcase },
            { id: 'staff', label: 'Staff', icon: Users }
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setUserType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                userType === type.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <type.icon size={16} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Owner Info */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Gym Owner</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail size={16} className="text-gray-400" />
            <span>griptightfitness@gmail.com</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Full Access</span>
          </div>
        </div>
      </div>

      {/* Managers List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {userType === 'all' ? 'All Users' : userType === 'manager' ? 'Managers' : userType === 'counselor' ? 'Counselors' : 'Staff'} ({filteredManagers.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : filteredManagers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {userType === 'all' ? 'Users' : userType === 'manager' ? 'Managers' : userType === 'counselor' ? 'Counselors' : 'Staff'} Found
            </h3>
            <p className="text-gray-600">Add users to give them access to the admin panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredManagers.map((manager) => (
              <div key={manager.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{manager.displayName}</h4>
                        <p className="text-sm text-gray-600">{manager.email}</p>
                        {manager.role && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{manager.role}</span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      manager.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {manager.status === 'active' ? (
                        <ShieldCheck size={14} />
                      ) : (
                        <ShieldX size={14} />
                      )}
                      {manager.status}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} />
                      <span>Added: {formatDate(manager.createdAt)}</span>
                    </div>
                    
                    {(manager.phone || manager.department) && (
                      <div className="flex items-center gap-3 text-gray-600">
                        {manager.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            <span>{manager.phone}</span>
                          </div>
                        )}
                        {manager.department && (
                          <div className="flex items-center gap-1">
                            <Briefcase size={14} />
                            <span>{manager.department}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Access Permissions ({manager.permissions?.length || 0}):</h5>
                      <div className="flex flex-wrap gap-1">
                        {manager.permissions && manager.permissions.length > 0 ? (
                          <>
                            {manager.permissions.slice(0, 4).map((permId) => {
                              const perm = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                              return perm ? (
                                <span key={permId} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  {perm.label}
                                </span>
                              ) : null;
                            })}
                            {manager.permissions.length > 4 && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                +{manager.permissions.length - 4} more
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">No permissions assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 flex items-center gap-2">
                  <button
                    className="flex-1 px-3 py-2 text-sm text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-1"
                    onClick={() => handleEditManager(manager)}
                    disabled={actionLoading}
                    title="Edit manager details and permissions"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>

                  {manager.status === 'active' ? (
                    <button
                      className="flex-1 px-3 py-2 text-sm text-orange-600 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors font-medium flex items-center justify-center gap-1"
                      onClick={() => handleStatusChange(manager.id, 'inactive')}
                      disabled={actionLoading === manager.id}
                    >
                      {actionLoading === manager.id ? (
                        <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Lock size={14} />
                          <span>Deactivate</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      className="flex-1 px-3 py-2 text-sm text-green-600 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center justify-center gap-1"
                      onClick={() => handleStatusChange(manager.id, 'active')}
                      disabled={actionLoading === manager.id}
                    >
                      {actionLoading === manager.id ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Unlock size={14} />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    className="px-3 py-2 text-sm text-purple-600 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center justify-center gap-1"
                    onClick={() => handleResetPassword(manager.email, manager.displayName)}
                    disabled={actionLoading === manager.email}
                    title="Send password reset email"
                  >
                    {actionLoading === manager.email ? (
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Mail size={14} />
                    )}
                  </button>
                  
                  <button
                    className="px-3 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-1"
                    onClick={() => handleRemoveManager(manager.id, manager.email)}
                    disabled={actionLoading === manager.id}
                    title="Remove manager"
                  >
                    {actionLoading === manager.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Manager Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <UserPlus size={24} className="text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                type="button"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddManager} className="p-4">
              {/* Basic Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.email}
                      onChange={(e) => setNewManager({...newManager, email: sanitizeEmail(e.target.value) || e.target.value})}
                      placeholder="manager@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      id="displayName"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.displayName}
                      onChange={(e) => setNewManager({...newManager, displayName: sanitizeInput(e.target.value)})}
                      placeholder="Manager Name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.phone}
                      onChange={(e) => setNewManager({...newManager, phone: sanitizePhone(e.target.value)})}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div>
                    <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">User Type *</label>
                    <select
                      id="userType"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.userType}
                      onChange={(e) => setNewManager({...newManager, userType: e.target.value})}
                      required
                    >
                      <option value="manager">Manager</option>
                      <option value="counselor">Counselor</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      id="role"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.role}
                      onChange={(e) => setNewManager({...newManager, role: e.target.value})}
                    >
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="trainer">Trainer</option>
                      <option value="counselor">Counselor</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      id="department"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.department}
                      onChange={(e) => setNewManager({...newManager, department: e.target.value})}
                      placeholder="Operations, Front Desk, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password (Optional - Auto-generated)
                      <span className="block text-xs text-gray-500 font-normal mt-0.5">A secure password will be auto-generated. User will receive a password reset email.</span>
                    </label>
                    <div className="relative flex items-center gap-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-20"
                        value={newManager.password}
                        onChange={(e) => setNewManager({...newManager, password: e.target.value})}
                        placeholder="Leave blank to auto-generate"
                      />
                      <button
                        type="button"
                        className="absolute right-12 p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        type="button"
                        className="absolute right-2 p-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                        onClick={generatePassword}
                        title="Generate secure password"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                    <small className="block text-xs text-gray-500 mt-1">Will be sent via email; should be changed on first login</small>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Permissions ({selectedPermissions.length} selected)</h3>
                <p className="text-sm text-gray-600 mb-4">Select which features this user can access</p>

                {['General', 'Members', 'Trainers', 'Packages', 'Subscriptions', 'Attendance', 'Security'].map(category => {
                  const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category);
                  const allSelected = categoryPerms.every(p => selectedPermissions.includes(p.id));
                  const someSelected = categoryPerms.some(p => selectedPermissions.includes(p.id)) && !allSelected;

                  return (
                    <div key={category} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-gray-900 hover:text-primary transition-colors font-medium"
                          onClick={() => toggleAllInCategory(category)}
                        >
                          {allSelected ? <CheckSquare size={18} className="text-primary" /> : someSelected ? <Square size={18} className="text-gray-400" /> : <Square size={18} className="text-gray-400" />}
                          <h4 className="font-semibold">{category}</h4>
                        </button>
                        <span className="text-sm text-gray-600 font-medium">
                          {categoryPerms.filter(p => selectedPermissions.includes(p.id)).length}/{categoryPerms.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                        {categoryPerms.map(permission => (
                          <label key={permission.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-0.5 w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                            />
                            <span className="flex-1">
                              <span className="block text-sm font-medium text-gray-900">{permission.label}</span>
                              {permission.description && (
                                <span className="block text-xs text-gray-500 mt-0.5">{permission.description}</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                  disabled={actionLoading === 'add'}
                >
                  {actionLoading === 'add' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding Manager...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Add Manager</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {showEditModal && editingManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowEditModal(false); resetForm(); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <Edit3 size={24} className="text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Edit Manager</h2>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                type="button"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateManager} className="p-4">
              {/* Basic Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      id="edit-email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                      value={newManager.email}
                      disabled
                    />
                    <small className="block text-xs text-gray-500 mt-1">Email cannot be changed</small>
                  </div>

                  <div>
                    <label htmlFor="edit-displayName" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      id="edit-displayName"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.displayName}
                      onChange={(e) => setNewManager({...newManager, displayName: e.target.value})}
                      placeholder="Manager Name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      id="edit-phone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.phone}
                      onChange={(e) => setNewManager({...newManager, phone: e.target.value})}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      id="edit-role"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.role}
                      onChange={(e) => setNewManager({...newManager, role: e.target.value})}
                    >
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="trainer">Trainer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div>
                    <label htmlFor="edit-department" className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      id="edit-department"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={newManager.department}
                      onChange={(e) => setNewManager({...newManager, department: e.target.value})}
                      placeholder="Operations, Front Desk, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Permissions ({selectedPermissions.length} selected)</h3>
                <p className="text-sm text-gray-600 mb-4">Select which features this user can access</p>

                {['General', 'Members', 'Trainers', 'Packages', 'Subscriptions', 'Attendance', 'Security'].map(category => {
                  const categoryPerms = AVAILABLE_PERMISSIONS.filter(p => p.category === category);
                  const allSelected = categoryPerms.every(p => selectedPermissions.includes(p.id));
                  const someSelected = categoryPerms.some(p => selectedPermissions.includes(p.id)) && !allSelected;

                  return (
                    <div key={category} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-gray-900 hover:text-primary transition-colors font-medium"
                          onClick={() => toggleAllInCategory(category)}
                        >
                          {allSelected ? <CheckSquare size={18} className="text-primary" /> : someSelected ? <Square size={18} className="text-gray-400" /> : <Square size={18} className="text-gray-400" />}
                          <h4 className="font-semibold">{category}</h4>
                        </button>
                        <span className="text-sm text-gray-600 font-medium">
                          {categoryPerms.filter(p => selectedPermissions.includes(p.id)).length}/{categoryPerms.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                        {categoryPerms.map(permission => (
                          <label key={permission.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-0.5 w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                            />
                            <span className="flex-1">
                              <span className="block text-sm font-medium text-gray-900">{permission.label}</span>
                              {permission.description && (
                                <span className="block text-xs text-gray-500 mt-0.5">{permission.description}</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                  disabled={actionLoading === 'update'}
                >
                  {actionLoading === 'update' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Edit3 size={18} />
                      <span>Update Manager</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;



