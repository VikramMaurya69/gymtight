import React, { useState, useEffect } from 'react';
import { DollarSign, List, User, Calendar, Trash2, X, Plus, Filter, Search } from 'lucide-react';
import { trainersService } from '../services/trainersService';
import { trainerPaymentsService } from '../services/trainerPaymentsService';
import { useBranch } from '../contexts/BranchContext';

const TrainerPayments = () => {
  const { currentBranch } = useBranch();
  const [trainers, setTrainers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    trainerId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [currentBranch]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (currentBranch) {
        const [trainersData, paymentsData] = await Promise.all([
          trainersService.getAllTrainers(currentBranch.id),
          trainerPaymentsService.getAllPayments(currentBranch.id),
        ]);
        setTrainers(trainersData.success ? trainersData.data : []);
        setPayments(paymentsData.success ? paymentsData.data : []);
      }
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate amount
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }
    
    try {
      setLoading(true);
      await trainerPaymentsService.addPayment({ ...formData, branchId: currentBranch?.id });
      setShowAddModal(false);
      setFormData({
        trainerId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadData();
    } catch (error) {
      alert('Failed to add payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId) => {
    try {
      setLoading(true);
      const result = await trainerPaymentsService.deletePayment(paymentId);
      if (result.success) {
        setDeleteConfirm(null);
        loadData();
      } else {
        alert('Failed to delete payment. Please try again.');
      }
    } catch (error) {
      alert('Failed to delete payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trainer Payments</h1>
            <p className="text-gray-600 mt-1">Track payments for personal training sessions</p>
          </div>
        </div>
        <div>
          <button 
            className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium text-sm flex items-center justify-center gap-2" 
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Add Payment
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
             <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm">
               Total Payments: {payments.length}
             </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <User className="w-4 h-4" />
                    <span>Trainer</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <DollarSign className="w-4 h-4" />
                    <span>Amount</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span>Payment Date</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <List className="w-4 h-4" />
                    <span>Notes</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-right whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-700">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-500 text-sm">Loading payments...</p>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <DollarSign className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No payments found</h3>
                      <p className="text-gray-500">Add a new payment to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">
                      {trainers.find(t => t.id === payment.trainerId)?.name || 'Unknown Trainer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        INR {parseFloat(payment.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {new Date(payment.paymentDate.toDate ? payment.paymentDate.toDate() : payment.paymentDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {payment.notes || <span className="text-gray-400 italic">No notes</span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDeleteConfirm(payment)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Payment"
                      >
                         <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Add New Payment</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
                <select 
                  name="trainerId" 
                  value={formData.trainerId} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="">Select Trainer</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                  ))}
                </select>
                {trainers.length === 0 && (
                   <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                     No trainers found for this branch.
                   </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
                <input 
                  type="number" 
                  name="amount" 
                  value={formData.amount} 
                  onChange={handleInputChange} 
                  required 
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="0.00" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input 
                  type="date" 
                  name="paymentDate" 
                  value={formData.paymentDate} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleInputChange} 
                  rows="3" 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none" 
                  placeholder="Add any additional details..."
                ></textarea>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button" 
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-lg font-medium transition-colors" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-lg shadow-blue-500/30" 
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Payment?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this payment of <span className="font-semibold text-gray-900">INR {deleteConfirm.amount}</span>? This action cannot be undone.
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-500/30"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerPayments;



