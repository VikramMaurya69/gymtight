import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { membersService } from '../services/membersService';
import { useBranch } from '../contexts/BranchContext';
import { useRBAC, PERMISSIONS } from '../contexts/RBACContext';

const WhatsApp = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappHistory, setWhatsappHistory] = useState([]);
  const [notification, setNotification] = useState(null);
  const [templates] = useState([
    {
      id: 'welcome',
      name: 'Welcome Message',
      content: 'Welcome to GymTight Fitness! Your membership is now active. We\'re excited to start your fitness journey with you!'
    },
    {
      id: 'payment_reminder',
      name: 'Payment Reminder',
      content: 'Hi {name}, this is a friendly reminder that your payment of INR {amount} is due on {due_date}. Please make the payment to continue enjoying our services.'
    },
    {
      id: 'expiry_reminder',
      name: 'Membership Expiry',
      content: 'Hi {name}, your membership expires on {expiry_date}. Renew now to continue your fitness journey with exclusive benefits!'
    },
    {
      id: 'class_booking',
      name: 'Class Booking',
      content: 'Hi {name}, your booking for {class_name} on {date_time} is confirmed. See you there!'
    },
    {
      id: 'motivation',
      name: 'Motivation Message',
      content: 'Hey {name}! We haven\'t seen you at the gym lately. Remember, consistency is key to achieving your fitness goals. Come back stronger!'
    }
  ]);

  const { currentBranch } = useBranch();
  const { hasPermission } = useRBAC();

  const loadMembers = useCallback(async () => {
    try {
      const result = await membersService.getAllMembers(currentBranch?.id);
      if (result.success) {
        setMembers(result.data);
      }
    } catch (error) {
      showNotification('Failed to load members', 'error');
    }
  }, [currentBranch]);

  const loadWhatsAppHistory = useCallback(async () => {
    const history = JSON.parse(localStorage.getItem('whatsapp_history') || '[]');
    setWhatsappHistory(history);
  }, []);

  useEffect(() => {
    loadMembers();
    loadWhatsAppHistory();
  }, [loadMembers, loadWhatsAppHistory]);

  const saveWhatsAppHistory = (data) => {
    const history = JSON.parse(localStorage.getItem('whatsapp_history') || '[]');
    history.unshift({
      id: Date.now(),
      ...data,
      timestamp: new Date().toISOString()
    });
    if (history.length > 100) {
      history.splice(100);
    }
    localStorage.setItem('whatsapp_history', JSON.stringify(history));
    setWhatsappHistory(history);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const formatPhoneForWhatsApp = (phone) => {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If doesn't start with country code, assume India (+91)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  };

  const openWhatsAppWeb = (phone, message) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const handleSendWhatsApp = async () => {
    if (!message.trim()) {
      showNotification('Please enter a message', 'error');
      return;
    }

    if (selectedMembers.length === 0) {
      showNotification('Please select at least one member', 'error');
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const member of selectedMembers) {
        if (member.phone) {
          openWhatsAppWeb(member.phone, message);
          successCount++;
          saveWhatsAppHistory({
            type: 'custom',
            recipient: member.name,
            phone: member.phone,
            message: message,
            status: 'opened'
          });
          // Add delay between opening WhatsApp windows
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      showNotification(`WhatsApp opened for ${successCount} member(s)`, 'success');
      setMessage('');
      setSelectedMembers([]);
    } catch (error) {
      showNotification('Failed to send WhatsApp messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setMessage(template.content);
  };

  const handleMemberSelect = (member) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === member.id)
        ? prev.filter(m => m.id !== member.id)
        : [...prev, member]
    );
  };

  const selectAllMembers = () => {
    setSelectedMembers(members);
  };

  const clearSelection = () => {
    setSelectedMembers([]);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!hasPermission(PERMISSIONS?.MANAGE_WHATSAPP)) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to access WhatsApp functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="h-8 w-8 text-green-600" />
          WhatsApp Communication
        </h1>
        <p className="text-gray-600 mt-1">Send WhatsApp messages directly to members</p>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Messages will open in WhatsApp Web. Make sure you're logged into WhatsApp Web for seamless messaging.
          </p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-400" />}
            {notification.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-400" />}
            <p className={`ml-3 text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' :
              notification.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {notification.message}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'send'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Send WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Message History
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
        </nav>
      </div>

      {/* Send WhatsApp Tab */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Recipients</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllMembers}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMembers.find(m => m.id === member.id)
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.phone}</p>
                    </div>
                    {selectedMembers.find(m => m.id === member.id) && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedMembers.length} of {members.length} members selected
            </div>
          </div>

          {/* Message Composer */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compose Message</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Type your WhatsApp message here..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {message.length} characters
                </p>
              </div>

              <button
                onClick={handleSendWhatsApp}
                disabled={loading || !message.trim() || selectedMembers.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Opening WhatsApp...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Open in WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Message History</h3>
            <p className="text-gray-600 mt-1">View sent WhatsApp messages</p>
          </div>

          <div className="divide-y divide-gray-200">
            {whatsappHistory.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No WhatsApp history available</p>
              </div>
            ) : (
              whatsappHistory.map((msg) => (
                <div key={msg.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-gray-900">{msg.recipient}</p>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {msg.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{msg.phone}</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{msg.message}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                <button
                  onClick={() => handleTemplateSelect(template)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Use Template
                </button>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap">
                {template.content}
              </p>
              <div className="mt-4 text-xs text-gray-500">
                Variables: {'{name}'}, {'{amount}'}, {'{due_date}'}, {'{expiry_date}'}, {'{class_name}'}, {'{date_time}'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhatsApp;


