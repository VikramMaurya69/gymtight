import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  increment,
  getDoc
} from './sqlFirestoreCompat';

export const counselorsService = {
  // Get all counselors for a branch
  async getAllCounselors(branchId) {
    try {
      const counselorsRef = collection(db, 'counselors');
      const q = query(counselorsRef, where('branchId', '==', branchId));
      const snapshot = await getDocs(q);

      const counselors = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        counselors.push({
          id: doc.id,
          ...data,
          // Ensure totalMembers exists, default to 0 if undefined
          totalMembers: data.totalMembers !== undefined ? data.totalMembers : 0,
          activeMembers: data.activeMembers !== undefined ? data.activeMembers : 0
        });
      });

      return {
        success: true,
        data: counselors
      };
    } catch (error) {
      console.error('Error getting counselors:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  // Get single counselor
  async getCounselor(counselorId) {
    try {
      const docRef = doc(db, 'counselors', counselorId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...docSnap.data()
          }
        };
      } else {
        return {
          success: false,
          error: 'Counselor not found'
        };
      }
    } catch (error) {
      console.error('Error getting counselor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Add new counselor
  async addCounselor(counselorData) {
    try {
      const counselorsRef = collection(db, 'counselors');
      const docRef = await addDoc(counselorsRef, {
        ...counselorData,
        totalMembers: 0,
        activeMembers: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          id: docRef.id,
          ...counselorData
        },
        message: 'Counselor added successfully'
      };
    } catch (error) {
      console.error('Error adding counselor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update counselor
  async updateCounselor(counselorId, counselorData) {
    try {
      const docRef = doc(db, 'counselors', counselorId);
      await updateDoc(docRef, {
        ...counselorData,
        updatedAt: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Counselor updated successfully'
      };
    } catch (error) {
      console.error('Error updating counselor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete counselor
  async deleteCounselor(counselorId) {
    try {
      const docRef = doc(db, 'counselors', counselorId);
      await deleteDoc(docRef);

      return {
        success: true,
        message: 'Counselor deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting counselor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Increment member count when a new member is added
  async incrementMemberCount(counselorId) {
    try {
      const docRef = doc(db, 'counselors', counselorId);
      await updateDoc(docRef, {
        totalMembers: increment(1),
        activeMembers: increment(1),
        updatedAt: new Date().toISOString()
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Error incrementing member count:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Decrement member count when a member is removed
  async decrementMemberCount(counselorId) {
    try {
      const docRef = doc(db, 'counselors', counselorId);
      await updateDoc(docRef, {
        totalMembers: increment(-1),
        activeMembers: increment(-1),
        updatedAt: new Date().toISOString()
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Error decrementing member count:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get counselors for dropdown
  async getCounselorsForDropdown(branchId) {
    try {
      const result = await this.getAllCounselors(branchId);
      if (result.success) {
        return result.data
          .filter(c => c.status === 'Active')
          .map(c => ({
            id: c.id,
            name: c.name
          }));
      }
      return [];
    } catch (error) {
      console.error('Error getting counselors for dropdown:', error);
      return [];
    }
  },

  // Get member count for a counselor
  async getMemberCount(counselorId) {
    try {
      const membersRef = collection(db, 'members');
      const q = query(membersRef, where('counselorId', '==', counselorId));
      const snapshot = await getDocs(q);

      return {
        success: true,
        total: snapshot.size,
        active: snapshot.docs.filter(doc => doc.data().selectStatus === 'Active').length
      };
    } catch (error) {
      console.error('Error getting member count:', error);
      return {
        success: false,
        total: 0,
        active: 0
      };
    }
  },

  // Get members under a specific counselor (Fetch all branch members & filter client-side for max robustness)
  async getMembersForCounselor(branchId, counselorId, counselorName) {
    try {
      if (!branchId) return { success: false, error: 'Branch ID is required', data: [] };

      // Fetch all members for the branch
      const membersRef = collection(db, 'members');
      const q = query(membersRef, where('branchId', '==', branchId));
      const snapshot = await getDocs(q);
      
      const members = [];
      const targetName = counselorName ? counselorName.toLowerCase().trim() : '';

      snapshot.forEach(doc => {
        const data = doc.data();
        let isMatch = false;

        // 1. Check ID Match
        if (data.counselorId === counselorId) {
          isMatch = true;
        }
        // 2. Check Name Match (Legacy) - Case Insensitive
        else if (targetName) {
           const fieldsToCheck = [
             data.counselorName, 
             data.counsellor, 
             data.assignCounselor, 
             data.selectCounsellor,
             data.counselor // sometimes just 'counselor'
           ];
           
           isMatch = fieldsToCheck.some(field => 
             field && typeof field === 'string' && field.toLowerCase().trim() === targetName
           );
        }

        if (isMatch) {
          members.push({
            id: doc.id,
            ...data,
            joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
            expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate().toISOString().split('T')[0] : data.expiryDate
          });
        }
      });
      
      return {
        success: true,
        data: members
      };
    } catch (error) {
      console.error('Error getting members for counselor:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  // Calculate commission for a counselor
  async calculateCommission(counselorId, startDate, endDate) {
    try {
      const membersRef = collection(db, 'members');
      const q = query(
        membersRef,
        where('counselorId', '==', counselorId),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );
      const snapshot = await getDocs(q);

      let totalRevenue = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        totalRevenue += parseFloat(data.totalAmountReceived || 0);
      });

      // Get counselor commission rate
      const counselorDoc = await this.getCounselor(counselorId);
      const commissionRate = counselorDoc.data?.commission || 0;
      const commission = (totalRevenue * commissionRate) / 100;

      return {
        success: true,
        data: {
          totalRevenue,
          commissionRate,
          commission,
          membersAdded: snapshot.size
        }
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Sync member count for a counselor (useful for fixing counts)
  async syncMemberCount(counselorId) {
    try {
      const countResult = await this.getMemberCount(counselorId);
      if (countResult.success) {
        const docRef = doc(db, 'counselors', counselorId);
        await updateDoc(docRef, {
          totalMembers: countResult.total,
          activeMembers: countResult.active,
          updatedAt: new Date().toISOString()
        });

        return {
          success: true,
          data: {
            totalMembers: countResult.total,
            activeMembers: countResult.active
          }
        };
      }
      return countResult;
    } catch (error) {
      console.error('Error syncing member count:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default counselorsService;


