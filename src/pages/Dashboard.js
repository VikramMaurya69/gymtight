import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  CreditCard,
  UserCheck,
  TrendingUp,
  Calendar,
  RefreshCw,
  Bell,
  BarChart3,
  Smartphone,
  Wallet,
  AlertCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  Activity,
  ChevronRight,
  Phone,
  Shield,
  Banknote,
  Cake,
  Gift
} from 'lucide-react';
import { useRBAC } from '../contexts/RBACContext';
import { dashboardService } from '../services/dashboardService';
import { db } from '../services/firebase';
import { collection, getDocs } from '../services/sqlFirestoreCompat';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, loading }) => (
  <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6 flex items-start justify-between transition-all hover:shadow-md">
    <div>
      <p className="text-sm font-medium text-[var(--muted-foreground)] mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-[var(--card-foreground)] tracking-tight">
        {loading ? <div className="h-8 w-24 bg-[var(--muted)] animate-pulse rounded"></div> : value}
      </h3>
      {subtext && <p className={`text-xs mt-2 font-medium ${colorClass.text}`}>{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl ${colorClass.bg} ${colorClass.text}`}>
      <Icon size={20} />
    </div>
  </div>
);

const OperationalCard = ({ title, value, subtext, icon: Icon, colorClass, loading }) => (
  <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-5 flex items-center gap-4 transition-all hover:shadow-md">
    <div className={`p-3 rounded-lg ${colorClass.bg} ${colorClass.text}`}>
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-xl font-bold text-[var(--card-foreground)]">
        {loading ? <div className="h-6 w-16 bg-[var(--muted)] animate-pulse rounded"></div> : value}
      </h3>
      <p className="text-sm text-[var(--muted-foreground)]">{subtext}</p>
    </div>
  </div>
);

const PaymentMethodItem = ({ type, amount, icon: Icon, colorClass, loading }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/40 transition-all">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass.bg} ${colorClass.text}`}>
        <Icon size={16} />
      </div>
      <span className="text-sm font-medium text-[var(--muted-foreground)]">{type}</span>
    </div>
    <span className="font-semibold text-[var(--card-foreground)]">
      {loading ? '...' : `INR ${amount}`}
    </span>
  </div>
);

const Dashboard = ({ user }) => {
  const { isOwner, isManager } = useRBAC();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [membershipAlerts, setMembershipAlerts] = useState({
    expiring: 0,
    expired: 0,
    balancePending: 0
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardService.getDashboardData();
      if (result.success) {
        setDashboardData(result.data);
        setLastRefresh(new Date());
      } else {
        setError(result.error);
        setDashboardData(result.data);
      }
      await loadMembershipAlerts();
    } catch (err) {
      setError(err.message);
      setDashboardData(dashboardService.getFallbackData());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMembershipAlerts = async () => {
    try {
      const membersRef = collection(db, 'members');
      const snapshot = await getDocs(membersRef);
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      let expiring = 0;
      let expired = 0;
      let balancePending = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        const expiryDate = data.expireOn?.toDate ? data.expireOn.toDate() :
          data.expiryDate?.toDate ? data.expiryDate.toDate() :
            data.expireOn ? new Date(data.expireOn) :
              data.expiryDate ? new Date(data.expiryDate) : null;
        const balance = parseFloat(data.balance) || 0;

        if (expiryDate) {
          if (expiryDate < now) expired++;
          else if (expiryDate <= thirtyDaysLater) expiring++;
        }
        if (balance > 0) balancePending++;
      });
      setMembershipAlerts({ expiring, expired, balancePending });
    } catch (error) { }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => loadDashboardData(), 30 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) loadDashboardData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadDashboardData]);

  if (loading && !dashboardData) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4 text-sm font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[var(--foreground)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] rounded-lg hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all text-sm font-medium shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Main Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Earnings"
          value={`INR ${dashboardData?.yearlyEarnings?.toLocaleString() || '0'}`}
          subtext="+12% from last year"
          icon={DollarSign}
          colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          loading={loading}
        />
        <StatCard
          title="Monthly Income"
          value={`INR ${dashboardData?.monthlyEarnings?.toLocaleString() || '0'}`}
          subtext="Current calendar month"
          icon={TrendingUp}
          colorClass={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
          loading={loading}
        />
        <StatCard
          title="Outstanding Balance"
          value={`INR ${dashboardData?.totalBalance?.toLocaleString() || '0'}`}
          subtext="Total pending payments"
          icon={Wallet}
          colorClass={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
          loading={loading}
        />
        <StatCard
          title="Monthly Expenses"
          value="INR 0"
          subtext="Recorded expenses"
          icon={BarChart3}
          colorClass={{ bg: 'bg-rose-50', text: 'text-rose-600' }}
          loading={loading}
        />
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OperationalCard
          title="Total Members"
          value={`${dashboardData?.activeMembers || 0} / ${dashboardData?.totalMembers || 0}`}
          subtext="Active / Total Registered"
          icon={Users}
          colorClass={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          loading={loading}
        />
        <OperationalCard
          title="New Members"
          value={dashboardData?.newMembersMonth || 0}
          subtext="Joined this month"
          icon={UserCheck}
          colorClass={{ bg: 'bg-cyan-50', text: 'text-cyan-600' }}
          loading={loading}
        />
        <OperationalCard
          title="Subscriptions"
          value={dashboardData?.subscriptionsMonth || 0}
          subtext="Renewals & New Plans"
          icon={Calendar}
          colorClass={{ bg: 'bg-violet-50', text: 'text-violet-600' }}
          loading={loading}
        />
        <OperationalCard
          title="Enquiries"
          value={dashboardData?.enquiriesMonth || 0}
          subtext="Leads this month"
          icon={Bell}
          colorClass={{ bg: 'bg-orange-50', text: 'text-orange-600' }}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Followups */}
        <div className="space-y-6 lg:col-span-2">
          {/* Birthdays Section - Always Show */}
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--card-foreground)] flex items-center gap-2">
                <Cake size={20} className="text-pink-600" />
                Birthdays
              </h3>
            </div>

              {/* Today's Birthdays */}
              {dashboardData?.todaysBirthdays?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-pink-700 mb-2 flex items-center gap-1">
                    <Gift size={16} />
                    Today ({dashboardData.todaysBirthdays.length})
                  </h4>
                  <div className="space-y-2">
                    {dashboardData.todaysBirthdays.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border)] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                            {member.name?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--card-foreground)]">{member.name}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">{member.contact}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-pink-600">Turning {member.age}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">Today</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Birthdays */}
              {dashboardData?.upcomingBirthdays?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-purple-700 mb-2">
                    Upcoming (Next 7 days)
                  </h4>
                  <div className="space-y-2">
                    {dashboardData.upcomingBirthdays.slice(0, 5).map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-[var(--background)]/80 rounded-lg border border-[var(--border)] text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white text-xs font-bold">
                            {member.name?.charAt(0) || 'M'}
                          </div>
                          <span className="font-medium text-[var(--card-foreground)]">{member.name}</span>
                        </div>
                        <span className="text-xs text-purple-600 font-medium">
                          in {member.daysUntil} day{member.daysUntil !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Birthdays Message */}
              {(!dashboardData?.todaysBirthdays || dashboardData.todaysBirthdays.length === 0) && 
               (!dashboardData?.upcomingBirthdays || dashboardData.upcomingBirthdays.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mx-auto mb-3">
                    <Cake size={32} className="text-pink-400" />
                  </div>
                  <p className="text-[var(--muted-foreground)] text-sm">No birthdays in the next 7 days</p>
                  <p className="text-[var(--muted-foreground)]/80 text-xs mt-1">Make sure member birthdays are added in the Members section</p>
                </div>
              )}
          </div>

          {/* Membership Alerts */}
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--card-foreground)] flex items-center gap-2">
                <AlertCircle size={20} className="text-primary" />
                Attention Required
              </h3>
              <button
                onClick={() => navigate('/membership-alerts')}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => navigate('/membership-alerts', { state: { activeTab: 'expiring' } })}
                className="group cursor-pointer p-4 rounded-xl border border-yellow-100 bg-yellow-50/50 hover:bg-yellow-50 hover:border-yellow-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg group-hover:bg-yellow-200 transition-colors">
                    <Clock size={18} />
                  </div>
                  <span className="font-semibold text-gray-900">Expiring Soon</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 ml-1">{loading ? '...' : membershipAlerts.expiring}</div>
                <div className="text-xs text-gray-500 ml-1 mt-1">Next 30 days</div>
              </div>

              <div
                onClick={() => navigate('/membership-alerts', { state: { activeTab: 'expired' } })}
                className="group cursor-pointer p-4 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 hover:border-red-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200 transition-colors">
                    <XCircle size={18} />
                  </div>
                  <span className="font-semibold text-gray-900">Expired</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 ml-1">{loading ? '...' : membershipAlerts.expired}</div>
                <div className="text-xs text-gray-500 ml-1 mt-1">Needs renewal</div>
              </div>

              <div
                onClick={() => navigate('/membership-alerts', { state: { activeTab: 'balance' } })}
                className="group cursor-pointer p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Wallet size={18} />
                  </div>
                  <span className="font-semibold text-gray-900">Pending Dues</span>
                </div>
                <div className="text-2xl font-bold text-gray-800 ml-1">{loading ? '...' : membershipAlerts.balancePending}</div>
                <div className="text-xs text-gray-500 ml-1 mt-1">Collect payments</div>
              </div>
            </div>
          </div>

          {/* Follow Ups */}
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h3 className="text-lg font-bold text-[var(--card-foreground)] mb-4">Today's Tasks & Follow-ups</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Enquiry Follow Up', value: dashboardData?.followups?.enquiry, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Balance Payment', value: dashboardData?.followups?.balance, icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Subscription Expiring', value: dashboardData?.followups?.expiring, icon: Clock, color: 'text-amber-600 bg-amber-50' },
                { label: 'Subscription Follow Up', value: dashboardData?.followups?.subscription, icon: Phone, color: 'text-blue-600 bg-blue-50' },
                { label: 'Locker Expiry', value: dashboardData?.followups?.locker, icon: Shield, color: 'text-gray-600 bg-gray-100' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--accent)]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <item.icon size={16} />
                    </div>
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">{item.label}</span>
                  </div>
                  <span className="font-bold text-[var(--card-foreground)]">{loading ? '...' : (item.value || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Collections & Payments */}
        <div className="space-y-6">
          {/* Daily Collection */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-indigo-200 text-sm font-medium mb-1">Today's Collection</p>
                  <h2 className="text-3xl font-bold">INR {loading ? '...' : (dashboardData?.todayCollection || '0')}</h2>
                </div>
                <div className="p-2 bg-white/10 rounded-lg">
                  <Activity size={24} className="text-indigo-300" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-indigo-200 bg-white/5 p-2 rounded-lg backdrop-blur-sm">
                <ArrowUpRight size={16} />
                <span>Expected: INR {loading ? '...' : (dashboardData?.expectedCollection || '0')}</span>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-indigo-500/20 blur-xl"></div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h3 className="text-lg font-bold text-[var(--card-foreground)] mb-4">Payment Methods</h3>
            <div className="space-y-3">
              <PaymentMethodItem type="Cash" amount={dashboardData?.payments?.cash} icon={Banknote} colorClass={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} loading={loading} />
              <PaymentMethodItem type="Card" amount={dashboardData?.payments?.card} icon={CreditCard} colorClass={{ bg: 'bg-blue-50', text: 'text-blue-600' }} loading={loading} />
              <PaymentMethodItem type="UPI (GPay/PhonePe)" amount={(parseInt(dashboardData?.payments?.gpay || 0) + parseInt(dashboardData?.payments?.phonepay || 0) + parseInt(dashboardData?.payments?.bharatpay || 0) + parseInt(dashboardData?.payments?.paytm || 0))} icon={Smartphone} colorClass={{ bg: 'bg-violet-50', text: 'text-violet-600' }} loading={loading} />
              <PaymentMethodItem type="Cheque/NEFT" amount={dashboardData?.payments?.neft} icon={DollarSign} colorClass={{ bg: 'bg-gray-100', text: 'text-gray-600' }} loading={loading} />
            </div>
          </div>

          {/* Attendance Quick View */}
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <h3 className="text-lg font-bold text-[var(--card-foreground)] mb-4">Attendance Today</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 p-3 bg-[var(--background)] rounded-lg text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--card-foreground)]">{loading ? '-' : (dashboardData?.staffAttendance || 0)}</div>
                <div className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mt-1">Staff</div>
              </div>
              <div className="flex-1 p-3 bg-[var(--background)] rounded-lg text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--card-foreground)]">{loading ? '-' : (dashboardData?.memberAttendance || 0)}</div>
                <div className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wide mt-1">Members</div>
              </div>
            </div>
            <button className="w-full py-2 text-sm text-[var(--primary)] font-medium border border-[var(--ring)]/30 rounded-lg hover:bg-[var(--accent)] transition-colors">
              View detailed logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


