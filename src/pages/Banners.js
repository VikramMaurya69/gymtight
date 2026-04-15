import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Image as ImageIcon,
  ExternalLink,
  MoreVertical,
  X,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { bannersService } from '../services/bannersService';
import { useRBAC, PERMISSIONS } from '../contexts/RBACContext';

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useRBAC();

  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    actionUrl: '',
    priority: 1,
    isActive: true
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const result = await bannersService.getBanners();
      if (result.success) {
        setBanners(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setCurrentBanner(banner);
      setFormData({
        title: banner.title || '',
        imageUrl: banner.imageUrl || '',
        actionUrl: banner.actionUrl || '',
        priority: banner.priority || 1,
        isActive: banner.isActive !== false
      });
    } else {
      setCurrentBanner(null);
      setFormData({
        title: '',
        imageUrl: '',
        actionUrl: '',
        priority: banners.length + 1,
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentBanner(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let result;
      if (currentBanner) {
        result = await bannersService.updateBanner(currentBanner.id, formData);
      } else {
        result = await bannersService.addBanner(formData);
      }

      if (result.success) {
        handleCloseModal();
        fetchBanners();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        const result = await bannersService.deleteBanner(id);
        if (result.success) {
          fetchBanners();
        } else {
          alert('Failed to delete banner: ' + result.error);
        }
      } catch (err) {
        alert('Error deleting banner: ' + err.message);
      }
    }
  };

  if (loading && !banners.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Banners</h1>
          <p className="text-gray-500 mt-1">Manage promotional banners visible in the mobile app</p>
        </div>
        
        {hasPermission(PERMISSIONS.MANAGE_BANNERS) && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>Add Banner</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-gray-100">
              {banner.imageUrl ? (
                <img 
                  src={banner.imageUrl} 
                  alt={banner.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://via.placeholder.com/800x300?text=Image+Error';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <ImageIcon size={40} />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-semibold shadow-sm">
                Priority: {banner.priority}
              </div>
              {!banner.isActive && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Inactive</span>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 truncate" title={banner.title}>
                {banner.title || 'Untitled Banner'}
              </h3>
              
              {banner.actionUrl && (
                <div className="flex items-center gap-1 text-sm text-blue-600 mt-1 mb-3 truncate">
                  <ExternalLink size={14} />
                  <span className="truncate">{banner.actionUrl}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                {hasPermission(PERMISSIONS.MANAGE_BANNERS) && (
                  <>
                    <button 
                      onClick={() => handleOpenModal(banner)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(banner.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && banners.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No banners found</p>
            <p className="text-sm">Create your first banner to get started</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden mx-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                {currentBanner ? 'Edit Banner' : 'New Banner'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Summer Sale"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, PNG, WEBP</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action URL (Deep Link)</label>
                <input
                  type="text"
                  name="actionUrl"
                  value={formData.actionUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. GymTight Fitness://offer/summer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input
                    type="number"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {formData.imageUrl && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Preview</p>
                  <div className="relative h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Banner
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

export default Banners;



