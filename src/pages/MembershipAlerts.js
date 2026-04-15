import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  AlertCircle,
  Send,
  MessageCircle,
  Mail,
  Phone,
  RefreshCw,
  CheckCircle,
  Search
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs } from '../services/sqlFirestoreCompat';

const MembershipAlerts = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [expiringMembers, setExpiringMembers] = useState([]);
  const [expiredMembers, setExpiredMembers] = useState([]);
  const [balancePendingMembers, setBalancePendingMembers] = useState([]);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'expiring'); // 'expiring', 'expired', 'balance'
  const [filterDays, setFilterDays] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');

  const loadMembershipData = useCallback(async () => {
    try {
      setLoading(true);
      const membersRef = collection(db, 'members');
      const snapshot = await getDocs(membersRef);

      const now = new Date();
      const filterDate = new Date(now.getTime() + (filterDays * 24 * 60 * 60 * 1000));

      const expiring = [];
      const expired = [];
      const balancePending = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const expiryDate = data.expireOn?.toDate ? data.expireOn.toDate() :
          data.expiryDate?.toDate ? data.expiryDate.toDate() :
            data.expireOn ? new Date(data.expireOn) :
              data.expiryDate ? new Date(data.expiryDate) : null;

        const balance = parseFloat(data.balance) || 0;
        const nextPaymentDate = data.nextPaymentDate?.toDate ? data.nextPaymentDate.toDate() :
          data.nextPaymentDate ? new Date(data.nextPaymentDate) : null;

        const memberInfo = {
          id: doc.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          contact: data.contact || data.phone,
          email: data.email,
          expiryDate: expiryDate,
          balance: balance,
          nextPaymentDate: nextPaymentDate,
          packageName: data.selectedPackage || data.membershipType,
          status: data.selectStatus || data.status
        };

        // Categorize members
        if (expiryDate) {
          if (expiryDate < now) {
            expired.push(memberInfo);
          } else if (expiryDate <= filterDate) {
            expiring.push(memberInfo);
          }
        }

        if (balance > 0) {
          balancePending.push(memberInfo);
        }
      });

      // Sort by date
      expiring.sort((a, b) => a.expiryDate - b.expiryDate);
      expired.sort((a, b) => b.expiryDate - a.expiryDate);
      balancePending.sort((a, b) => {
        if (a.nextPaymentDate && b.nextPaymentDate) {
          return a.nextPaymentDate - b.nextPaymentDate;
        }
        return b.balance - a.balance;
      });

      setExpiringMembers(expiring);
      setExpiredMembers(expired);
      setBalancePendingMembers(balancePending);
    } catch (error) {
      // Error loading membership data
    } finally {
      setLoading(false);
    }
  }, [filterDays]);

  useEffect(() => {
    loadMembershipData();
  }, [loadMembershipData]);

  const sendWhatsAppMessage = (contact, memberName, type) => {
    if (!contact) {
      alert('No contact number available');
      return;
    }

    let message = '';
    if (type === 'expiring') {
      message = `Hello ${memberName}, your gym membership is expiring soon. Please renew to continue enjoying our services. Contact us for more details.`;
    } else if (type === 'expired') {
      message = `Hello ${memberName}, your gym membership has expired. Please renew at the earliest to resume your fitness journey. Contact us today!`;
    } else if (type === 'balance') {
      message = `Hello ${memberName}, you have a pending balance in your gym membership. Please clear the payment at your earliest convenience.`;
    }

    const whatsappUrl = `https://wa.me/${contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const sendSMS = (contact, memberName, type) => {
    if (!contact) {
      alert('No contact number available');
      return;
    }

    let message = '';
    if (type === 'expiring') {
      message = `Hi ${memberName}, your gym membership is expiring soon. Please renew to continue. - GymTight Fitness`;
    } else if (type === 'expired') {
      message = `Hi ${memberName}, your gym membership has expired. Renew now to continue your fitness journey. - GymTight Fitness`;
    } else if (type === 'balance') {
      message = `Hi ${memberName}, you have a pending balance. Please clear the payment. - GymTight Fitness`;
    }

    const smsUrl = `sms:${contact}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const sendEmail = (email, memberName, type) => {
    if (!email) {
      alert('No email address available');
      return;
    }

    let subject = '';
    let body = '';

    if (type === 'expiring') {
      subject = 'Gym Membership Renewal Reminder';
      body = `Dear ${memberName},\n\nYour gym membership is expiring soon. Please renew to continue enjoying our services.\n\nContact us for more details.\n\nBest regards,\nGymTight Fitness Team`;
    } else if (type === 'expired') {
      subject = 'Gym Membership Expired';
      body = `Dear ${memberName},\n\nYour gym membership has expired. Please renew at the earliest to resume your fitness journey.\n\nContact us today!\n\nBest regards,\nGymTight Fitness Team`;
    } else if (type === 'balance') {
      subject = 'Payment Reminder - Pending Balance';
      body = `Dear ${memberName},\n\nYou have a pending balance in your gym membership account. Please clear the payment at your earliest convenience.\n\nBest regards,\nGymTight Fitness Team`;
    }

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getDaysRemaining = (date) => {
    if (!date) return null;
    const now = new Date();
    const diff = date - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderMembers = (members, type) => {
    return (
      <>
        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {members.map(member => {
            const daysRemaining = getDaysRemaining(member.expiryDate);
            const isUrgent = daysRemaining !== null && daysRemaining <= 7;
            
            return (
              <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{member.name}</h3>
                    <div className="text-xs text-gray-500">{member.packageName || 'No Package'}</div>
                  </div>
                  {member.status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status}
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    {member.contact || 'N/A'}
                  </div>
                  
                  {(type === 'expiring' || type === 'expired') && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(member.expiryDate)}
                      </div>
                      {type === 'expiring' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isUrgent ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {daysRemaining} days left
                        </span>
                      )}
                    </div>
                  )}

                  {type === 'balance' && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-50">
                      <span className="text-gray-500">Pending Balance:</span>
                      <span className="text-yellow-700 font-semibold">INR {member.balance.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    className="flex-1 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                    onClick={() => sendWhatsAppMessage(member.contact, member.name, type)}
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                  <button
                    className="flex-1 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                    onClick={() => sendSMS(member.contact, member.name, type)}
                  >
                    <Send size={14} />
                    SMS
                  </button>
                  <button
                    className="py-2 px-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                    onClick={() => sendEmail(member.email, member.name, type)}
                    disabled={!member.email}
                  >
                    <Mail size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  {(type === 'expiring' || type === 'expired') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>}
                  {(type === 'expiring') && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>}
                  {type === 'balance' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Amount</th>}
                  {type === 'balance' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map(member => {
                const daysRemaining = getDaysRemaining(member.expiryDate);
                const isUrgent = daysRemaining !== null && daysRemaining <= 7;

                return (
                  <tr key={member.id} className={`hover:bg-gray-50 transition-colors ${isUrgent ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900 text-sm">{member.name}</div>
                      {member.status && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Phone size={14} className="text-gray-400" />
                        {member.contact || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {member.email ? (
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Mail size={14} className="text-gray-400" />
                          {member.email}
                        </div>
                      ) : <span className="text-gray-400 text-sm">N/A</span>}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">{member.packageName || 'N/A'}</td>
                    {(type === 'expiring' || type === 'expired') && (
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDate(member.expiryDate)}
                        </div>
                      </td>
                    )}
                    {type === 'expiring' && (
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isUrgent ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {daysRemaining} days
                        </span>
                      </td>
                    )}
                    {type === 'balance' && (
                      <>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-yellow-700 font-semibold text-sm">
                            INR {member.balance.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-gray-600 text-sm">{formatDate(member.nextPaymentDate)}</td>
                      </>
                    )}
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          onClick={() => sendWhatsAppMessage(member.contact, member.name, type)}
                          title="Send WhatsApp Message"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={() => sendSMS(member.contact, member.name, type)}
                          title="Send SMS"
                        >
                          <Send size={16} />
                        </button>
                        <button
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => sendEmail(member.email, member.name, type)}
                          title="Send Email"
                          disabled={!member.email}
                        >
                          <Mail size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </>
    );
  };

  const getCurrentData = () => {
    let data = [];
    switch (activeTab) {
      case 'expiring':
        data = expiringMembers;
        break;
      case 'expired':
        data = expiredMembers;
        break;
      case 'balance':
        data = balancePendingMembers;
        break;
      default:
        data = [];
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      data = data.filter(member => 
        member.name?.toLowerCase().includes(search) ||
        member.contact?.toLowerCase().includes(search) ||
        member.email?.toLowerCase().includes(search) ||
        member.packageName?.toLowerCase().includes(search)
      );
    }

    return data;
  };

  const currentData = getCurrentData();

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 mb-20">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <AlertCircle size={24} className="text-primary" />
            Membership Alerts
          </h1>
          <p className="text-sm text-gray-600">Track expirations & pending balances</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm w-full sm:w-auto"
          >
            <option value={7}>Next 7 days</option>
            <option value={15}>Next 15 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
          </select>
          <button
            onClick={loadMembershipData}
            className="inline-flex justify-center items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm w-full sm:w-auto"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, contact, email, or package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={`flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'expiring'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          onClick={() => setActiveTab('expiring')}
        >
          <Calendar size={16} />
          Expiring ({expiringMembers.length})
        </button>
        <button
          className={`flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'expired'
              ? 'bg-red-100 text-red-800 border border-red-200 shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          onClick={() => setActiveTab('expired')}
        >
          <AlertCircle size={16} />
          Expired ({expiredMembers.length})
        </button>
        <button
          className={`flex-1 sm:flex-none inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${activeTab === 'balance'
              ? 'bg-orange-100 text-orange-800 border border-orange-200 shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          onClick={() => setActiveTab('balance')}
        >
          <AlertCircle size={16} />
          Pending ({balancePendingMembers.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gray-500">Loading data...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="bg-gray-50 p-4 rounded-full mb-3">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">All Caught Up!</h3>
            <p className="text-sm text-gray-500">No {activeTab} memberships found for the selected period.</p>
          </div>
        ) : (
          renderMembers(currentData, activeTab)
        )}
      </div>
    </div>
  );
};

export default MembershipAlerts;



