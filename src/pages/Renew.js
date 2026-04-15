import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { membersService } from '../services/membersService';
import { packagesService } from '../services/packagesService';
import { ArrowLeft, User, Calendar, CreditCard, Check, AlertTriangle } from 'lucide-react';
import { formatDateToDDMMYYYY } from '../utils/dateFormat';

const Renew = () => {
  const { memberId } = useParams();
  const identifier = memberId;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [member, setMember] = useState(null);
  const [packages, setPackages] = useState([]);

  const [form, setForm] = useState({
    duration: 30,
    durationUnit: 'days',
    membershipCost: '',
    amountPaid: '',
    discount: '',
    selectedPackage: '',
    membershipType: '',
    paymentMode: 'Cash',
    nextJoiningDate: ''
  });

  const [previewExpiry, setPreviewExpiry] = useState('');

  // Load packages on mount
  useEffect(() => {
    const loadPackages = async () => {
      try {
        console.log('Loading packages for Renew page...');
        const result = await packagesService.getActivePackages();
        if (result.success) {
          console.log(`Loaded ${result.data.length} packages for Renew page`);
          setPackages(result.data);
        }
      } catch (err) {
        console.error('Error loading packages:', err);
      }
    };
    loadPackages();
  }, []);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        setLoading(true);
        const res = await membersService.getMemberByIdentifier(identifier);
        if (!res.success) {
          setError('Member not found.');
          return;
        }
        const m = res.data;
        setMember(m);
        setForm(prev => ({
          ...prev,
          membershipCost: m.membershipCost ?? '',
          amountPaid: '', // Reset for new payment
          discount: '', // Reset discount
          selectedPackage: m.selectedPackage ?? m.membershipName ?? '',
          membershipType: m.membershipType ?? ''
        }));
      } catch (e) {
        setError(e.message || 'Failed to load member');
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [identifier]);

  // Calculate preview expiry from next joining date based on package duration
  useEffect(() => {
    if (!member) return;

    // Use next joining date as base, or fall back to today
    const joiningDate = form.nextJoiningDate ? new Date(form.nextJoiningDate) : new Date();
    const newDate = new Date(joiningDate);
    const duration = parseInt(form.duration) || 0;

    if (form.durationUnit === 'days') {
      newDate.setDate(newDate.getDate() + duration);
    } else if (form.durationUnit === 'months') {
      newDate.setMonth(newDate.getMonth() + duration);
    } else if (form.durationUnit === 'years') {
      newDate.setFullYear(newDate.getFullYear() + duration);
    }

    setPreviewExpiry(formatDateToDDMMYYYY(newDate));
  }, [form.duration, form.durationUnit, form.nextJoiningDate, member]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // When package is selected, auto-fill cost, name, and duration
    if (name === 'selectedPackage' && value) {
      const selectedPkg = packages.find(p => p.id === value);
      if (selectedPkg) {
        // Parse duration from package
        let pkgDuration = 30;
        let pkgUnit = 'days';
        
        if (selectedPkg.duration) {
          const durStr = typeof selectedPkg.duration === 'object' 
            ? JSON.stringify(selectedPkg.duration) 
            : String(selectedPkg.duration);
          
          // Try to parse "3months", "6months", "12months", "1month", "30days", etc.
          const monthMatch = durStr.match(/(\d+)\s*month/i);
          const dayMatch = durStr.match(/(\d+)\s*day/i);
          
          if (monthMatch) {
            pkgDuration = parseInt(monthMatch[1]);
            pkgUnit = 'months';
          } else if (dayMatch) {
            pkgDuration = parseInt(dayMatch[1]);
            pkgUnit = 'days';
          }
        }
        
        setForm(prev => ({
          ...prev,
          selectedPackage: value,
          membershipType: selectedPkg.packageName,
          membershipCost: selectedPkg.price?.toString() || '',
          duration: pkgDuration,
          durationUnit: pkgUnit
        }));
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!member?.id) return;

    try {
      setLoading(true);
      const payload = {
        duration: parseInt(form.duration, 10),
        durationUnit: form.durationUnit,
        membershipCost: form.membershipCost,
        amountPaid: form.amountPaid,
        discount: form.discount || 0,
        selectedPackage: form.selectedPackage,
        membershipType: form.membershipType,
        paymentMode: form.paymentMode,
        nextJoiningDate: form.nextJoiningDate
      };
      const res = await membersService.renewSubscription(member.id, payload);
      if (res.success) {
        setSuccess('Subscription renewed successfully!');
        // Wait a bit then go back
        setTimeout(() => navigate('/members'), 1500);
      } else {
        setError(res.error || 'Failed to renew');
      }
    } catch (e) {
      setError(e.message || 'Failed to renew');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Member</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/members')} className="px-4 py-2 bg-primary text-white rounded-lg">
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center text-gray-600 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Members
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Renew Membership</h1>
        <p className="text-gray-600 mt-1">Extend subscription and update payment details</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Member Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-blue-50 p-3 rounded-full">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.phone}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-xs font-semibold text-gray-500 uppercase">Current Plan</div>
                <div className="text-gray-900 font-medium mt-1">{member.selectedPackage || member.membershipName || 'N/A'}</div>
              </div>

              <div className={`p-4 rounded-xl ${member.status?.toLowerCase() === 'active' ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-xs font-semibold uppercase mb-1 flex items-center gap-2">
                  <Calendar size={14} />
                  Current Expiry
                </div>
                <div className={`font-medium ${member.status?.toLowerCase() === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                  {formatDateToDDMMYYYY(member.expiryDate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Status: <span className="font-semibold">{member.status || 'Unknown'}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-xs font-semibold text-blue-800 uppercase mb-1">New Expiry Date</div>
                <div className="text-lg font-bold text-blue-900">
                  {previewExpiry}
                </div>
                <div className="text-xs text-blue-600 mt-1">Estimated based on selection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Renewal Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="text-gray-400" size={20} />
                Renewal Details
              </h3>
            </div>

            <form onSubmit={submit} className="p-8 space-y-8">
              {/* Payment Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="text-gray-400" size={20} />
                  Payment Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package/Plan</label>
                    <select
                      name="selectedPackage"
                      value={form.selectedPackage}
                      onChange={onChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    >
                      <option value="">Select Package</option>
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.packageName} - INR {pkg.price?.toLocaleString('en-IN') || 0} ({pkg.packageType})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Joining Date</label>
                    <input
                      type="date"
                      name="nextJoiningDate"
                      value={form.nextJoiningDate}
                      onChange={onChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (INR)</label>
                    <input
                      type="number"
                      name="membershipCost"
                      value={form.membershipCost}
                      onChange={onChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (INR)</label>
                    <input
                      type="number"
                      name="amountPaid"
                      value={form.amountPaid}
                      onChange={onChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount (INR)</label>
                    <input
                      type="number"
                      name="discount"
                      value={form.discount}
                      onChange={onChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/members')}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
                >
                  {loading ? 'Processing...' : (
                    <>
                      <Check size={18} />
                      Confirm Renewal
                    </>
                  )}
                </button>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm flex items-center gap-2">
                  <Check size={16} />
                  {success}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Renew;


