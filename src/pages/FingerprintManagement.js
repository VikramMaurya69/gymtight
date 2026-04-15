import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  UserPlus, 
  Users, 
  Activity,
  Clock,
  ChevronRight,
  Phone,
  Shield,
  Banknote,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  AlertTriangle
} from 'lucide-react';
import { fingerprintService, DEVICE_CONFIG } from '../services/fingerprintService';
import { membersService } from '../services/membersService';
import { useRBAC } from '../contexts/RBACContext';

const FingerprintManagement = () => {
  const { hasPermission, isOwner } = useRBAC();
  const [deviceStatus, setDeviceStatus] = useState({
    connected: false,
    listening: false,
    deviceInfo: DEVICE_CONFIG
  });
  
  const [fingerprintLogs, setFingerprintLogs] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, member, trainer
  const [filterTimeRange, setFilterTimeRange] = useState('today'); // today, week, month, all
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    selectedMemberId: '',
    personType: 'member',
    personName: ''
  });

  // Real-time scan display
  const [latestScan, setLatestScan] = useState(null);

  useEffect(() => {
    loadInitialData();
    updateDeviceStatus();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadFingerprintLogs(),
        loadMembers()
      ]);
    } catch (error) {
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const result = await membersService.getAllMembers();
      if (result.success) {
        setMembers(result.data);
      }
    } catch (error) {
      // Error loading members
    }
  };

  const updateDeviceStatus = () => {
    setDeviceStatus(fingerprintService.getDeviceStatus());
  };

  const loadFingerprintLogs = async () => {
    try {
      const result = await fingerprintService.getFingerprintLogs(100);
      setFingerprintLogs(result.logs);
    } catch (error) {
      setError('Failed to load fingerprint logs');
    }
  };

  // Enhanced search function with ID/Mobile support
  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setError('Please enter at least 2 characters to search');
      setTimeout(() => setError(''), 2000);
      return;
    }

    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const result = await fingerprintService.searchFingerprints(searchTerm.trim());
      
      if (result.success) {
        setSearchResults(result.data);
        setShowSearchResults(true);
        setSuccess(`Found ${result.data.length} fingerprint record(s) for "${searchTerm}"`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'No records found for the search term');
        setSearchResults([]);
        setShowSearchResults(false);
        setTimeout(() => setError(''), 4000);
      }
    } catch (error) {
      setError('Search failed. Please check your connection and try again.');
      setSearchResults([]);
      setShowSearchResults(false);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Search by specific identifier (mobile/ID/email)
  const handleSearchByIdentifier = async (identifier, type = 'auto') => {
    try {
      setLoading(true);
      const result = await fingerprintService.getFingerprintByIdentifier(identifier, type);
      
      if (result.success && result.count > 0) {
        setSearchResults(result.data);
        setShowSearchResults(true);
        setSuccess(`Found ${result.count} records for ${type}: ${identifier}`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(`No fingerprint records found for ${identifier}`);
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Search failed. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleConnectDevice = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('Attempting to connect to fingerprint device...');
      
      const result = await fingerprintService.connectDevice();
      
      if (result.success) {
        setSuccess(`Successfully connected to fingerprint device!`);
        updateDeviceStatus();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(result.message || 'Failed to connect to fingerprint device');
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to connect device. Please check if the device is powered on and connected.';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectDevice = async () => {
    try {
      setLoading(true);
      
      // Stop listening first
      if (deviceStatus.listening) {
        fingerprintService.stopFingerprintListening();
      }
      
      const result = await fingerprintService.disconnectDevice();
      
      if (result.success) {
        setSuccess(result.message);
        updateDeviceStatus();
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Failed to disconnect device');
    } finally {
      setLoading(false);
    }
  };

  const handleStartListening = async () => {
    try {
      setError('');
      
      const result = await fingerprintService.startFingerprintListening((scanData) => {
        setLatestScan(scanData);
        // Refresh logs to show new scan
        loadFingerprintLogs();
        
        // Show success message
        setSuccess(`Fingerprint scan detected: ${scanData.personName} (${scanData.personType})`);
        
        // Clear the message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      });
      
      if (result.success) {
        setSuccess(result.message);
        updateDeviceStatus();
      }
    } catch (error) {
      setError('Failed to start fingerprint listening');
    }
  };

  const handleStopListening = () => {
    try {
      const result = fingerprintService.stopFingerprintListening();
      
      if (result.success) {
        setSuccess(result.message);
        updateDeviceStatus();
      }
    } catch (error) {
      setError('Failed to stop fingerprint listening');
    }
  };

  const handleRegisterFingerprint = async (e) => {
    e.preventDefault();
    
    if (!registerForm.selectedMemberId) {
      setError('Please select a member to register');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (!deviceStatus.connected) {
      setError('Please connect the fingerprint device first');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Find the selected member
    const selectedMember = members.find(m => m.id === registerForm.selectedMemberId);
    if (!selectedMember) {
      setError('Selected member not found. Please refresh and try again.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess(`Starting fingerprint registration for ${selectedMember.name}...`);
      
      const result = await fingerprintService.registerFingerprint(
        selectedMember.id,
        registerForm.personType,
        selectedMember.name
      );
      
      if (result.success) {
        setSuccess(`INR  Fingerprint successfully registered for ${selectedMember.name}!`);
        setShowRegisterModal(false);
        setRegisterForm({ selectedMemberId: '', personType: 'member', personName: '' });
        // Refresh data to show new registration
        await loadFingerprintLogs();
        await loadMembers(); // Refresh members to update fingerprint status
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.message || 'Registration failed. Please try again.');
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      const errorMsg = error.message || 'Registration failed. Please ensure the device is connected and try again.';
      setError(`Registration failed: ${errorMsg}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFingerprint = async (registrationId) => {
    if (!window.confirm('Are you sure you want to delete this fingerprint registration?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await fingerprintService.deleteFingerprint(registrationId);
      
      if (result.success) {
        setSuccess(result.message);
        loadFingerprintLogs();
      }
    } catch (error) {
      setError(`Failed to delete fingerprint: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = fingerprintLogs.filter(log => {
    // Search functionality - check multiple fields
    let matchesSearch = true;
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      matchesSearch = (
        (log.personName && log.personName.toLowerCase().includes(searchLower)) ||
        (log.personType && log.personType.toLowerCase().includes(searchLower)) ||
        (log.fingerprintTemplateId && log.fingerprintTemplateId.toString().includes(searchLower)) ||
        (log.id && log.id.toString().includes(searchLower))
      );
    }
    
    // Type filtering
    const matchesType = filterType === 'all' || log.personType === filterType;
    
    // Time range filtering
    let matchesTime = true;
    if (filterTimeRange !== 'all' && log.scanTime) {
      const logDate = new Date(log.scanTime);
      const now = new Date();
      
      // Validate date
      if (isNaN(logDate.getTime())) {
        matchesTime = false;
      } else {
        switch (filterTimeRange) {
          case 'today':
            matchesTime = logDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesTime = logDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesTime = logDate >= monthAgo;
            break;
          default:
            matchesTime = true;
        }
      }
    }
    
    return matchesSearch && matchesType && matchesTime;
  });

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getStatusIcon = (connected) => {
    return connected ? (
      <CheckCircle className="status-icon connected" size={16} />
    ) : (
      <XCircle className="status-icon disconnected" size={16} />
    );
  };

  // Permission checks
  const canView = isOwner() || hasPermission('view_fingerprint');
  const canRegister = isOwner() || hasPermission('register_fingerprint');
  const canManageDevice = isOwner() || hasPermission('manage_fingerprint_device');

  // Access denied if no view permission
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to view fingerprint management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-800">Fingerprint Management</h1>
          </div>
          <p className="text-gray-600 mt-1">Manage fingerprint device connections, user registrations, and access logs</p>
        </div>
        
        {canRegister && (
          <button 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            onClick={() => setShowRegisterModal(true)}
          >
            <UserPlus size={16} />
            Register User
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-3">
          <XCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center gap-3">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Device Status Section */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Device Status</h2>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">{deviceStatus.deviceInfo.deviceName}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection:</span>
                  <span className="font-medium text-gray-900">
                    {deviceStatus.connectionType || 'Simulation'} 
                    {deviceStatus.connectionType && (
                      <span className="text-gray-500"> ({deviceStatus.connectionType})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Serial Number:</span>
                  <span className="font-medium text-gray-900">{deviceStatus.deviceInfo.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MAC Address:</span>
                  <span className="font-medium text-gray-900">{deviceStatus.deviceInfo.macAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Algorithm:</span>
                  <span className="font-medium text-gray-900">{deviceStatus.deviceInfo.fingerprintAlgorithm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform:</span>
                  <span className="font-medium text-gray-900">{deviceStatus.deviceInfo.platform}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(deviceStatus.connected)}
                <span className="text-gray-700">Connection: <span className="font-medium">{deviceStatus.connected ? 'Connected' : 'Disconnected'}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(deviceStatus.listening)}
                <span className="text-gray-700">Listening: <span className="font-medium">{deviceStatus.listening ? 'Active' : 'Inactive'}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  deviceStatus.simulationMode ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {deviceStatus.simulationMode ? 'INR  SIMULATION MODE' : 'INR  HARDWARE MODE (PLACEHOLDER)'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                deviceStatus.connected 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-primary text-white hover:bg-blue-700'
              }`}
              onClick={deviceStatus.connected ? handleDisconnectDevice : handleConnectDevice}
              disabled={loading}
            >
              {deviceStatus.connected ? (
                <>
                  <WifiOff size={16} />
                  Disconnect
                </>
              ) : (
                <>
                  <Wifi size={16} />
                  Connect
                </>
              )}
            </button>
            
            {deviceStatus.connected && canManageDevice && (
              <button
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                  deviceStatus.listening 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                onClick={deviceStatus.listening ? handleStopListening : handleStartListening}
                disabled={loading}
              >
                {deviceStatus.listening ? (
                  <>
                    <Pause size={16} />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Start Listening
                  </>
                )}
              </button>
            )}
            
            {canRegister && (
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
                onClick={() => setShowRegisterModal(true)}
                disabled={!deviceStatus.connected || loading}
              >
                <UserPlus size={16} />
                Register Fingerprint
              </button>
            )}

            {canManageDevice && (
              <button
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm ${
                  deviceStatus.simulationMode 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                onClick={() => {
                  fingerprintService.setSimulationMode(!deviceStatus.simulationMode);
                  updateDeviceStatus();
                }}
                disabled={deviceStatus.connected}
                title={deviceStatus.connected ? 'Disconnect device first to change mode' : 'Toggle between simulation and hardware mode'}
              >
                {deviceStatus.simulationMode ? 'INR  Switch to Hardware Mode' : 'INR  Switch to Simulation'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Latest Scan Display */}
      {latestScan && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Latest Scan</h2>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Users className="text-primary" size={20} />
                <div>
                  <h3 className="font-semibold text-gray-900">{latestScan.personName}</h3>
                  <span className="text-sm text-gray-600">{latestScan.personType}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} />
                <span>{formatDateTime(latestScan.scanTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Activity size={16} />
                <span>Confidence: {(latestScan.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fingerprint Logs Section */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Fingerprint Logs {loading && <span className="ml-2">INR </span>}</h2>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, mobile number, ID, or email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={handleSearch}
              disabled={!searchTerm.trim() || searchTerm.trim().length < 2}
              title="Search fingerprints (minimum 2 characters)"
            >
              Search
            </button>
            {showSearchResults && (
              <button 
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={clearSearch}
                title="Clear search results"
              >
                Clear
              </button>
            )}
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="member">Members</option>
              <option value="trainer">Trainers</option>
            </select>
            
            <select
              value={filterTimeRange}
              onChange={(e) => setFilterTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            
            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div className="mt-4">
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                <p className="text-gray-600 mt-2">Loading logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 text-center">
                 <p className="text-gray-600">
                  {fingerprintLogs.length > 0 
                    ? 'No logs match your current filters.' 
                    : 'No fingerprint logs found.'}
                 </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{log.personName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(log.scanTime)}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.personType === 'member' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                      {log.personType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                     <div className="col-span-2">
                        <span className="block text-xs text-gray-400 mb-1">Confidence</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${(log.confidence || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700">{((log.confidence || 0) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs text-gray-400">Template ID</span>
                      {log.fingerprintTemplateId}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button 
                      className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
                      onClick={() => handleDeleteFingerprint(log.id)}
                      title="Delete Registration"
                    >
                      <XCircle size={16} /> Delete Registration
                    </button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.personName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.personType === 'member' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {log.personType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(log.scanTime)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                            <div 
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${(log.confidence || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-700">{((log.confidence || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.fingerprintTemplateId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleDeleteFingerprint(log.id)}
                          title="Delete Registration"
                        >
                          <XCircle size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-600">
                      {loading ? (
                        'INR  Loading fingerprint logs...'
                      ) : filteredLogs.length === 0 && fingerprintLogs.length > 0 ? (
                        'INR  No logs match your current filters. Try adjusting your search criteria.'
                      ) : (
                        'INR  No fingerprint logs found. Start by registering fingerprints and scanning to see activity here.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      </div>
      </div>
      
      {/* Search Results Section */}
      {showSearchResults && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Search Results</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{searchResults.length} results for "{searchTerm}"</span>
              <button 
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={clearSearch}
              >
                Clear Results
              </button>
            </div>
          </div>
          
          <div>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Search className="text-gray-400" size={48} />
                <h3 className="text-lg font-semibold text-gray-800">No fingerprint records found</h3>
                <p className="text-gray-600">Try searching with different terms like:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>INR  Full name or partial name</li>
                  <li>INR  Mobile number (10 digits)</li>
                  <li>INR  Email address</li>
                  <li>INR  Member ID or Trainer ID</li>
                  <li>INR  ID Number</li>
                </ul>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result) => (
                  <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Users size={20} className="text-primary" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{result.personName}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            result.personType === 'member' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {result.personType.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        <Fingerprint size={12} />
                        Active
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {result.mobileNumber && (
                        <div className="flex justify-between">
                          <strong className="text-gray-600">Mobile:</strong>
                          <span className="text-gray-900">{result.mobileNumber}</span>
                        </div>
                      )}
                      {result.emailAddress && (
                        <div className="flex justify-between">
                          <strong className="text-gray-600">Email:</strong>
                          <span className="text-gray-900">{result.emailAddress}</span>
                        </div>
                      )}
                      {result.idNumber && (
                        <div className="flex justify-between">
                          <strong className="text-gray-600">ID Number:</strong>
                          <span className="text-gray-900">{result.idNumber}</span>
                        </div>
                      )}
                      {result.memberId && (
                        <div className="flex justify-between">
                          <strong className="text-gray-600">Member ID:</strong>
                          <span className="text-gray-900">{result.memberId}</span>
                        </div>
                      )}
                      {result.trainerId && (
                        <div className="flex justify-between">
                          <strong className="text-gray-600">Trainer ID:</strong>
                          <span className="text-gray-900">{result.trainerId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <strong className="text-gray-600">Registration ID:</strong>
                        <span className="text-gray-900 font-mono text-xs">{result.registrationId}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-gray-600">Registered:</strong>
                        <span className="text-gray-900">{new Date(result.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button 
                      className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={() => handleSearchByIdentifier(result.mobileNumber || result.emailAddress, 
                        result.mobileNumber ? 'mobile' : 'email')}
                      title="View all fingerprints for this person"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Register Fingerprint Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Register New Fingerprint</h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                onClick={() => setShowRegisterModal(false)}
              >
                INR 
              </button>
            </div>
            
            <form onSubmit={handleRegisterFingerprint} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Member *</label>
                <select
                  value={registerForm.selectedMemberId}
                  onChange={(e) => {
                    const selectedMember = members.find(m => m.id === e.target.value);
                    setRegisterForm({
                      ...registerForm,
                      selectedMemberId: e.target.value,
                      personName: selectedMember ? selectedMember.name : ''
                    });
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Choose a member to register fingerprint...</option>
                  {members && members.length > 0 ? (
                    members
                      .filter(member => !member.fingerprintStatus || member.fingerprintStatus === 'none')
                      .map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.email} {member.membershipType ? `(${member.membershipType})` : ''}
                        </option>
                      ))
                  ) : (
                    <option disabled>Loading members...</option>
                  )}
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  Only members without existing fingerprint registrations are displayed
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Person Type *</label>
                <select
                  value={registerForm.personType}
                  onChange={(e) => setRegisterForm({
                    ...registerForm,
                    personType: e.target.value
                  })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="trainer">Trainer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Member Name</label>
                <input
                  type="text"
                  value={registerForm.personName}
                  readOnly
                  placeholder="Select a member above to see their name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Member name is automatically populated when you select a member above
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading || !registerForm.selectedMemberId}
                >
                  {loading ? 'Registering...' : 'Register Fingerprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FingerprintManagement;



