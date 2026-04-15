import React, { useState, useEffect } from 'react';
import { Users, Edit3, Trash2, Fingerprint, X, Scan, Dumbbell, CheckCircle, AlertCircle, Plus, Search, Filter, AlertTriangle, Upload } from 'lucide-react';
import { fingerprintService } from '../services/fingerprintService';
import { trainersService } from '../services/trainersService';
import etimeTrackService from '../services/etimeTrackService';
import { useBranch } from '../contexts/BranchContext';
import { useRBAC } from '../contexts/RBACContext';
import { sanitizeInput, sanitizeEmail, sanitizePhone, validateFileUpload } from '../utils/sanitization';
import { validateEmail, validatePhone, getEmailError, getPhoneError } from '../utils/validation';
import { trainerPaymentsService } from '../services/trainerPaymentsService';

const Trainers = () => {
  const { currentBranch } = useBranch();
  const { hasPermission, isOwner } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fingerprint registration states
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [fingerprintTrainer, setFingerprintTrainer] = useState(null);
  const [fingerprintStatus, setFingerprintStatus] = useState('idle'); // idle, scanning, success, error
  const [fingerprintMessage, setFingerprintMessage] = useState('');
  const [bridgeConnected, setBridgeConnected] = useState(false);

  // Form state for add/edit trainer
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: 'Weight Training',
    experience: '',
    certifications: '',
    status: 'Active',
    hourlyRate: '',
    rating: '',
    clientsCount: '',
    joinDate: '',
    photo: null
  });

  const [trainerPhoto, setTrainerPhoto] = useState(null);
  const [certificationFiles, setCertificationFiles] = useState([]);

  useEffect(() => {
    if (currentBranch) {
      loadTrainers();
    }
  }, [currentBranch]);

  const loadTrainers = async () => {
    if (!currentBranch) return;

    try {
      setTrainersLoading(true);
      const [trainersResult, paymentsResult] = await Promise.all([
        trainersService.getAllTrainers(currentBranch.id),
        trainerPaymentsService.getAllPayments(currentBranch.id)
      ]);

      if (trainersResult.success) {
        setTrainers(trainersResult.data);
      } else {
        setError(trainersResult.error);
      }

      if (paymentsResult.success) {
        setPayments(paymentsResult.data);
      } else {
        setError(paymentsResult.error);
      }
    } catch (error) {
      setError('Failed to load data');
      // Error loading data
    } finally {
      setTrainersLoading(false);
    }
  };



  // Form handling functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Sanitize input based on field type
    let sanitizedValue = value;
    if (name === 'email') {
      sanitizedValue = sanitizeEmail(value) || value;
    } else if (name === 'phone') {
      sanitizedValue = sanitizePhone(value);
    } else if (['name', 'specialty', 'description'].includes(name)) {
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
      specialty: 'Weight Training',
      experience: '',
      certifications: '',
      status: 'Active',
      hourlyRate: '',
      rating: '',
      clientsCount: '',
      joinDate: '',
      photo: null
    });
    setTrainerPhoto(null);
    setCertificationFiles([]);
    setEditingTrainer(null);
  };

  // Photo upload handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTrainerPhoto(e.target.result);
        setFormData(prev => ({ ...prev, photo: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Certification files upload handler
  const handleCertificationUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [];

    files.forEach(file => {
      if (file.type === 'application/pdf' || file.type.includes('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          newFiles.push({
            name: file.name,
            type: file.type,
            data: event.target.result,
            size: file.size
          });

          if (newFiles.length === files.length) {
            setCertificationFiles(prev => [...prev, ...newFiles]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Remove certification file
  const removeCertificationFile = (index) => {
    setCertificationFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTrainer = async (e) => {
    e.preventDefault();

    // Permission check
    if (!canAdd) {
      setError('You do not have permission to add trainers');
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

    // Validate phone number
    if (formData.phone) {
      const phoneError = getPhoneError(formData.phone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');

      // Prepare certifications array
      const certificationsArray = formData.certifications
        ? formData.certifications.split(',').map(cert => cert.trim()).filter(cert => cert)
        : [];

      const trainerData = {
        ...formData,
        branchId: currentBranch?.id,
        photo: trainerPhoto,
        certifications: certificationsArray,
        certificationFiles: certificationFiles,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : 0,
        rating: formData.rating ? parseFloat(formData.rating) : 0,
        clientsCount: formData.clientsCount ? parseInt(formData.clientsCount) : 0,
        createdAt: new Date()
      };

      const result = await trainersService.addTrainer(trainerData);

      if (result.success) {
        setSuccess('Trainer added successfully');
        setShowAddModal(false);
        resetForm();
        await loadTrainers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to add trainer');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTrainer = async (e) => {
    e.preventDefault();

    // Permission check
    if (!canEdit) {
      setError('You do not have permission to edit trainers');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Prepare certifications array
      const certificationsArray = formData.certifications
        ? formData.certifications.split(',').map(cert => cert.trim()).filter(cert => cert)
        : [];

      const trainerData = {
        ...formData,
        branchId: editingTrainer?.branchId || currentBranch?.id,
        photo: trainerPhoto || editingTrainer?.photo,
        certifications: certificationsArray,
        certificationFiles: certificationFiles,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : 0,
        rating: formData.rating ? parseFloat(formData.rating) : 0,
        clientsCount: formData.clientsCount ? parseInt(formData.clientsCount) : 0,
        updatedAt: new Date()
      };

      const result = await trainersService.updateTrainer(editingTrainer.id, trainerData);

      if (result.success) {
        setSuccess('Trainer updated successfully');
        setShowEditModal(false);
        resetForm();
        await loadTrainers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to update trainer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrainer = async (trainerId, trainerName) => {
    // Permission check
    if (!canDelete) {
      setError('You do not have permission to delete trainers');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${trainerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await trainersService.deleteTrainer(trainerId);

      if (result.success) {
        setSuccess('Trainer deleted successfully');
        await loadTrainers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to delete trainer');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (trainer) => {
    setEditingTrainer(trainer);
    setTrainerPhoto(trainer.photo || null);

    // Format dates properly
    const formatDate = (date) => {
      if (!date) return '';
      try {
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    setFormData({
      name: trainer.name || '',
      email: trainer.email || '',
      phone: trainer.phone || '',
      specialty: trainer.specialty || 'Weight Training',
      experience: trainer.experience !== undefined && trainer.experience !== null ? trainer.experience.toString() : '',
      certifications: Array.isArray(trainer.certifications)
        ? trainer.certifications.join(', ')
        : (trainer.certifications || ''),
      status: trainer.status || 'Active',
      hourlyRate: trainer.hourlyRate !== undefined && trainer.hourlyRate !== null ? trainer.hourlyRate.toString() : '',
      rating: trainer.rating !== undefined && trainer.rating !== null ? trainer.rating.toString() : '',
      clientsCount: trainer.clientsCount !== undefined && trainer.clientsCount !== null ? trainer.clientsCount.toString() : '',
      joinDate: formatDate(trainer.joinDate) || formatDate(trainer.createdAt) || '',
      photo: trainer.photo || null
    });
    setShowEditModal(true);
  };

  // Initialize ETimeTrack connection on component mount
  useEffect(() => {
    etimeTrackService.connect();

    // Listen for real-time fingerprint events
    etimeTrackService.on('fingerprintData', (data) => {
      if (fingerprintStatus === 'scanning') {
        handleFingerprintCaptured(data);
      }
    });

    etimeTrackService.on('connected', () => {
      setBridgeConnected(true);
    });

    etimeTrackService.on('disconnected', () => {
      setBridgeConnected(false);
    });

    return () => {
      etimeTrackService.disconnect();
    };
  }, [fingerprintStatus]);

  const openFingerprintModal = (trainer) => {
    setFingerprintTrainer(trainer);
    setShowFingerprintModal(true);
    setFingerprintStatus('idle');
    setFingerprintMessage('');
  };

  const closeFingerprintModal = () => {
    setShowFingerprintModal(false);
    setFingerprintTrainer(null);
    setFingerprintStatus('idle');
    setFingerprintMessage('');
  };

  const startFingerprintCapture = async () => {
    if (!bridgeConnected) {
      setFingerprintMessage('Bridge server not connected. Please ensure the system is running.');
      return;
    }

    setFingerprintStatus('scanning');
    setFingerprintMessage('Please place your finger on the scanner...');

    // Set timeout for scan
    setTimeout(() => {
      if (fingerprintStatus === 'scanning') {
        setFingerprintStatus('error');
        setFingerprintMessage('Scanning timeout. Please try again.');
      }
    }, 30000); // 30 second timeout
  };

  const handleFingerprintCaptured = async (fingerprintData) => {
    if (!fingerprintTrainer || fingerprintStatus !== 'scanning') return;

    try {
      setFingerprintStatus('processing');
      setFingerprintMessage('Processing fingerprint...');

      // Get trainer details for fingerprint registration
      const trainerDetailsResult = await trainersService.getTrainerDetailsForFingerprint(fingerprintTrainer.id);

      if (!trainerDetailsResult.success) {
        throw new Error('Failed to get trainer details');
      }

      const trainerDetails = trainerDetailsResult.data;

      // Register fingerprint with our system including ID/mobile linking
      const result = await fingerprintService.registerFingerprint(
        fingerprintTrainer.id,
        'trainer',
        fingerprintTrainer.name,
        {
          ...trainerDetails.userDetails,
          etimeTrackData: fingerprintData,
          deviceInfo: fingerprintData.deviceInfo || {}
        }
      );

      if (result.success) {
        setFingerprintStatus('success');
        setFingerprintMessage('Fingerprint registered successfully!');

        await loadTrainers();

        setTimeout(() => {
          closeFingerprintModal();
          setSuccess(`Fingerprint registered successfully for ${fingerprintTrainer.name}`);
          setTimeout(() => setSuccess(''), 3000);
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setFingerprintStatus('error');
      setFingerprintMessage(`Registration failed: ${error.message}`);
    }
  };

  const handleRegisterFingerprint = (trainer) => {
    openFingerprintModal(trainer);
  };

  const handleDeleteFingerprint = async (registrationId, trainerName) => {
    if (!window.confirm(`Are you sure you want to delete the fingerprint for ${trainerName}?`)) {
      return;
    }

    try {
      setLoading(true);

      const result = await fingerprintService.deleteFingerprint(registrationId);

      if (result.success) {
        setSuccess(`Fingerprint deleted successfully for ${trainerName}`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to delete fingerprint');
      }
    } catch (error) {
      setError(`Failed to delete fingerprint: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const specialties = ['Weight Training', 'Yoga & Pilates', 'Cardio & HIIT', 'Nutrition Coaching', 'CrossFit', 'Boxing', 'Swimming', 'Dance'];

  const filteredTrainers = trainers.filter(trainer => {
    const matchesSearch = trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = filterSpecialty === 'all' || trainer.specialty === filterSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  const getTrainerPayments = (trainerId) => {
    return payments
      .filter(p => p.trainerId === trainerId)
      .reduce((acc, p) => acc + parseFloat(p.amount), 0);
  };

  // Permission checks
  const canView = isOwner() || hasPermission('view_trainers');
  const canAdd = isOwner() || hasPermission('add_trainers');
  const canEdit = isOwner() || hasPermission('edit_trainers');
  const canDelete = isOwner() || hasPermission('delete_trainers');
  const canRegisterFingerprint = isOwner() || hasPermission('register_fingerprint');

  // Access denied if no view permission
  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view trainers.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trainers Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage gym trainers and their information</p>
        </div>

        {canAdd && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm font-medium"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} />
            Add Trainer
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-800">{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-800">{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Branch Context */}
      {currentBranch && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-gray-700">Managing trainers for:</span> <span className="font-semibold text-blue-600">{currentBranch.name}</span>
        </div>
      )}

      {/* Trainers Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
            <Dumbbell size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{trainers.length}</h3>
            <p className="text-sm text-gray-500">Total Trainers</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-lg text-green-600">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{trainers.filter(t => t.status === 'Active').length}</h3>
            <p className="text-sm text-gray-500">Active Trainers</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trainers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px] border border-gray-200 rounded-lg p-1 bg-gray-50/50">
            <Filter size={16} className="text-gray-500 ml-2" />
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-gray-700 p-1"
            >
              <option value="all">All Specialties</option>
              {specialties.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Trainers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {trainersLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading trainers...</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
              {filteredTrainers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Dumbbell className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm || filterSpecialty !== 'all' ? 'No trainers match' : 'No trainers found'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || filterSpecialty !== 'all' ? 'Try adjusting filters' : 'Add your first trainer to get started'}
                  </p>
                  {!searchTerm && filterSpecialty === 'all' && (
                    <button
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus size={20} />
                      Add Trainer
                    </button>
                  )}
                </div>
              ) : (
                filteredTrainers.map((trainer) => (
                  <div key={trainer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{trainer.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{trainer.phone || 'N/A'}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${trainer.status?.toLowerCase() === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                        {trainer.status || 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="block text-xs text-gray-400">Specialty</span>
                        {trainer.specialty || 'N/A'}
                      </div>
                      <div>
                        <span className="block text-xs text-gray-400">Total Paid</span>
                        <span className="font-semibold text-green-600">INR {getTrainerPayments(trainer.id)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-xs text-gray-400">Email</span>
                        {trainer.email || 'N/A'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(trainer)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit3 size={16} /> Edit
                        </button>
                      )}
                      {canRegisterFingerprint && (
                        <button
                          onClick={() => openFingerprintModal(trainer)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Fingerprint size={16} /> Fingerprint
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteTrainer(trainer.id)}
                          className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
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
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trainersLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <Dumbbell className="w-12 h-12 text-gray-300 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchTerm || filterSpecialty !== 'all' ? 'No trainers match your criteria' : 'No trainers found'}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {searchTerm || filterSpecialty !== 'all'
                              ? 'Try adjusting your search or filter criteria'
                              : 'Add your first trainer to get started'
                            }
                          </p>
                          {!searchTerm && filterSpecialty === 'all' && (
                            <button
                              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-medium flex items-center gap-2"
                              onClick={() => setShowAddModal(true)}
                            >
                              <Plus size={20} />
                              <span>Add First Trainer</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrainers.map((trainer) => (
                      <tr key={trainer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{trainer.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{trainer.email || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{trainer.phone || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {trainer.specialty || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${trainer.status?.toLowerCase() === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                            {trainer.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-green-600">INR {getTrainerPayments(trainer.id)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(trainer)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Trainer"
                              >
                                <Edit3 size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteTrainer(trainer.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Trainer"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            {canRegisterFingerprint && (
                              <button
                                onClick={() => openFingerprintModal(trainer)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Register Fingerprint"
                              >
                                <Fingerprint size={16} />
                              </button>
                            )}
                            {!canEdit && !canDelete && !canRegisterFingerprint && (
                              <span className="text-gray-400 text-sm">No actions available</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Trainer</h2>
                <p className="text-sm text-gray-500 mt-1">Field marked with * is mandatory</p>
              </div>
              {currentBranch && (
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  Branch: {currentBranch.name}
                </div>
              )}
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTrainer} className="p-6">
              <div className="space-y-6">
                {/* Profile Photo Section */}
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                      {trainerPhoto ? (
                        <img src={trainerPhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Dumbbell size={40} className="text-gray-400" />
                      )}
                    </div>
                    <label htmlFor="trainer-profile-photo" className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      <Edit3 size={16} />
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="trainer-profile-photo"
                    />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Row 1 - Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2 - Contact & Specialty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone*</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Phone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialty*</label>
                      <select
                        name="specialty"
                        value={formData.specialty}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                        required
                      >
                        {specialties.map(specialty => (
                          <option key={specialty} value={specialty}>{specialty}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3 - Professional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                      <input
                        type="text"
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        placeholder="e.g., 5 years"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Row 4 - Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                      <input
                        type="number"
                        name="rating"
                        value={formData.rating}
                        onChange={handleInputChange}
                        placeholder="4.5"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                        max="5"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Clients</label>
                      <input
                        type="number"
                        name="clientsCount"
                        value={formData.clientsCount}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Row 5 - Dates & Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                      <input
                        type="date"
                        name="joinDate"
                        value={formData.joinDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  {/* Certifications - Full Width */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                      <textarea
                        name="certifications"
                        value={formData.certifications}
                        onChange={handleInputChange}
                        placeholder="e.g., ACSM Certified, NASM-CPT (comma separated)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        rows="3"
                      />
                    </div>
                    {/* Certification Files Upload (accept pdf, jpg, jpeg, png) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Certification Documents</label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-700 text-sm font-medium">
                          <Upload size={16} />
                          <span>Upload Files</span>
                          <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg"
                            multiple
                            onChange={handleCertificationUpload}
                            className="hidden"
                            id="trainer-certification-files"
                          />
                        </label>
                        <span className="text-xs text-gray-500">PDF, JPG, PNG allowed</span>
                      </div>

                      {certificationFiles && certificationFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {certificationFiles.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-700 truncate max-w-[200px]">{f.name}</span>
                              <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => removeCertificationFile(idx)}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trainer Modal */}
      {showEditModal && editingTrainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Trainer</h2>
                <p className="text-sm text-gray-500 mt-1">Update trainer information</p>
              </div>
              {editingTrainer?.branchId && (
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  Branch: {currentBranch?.name || 'Unknown Branch'}
                </div>
              )}
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditTrainer} className="p-6">
              <div className="space-y-6">
                {/* Profile Photo Section */}
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                      {trainerPhoto || editingTrainer?.photo ? (
                        <img src={trainerPhoto || editingTrainer.photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Dumbbell size={40} className="text-gray-400" />
                      )}
                    </div>
                    <label htmlFor="edit-trainer-profile-photo" className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      <Edit3 size={16} />
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="edit-trainer-profile-photo"
                    />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Row 1 - Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Full Name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Email"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2 - Contact & Specialty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone*</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Phone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialty*</label>
                      <select
                        name="specialty"
                        value={formData.specialty}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                        required
                      >
                        {specialties.map(specialty => (
                          <option key={specialty} value={specialty}>{specialty}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3 - Professional Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                      <input
                        type="text"
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        placeholder="e.g., 5 years"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Row 4 - Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                      <input
                        type="number"
                        name="rating"
                        value={formData.rating}
                        onChange={handleInputChange}
                        placeholder="4.5"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                        max="5"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Clients</label>
                      <input
                        type="number"
                        name="clientsCount"
                        value={formData.clientsCount}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Row 5 - Dates & Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                      <input
                        type="date"
                        name="joinDate"
                        value={formData.joinDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  {/* Certifications - Full Width */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                      <textarea
                        name="certifications"
                        value={formData.certifications}
                        onChange={handleInputChange}
                        placeholder="e.g., ACSM Certified, NASM-CPT (comma separated)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        rows="3"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-700 text-sm font-medium">
                        <Upload size={16} />
                        <span>Upload Files</span>
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                          multiple
                          onChange={handleCertificationUpload}
                          className="hidden"
                          id="edit-trainer-certification-files"
                        />
                      </label>
                      <span className="text-xs text-gray-500">PDF, JPG, PNG allowed</span>
                    </div>
                    {certificationFiles && certificationFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {certificationFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-sm text-gray-700 truncate max-w-[200px]">{f.name}</span>
                            <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={() => removeCertificationFile(idx)}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-6 mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium text-sm"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fingerprint Registration Modal */}
      {showFingerprintModal && (
        <div className="modal-overlay" onClick={closeFingerprintModal}>
          <div className="modal-content fingerprint-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Fingerprint size={24} /> Register Trainer Fingerprint</h3>
              <button
                className="close-btn"
                onClick={closeFingerprintModal}
                disabled={fingerprintStatus === 'scanning' || fingerprintStatus === 'processing'}
              >
                <X size={20} />
              </button>
            </div>

            <div className="fingerprint-content">
              <div className="member-info">
                <h4>Trainer: {fingerprintTrainer?.name}</h4>
                <p>ID: {fingerprintTrainer?.id}</p>
                <p>Phone: {fingerprintTrainer?.phone}</p>
                <p>Specialty: {fingerprintTrainer?.specialty}</p>
              </div>

              <div className="bridge-status">
                <div className={`connection-indicator ${bridgeConnected ? 'connected' : 'disconnected'}`}>
                  <div className="status-dot"></div>
                  <span>{bridgeConnected ? 'Bridge Connected' : 'Bridge Disconnected'}</span>
                </div>
              </div>

              <div className="fingerprint-scanner">
                {fingerprintStatus === 'idle' && (
                  <div className="scan-instructions">
                    <Fingerprint size={80} className="scan-icon" />
                    <h3>Ready to Scan</h3>
                    <p>Click "Start Scan" and place finger on the device when prompted</p>
                  </div>
                )}

                {fingerprintStatus === 'scanning' && (
                  <div className="scanning-state">
                    <div className="pulse-animation">
                      <Scan size={80} className="scan-icon pulse" />
                    </div>
                    <h3>Scanning...</h3>
                    <p>Please place your finger on the scanner</p>
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                    </div>
                  </div>
                )}

                {fingerprintStatus === 'processing' && (
                  <div className="processing-state">
                    <div className="spinner"></div>
                    <h3>Processing...</h3>
                    <p>Registering fingerprint data</p>
                  </div>
                )}

                {fingerprintStatus === 'success' && (
                  <div className="success-state">
                    <CheckCircle size={80} className="success-icon" />
                    <h3>Success!</h3>
                    <p>Trainer fingerprint registered successfully</p>
                  </div>
                )}

                {fingerprintStatus === 'error' && (
                  <div className="error-state">
                    <AlertCircle size={80} className="error-icon" />
                    <h3>Error</h3>
                    <p>Registration failed. Please try again.</p>
                  </div>
                )}
              </div>

              {fingerprintMessage && (
                <div className={`message ${fingerprintStatus}`}>
                  {fingerprintMessage}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeFingerprintModal}
                disabled={fingerprintStatus === 'scanning' || fingerprintStatus === 'processing'}
              >
                {fingerprintStatus === 'success' ? 'Close' : 'Cancel'}
              </button>

              {fingerprintStatus === 'idle' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={startFingerprintCapture}
                  disabled={!bridgeConnected}
                >
                  <Scan size={16} />
                  Start Scan
                </button>
              )}

              {fingerprintStatus === 'error' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setFingerprintStatus('idle');
                    setFingerprintMessage('');
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trainers;



