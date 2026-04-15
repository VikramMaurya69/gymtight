import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar,
  Clock,
  X,
  Save,
  Loader2,
  AlertCircle,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { messagesService } from '../services/messagesService';
import { useRBAC, PERMISSIONS } from '../contexts/RBACContext';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = useRBAC();

  const [formData, setFormData] = useState({
    text: '',
    startAt: '',
    endAt: ''
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const result = await messagesService.getMessages();
      if (result.success) {
        setMessages(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const handleOpenModal = (message = null) => {
    if (message) {
      setCurrentMessage(message);
      setFormData({
        text: message.text || '',
        startAt: formatDateForInput(message.startAt),
        endAt: formatDateForInput(message.endAt)
      });
    } else {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);

      setCurrentMessage(null);
      setFormData({
        text: '',
        startAt: formatDateForInput(now),
        endAt: formatDateForInput(nextWeek)
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentMessage(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (new Date(formData.endAt) <= new Date(formData.startAt)) {
        throw new Error('End time must be after start time');
      }

      let result;
      if (currentMessage) {
        result = await messagesService.updateMessage(currentMessage.id, formData);
      } else {
        result = await messagesService.addMessage(formData);
      }

      if (result.success) {
        handleCloseModal();
        fetchMessages();
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
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        const result = await messagesService.deleteMessage(id);
        if (result.success) {
          fetchMessages();
        } else {
          alert('Failed to delete message: ' + result.error);
        }
      } catch (err) {
        alert('Error deleting message: ' + err.message);
      }
    }
  };

  const getStatusColor = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (now > endDate) return 'bg-gray-100 text-gray-800 border-gray-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return 'Scheduled';
    if (now > endDate) return 'Expired';
    return 'Active';
  };

  if (loading && !messages.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">App Messages</h1>
          <p className="text-gray-500 mt-1">Manage announcements and alerts visible in the mobile app</p>
        </div>
        
        {hasPermission(PERMISSIONS.MANAGE_MESSAGES) && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>New Message</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {messages.map((message) => {
          const statusClass = getStatusColor(message.startAt, message.endAt);
          const statusText = getStatusText(message.startAt, message.endAt);
          
          return (
            <div key={message.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                    {statusText}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>Created: {new Date(message.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-start gap-2">
                  <MessageSquare size={20} className="text-primary mt-1 shrink-0" />
                  {message.text}
                </h3>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Clock size={16} className="text-blue-500" />
                    <span className="font-medium">Starts:</span>
                    <span>{new Date(message.startAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Clock size={16} className="text-red-500" />
                    <span className="font-medium">Ends:</span>
                    <span>{new Date(message.endAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {hasPermission(PERMISSIONS.MANAGE_MESSAGES) && (
                <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                  <button 
                    onClick={() => handleOpenModal(message)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-gray-50 hover:bg-white hover:text-blue-600 hover:shadow-md border border-transparent hover:border-blue-100 rounded-lg transition-all"
                  >
                    <Edit2 size={16} />
                    <span className="md:hidden">Edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(message.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-gray-50 hover:bg-white hover:text-red-600 hover:shadow-md border border-transparent hover:border-red-100 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                    <span className="md:hidden">Delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <MessageSquare size={48} className="mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium text-gray-600">No active messages</p>
            <p className="text-sm text-gray-500">Create a message to announce sales or updates in the app</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden mx-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                {currentMessage ? 'Edit Message' : 'New Message'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Text</label>
                <textarea
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                  placeholder="e.g. 50% OFF All Memberships This Week!"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    name="startAt"
                    value={formData.startAt}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    name="endAt"
                    value={formData.endAt}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-700">
                <CheckCircle2 size={20} className="shrink-0" />
                <p>
                  This message will only be visible to users between the Start Time and End Time.
                </p>
              </div>

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
                      Save Message
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

export default Messages;



