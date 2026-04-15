import React, { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../services/attendanceService';
import { useRBAC, PERMISSIONS } from '../contexts/RBACContext';
import { 
  Calendar, 
  Users, 
  UserCheck, 
  Clock, 
  Download,
  Search,
  Filter,
  TrendingUp,
  Activity,
  Timer,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MapPin,
  Fingerprint
} from 'lucide-react';

const Attendance = () => {
  const { hasPermission } = useRBAC();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState('daily'); // daily, range, person
  const [filterType, setFilterType] = useState('all'); // all, members, trainers
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [stats, setStats] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      let data;

      switch (viewMode) {
        case 'daily':
          data = await attendanceService.getAttendanceByDate(new Date(selectedDate));
          break;
        case 'range':
          data = await attendanceService.getAttendanceByRange(
            new Date(dateRange.start), 
            new Date(dateRange.end)
          );
          break;
        default:
          data = await attendanceService.getAttendanceByDate(new Date(selectedDate));
      }

      setAttendanceData(data);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load attendance data: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dateRange, viewMode]);

  const loadStats = async () => {
    try {
      const statsData = await attendanceService.getAttendanceStats(7);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      // Don't show alert for stats error, just log it
    }
  };

  // Permission check and initial load
  useEffect(() => {
    if (!hasPermission(PERMISSIONS.VIEW_ATTENDANCE)) {
      setAlert({
        type: 'error',
        message: 'You do not have permission to view attendance data.'
      });
      return;
    }
    
    // Load stats and attendance data separately for better UX
    loadStats();
    loadAttendanceData();
  }, [hasPermission, selectedDate, dateRange, viewMode, loadAttendanceData]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setExpandedRows(new Set());
  };

  const toggleRowExpansion = (personId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
    }
    setExpandedRows(newExpanded);
  };

  const getFilteredAttendance = () => {
    if (!attendanceData) return [];
    
    let data = [];
    
    if (viewMode === 'daily' && attendanceData.attendance) {
      data = attendanceData.attendance;
    } else if (viewMode === 'range' && Array.isArray(attendanceData)) {
      return attendanceData; // Range data is already processed differently
    }

    // Apply type filter
    if (filterType !== 'all') {
      data = data.filter(person => person.personType === filterType.slice(0, -1)); // Remove 's' from 'members'/'trainers'
    }

    // Apply search filter
    if (searchTerm) {
      data = data.filter(person => 
        person.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.personId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const exportAttendance = () => {
    const data = getFilteredAttendance();
    const csvContent = [
      ['Name', 'Type', 'First Scan', 'Last Scan', 'Total Scans', 'Time Spent'].join(','),
      ...data.map(person => [
        person.personName,
        person.personType,
        formatTime(person.firstScan),
        formatTime(person.lastScan),
        person.totalScans,
        formatDuration(person.estimatedTimeSpent)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!hasPermission(PERMISSIONS.VIEW_ATTENDANCE)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>
            <p className="text-sm text-gray-600 mt-1">Access Denied</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow border border-gray-200">
          <Activity size={48} className="text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view attendance data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track member and trainer attendance from fingerprint scans</p>
        </div>
        
        <button onClick={exportAttendance} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-medium">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`p-4 rounded-lg ${alert.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          <div className="flex items-center justify-between">
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)} className="text-xl font-bold hover:opacity-70">x</button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalUniqueMembersInPeriod}</h3>
              <p className="text-sm text-gray-500">Active Members (7d)</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="bg-green-50 p-3 rounded-lg text-green-600">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalUniqueTrainersInPeriod}</h3>
              <p className="text-sm text-gray-500">Active Trainers (7d)</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
              <Fingerprint size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalScansInPeriod}</h3>
              <p className="text-sm text-gray-500">Total Scans (7d)</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{Math.round(stats.averageDailyAttendance)}</h3>
              <p className="text-sm text-gray-500">Avg. Daily (7d)</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">View Mode:</label>
            <div className="flex gap-2">
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'daily' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleViewModeChange('daily')}
              >
                <Calendar size={16} />
                Daily View
              </button>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'range' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleViewModeChange('range')}
              >
                <BarChart3 size={16} />
                Date Range
              </button>
            </div>
          </div>

          {viewMode === 'daily' && (
            <div className="flex-1">
              <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-2">Select Date:</label>
              <input
                type="date"
                id="selectedDate"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          {viewMode === 'range' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range:</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  max={dateRange.end}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  min={dateRange.start}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-600" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
            >
              <option value="all">All Types</option>
              <option value="members">Members Only</option>
              <option value="trainers">Trainers Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      {attendanceData && viewMode === 'daily' && attendanceData.summary && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Total People:</span>
              <span className="text-xl font-bold text-gray-800">{attendanceData.summary.totalPeople}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Members:</span>
              <span className="text-xl font-bold text-gray-800">{attendanceData.summary.totalMembers}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Trainers:</span>
              <span className="text-xl font-bold text-gray-800">{attendanceData.summary.totalTrainers}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Total Scans:</span>
              <span className="text-xl font-bold text-gray-800">{attendanceData.summary.totalScans}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Peak Hour:</span>
              <span className="text-xl font-bold text-gray-800">{attendanceData.summary.peakHours.hourRange}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Avg. Time Spent:</span>
              <span className="text-xl font-bold text-gray-800">{formatDuration(attendanceData.summary.averageTimeSpent)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading attendance data...</p>
          </div>
        ) : viewMode === 'range' ? (
          // Date Range View
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance by Date ({dateRange.start} to {dateRange.end})</h3>
            {attendanceData && attendanceData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attendanceData.map((dayData) => (
                  <div key={dayData.date} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">{new Date(dayData.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Users size={16} className="text-blue-600" />
                        <span>{dayData.uniqueMembers} Members</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <UserCheck size={16} className="text-green-600" />
                        <span>{dayData.uniqueTrainers} Trainers</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Fingerprint size={16} className="text-purple-600" />
                        <span>{dayData.totalScans} Scans</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity size={48} className="text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No attendance data found</h3>
                <p className="text-gray-600">No fingerprint scans recorded for the selected date range.</p>
              </div>
            )}
          </div>
        ) : (
          // Daily View
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Attendance Details</h3>
            {getFilteredAttendance().length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getFilteredAttendance().map((person) => (
                  <div key={person.personId} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 flex items-center justify-between border-b border-gray-200">
                      <div>
                        <h4 className="font-semibold text-gray-800">{person.personName}</h4>
                        <p className="text-sm text-gray-600">ID: {person.personId}</p>
                      </div>
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        person.personType === 'member' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {person.personType === 'member' ? (
                          <Users size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                        {person.personType}
                      </span>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Clock size={16} />
                            First Scan
                          </div>
                          <div className="font-semibold text-gray-800">{formatTime(person.firstScan)}</div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Clock size={16} />
                            Last Scan
                          </div>
                          <div className="font-semibold text-gray-800">{formatTime(person.lastScan)}</div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Fingerprint size={16} />
                            Total Scans
                          </div>
                          <div className="font-semibold text-gray-800">{person.totalScans}</div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Timer size={16} />
                            Time Spent
                          </div>
                          <div className="font-semibold text-gray-800">{formatDuration(person.estimatedTimeSpent)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-4 pb-4">
                      <button
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        onClick={() => toggleRowExpansion(person.personId)}
                      >
                        {expandedRows.has(person.personId) ? (
                          <>
                            <ChevronUp size={16} />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            View Details
                          </>
                        )}
                      </button>
                    </div>
                    
                    {expandedRows.has(person.personId) && (
                      <div className="bg-gray-50 p-4 border-t border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-3">All Scans for {person.personName}</h5>
                        <div className="space-y-2">
                          {person.scans.map((scan, index) => (
                            <div key={scan.id} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Clock size={14} />
                                  {formatTime(scan.scanTime)}
                                </div>
                                <div className="text-gray-600">
                                  Confidence: {Math.round(scan.confidence * 100)}%
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin size={14} />
                                  {scan.deviceInfo?.name || 'Main Entrance'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity size={48} className="text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No attendance data found</h3>
                <p className="text-gray-600">No fingerprint scans recorded for the selected date and filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;



