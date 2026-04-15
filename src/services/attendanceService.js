import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Timestamp,
  startOfDay,
  endOfDay 
} from './sqlFirestoreCompat';

export class AttendanceService {
  constructor() {
    this.collection = 'fingerprint_logs';
  }

  // Get attendance for a specific date with optimized query
  async getAttendanceByDate(date = new Date()) {
    try {
      const startOfDayTimestamp = new Date(date);
      startOfDayTimestamp.setHours(0, 0, 0, 0);
      
      const endOfDayTimestamp = new Date(date);
      endOfDayTimestamp.setHours(23, 59, 59, 999);

      // Optimized query with limit to prevent large data fetches
      const q = query(
        collection(db, this.collection),
        where('scanTime', '>=', Timestamp.fromDate(startOfDayTimestamp)),
        where('scanTime', '<=', Timestamp.fromDate(endOfDayTimestamp)),
        orderBy('scanTime', 'desc'),
        limit(500) // Limit to prevent performance issues
      );

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          personId: data.personId,
          personName: data.personName,
          personType: data.personType,
          scanTime: data.scanTime.toDate(),
          confidence: data.confidence,
          deviceInfo: data.deviceInfo
        };
      });

      return this.processAttendanceData(logs);
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      throw new Error('Failed to load attendance data. Please try again.');
    }
  }

  // Get attendance for a date range with optimized processing
  async getAttendanceByRange(startDate, endDate) {
    try {
      const startTimestamp = new Date(startDate);
      startTimestamp.setHours(0, 0, 0, 0);
      
      const endTimestamp = new Date(endDate);
      endTimestamp.setHours(23, 59, 59, 999);

      // Calculate days difference to prevent large queries
      const daysDiff = Math.ceil((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        throw new Error('Date range too large. Please select a range of 30 days or less.');
      }

      const q = query(
        collection(db, this.collection),
        where('scanTime', '>=', Timestamp.fromDate(startTimestamp)),
        where('scanTime', '<=', Timestamp.fromDate(endTimestamp)),
        orderBy('scanTime', 'desc'),
        limit(1000) // Limit for performance
      );

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          personId: data.personId,
          personName: data.personName,
          personType: data.personType,
          scanTime: data.scanTime.toDate(),
          confidence: data.confidence,
          deviceInfo: data.deviceInfo
        };
      });

      return this.processAttendanceDataByDate(logs);
    } catch (error) {
      console.error('Error fetching attendance by range:', error);
      throw new Error(error.message || 'Failed to load attendance data. Please try again.');
    }
  }

  // Get attendance for a specific person
  async getPersonAttendance(personId, startDate = null, endDate = null) {
    try {
      let q = query(
        collection(db, this.collection),
        where('personId', '==', personId),
        orderBy('scanTime', 'desc')
      );

      if (startDate && endDate) {
        const startTimestamp = new Date(startDate);
        startTimestamp.setHours(0, 0, 0, 0);
        
        const endTimestamp = new Date(endDate);
        endTimestamp.setHours(23, 59, 59, 999);

        q = query(
          collection(db, this.collection),
          where('personId', '==', personId),
          where('scanTime', '>=', Timestamp.fromDate(startTimestamp)),
          where('scanTime', '<=', Timestamp.fromDate(endTimestamp)),
          orderBy('scanTime', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scanTime: doc.data().scanTime.toDate()
      }));

      return this.processPersonAttendance(logs);
    } catch (error) {
      console.error('Error fetching person attendance:', error);
      throw error;
    }
  }

  // Process attendance data to group by person and calculate entry/exit times
  processAttendanceData(logs) {
    const attendanceMap = new Map();
    const allScans = [];

    logs.forEach(log => {
      const personKey = `${log.personId}-${log.personType}`;
      const scanData = {
        id: log.id,
        personId: log.personId,
        personName: log.personName,
        personType: log.personType,
        scanTime: log.scanTime,
        confidence: log.confidence,
        deviceInfo: log.deviceInfo
      };

      allScans.push(scanData);

      if (!attendanceMap.has(personKey)) {
        attendanceMap.set(personKey, {
          personId: log.personId,
          personName: log.personName,
          personType: log.personType,
          scans: [],
          firstScan: log.scanTime,
          lastScan: log.scanTime,
          totalScans: 0,
          estimatedTimeSpent: 0
        });
      }

      const personData = attendanceMap.get(personKey);
      personData.scans.push(scanData);
      personData.totalScans++;
      
      if (log.scanTime < personData.firstScan) {
        personData.firstScan = log.scanTime;
      }
      if (log.scanTime > personData.lastScan) {
        personData.lastScan = log.scanTime;
      }

      // Calculate estimated time spent (difference between first and last scan)
      personData.estimatedTimeSpent = Math.max(0, 
        (personData.lastScan.getTime() - personData.firstScan.getTime()) / (1000 * 60) // in minutes
      );
    });

    const attendanceList = Array.from(attendanceMap.values());
    
    // Sort by last scan time (most recent first)
    attendanceList.sort((a, b) => b.lastScan.getTime() - a.lastScan.getTime());

    return {
      attendance: attendanceList,
      allScans: allScans.sort((a, b) => b.scanTime.getTime() - a.scanTime.getTime()),
      summary: this.generateAttendanceSummary(attendanceList)
    };
  }

  // Process attendance data grouped by date
  processAttendanceDataByDate(logs) {
    const dateMap = new Map();

    logs.forEach(log => {
      const dateKey = log.scanTime.toDateString();
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          logs: [],
          uniqueMembers: new Set(),
          uniqueTrainers: new Set(),
          totalScans: 0
        });
      }

      const dayData = dateMap.get(dateKey);
      dayData.logs.push(log);
      dayData.totalScans++;

      if (log.personType === 'member') {
        dayData.uniqueMembers.add(log.personId);
      } else if (log.personType === 'trainer') {
        dayData.uniqueTrainers.add(log.personId);
      }
    });

    // Convert sets to counts and sort by date
    const dateAttendance = Array.from(dateMap.values()).map(day => ({
      ...day,
      uniqueMembers: day.uniqueMembers.size,
      uniqueTrainers: day.uniqueTrainers.size,
      dateObj: new Date(day.date)
    })).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    return dateAttendance;
  }

  // Process individual person attendance
  processPersonAttendance(logs) {
    if (logs.length === 0) return null;

    const dateMap = new Map();
    
    logs.forEach(log => {
      const dateKey = log.scanTime.toDateString();
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dateObj: new Date(dateKey),
          scans: [],
          firstScan: null,
          lastScan: null,
          totalScans: 0,
          estimatedTimeSpent: 0
        });
      }

      const dayData = dateMap.get(dateKey);
      dayData.scans.push(log);
      dayData.totalScans++;

      if (!dayData.firstScan || log.scanTime < dayData.firstScan) {
        dayData.firstScan = log.scanTime;
      }
      if (!dayData.lastScan || log.scanTime > dayData.lastScan) {
        dayData.lastScan = log.scanTime;
      }

      // Calculate estimated time spent for the day
      if (dayData.firstScan && dayData.lastScan) {
        dayData.estimatedTimeSpent = Math.max(0,
          (dayData.lastScan.getTime() - dayData.firstScan.getTime()) / (1000 * 60)
        );
      }
    });

    const attendance = Array.from(dateMap.values())
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    return {
      personInfo: {
        personId: logs[0].personId,
        personName: logs[0].personName,
        personType: logs[0].personType
      },
      attendance,
      totalDays: attendance.length,
      totalScans: logs.length,
      averageTimePerDay: attendance.reduce((sum, day) => sum + day.estimatedTimeSpent, 0) / attendance.length
    };
  }

  // Generate summary statistics
  generateAttendanceSummary(attendanceList) {
    const members = attendanceList.filter(person => person.personType === 'member');
    const trainers = attendanceList.filter(person => person.personType === 'trainer');

    return {
      totalPeople: attendanceList.length,
      totalMembers: members.length,
      totalTrainers: trainers.length,
      totalScans: attendanceList.reduce((sum, person) => sum + person.totalScans, 0),
      averageTimeSpent: attendanceList.length > 0 
        ? attendanceList.reduce((sum, person) => sum + person.estimatedTimeSpent, 0) / attendanceList.length 
        : 0,
      peakHours: this.calculatePeakHours(attendanceList)
    };
  }

  // Calculate peak hours
  calculatePeakHours(attendanceList) {
    const hourCounts = new Array(24).fill(0);
    
    attendanceList.forEach(person => {
      person.scans.forEach(scan => {
        const hour = scan.scanTime.getHours();
        hourCounts[hour]++;
      });
    });

    const maxCount = Math.max(...hourCounts);
    const peakHour = hourCounts.indexOf(maxCount);
    
    return {
      hour: peakHour,
      count: maxCount,
      hourRange: `${peakHour}:00 - ${peakHour + 1}:00`
    };
  }

  // Get attendance statistics for dashboard - optimized
  async getAttendanceStats(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Optimized query with limit
      const q = query(
        collection(db, this.collection),
        where('scanTime', '>=', Timestamp.fromDate(startDate)),
        where('scanTime', '<=', Timestamp.fromDate(endDate)),
        orderBy('scanTime', 'desc'),
        limit(1000) // Prevent large data fetches
      );

      const snapshot = await getDocs(q);
      
      // Optimize data processing - only extract needed fields
      const uniqueMembers = new Set();
      const uniqueTrainers = new Set();
      const dailyStats = new Map();
      let totalScans = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const scanTime = data.scanTime.toDate();
        const dateKey = scanTime.toDateString();
        totalScans++;
        
        if (data.personType === 'member') {
          uniqueMembers.add(data.personId);
        } else if (data.personType === 'trainer') {
          uniqueTrainers.add(data.personId);
        }

        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, {
            date: dateKey,
            members: new Set(),
            trainers: new Set(),
            totalScans: 0
          });
        }

        const dayData = dailyStats.get(dateKey);
        dayData.totalScans++;
        
        if (data.personType === 'member') {
          dayData.members.add(data.personId);
        } else if (data.personType === 'trainer') {
          dayData.trainers.add(data.personId);
        }
      });

      const dailyStatsArray = Array.from(dailyStats.values()).map(day => ({
        date: day.date,
        members: day.members.size,
        trainers: day.trainers.size,
        totalScans: day.totalScans,
        totalPeople: day.members.size + day.trainers.size
      }));

      const averageDailyAttendance = dailyStatsArray.length > 0 
        ? dailyStatsArray.reduce((sum, day) => sum + day.totalPeople, 0) / dailyStatsArray.length 
        : 0;

      return {
        totalUniqueMembersInPeriod: uniqueMembers.size,
        totalUniqueTrainersInPeriod: uniqueTrainers.size,
        totalScansInPeriod: totalScans,
        averageDailyAttendance,
        dailyStats: dailyStatsArray.sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      throw new Error('Failed to load attendance statistics. Please try again.');
    }
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService();


