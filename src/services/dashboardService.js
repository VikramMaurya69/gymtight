import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp,
  getCountFromServer
} from './sqlFirestoreCompat';

export class DashboardService {
  constructor() {
    this.membersCollection = 'members';
    this.trainersCollection = 'trainers';
    this.attendanceCollection = 'attendance_logs';
    this.subscriptionsCollection = 'subscriptions';
    this.paymentsCollection = 'payments';
    this.fingerprintLogsCollection = 'fingerprint_logs';
    this.userActionsCollection = 'user_actions';
  }

  // Get total member count
  async getTotalMembers() {
    try {
      const membersQuery = query(
        collection(db, this.membersCollection)
      );
      const snapshot = await getDocs(membersQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting total members:', error);
      return 0;
    }
  }

  // Get member growth compared to last month
  async getMemberGrowth() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all members and filter by date in JavaScript
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      
      let currentCount = 0;
      let lastCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        
        if (createdAt >= thisMonth) {
          currentCount++;
        } else if (createdAt >= lastMonth && createdAt < thisMonth) {
          lastCount++;
        }
      });

      const growth = lastCount > 0 ? ((currentCount - lastCount) / lastCount * 100) : 0;
      return {
        current: currentCount,
        previous: lastCount,
        percentage: growth.toFixed(1),
        trend: growth >= 0 ? 'up' : 'down'
      };
    } catch (error) {
      console.error('Error calculating member growth:', error);
      return { current: 0, previous: 0, percentage: '0.0', trend: 'neutral' };
    }
  }

  // Get expiring memberships (next 30 days)
  async getExpiringMemberships() {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      const expiringMembers = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Check for expireOn or expiryDate fields
        const expiryDate = data.expireOn?.toDate ? data.expireOn.toDate() : 
                          data.expiryDate?.toDate ? data.expiryDate.toDate() :
                          data.expireOn ? new Date(data.expireOn) :
                          data.expiryDate ? new Date(data.expiryDate) : null;
        
        if (expiryDate && expiryDate <= thirtyDaysFromNow && expiryDate >= now) {
          expiringMembers.push({
            id: doc.id,
            name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email,
            membershipEndDate: expiryDate,
            membershipType: data.membershipType || data.selectedPackage
          });
        }
      });

      return {
        count: expiringMembers.length,
        members: expiringMembers
      };
    } catch (error) {
      console.error('Error getting expiring memberships:', error);
      return { count: 0, members: [] };
    }
  }

  // Get active trainers count
  async getActiveTrainers() {
    try {
      const trainersQuery = query(
        collection(db, this.trainersCollection),
        where('status', '==', 'active')
      );
      const snapshot = await getCountFromServer(trainersQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting active trainers:', error);
      return 0;
    }
  }

  // Get trainer growth
  async getTrainerGrowth() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const recentQuery = query(
        collection(db, this.trainersCollection),
        where('status', '==', 'active'),
        where('createdAt', '>=', Timestamp.fromDate(lastMonth))
      );
      
      const snapshot = await getDocs(recentQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting trainer growth:', error);
      return 0;
    }
  }

  // Get today's attendance count
  async getTodayAttendance() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000));

      const attendanceQuery = query(
        collection(db, this.attendanceCollection),
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<', Timestamp.fromDate(endOfDay))
      );
      
      const snapshot = await getCountFromServer(attendanceQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting today attendance:', error);
      return 0;
    }
  }

  // Get active members count (status = Active)
  async getActiveMembersCount() {
    try {
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      let activeCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.selectStatus === 'Active' || data.status === 'Active') {
          activeCount++;
        }
      });
      
      return activeCount;
    } catch (error) {
      console.error('Error getting active members count:', error);
      return 0;
    }
  }

  // Get total balance pending from all members
  async getTotalBalance() {
    try {
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      let totalBalance = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const balance = parseFloat(data.balance) || 0;
        if (balance > 0) {
          totalBalance += balance;
        }
      });
      
      return totalBalance;
    } catch (error) {
      console.error('Error getting total balance:', error);
      return 0;
    }
  }

  // Get today's collection (payments received today)
  async getTodayCollection() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      let todayCollection = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() :
                         data.memberJoiningFrom?.toDate ? data.memberJoiningFrom.toDate() :
                         data.createdAt ? new Date(data.createdAt) :
                         data.memberJoiningFrom ? new Date(data.memberJoiningFrom) : null;
        
        if (createdAt && createdAt >= startOfDay) {
          // Add payment received for members joined today
          todayCollection += parseFloat(data.paymentReceived) || 0;
        }
      });
      
      return todayCollection;
    } catch (error) {
      console.error('Error getting today collection:', error);
      return 0;
    }
  }

  // Get attendance for the last 6 months for chart
  async getAttendanceChart() {
    try {
      const months = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const attendanceQuery = query(
          collection(db, this.attendanceCollection),
          where('timestamp', '>=', Timestamp.fromDate(month)),
          where('timestamp', '<', Timestamp.fromDate(nextMonth))
        );
        
        const snapshot = await getCountFromServer(attendanceQuery);
        
        months.push({
          month: month.toLocaleDateString('en-US', { month: 'short' }),
          value: snapshot.data().count,
          fullDate: month
        });
      }
      
      return months;
    } catch (error) {
      console.error('Error getting attendance chart data:', error);
      return [];
    }
  }

  // Get monthly revenue (if payments collection exists)
  async getMonthlyRevenue() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Try to get from payments collection first
      try {
        const paymentsQuery = query(collection(db, this.paymentsCollection));
        const snapshot = await getDocs(paymentsQuery);
        let totalRevenue = 0;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const paymentDate = data.createdAt?.toDate ? data.createdAt.toDate() :
                             data.paymentDate?.toDate ? data.paymentDate.toDate() :
                             data.createdAt ? new Date(data.createdAt) :
                             data.paymentDate ? new Date(data.paymentDate) : null;
          
          if (paymentDate && paymentDate >= startOfMonth) {
            totalRevenue += parseFloat(data.amount) || 0;
          }
        });
        
        if (totalRevenue > 0) return totalRevenue;
      } catch (paymentsError) {
        console.log('Payments collection not available, calculating from members...');
      }
      
      // Fallback: calculate from member payments
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      let totalRevenue = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const joinDate = data.memberJoiningFrom?.toDate ? data.memberJoiningFrom.toDate() :
                        data.createdAt?.toDate ? data.createdAt.toDate() :
                        data.memberJoiningFrom ? new Date(data.memberJoiningFrom) :
                        data.createdAt ? new Date(data.createdAt) : null;
        
        if (joinDate && joinDate >= startOfMonth) {
          totalRevenue += parseFloat(data.paymentReceived) || parseFloat(data.amountToBePaid) || 0;
        }
      });
      
      return totalRevenue;
    } catch (error) {
      console.error('Error getting monthly revenue:', error);
      return 0;
    }
  }

  // Get recent activities
  async getRecentActivities(limitCount = 10) {
    try {
      const activities = [];
      
      // Get recent member registrations
      const membersQuery = query(
        collection(db, this.membersCollection),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const membersSnapshot = await getDocs(membersQuery);
      
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'member_registered',
          icon: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥',
          text: `New member ${data.name} registered`,
          time: data.createdAt?.toDate() || new Date(),
          id: doc.id
        });
      });

      // Get recent attendance logs
      const attendanceQuery = query(
        collection(db, this.attendanceCollection),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'attendance',
          icon: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â',
          text: `${data.personName || 'Member'} checked in`,
          time: data.timestamp?.toDate() || new Date(),
          id: doc.id
        });
      });

      // Sort all activities by time and limit
      activities.sort((a, b) => b.time - a.time);
      return activities.slice(0, limitCount);
      
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  // Get comprehensive dashboard data (Fitomatic Style)
  async getDashboardData() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ Loading dashboard data...');
      
      // Helper to safely call methods and return default on error
      const safeCall = async (fn, defaultValue = 0) => {
        try {
          return await fn();
        } catch (error) {
          console.warn(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Error in dashboard call:`, error.message);
          return defaultValue;
        }
      };
      
      const [
        totalMembers,
        memberGrowth,
        expiringMemberships,
        activeTrainers,
        trainerGrowth,
        todayAttendance,
        attendanceChart,
        monthlyRevenue,
        recentActivities,
        yearlyRevenue,
        subscriptions,
        payments,
        enquiries,
        followups,
        staffAttendance,
        todaysBirthdays,
        upcomingBirthdays
      ] = await Promise.all([
        safeCall(() => this.getTotalMembers(), 0),
        safeCall(() => this.getMemberGrowth(), { current: 0, percentage: 0, trend: 'neutral' }),
        safeCall(() => this.getExpiringMemberships(), { count: 0, members: [] }),
        safeCall(() => this.getActiveTrainers(), 0),
        safeCall(() => this.getTrainerGrowth(), 0),
        safeCall(() => this.getTodayAttendance(), 0),
        safeCall(() => this.getAttendanceChart(), []),
        safeCall(() => this.getMonthlyRevenue(), 0),
        safeCall(() => this.getRecentActivities(), []),
        safeCall(() => this.getYearlyRevenue(), 0),
        safeCall(() => this.getSubscriptionsData(), {}),
        safeCall(() => this.getPaymentsBreakdown(), {}),
        safeCall(() => this.getEnquiriesData(), { thisMonth: 0 }),
        safeCall(() => this.getFollowupData(), {}),
        safeCall(() => this.getStaffAttendance(), 0),
        safeCall(() => this.getTodaysBirthdays(), []),
        safeCall(() => this.getUpcomingBirthdays(), [])
      ]);

      const dashboardData = {
        // Fitomatic-style main metrics
        yearlyEarnings: yearlyRevenue || (monthlyRevenue * 12) || 0,
        monthlyEarnings: monthlyRevenue || 0,
        totalBalance: await safeCall(() => this.getTotalBalance(), 0), // Actual balance from members
        
        // Member metrics
        totalMembers,
        activeMembers: await safeCall(() => this.getActiveMembersCount(), 0), // Actual active members
        newMembersMonth: memberGrowth.current || 0,
        
        // Operational metrics
        subscriptionsMonth: memberGrowth.current || 0, // Same as new members this month
        enquiriesMonth: enquiries?.thisMonth || 0,
        
        // Today's collection
        todayCollection: await safeCall(() => this.getTodayCollection(), 0), // Actual today's collection
        expectedCollection: 25000,
        
        // Payment breakdown
        payments: {
          cash: payments?.cash || 0,
          card: payments?.card || 0,
          gpay: payments?.gpay || 0,
          phonepay: payments?.phonepay || 0,
          bharatpay: payments?.bharatpay || 0,
          paytm: payments?.paytm || 0,
          razorpay: payments?.razorpay || 0,
          neft: payments?.neft || 0
        },
        
        // Follow up data
        followups: {
          enquiry: followups?.enquiry || 0,
          balance: followups?.balance || 0,
          expiring: followups?.expiring || expiringMemberships.count || 0,
          subscription: followups?.subscription || 0,
          locker: followups?.locker || 0
        },
        
        // Attendance
        staffAttendance: staffAttendance || 0,
        memberAttendance: todayAttendance || 0,
        
        // Birthdays
        todaysBirthdays: todaysBirthdays || [],
        upcomingBirthdays: upcomingBirthdays || [],
        
        // Legacy support for existing components
        memberGrowth: {
          current: memberGrowth.current,
          text: `${memberGrowth.percentage >= 0 ? '+' : ''}${memberGrowth.percentage}% from last month`,
          trend: memberGrowth.trend
        },
        expiringMemberships: {
          count: expiringMemberships.count,
          text: 'in the next 30 days',
          members: expiringMemberships.members
        },
        activeTrainers,
        trainerGrowth: {
          count: trainerGrowth,
          text: trainerGrowth > 0 ? `+${trainerGrowth} since last month` : 'No new trainers this month'
        },
        todayAttendance,
        monthlyRevenue,
        attendanceChart,
        recentActivities,
        lastUpdated: new Date()
      };

      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Dashboard data loaded successfully');
      return { success: true, data: dashboardData };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error loading dashboard data:', error);
      return { 
        success: false, 
        error: error.message,
        data: this.getFallbackData()
      };
    }
  }

  // Fallback data when Firebase calls fail - returns empty/zero data
  getFallbackData() {
    return {
      totalMembers: 0,
      memberGrowth: { current: 0, text: 'No data available', trend: 'neutral' },
      expiringMemberships: { count: 0, text: 'in the next 30 days', members: [] },
      activeTrainers: 0,
      trainerGrowth: { count: 0, text: 'No data available' },
      todayAttendance: 0,
      monthlyRevenue: 0,
      attendanceChart: [],
      recentActivities: [],
      lastUpdated: new Date()
    };
  }

  // Get quick stats for header
  async getQuickStats() {
    try {
      const [todayAttendance, totalMembers] = await Promise.all([
        this.getTodayAttendance(),
        this.getTotalMembers()
      ]);

      return {
        todayVisits: todayAttendance,
        totalMembers,
        growth: '+5.2%' // Calculate this based on week-over-week data
      };
    } catch (error) {
      console.error('Error getting quick stats:', error);
      return {
        todayVisits: 0,
        totalMembers: 0,
        growth: '0%'
      };
    }
  }

  // Get yearly revenue
  async getYearlyRevenue() {
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear + 1, 0, 1); // Start of next year

      // Get all payments from the collection
      const paymentsQuery = query(collection(db, this.paymentsCollection));
      const snapshot = await getDocs(paymentsQuery);
      let total = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Check both createdAt and paymentDate fields
        const paymentDate = data.createdAt?.toDate ? data.createdAt.toDate() :
                           data.paymentDate?.toDate ? data.paymentDate.toDate() :
                           data.createdAt ? new Date(data.createdAt) :
                           data.paymentDate ? new Date(data.paymentDate) : null;
        
        if (paymentDate && paymentDate >= startOfYear && paymentDate < endOfYear) {
          total += parseFloat(data.amount) || 0;
        }
      });

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â  Yearly revenue for ${currentYear}:`, total);
      return total;
    } catch (error) {
      console.error('Error getting yearly revenue:', error);
      return 0;
    }
  }

  // Get subscriptions data
  async getSubscriptionsData() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const subscriptionsQuery = query(
        collection(db, this.subscriptionsCollection),
        where('startDate', '>=', Timestamp.fromDate(startOfMonth))
      );

      const snapshot = await getDocs(subscriptionsQuery);
      
      return {
        thisMonth: snapshot.size,
        total: await this.getTotalSubscriptions()
      };
    } catch (error) {
      console.error('Error getting subscriptions data:', error);
      return { thisMonth: 0, total: 0 };
    }
  }

  // Get total subscriptions count
  async getTotalSubscriptions() {
    try {
      const subscriptionsQuery = query(collection(db, this.subscriptionsCollection));
      const snapshot = await getCountFromServer(subscriptionsQuery);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting total subscriptions:', error);
      return 0;
    }
  }

  // Get payments breakdown
  async getPaymentsBreakdown() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      // Try to get from payments collection first
      try {
        const paymentsQuery = query(collection(db, this.paymentsCollection));
        const snapshot = await getDocs(paymentsQuery);
        
        if (snapshot.size > 0) {
          const breakdown = {
            today: 0,
            cash: 0,
            card: 0,
            gpay: 0,
            phonepay: 0,
            bharatpay: 0,
            paytm: 0,
            razorpay: 0,
            neft: 0
          };

          snapshot.forEach(doc => {
            const data = doc.data();
            const paymentDate = data.createdAt?.toDate ? data.createdAt.toDate() :
                               data.paymentDate?.toDate ? data.paymentDate.toDate() :
                               data.createdAt ? new Date(data.createdAt) :
                               data.paymentDate ? new Date(data.paymentDate) : null;
            
            if (paymentDate && paymentDate >= startOfDay && paymentDate < endOfDay) {
              const amount = parseFloat(data.amount) || 0;
              const method = (data.paymentMethod || 'cash').toLowerCase();
              
              breakdown.today += amount;
              
              if (breakdown[method] !== undefined) {
                breakdown[method] += amount;
              } else {
                breakdown.cash += amount;
              }
            }
          });

          return breakdown;
        }
      } catch (paymentsError) {
        console.log('Payments collection not available, calculating from members...');
      }

      // Fallback: Calculate from members collection
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      
      const breakdown = {
        today: 0,
        cash: 0,
        card: 0,
        gpay: 0,
        phonepay: 0,
        bharatpay: 0,
        paytm: 0,
        razorpay: 0,
        neft: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        // Check if member was added/joined today
        const joinDate = data.memberJoiningFrom?.toDate ? data.memberJoiningFrom.toDate() :
                        data.createdAt?.toDate ? data.createdAt.toDate() :
                        data.memberJoiningFrom ? new Date(data.memberJoiningFrom) :
                        data.createdAt ? new Date(data.createdAt) : null;
        
        if (joinDate && joinDate >= startOfDay && joinDate < endOfDay) {
          const amount = parseFloat(data.paymentReceived) || 0;
          const method = (data.selectPaymentMode || 'Cash').toLowerCase();
          
          breakdown.today += amount;
          
          // Map payment method to breakdown keys
          if (method === 'cash') {
            breakdown.cash += amount;
          } else if (method === 'card') {
            breakdown.card += amount;
          } else if (method === 'upi') {
            breakdown.gpay += amount; // Default UPI to gpay
          } else if (method === 'net banking') {
            breakdown.neft += amount;
          } else {
            breakdown.cash += amount; // Default to cash
          }
        }
      });

      return breakdown;
    } catch (error) {
      console.error('Error getting payments breakdown:', error);
      return {
        today: 0, cash: 0, card: 0, gpay: 0, phonepay: 0, 
        bharatpay: 0, paytm: 0, razorpay: 0, neft: 0
      };
    }
  }

  // Get enquiries data
  async getEnquiriesData() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const enquiriesQuery = query(
        collection(db, 'enquiries'),
        where('enquiryDate', '>=', Timestamp.fromDate(startOfMonth))
      );

      const snapshot = await getDocs(enquiriesQuery);
      
      return {
        thisMonth: snapshot.size
      };
    } catch (error) {
      console.error('Error getting enquiries data:', error);
      return { thisMonth: 0 };
    }
  }

  // Get follow up data
  async getFollowupData() {
    try {
      const followupsQuery = query(collection(db, 'followups'));
      const snapshot = await getDocs(followupsQuery);
      
      const followups = {
        enquiry: 0,
        balance: 0,
        expiring: 0,
        subscription: 0,
        locker: 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type?.toLowerCase() || 'enquiry';
        
        if (followups[type] !== undefined) {
          followups[type]++;
        }
      });

      return followups;
    } catch (error) {
      console.error('Error getting followup data:', error);
      return {
        enquiry: 0, balance: 0, expiring: 0, subscription: 0, locker: 0
      };
    }
  }

  // Get staff attendance
  async getStaffAttendance() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const staffAttendanceQuery = query(
        collection(db, 'staff_attendance'),
        where('date', '>=', Timestamp.fromDate(startOfDay))
      );

      const snapshot = await getDocs(staffAttendanceQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting staff attendance:', error);
      return 0;
    }
  }

  // Get today's birthdays
  async getTodaysBirthdays() {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1; // 1-12
      const todayDate = today.getDate();

      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ Checking birthdays: ${snapshot.size} total members`);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Today's date: ${todayMonth}/${todayDate}`);
      
      const birthdays = [];
      let membersWithDOB = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        let dob = null;
        
        // Handle different date formats and field names
        const dobField = data.dateOfBirth || data.dob || data.birthDate || data.birthday;
        
        if (dobField) {
          membersWithDOB++;
          if (dobField.toDate) {
            dob = dobField.toDate();
          } else if (typeof dobField === 'string') {
            dob = new Date(dobField);
          } else if (dobField instanceof Date) {
            dob = dobField;
          }
        }
        
        if (dob && !isNaN(dob.getTime())) {
          const birthMonth = dob.getMonth() + 1;
          const birthDate = dob.getDate();
          
          if (birthMonth === todayMonth && birthDate === todayDate) {
            const age = today.getFullYear() - dob.getFullYear();
            birthdays.push({
              id: doc.id,
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              contact: data.contact || data.phone,
              age: age,
              dateOfBirth: dob
            });
          }
        }
      });

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Found ${membersWithDOB} members with DOB, ${birthdays.length} birthdays today`);
      return birthdays;
    } catch (error) {
      console.error('Error getting today\'s birthdays:', error);
      return [];
    }
  }

  // Get upcoming birthdays (next 7 days)
  async getUpcomingBirthdays() {
    try {
      const today = new Date();
      const membersQuery = query(collection(db, this.membersCollection));
      const snapshot = await getDocs(membersQuery);
      
      const upcomingBirthdays = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        let dob = null;
        
        // Handle different date formats and field names
        const dobField = data.dateOfBirth || data.dob || data.birthDate || data.birthday;
        
        if (dobField) {
          if (dobField.toDate) {
            dob = dobField.toDate();
          } else if (typeof dobField === 'string') {
            dob = new Date(dobField);
          } else if (dobField instanceof Date) {
            dob = dobField;
          }
        }
        
        if (dob && !isNaN(dob.getTime())) {
          // Calculate next birthday
          const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
          }
          
          const daysUntilBirthday = Math.floor((nextBirthday - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilBirthday > 0 && daysUntilBirthday <= 7) {
            const age = today.getFullYear() - dob.getFullYear();
            upcomingBirthdays.push({
              id: doc.id,
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              contact: data.contact || data.phone,
              age: age,
              dateOfBirth: dob,
              daysUntil: daysUntilBirthday
            });
          }
        }
      });

      // Sort by days until birthday
      upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â  Found ${upcomingBirthdays.length} upcoming birthdays in next 7 days`);
      return upcomingBirthdays;
    } catch (error) {
      console.error('Error getting upcoming birthdays:', error);
      return [];
    }
  }

  // Get Fitomatic-style fallback data
  getFitomaticFallbackData() {
    return {
      // Main earnings
      yearlyEarnings: 0,
      monthlyEarnings: 0,
      totalBalance: 0,
      
      // Members
      totalMembers: 0,
      activeMembers: 0,
      newMembersMonth: 0,
      
      // Operations
      subscriptionsMonth: 0,
      enquiriesMonth: 0,
      
      // Today's collection
      todayCollection: 0,
      expectedCollection: 0,
      
      // Payments
      payments: {
        cash: 0, card: 0, gpay: 0, phonepay: 0,
        bharatpay: 0, paytm: 0, razorpay: 0, neft: 0
      },
      
      // Follow ups
      followups: {
        enquiry: 0, balance: 0, expiring: 0, subscription: 0, locker: 0
      },
      
      // Attendance
      staffAttendance: 0,
      memberAttendance: 0,
      
      // Legacy support
      memberGrowth: { current: 0, text: 'No data available', trend: 'neutral' },
      expiringMemberships: { count: 0, text: 'in the next 30 days', members: [] },
      activeTrainers: 0,
      todayAttendance: 0,
      monthlyRevenue: 0,
      attendanceChart: [],
      recentActivities: [],
      lastUpdated: new Date()
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();


