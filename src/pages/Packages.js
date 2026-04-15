import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  X,
  AlertCircle,
  Save
} from 'lucide-react';
import { packagesService, PACKAGE_TYPES } from '../services/packagesService';
import { useRBAC } from '../contexts/RBACContext';
import { useBranch } from '../contexts/BranchContext';

const Packages = () => {
  const { hasPermission, isOwner } = useRBAC();
  const { currentBranch } = useBranch();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  // Helper function to convert duration object to string
  const formatDuration = (duration) => {
    if (!duration) return '';
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'object') {
      const parts = [];
      if (duration.months) parts.push(`${duration.months}month${duration.months > 1 ? 's' : ''}`);
      if (duration.days) parts.push(`${duration.days}day${duration.days > 1 ? 's' : ''}`);
      return parts.join(' ') || '';
    }
    return String(duration);
  };

  const [formData, setFormData] = useState({
    type: 'General Subscription (GS)',
    name: '',
    price: '',
    maxDiscount: '',
    incentivePercent: '',
    sessionCount: '',
    duration: '',
    details: '',
    showOnWebsite: true,
    status: 'active'
  });

  useEffect(() => {
    loadPackages();
  }, [currentBranch]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const result = await packagesService.getAllPackages();
      if (result.success) {
        setPackages(result.data);
      } else {
        setError('Failed to load packages');
      }
    } catch (err) {
      setError('Error loading packages');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'General Subscription (GS)',
      name: '',
      price: '',
      maxDiscount: '',
      incentivePercent: '',
      sessionCount: '',
      duration: '',
      details: '',
      showOnWebsite: true,
      status: 'active'
    });
    setEditingPackage(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    let sanitizedValue = value;
    if (['price', 'maxDiscount', 'sessionCount'].includes(name)) {
      sanitizedValue = value; // Keep as string for input
    } else if (['incentivePercent'].includes(name)) {
      sanitizedValue = value; // Keep as string for input
    } else if (type !== 'checkbox') {
      sanitizedValue = value.trim(); // Just trim, no HTML escaping for inputs
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : sanitizedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const packageData = {
        packageType: formData.type,
        packageName: formData.name,
        price: parseFloat(formData.price) || 0,
        maxDiscount: parseFloat(formData.maxDiscount) || 0,
        incentivePercent: parseFloat(formData.incentivePercent) || 0,
        sessionCount: parseInt(formData.sessionCount) || 0,
        duration: formData.duration,
        details: formData.details,
        showOnWebsite: formData.showOnWebsite,
        status: formData.status,
        branchId: currentBranch,
        isActive: formData.status === 'active'
      };

      let result;
      if (editingPackage) {
        result = await packagesService.updatePackage(editingPackage.id, packageData);
      } else {
        result = await packagesService.createPackage(packageData);
      }

      if (result.success) {
        setSuccess(editingPackage ? 'Package updated successfully!' : 'Package created successfully!');
        setShowAddModal(false);
        resetForm();
        loadPackages();
      } else {
        setError(result.error || 'Failed to save package');
      }
    } catch (err) {
      setError('Error saving package');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      type: pkg.packageType || 'General Subscription (GS)',
      name: pkg.packageName || '',
      price: pkg.price?.toString() || '',
      maxDiscount: pkg.maxDiscount?.toString() || '',
      incentivePercent: pkg.incentivePercent?.toString() || '',
      sessionCount: pkg.sessionCount?.toString() || '',
      duration: formatDuration(pkg.duration),
      details: pkg.details || '',
      showOnWebsite: pkg.showOnWebsite !== false,
      status: pkg.status || 'active'
    });
    setShowAddModal(true);
  };

  const handleDelete = async (packageId) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;

    try {
      const result = await packagesService.deletePackage(packageId);
      if (result.success) {
        setSuccess('Package deleted successfully!');
        loadPackages();
      } else {
        setError(result.error || 'Failed to delete package');
      }
    } catch (err) {
      setError('Error deleting package');
    }
  };

  const toggleWebsiteVisibility = async (pkg) => {
    try {
      const result = await packagesService.updatePackage(pkg.id, {
        showOnWebsite: !pkg.showOnWebsite
      });

      if (result.success) {
        setSuccess('Website visibility updated!');
        loadPackages();
      } else {
        setError('Failed to update visibility');
      }
    } catch (err) {
      setError('Error updating visibility');
    }
  };

  const toggleStatus = async (pkg) => {
    try {
      const newStatus = (pkg.status || 'active').toLowerCase() === 'active' ? 'Inactive' : 'Active';
      const result = await packagesService.updatePackage(pkg.id, {
        status: newStatus
      });

      if (result.success) {
        setSuccess(`Package ${newStatus.toLowerCase()} successfully!`);
        loadPackages();
      } else {
        setError('Failed to update status');
      }
    } catch (err) {
      setError('Error updating status');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.packageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.packageType?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const canAdd = isOwner() || hasPermission('add_packages');
  const canEdit = isOwner() || hasPermission('edit_packages');
  const canDelete = isOwner() || hasPermission('delete_packages');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Membership Packages</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all membership plans and subscriptions</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-medium" onClick={loadPackages}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {canAdd && (
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm font-medium whitespace-nowrap" onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus size={18} />
                Add Package
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-green-600" />
            <span className="text-green-800">{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-gray-600 text-sm font-medium">Show</label>
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <label className="text-gray-600 text-sm font-medium">entries</label>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search packages..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
        </div>
      </div>

      {/* Package Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {filteredPackages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-gray-600">No packages found</p>
              </div>
            ) : (
              filteredPackages.slice(0, entriesPerPage).map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{pkg.packageName || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{pkg.packageType || 'N/A'}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${(pkg.status || 'active').toLowerCase() === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                      }`}>
                      {(pkg.status || 'active').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="block text-xs text-gray-400">Price</span>
                      <span className="font-medium text-gray-900">{typeof pkg.price === 'object' ? JSON.stringify(pkg.price) : String(pkg.price || 0)}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Duration</span>
                      {formatDuration(pkg.duration) || '-'}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Sessions</span>
                      {typeof pkg.sessionCount === 'object' ? JSON.stringify(pkg.sessionCount) : String(pkg.sessionCount || 0)}
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400">Website</span>
                      <button
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${pkg.showOnWebsite !== false
                            ? 'text-green-700 bg-green-50'
                            : 'text-gray-700 bg-gray-50'
                          }`}
                        onClick={() => canEdit && toggleWebsiteVisibility(pkg)}
                        disabled={!canEdit}
                      >
                        {pkg.showOnWebsite !== false ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2" title="View">
                      <Eye size={16} /> View
                    </button>
                    {canEdit && (
                      <button
                        className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit size={16} /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incentive %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Show On Website</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading packages...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredPackages.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-16 text-center">
                      <p className="text-gray-600">No packages found</p>
                    </td>
                  </tr>
                ) : (
                  filteredPackages.slice(0, entriesPerPage).map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {typeof pkg.packageType === 'object' ? JSON.stringify(pkg.packageType) : (pkg.packageType || 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <strong className="text-gray-900">
                          {typeof pkg.packageName === 'object' ? JSON.stringify(pkg.packageName) : (pkg.packageName || 'N/A')}
                        </strong>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {typeof pkg.price === 'object' ? JSON.stringify(pkg.price) : String(pkg.price !== undefined ? pkg.price : '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {typeof pkg.maxDiscount === 'object' ? JSON.stringify(pkg.maxDiscount) : String(pkg.maxDiscount !== undefined ? pkg.maxDiscount : '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {typeof pkg.incentivePercent === 'object' ? JSON.stringify(pkg.incentivePercent) : String(pkg.incentivePercent !== undefined ? pkg.incentivePercent : '0') + '%'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {typeof pkg.sessionCount === 'object' ? JSON.stringify(pkg.sessionCount) : String(pkg.sessionCount !== undefined ? pkg.sessionCount : '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {formatDuration(pkg.duration) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pkg.showOnWebsite !== false
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          onClick={() => canEdit && toggleWebsiteVisibility(pkg)}
                          disabled={!canEdit}
                        >
                          {pkg.showOnWebsite !== false ? (
                            <><ToggleRight size={20} /> ON</>
                          ) : (
                            <><ToggleLeft size={20} /> OFF</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${(pkg.status || 'active').toLowerCase() === 'active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          onClick={() => canEdit && toggleStatus(pkg)}
                          disabled={!canEdit}
                          title="Click to toggle status"
                        >
                          {(pkg.status || 'active').toLowerCase() === 'active' ? (
                            <><ToggleRight size={20} /> ACTIVE</>
                          ) : (
                            <><ToggleLeft size={20} /> INACTIVE</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <Eye size={14} />
                          </button>
                          {canEdit && (
                            <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" onClick={() => handleEdit(pkg)} title="Edit">
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDelete(pkg.id)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => { setShowAddModal(false); resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 z-10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{editingPackage ? 'Edit Membership Package' : 'Add Membership Package'}</h2>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => { setShowAddModal(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type <span className="text-red-500">*</span></label>
                  <select name="type" value={formData.type} onChange={handleInputChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    {PACKAGE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Package Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="price"
                    placeholder="0"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Discount</label>
                  <input
                    type="number"
                    name="maxDiscount"
                    placeholder="0"
                    value={formData.maxDiscount}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Incentive %</label>
                  <input
                    type="number"
                    name="incentivePercent"
                    placeholder="0"
                    value={formData.incentivePercent}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Count</label>
                  <input
                    type="number"
                    name="sessionCount"
                    placeholder="0"
                    value={formData.sessionCount}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="duration"
                    placeholder="e.g., 1 Month, 3 Month, 6 Month"
                    value={formData.duration}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                  <textarea
                    name="details"
                    placeholder="Package details..."
                    value={formData.details}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="showOnWebsite"
                      checked={formData.showOnWebsite}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    />
                    Show On Website
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-6 flex items-center justify-end gap-4">
                <button type="button" className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium" disabled={loading}>
                  <Save size={16} />
                  {loading ? 'Saving...' : (editingPackage ? 'Update' : 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Packages;



