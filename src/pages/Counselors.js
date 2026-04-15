import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Edit3,
  Trash2,
  X,
  Search,
  Users,
  Mail,
  Phone,
  Calendar,
  Award,
  TrendingUp
} from 'lucide-react';
import { counselorsService } from '../services/counselorsService';
import { membersService } from '../services/membersService';
import { useBranch } from '../contexts/BranchContext';
import { useRBAC } from '../contexts/RBACContext';
import { sanitizeInput, sanitizeEmail, sanitizePhone } from '../utils/sanitization';
import { validateEmail, validatePhone, getEmailError, getPhoneError } from '../utils/validation';

const Counselors = () => {
  const { currentBranch } = useBranch();
  const { hasPermission, isOwner } = useRBAC();
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [counselorMembers, setCounselorMembers] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    joinDate: new Date().toISOString().split('T')[0],
    commission: '',
    specialization: '',
    targetMembers: '',
    role: 'counselor',
    visibility: 'visible'
  });

  useEffect(() => {
    if (currentBranch) {
      loadCounselors();
    }
  }, [currentBranch]);

  const loadCounselors = async () => {
    if (!currentBranch) return;

    try {
      setLoading(true);
      const result = await counselorsService.getAllCounselors(currentBranch.id);
      if (result.success) {
        const counselorsData = result.data || [];

        // Sync member counts for all counselors to ensure accuracy
        for (const counselor of counselorsData) {
          if (counselor.totalMembers === undefined || counselor.totalMembers === 0) {
            await counselorsService.syncMemberCount(counselor.id);
          }
        }

        // Reload to get updated counts
        const updatedResult = await counselorsService.getAllCounselors(currentBranch.id);
        if (updatedResult.success) {
          setCounselors(updatedResult.data || []);
        } else {
          setCounselors(counselorsData);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load counselors');
      // Error loading counselors
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let sanitizedValue = value;
    if (name === 'email') {
      sanitizedValue = sanitizeEmail(value) || value;
    } else if (name === 'phone') {
      sanitizedValue = sanitizePhone(value);
    } else if (['name', 'specialization'].includes(name)) {
      sanitizedValue = sanitizeInput(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      commission: '',
      specialization: '',
      targetMembers: ''
    });
    setEditingCounselor(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      setError('Name and phone are required');
      return;
    }

    // Validate phone number
    const phoneError = getPhoneError(formData.phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    // Validate email if provided
    if (formData.email) {
      const emailError = getEmailError(formData.email);
      if (emailError) {
        setError(emailError);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      const counselorData = {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone,
        status: formData.status,
        joinDate: formData.joinDate,
        commission: formData.commission ? parseFloat(formData.commission) : 0,
        specialization: formData.specialization || '',
        targetMembers: formData.targetMembers ? parseInt(formData.targetMembers) : 0,
        branchId: currentBranch.id,
        updatedAt: new Date().toISOString()
      };

      let result;
      if (editingCounselor) {
        // Update - don't reset member counts
        result = await counselorsService.updateCounselor(editingCounselor.id, counselorData);
      } else {
        // New counselor - initialize counts to 0
        counselorData.createdAt = new Date().toISOString();
        counselorData.totalMembers = 0;
        counselorData.activeMembers = 0;
        result = await counselorsService.addCounselor(counselorData);
      }

      if (result.success) {
        setSuccess(editingCounselor ? 'Counselor updated successfully' : 'Counselor added successfully');
        resetForm();
        setShowAddModal(false);
        loadCounselors();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (counselor) => {
    setEditingCounselor(counselor);
    setFormData({
      name: counselor.name || '',
      email: counselor.email || '',
      phone: counselor.phone || '',
      status: counselor.status || 'Active',
      joinDate: counselor.joinDate || new Date().toISOString().split('T')[0],
      commission: counselor.commission !== undefined && counselor.commission !== null ? counselor.commission.toString() : '',
      specialization: counselor.specialization || '',
      targetMembers: counselor.targetMembers !== undefined && counselor.targetMembers !== null ? counselor.targetMembers.toString() : '',
      role: counselor.role || 'counselor',
      visibility: counselor.visibility || 'visible'
    });
    setShowAddModal(true);
  };

  const handleDelete = async (counselorId) => {
    if (!window.confirm('Are you sure you want to delete this counselor?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await counselorsService.deleteCounselor(counselorId);

      if (result.success) {
        setSuccess('Counselor deleted successfully');
        loadCounselors();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMembers = async (counselor) => {
    setSelectedCounselor(counselor);
    setShowMembersModal(true);
    setLoading(true);

    try {
      // Use efficient query by counselorId and Name (for legacy)
      const result = await counselorsService.getMembersForCounselor(currentBranch.id, counselor.id, counselor.name);
      if (result.success) {
        setCounselorMembers(result.data);
      } else {
        setError('Failed to load members');
      }
    } catch (err) {
      setError('Error loading members');
    } finally {
      setLoading(false);
    }
  };

  const filteredCounselors = counselors.filter(counselor =>
    counselor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    counselor.phone?.includes(searchTerm) ||
    counselor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Counselors Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage counselors and track their performance</p>
        </div>

        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm font-medium"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <UserPlus size={18} />
          Add Counselor
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{counselors.length}</h3>
            <p className="text-sm text-gray-500">Total Counselors</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="bg-pink-50 p-3 rounded-lg text-pink-600">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {counselors.filter(c => c.status === 'Active').length}
            </h3>
            <p className="text-sm text-gray-500">Active Counselors</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {counselors.reduce((sum, c) => sum + (c.totalMembers || 0), 0)}
            </h3>
            <p className="text-sm text-gray-500">Total Members Enrolled</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search counselors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
        />
      </div>

      {/* Counselors Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-16 text-center text-gray-600">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-3"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredCounselors.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-16 text-center text-gray-600">
                    No counselors found
                  </td>
                </tr>
              ) : (
                filteredCounselors.map((counselor) => (
                  <tr key={counselor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <strong
                        className="text-primary cursor-pointer hover:underline"
                        onClick={() => handleViewMembers(counselor)}
                        title="Click to view members"
                      >
                        {counselor.name}
                      </strong>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={14} />
                        {counselor.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {counselor.email ? (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail size={14} />
                          {counselor.email}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 capitalize">
                        {counselor.role ? counselor.role.replace('_', ' ') : 'Counselor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {counselor.totalMembers || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{counselor.commission || '-'}%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${counselor.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {counselor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${counselor.visibility === 'visible' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {counselor.visibility === 'visible' ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={14} />
                        {counselor.joinDate ? new Date(counselor.joinDate).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => handleEdit(counselor)}
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleDelete(counselor.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{editingCounselor ? 'Edit Counselor' : 'Add New Counselor'}</h2>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone*</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Join Date*</label>
                  <input
                    type="date"
                    name="joinDate"
                    value={formData.joinDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Commission (%)</label>
                  <input
                    type="number"
                    name="commission"
                    value={formData.commission}
                    onChange={handleInputChange}
                    placeholder="e.g., 10"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  >
                    <option value="counselor">Counselor</option>
                    <option value="senior_counselor">Senior Counselor</option>
                    <option value="head_counselor">Head Counselor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visibility Status</label>
                  <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  >
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    placeholder="e.g., Weight Loss, Body Building"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Target (Members)</label>
                  <input
                    type="number"
                    name="targetMembers"
                    value={formData.targetMembers}
                    onChange={handleInputChange}
                    placeholder="e.g., 20"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingCounselor ? 'Update' : 'Add')} Counselor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members View Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMembersModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">Members Added by {selectedCounselor?.name}</h2>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowMembersModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex flex-col items-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-3"></div>
                  <p className="text-gray-600">Loading members...</p>
                </div>
              ) : counselorMembers.length === 0 ? (
                <p className="text-center py-16 text-gray-600">
                  No members found for this counselor
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Received</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {counselorMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <strong className="text-gray-800">{member.name || `${member.firstName} ${member.lastName}`}</strong>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{member.phone || member.contact}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">{member.membershipType || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">INR {member.membershipCost?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">INR {member.paymentReceived?.toLocaleString() || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-semibold ${member.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                INR {member.balance?.toLocaleString() || '0'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {member.memberJoiningFrom?.toDate ?
                                member.memberJoiningFrom.toDate().toLocaleDateString() :
                                member.memberJoiningFrom ? new Date(member.memberJoiningFrom).toLocaleDateString() : '-'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(member.status === 'Active' || member.selectStatus === 'Active') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {member.status || member.selectStatus || 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Members</div>
                        <div className="text-2xl font-bold text-primary">{counselorMembers.length}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                        <div className="text-2xl font-bold text-green-600">
                          INR {counselorMembers.reduce((sum, m) => sum + (parseFloat(m.paymentReceived) || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Total Balance Pending</div>
                        <div className="text-2xl font-bold text-orange-600">
                          INR {counselorMembers.reduce((sum, m) => sum + (parseFloat(m.balance) || 0), 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Counselors;



