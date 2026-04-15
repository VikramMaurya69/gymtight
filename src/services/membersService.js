import { db } from './firebase';
import { smsService } from './smsService';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  writeBatch
} from './sqlFirestoreCompat';

// Members Service Class
export class MembersService {
  constructor() {
    this.collectionName = 'members';
  }

    // Get all members for a branch
  async getAllMembers(branchId = null) {
    try {
      let membersQuery;
      
      if (branchId) {
        // Simple query by branchId only - no orderBy to avoid composite index requirement
        membersQuery = query(
          collection(db, this.collectionName),
          where('branchId', '==', branchId)
        );
      } else {
        // Query all members with orderBy
        membersQuery = query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(membersQuery);
      const members = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          ...data,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate,
          lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        });
      });

      // Sort by createdAt descending in JavaScript when filtering by branch
      if (branchId) {
        members.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      return { success: true, data: members };
    } catch (error) {
      console.error('Error fetching members:', error);
      return { success: false, error: error.message };
    }
  }

  // Get member by ID
  async getMemberById(memberId) {
    try {
      const memberDoc = await getDoc(doc(db, this.collectionName, memberId));
      
      if (!memberDoc.exists()) {
        return { success: false, error: 'Member not found' };
      }
      
      const data = memberDoc.data();
      const member = {
        id: memberDoc.id,
        ...data,
        joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
        expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate,
        lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      };
      
      return { success: true, data: member };
    } catch (error) {
      console.error('Error fetching member:', error);
      return { success: false, error: error.message };
    }
  }

  // Get member by flexible identifier: Firestore doc id, legacy memberId, or phone
  async getMemberByIdentifier(identifier) {
    try {
      if (!identifier) {
        return { success: false, error: 'Identifier is required' };
      }

      // Try direct doc id first
      const docSnap = await getDoc(doc(db, this.collectionName, identifier));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...data,
            joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
            expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate,
            lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
          }
        };
      }

      // Otherwise try querying by legacy fields (memberId or phone/contact)
      const q1 = query(
        collection(db, this.collectionName),
        where('memberId', '==', identifier)
      );
      let snap = await getDocs(q1);
      if (snap.empty) {
        const q2 = query(
          collection(db, this.collectionName),
          where('phone', '==', identifier)
        );
        snap = await getDocs(q2);
      }
      if (snap.empty) {
        return { success: false, error: 'Member not found' };
      }
      const first = snap.docs[0];
      const data = first.data();
      return {
        success: true,
        data: {
          id: first.id,
          ...data,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate,
          lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        }
      };
    } catch (error) {
      console.error('Error fetching member by identifier:', error);
      return { success: false, error: error.message };
    }
  }

  // Find a member by phone within a branch
  async findMemberByPhoneInBranch(branchId, phone) {
    try {
      if (!branchId || !phone) return { success: false, error: 'branchId and phone are required' };
      const q = query(
        collection(db, this.collectionName),
        where('branchId', '==', branchId),
        where('phone', '==', phone)
      );
      const snap = await getDocs(q);
      if (snap.empty) return { success: false, error: 'Not found' };
      const docRef = snap.docs[0];
      return { success: true, data: { id: docRef.id, ...docRef.data() } };
    } catch (error) {
      console.error('Error finding member by phone in branch:', error);
      return { success: false, error: error.message };
    }
  }

  // Add new member
  async addMember(memberData) {
    try {
      // Validate required fields
      const requiredFields = ['name', 'phone'];
      for (const field of requiredFields) {
        if (!memberData[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // Check if phone already exists (only if not N/A and within same branch)
      if (memberData.phone && memberData.phone !== 'N/A' && memberData.branchId) {
        const phoneQuery = query(
          collection(db, this.collectionName),
          where('phone', '==', memberData.phone.trim()),
          where('branchId', '==', memberData.branchId)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
          return { success: false, error: 'Phone number already exists in this branch' };
        }
      }

      // Check if email already exists (only if email is provided and not N/A)
      if (memberData.email && memberData.email.trim() && memberData.email !== 'N/A') {
        const emailQuery = query(
          collection(db, this.collectionName),
          where('email', '==', memberData.email.trim().toLowerCase())
        );
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          return { success: false, error: 'Email already exists' };
        }
      }

      // Prepare member data
      const newMember = {
        ...memberData, // Include all fields from memberData
        name: memberData.name.trim(),
        email: memberData.email ? memberData.email.trim().toLowerCase() : '',
        phone: memberData.phone.trim(),
        membershipType: memberData.membershipType || '',
        branchId: memberData.branchId, // Add branch association
        status: memberData.status || 'Active',
        joinDate: memberData.joinDate ? Timestamp.fromDate(new Date(memberData.joinDate)) : Timestamp.now(),
        expiryDate: memberData.expiryDate ? Timestamp.fromDate(new Date(memberData.expiryDate)) : this.calculateExpiryDate(memberData.membershipType),
        lastVisit: null,
        address: memberData.address || '',
        emergencyContact: memberData.emergencyContact || '',
        notes: memberData.notes || '',
        fingerprintRegistered: false,
        fingerprintIds: [], // Array to store multiple fingerprint registration IDs
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.collectionName), newMember);
      
      // Send welcome SMS (don't fail the operation if SMS fails)
      try {
        if (newMember.phone) {
          await smsService.sendWelcomeSMS(newMember.phone, newMember.name);
          console.log(`Welcome SMS sent to ${newMember.name} at ${newMember.phone}`);
        }
      } catch (smsError) {
        console.warn('Failed to send welcome SMS:', smsError.message);
        // Don't fail the member creation if SMS fails
      }
      
      return { 
        success: true, 
        data: { id: docRef.id, ...newMember },
        message: 'Member added successfully' 
      };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
  }

  // Update member
  async updateMember(memberId, memberData) {
    try {
      const memberRef = doc(db, this.collectionName, memberId);
      
      // Prepare update data
      const updateData = {
        ...memberData,
        updatedAt: Timestamp.now()
      };

      // Convert date strings to Timestamps if provided
      if (memberData.joinDate) {
        updateData.joinDate = Timestamp.fromDate(new Date(memberData.joinDate));
      }
      if (memberData.expiryDate) {
        updateData.expiryDate = Timestamp.fromDate(new Date(memberData.expiryDate));
      }
      if (memberData.lastVisit) {
        updateData.lastVisit = Timestamp.fromDate(new Date(memberData.lastVisit));
      }

      await updateDoc(memberRef, updateData);
      
      return { 
        success: true, 
        message: 'Member updated successfully' 
      };
    } catch (error) {
      console.error('Error updating member:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete member
  async deleteMember(memberId) {
    try {
      await deleteDoc(doc(db, this.collectionName, memberId));
      return { 
        success: true, 
        message: 'Member deleted successfully' 
      };
    } catch (error) {
      console.error('Error deleting member:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete all members in a branch (batched)
  async deleteMembersByBranch(branchId) {
    try {
      if (!branchId) return { success: false, error: 'branchId is required' };
      let deleted = 0;

      // Fetch in pages to respect batch limits
      while (true) {
        const q = query(
          collection(db, this.collectionName),
          where('branchId', '==', branchId),
          limit(450)
        );
        const snap = await getDocs(q);
        if (snap.empty) break;

        const batch = writeBatch(db);
        snap.forEach(d => {
          batch.delete(doc(db, this.collectionName, d.id));
        });
        await batch.commit();
        deleted += snap.size;
        // Loop until none left
        if (snap.size < 450) break;
      }

      return { success: true, deleted };
    } catch (error) {
      console.error('Error deleting members by branch:', error);
      return { success: false, error: error.message };
    }
  }

  // Renew member subscription
  async renewSubscription(memberId, renewalData) {
    try {
      const memberRef = doc(db, this.collectionName, memberId);
      const memberDoc = await getDoc(memberRef);

      if (!memberDoc.exists()) {
        return { success: false, error: 'Member not found' };
      }

      const memberData = memberDoc.data();

      // Determine base date: use nextJoiningDate if provided, otherwise use current expiry or today
      const now = new Date();
      let baseDate;
      
      if (renewalData.nextJoiningDate) {
        // Use the provided next joining date as base
        baseDate = new Date(renewalData.nextJoiningDate);
      } else {
        // Fallback to old logic: max(current expiry, today)
        const existingExpiry = memberData.expireOn?.toDate ? memberData.expireOn.toDate() :
                               memberData.expiryDate?.toDate ? memberData.expiryDate.toDate() : null;
        baseDate = existingExpiry && existingExpiry > now ? existingExpiry : now;
      }

      // Parse duration and unit (default to days if not provided)
      const rawDuration = renewalData.duration;
      const duration = Number.parseInt(rawDuration, 10);
      if (!Number.isFinite(duration) || duration <= 0) {
        return { success: false, error: 'Invalid renewal duration' };
      }
      const unit = (renewalData.durationUnit || 'days').toLowerCase();

      // Compute new expiry based on unit
      const newExpiryDate = new Date(baseDate);
      if (unit === 'months' || unit === 'month') {
        newExpiryDate.setMonth(newExpiryDate.getMonth() + duration);
      } else if (unit === 'years' || unit === 'year') {
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + duration);
      } else {
        // default days
        newExpiryDate.setDate(newExpiryDate.getDate() + duration);
      }

      // Optional financial updates: recalculate balance if amounts provided
      let updateFinancials = {};
      const cost = Number.parseFloat(renewalData.membershipCost);
      const paid = Number.parseFloat(renewalData.amountPaid ?? renewalData.paymentReceived);
      const discount = Number.parseFloat(renewalData.discount);
      if (Number.isFinite(cost) || Number.isFinite(paid) || Number.isFinite(discount)) {
        const safeCost = Number.isFinite(cost) ? cost : Number.parseFloat(memberData.membershipCost) || 0;
        const safePaid = Number.isFinite(paid) ? paid : Number.parseFloat(memberData.amountPaid ?? memberData.paymentReceived) || 0;
        const safeDiscount = Number.isFinite(discount) ? discount : Number.parseFloat(memberData.discount) || 0;
        const pending = Math.max(safeCost - safePaid - safeDiscount, 0);
        updateFinancials = {
          membershipCost: safeCost,
          amountPaid: safePaid,
          paymentReceived: safePaid,
          discount: safeDiscount,
          amountToBePaid: pending,
          balanceAmount: pending,
          balance: pending.toString()
        };
      }

      const updateData = {
        selectedPackage: renewalData.selectedPackage || memberData.selectedPackage,
        membershipType: renewalData.membershipType || memberData.membershipType,
        expiryDate: Timestamp.fromDate(newExpiryDate),
        status: 'Active',
        updatedAt: Timestamp.now(),
        ...updateFinancials
      };

      // If nextJoiningDate was provided, update memberJoiningFrom
      if (renewalData.nextJoiningDate) {
        updateData.memberJoiningFrom = renewalData.nextJoiningDate;
      }

      await updateDoc(memberRef, updateData);

      // Log the renewal in a subcollection
      const renewalHistoryRef = collection(db, this.collectionName, memberId, 'renewalHistory');
      await addDoc(renewalHistoryRef, {
        ...renewalData,
        renewalDate: Timestamp.now(),
        newExpiryDate: Timestamp.fromDate(newExpiryDate),
        unit: unit,
        duration: duration
      });

      // Return updated snapshot data for UI
      const refreshed = await getDoc(memberRef);
      return { 
        success: true, 
        message: 'Subscription renewed successfully',
        data: { id: memberId, ...refreshed.data() }
      };
    } catch (error) {
      console.error('Error renewing subscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Get member details for fingerprint registration
  async getMemberDetailsForFingerprint(memberId) {
    try {
      const memberRef = doc(db, this.collectionName, memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        return { success: false, error: 'Member not found' };
      }

      const data = memberDoc.data();
      
      return {
        success: true,
        data: {
          memberId: memberId,
          personId: memberId,
          personName: data.name,
          personType: 'member',
          mobile: data.phone,
          email: data.email,
          idNumber: data.membershipId || data.id,
          userDetails: {
            memberId: memberId,
            mobile: data.phone,
            email: data.email,
            idNumber: data.membershipId || data.id,
            membershipType: data.membershipType,
            status: data.status
          }
        }
      };
    } catch (error) {
      console.error('Error getting member details for fingerprint:', error);
      return { success: false, error: error.message };
    }
  }

  // Update member's fingerprint status
  async updateFingerprintStatus(memberId, fingerprintId, action = 'add') {
    try {
      const memberRef = doc(db, this.collectionName, memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        return { success: false, error: 'Member not found' };
      }

      const currentData = memberDoc.data();
      let fingerprintIds = currentData.fingerprintIds || [];

      if (action === 'add') {
        if (!fingerprintIds.includes(fingerprintId)) {
          fingerprintIds.push(fingerprintId);
        }
      } else if (action === 'remove') {
        fingerprintIds = fingerprintIds.filter(id => id !== fingerprintId);
      }

      await updateDoc(memberRef, {
        fingerprintRegistered: fingerprintIds.length > 0,
        fingerprintIds: fingerprintIds,
        updatedAt: Timestamp.now()
      });

      return { success: true, message: 'Fingerprint status updated' };
    } catch (error) {
      console.error('Error updating fingerprint status:', error);
      return { success: false, error: error.message };
    }
  }

  // Update last visit
  async updateLastVisit(memberId) {
    try {
      const memberRef = doc(db, this.collectionName, memberId);
      await updateDoc(memberRef, {
        lastVisit: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating last visit:', error);
      return { success: false, error: error.message };
    }
  }

  // Get members by status
  async getMembersByStatus(status) {
    try {
      const membersQuery = query(
        collection(db, this.collectionName),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(membersQuery);
      const members = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          ...data,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate,
          lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit
        });
      });
      
      return { success: true, data: members };
    } catch (error) {
      console.error('Error fetching members by status:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate expiry date based on membership type
  calculateExpiryDate(membershipType) {
    const now = new Date();
    let expiryDate = new Date(now);

    switch (membershipType.toLowerCase()) {
      case 'basic':
        expiryDate.setMonth(expiryDate.getMonth() + 3); // 3 months
        break;
      case 'premium':
        expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 months
        break;
      case 'vip':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
        break;
      default:
        expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month default
    }

    return Timestamp.fromDate(expiryDate);
  }

  // Get membership statistics
  async getMembershipStats() {
    try {
      const membersQuery = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(membersQuery);
      
      const stats = {
        total: 0,
        active: 0,
        expired: 0,
        suspended: 0,
        basic: 0,
        premium: 0,
        vip: 0,
        newThisMonth: 0
      };

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate();
        
        stats.total++;
        
        // Count by status
        const status = data.status?.toLowerCase();
        if (status === 'active') stats.active++;
        else if (status === 'expired') stats.expired++;
        else if (status === 'suspended') stats.suspended++;
        
        // Count by membership type
        const membershipType = data.membershipType?.toLowerCase();
        if (membershipType === 'basic') stats.basic++;
        else if (membershipType === 'premium') stats.premium++;
        else if (membershipType === 'vip') stats.vip++;
        
        // Count new members this month
        if (createdAt && 
            createdAt.getMonth() === currentMonth && 
            createdAt.getFullYear() === currentYear) {
          stats.newThisMonth++;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching membership stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Search members
  async searchMembers(searchTerm) {
    try {
      const membersQuery = query(
        collection(db, this.collectionName),
        orderBy('name')
      );
      
      const querySnapshot = await getDocs(membersQuery);
      const members = [];
      const searchLower = searchTerm.toLowerCase();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const member = {
          id: doc.id,
          ...data,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
          expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate,
          lastVisit: data.lastVisit?.toDate ? data.lastVisit.toDate().toISOString().split('T')[0] : data.lastVisit
        };
        
        // Client-side search (you might want to use Algolia or similar for better search)
        if (
          member.name?.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower) ||
          member.phone?.includes(searchTerm)
        ) {
          members.push(member);
        }
      });
      
      return { success: true, data: members };
    } catch (error) {
      console.error('Error searching members:', error);
      return { success: false, error: error.message };
    }
  }

  // Get member history (subscriptions, payments, renewals, PT sessions, etc.)
  async getMemberHistory(memberId) {
    try {
      const history = {
        subscriptions: [],
        payments: [],
        renewals: [],
        ptSessions: [],
        additionalServices: [],
        attendance: [],
        coupons: []
      };

      // Get subscription history
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('memberId', '==', memberId),
        orderBy('startDate', 'desc')
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      subscriptionsSnapshot.forEach(doc => {
        const data = doc.data();
        history.subscriptions.push({
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate)
        });
      });

      // Get payment history
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('memberId', '==', memberId),
        orderBy('paymentDate', 'desc')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        history.payments.push({
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate)
        });
      });

      // Get PT sessions
      const ptSessionsQuery = query(
        collection(db, 'pt_sessions'),
        where('memberId', '==', memberId),
        orderBy('sessionDate', 'desc')
      );
      const ptSessionsSnapshot = await getDocs(ptSessionsQuery);
      ptSessionsSnapshot.forEach(doc => {
        const data = doc.data();
        history.ptSessions.push({
          id: doc.id,
          ...data,
          sessionDate: data.sessionDate?.toDate ? data.sessionDate.toDate() : new Date(data.sessionDate)
        });
      });

      // Get additional services
      const servicesQuery = query(
        collection(db, 'additional_services'),
        where('memberId', '==', memberId),
        orderBy('purchaseDate', 'desc')
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      servicesSnapshot.forEach(doc => {
        const data = doc.data();
        history.additionalServices.push({
          id: doc.id,
          ...data,
          purchaseDate: data.purchaseDate?.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate)
        });
      });

      // Get attendance history (last 30 records)
      const attendanceQuery = query(
        collection(db, 'attendance_logs'),
        where('memberId', '==', memberId),
        orderBy('timestamp', 'desc'),
        limit(30)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      attendanceSnapshot.forEach(doc => {
        const data = doc.data();
        history.attendance.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        });
      });

      // Get coupon usage history
      const couponsQuery = query(
        collection(db, 'coupons'),
        where('memberId', '==', memberId)
      );
      const couponsSnapshot = await getDocs(couponsQuery);
      couponsSnapshot.forEach(doc => {
        const data = doc.data();
        history.coupons.push({
          id: doc.id,
          ...data
        });
      });

      return { success: true, data: history };
    } catch (error) {
      console.error('Error fetching member history:', error);
      return { success: false, error: error.message, data: {
        subscriptions: [],
        payments: [],
        renewals: [],
        ptSessions: [],
        additionalServices: [],
        attendance: [],
        coupons: []
      }};
    }
  }

  // Get PT and Additional Services for a member
  async getMemberPTAndServices(memberId) {
    try {
      const ptAndServices = {
        ptSessions: [],
        additionalServices: []
      };

      // Get PT sessions with trainer details
      const ptQuery = query(
        collection(db, 'pt_sessions'),
        where('memberId', '==', memberId),
        orderBy('sessionDate', 'desc')
      );
      const ptSnapshot = await getDocs(ptQuery);
      
      for (const docSnap of ptSnapshot.docs) {
        const data = docSnap.data();
        ptAndServices.ptSessions.push({
          id: docSnap.id,
          ...data,
          sessionDate: data.sessionDate?.toDate ? data.sessionDate.toDate() : new Date(data.sessionDate)
        });
      }

      // Get additional services
      const servicesQuery = query(
        collection(db, 'additional_services'),
        where('memberId', '==', memberId),
        orderBy('purchaseDate', 'desc')
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      servicesSnapshot.forEach(doc => {
        const data = doc.data();
        ptAndServices.additionalServices.push({
          id: doc.id,
          ...data,
          purchaseDate: data.purchaseDate?.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate)
        });
      });

      return { success: true, data: ptAndServices };
    } catch (error) {
      console.error('Error fetching PT and services:', error);
      return { success: false, error: error.message, data: { ptSessions: [], additionalServices: [] }};
    }
  }

  // Find potential duplicate members
  async findPotentialDuplicates() {
    try {
      const membersQuery = query(collection(db, this.collectionName));
      const snapshot = await getDocs(membersQuery);
      
      const membersByContact = {};
      const membersByEmail = {};
      const duplicates = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const member = { id: doc.id, ...data };

        // Group by contact
        if (member.contact) {
          const contact = member.contact.replace(/\D/g, ''); // Remove non-digits
          if (!membersByContact[contact]) {
            membersByContact[contact] = [];
          }
          membersByContact[contact].push(member);
        }

        // Group by email
        if (member.email) {
          const email = member.email.toLowerCase();
          if (!membersByEmail[email]) {
            membersByEmail[email] = [];
          }
          membersByEmail[email].push(member);
        }
      });

      // Find duplicates by contact
      Object.entries(membersByContact).forEach(([contact, members]) => {
        if (members.length > 1) {
          duplicates.push({
            type: 'contact',
            value: contact,
            members: members,
            count: members.length
          });
        }
      });

      // Find duplicates by email
      Object.entries(membersByEmail).forEach(([email, members]) => {
        if (members.length > 1) {
          // Check if not already added by contact
          const existingDup = duplicates.find(d => 
            d.members.some(m => members.some(mem => mem.id === m.id))
          );
          if (!existingDup) {
            duplicates.push({
              type: 'email',
              value: email,
              members: members,
              count: members.length
            });
          }
        }
      });

      return { success: true, data: duplicates };
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Merge two members
  async mergeMembers(primaryMemberId, secondaryMemberId) {
    try {
      // Get both members
      const primaryResult = await this.getMemberById(primaryMemberId);
      const secondaryResult = await this.getMemberById(secondaryMemberId);

      if (!primaryResult.success || !secondaryResult.success) {
        return { success: false, error: 'Failed to retrieve members' };
      }

      const primary = primaryResult.data;
      const secondary = secondaryResult.data;

      // Merge data - primary takes precedence, but fill in missing fields from secondary
      const mergedData = {
        ...secondary,
        ...primary,
        // Special handling for certain fields
        balance: (parseFloat(primary.balance) || 0) + (parseFloat(secondary.balance) || 0),
        // Keep all notes/remarks
        remarks: [primary.remarks, secondary.remarks].filter(Boolean).join('\n---\n'),
        // Mark as merged
        mergedFrom: secondaryMemberId,
        mergedAt: new Date()
      };

      // Update primary member
      const primaryRef = doc(db, this.collectionName, primaryMemberId);
      await updateDoc(primaryRef, mergedData);

      // Transfer subscriptions, payments, PT sessions from secondary to primary
      const batch = writeBatch(db);

      // Update subscriptions
      const subsQuery = query(collection(db, 'subscriptions'), where('memberId', '==', secondaryMemberId));
      const subsSnapshot = await getDocs(subsQuery);
      subsSnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, { memberId: primaryMemberId });
      });

      // Update payments
      const paymentsQuery = query(collection(db, 'payments'), where('memberId', '==', secondaryMemberId));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, { memberId: primaryMemberId });
      });

      // Update PT sessions
      const ptQuery = query(collection(db, 'pt_sessions'), where('memberId', '==', secondaryMemberId));
      const ptSnapshot = await getDocs(ptQuery);
      ptSnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, { memberId: primaryMemberId });
      });

      // Update attendance logs
      const attendanceQuery = query(collection(db, 'attendance_logs'), where('memberId', '==', secondaryMemberId));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      attendanceSnapshot.forEach(docSnap => {
        batch.update(docSnap.ref, { memberId: primaryMemberId });
      });

      // Mark secondary as merged (don't delete, keep for audit trail)
      const secondaryRef = doc(db, this.collectionName, secondaryMemberId);
      batch.update(secondaryRef, { 
        status: 'Merged',
        selectStatus: 'Merged',
        mergedInto: primaryMemberId,
        mergedAt: new Date()
      });

      await batch.commit();

      return { success: true, message: 'Members merged successfully' };
    } catch (error) {
      console.error('Error merging members:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export a singleton instance
export const membersService = new MembersService();


