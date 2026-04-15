import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  MapPin, 
  User,
  Edit3,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { useBranch } from '../../contexts/BranchContext';
import { branchService } from '../../services/branchService';

const BranchSelector = () => {
  const { branches, currentBranch, switchBranch, addBranch, updateBranch, removeBranch } = useBranch();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    manager: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBranchSelect = (branch) => {
    switchBranch(branch);
    setShowDropdown(false);
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Branch name is required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const result = await branchService.createBranch(formData);
      
      if (result.success) {
        addBranch(result.data);
        resetForm();
        setShowCreateForm(false);
      } else {
        setError(result.error || 'Failed to create branch');
      }
    } catch (err) {
      setError('Error creating branch');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    
    if (!editingBranch) return;
    
    try {
      setLoading(true);
      setError('');
      
      const result = await branchService.updateBranch(editingBranch.id, formData);
      
      if (result.success) {
        updateBranch(editingBranch.id, formData);
        resetForm();
        setEditingBranch(null);
      } else {
        setError(result.error || 'Failed to update branch');
      }
    } catch (err) {
      setError('Error updating branch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (branches.length <= 1) {
      setError('Cannot delete the last branch');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete "${branch.name}"?`)) {
      try {
        setLoading(true);
        setError('');
        
        const result = await branchService.deleteBranch(branch.id);
        
        if (result.success) {
          removeBranch(branch.id);
        } else {
          setError(result.error || 'Failed to delete branch');
        }
      } catch (err) {
        setError('Error deleting branch');
      } finally {
        setLoading(false);
      }
    }
  };

  const startEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      manager: branch.manager || '',
      status: branch.status || 'Active'
    });
    setShowDropdown(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      manager: '',
      status: 'Active'
    });
    setError('');
    setEditingBranch(null);
    setShowCreateForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="relative">
      {/* Branch Dropdown */}
      <div className="relative">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Building2 size={16} className="text-primary" />
          <span className="flex-1 text-left font-medium text-gray-700">
            {currentBranch?.name || 'Select Branch'}
          </span>
          <ChevronDown size={16} className={`text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <span className="font-semibold text-gray-800">Switch Branch</span>
              <button 
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                onClick={() => {
                  setShowCreateForm(true);
                  setShowDropdown(false);
                }}
              >
                <Plus size={14} />
                Add Branch
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[400px]">
              {branches.map(branch => (
                <div key={branch.id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                  <div 
                    className={`flex-1 cursor-pointer ${currentBranch?.id === branch.id ? 'bg-blue-50 -m-3 p-3 border-l-4 border-primary' : ''}`}
                    onClick={() => handleBranchSelect(branch)}
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-800">{branch.name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MapPin size={12} />
                        {branch.address || 'No address'}
                      </div>
                      {branch.manager && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <User size={12} />
                          {branch.manager}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-1.5 text-gray-600 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(branch);
                      }}
                      title="Edit Branch"
                    >
                      <Edit3 size={14} />
                    </button>
                    {branches.length > 1 && (
                      <button 
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBranch(branch);
                        }}
                        title="Delete Branch"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Branch Modal */}
      {(showCreateForm || editingBranch) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-800">
                {editingBranch ? 'Edit Branch' : 'Create New Branch'}
              </h3>
              <button 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={resetForm}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={editingBranch ? handleUpdateBranch : handleCreateBranch} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter branch name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Branch address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Contact number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Branch email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                  <input
                    type="text"
                    name="manager"
                    value={formData.manager}
                    onChange={handleInputChange}
                    placeholder="Branch manager name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : (editingBranch ? 'Update Branch' : 'Create Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default BranchSelector;

