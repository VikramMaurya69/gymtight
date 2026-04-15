import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from './sqlFirestoreCompat';

class EnquiriesService {
  constructor() {
    this.collectionName = 'enquiries';
  }

  /**
   * Get all enquiries for a branch
   */
  async getAllEnquiries(branchId = null) {
    try {
      let q;
      
      // Fetch all enquiries and filter client-side to avoid composite index requirement
      q = query(
        collection(db, this.collectionName),
        orderBy('enquiryDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const enquiries = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter by branchId on client side if provided
        if (!branchId || data.branchId === branchId) {
          enquiries.push({
            id: doc.id,
            ...data
          });
        }
      });

      return enquiries;
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      return [];
    }
  }

  /**
   * Add a new enquiry
   */
  async addEnquiry(enquiryData) {
    try {
      const docData = {
        ...enquiryData,
        enquiryDate: Timestamp.fromDate(enquiryData.enquiryDate),
        nextFollowUp: enquiryData.nextFollowUp ? Timestamp.fromDate(new Date(enquiryData.nextFollowUp)) : null,
        dateOfBirth: enquiryData.dateOfBirth ? Timestamp.fromDate(new Date(enquiryData.dateOfBirth)) : null,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      const docRef = await addDoc(collection(db, this.collectionName), docData);
      
      return {
        success: true,
        id: docRef.id,
        message: 'Enquiry added successfully'
      };
    } catch (error) {
      console.error('Error adding enquiry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update an enquiry
   */
  async updateEnquiry(enquiryId, updates) {
    try {
      const enquiryRef = doc(db, this.collectionName, enquiryId);
      
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (updates.nextFollowUp) {
        updateData.nextFollowUp = Timestamp.fromDate(new Date(updates.nextFollowUp));
      }

      if (updates.dateOfBirth) {
        updateData.dateOfBirth = Timestamp.fromDate(new Date(updates.dateOfBirth));
      }

      await updateDoc(enquiryRef, updateData);
      
      return {
        success: true,
        message: 'Enquiry updated successfully'
      };
    } catch (error) {
      console.error('Error updating enquiry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete an enquiry
   */
  async deleteEnquiry(enquiryId) {
    try {
      await deleteDoc(doc(db, this.collectionName, enquiryId));
      
      return {
        success: true,
        message: 'Enquiry deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get counselors for the dropdown
   */
  async getCounselors(branchId = null) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¹ Fetching counselors for enquiry form...');
      
      let q;
      if (branchId) {
        q = query(
          collection(db, 'counselors'),
          where('branchId', '==', branchId)
        );
      } else {
        q = query(collection(db, 'counselors'));
      }
      
      const snapshot = await getDocs(q);
      const counselors = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        counselors.push({
          id: doc.id,
          name: data.name || 'Unknown Counselor',
          ...data
        });
      });

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Found ${counselors.length} counselors`);
      return counselors;
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching counselors:', error);
      return [];
    }
  }

  /**
   * Get packages for the dropdown
   */
  async getPackages(branchId = null) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Fetching packages for enquiry form...');
      
      // Try to get all packages first
      const q = query(collection(db, 'packages'));
      const snapshot = await getDocs(q);
      const packages = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filter by branchId if provided, and check if active
        const isActive = data.isActive !== false && data.status !== 'inactive';
        const matchesBranch = !branchId || data.branchId === branchId || !data.branchId;
        
        if (isActive && matchesBranch) {
          packages.push({
            id: doc.id,
            name: data.packageName || data.name || 'Unknown',
            price: data.price || 0,
            ...data
          });
        }
      });

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Found ${packages.length} packages`);
      return packages;
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching packages:', error);
      return [];
    }
  }

  /**
   * Get enquiry statistics
   */
  async getEnquiryStats(branchId = null) {
    try {
      const enquiries = await this.getAllEnquiries(branchId);
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = {
        total: enquiries.length,
        thisMonth: 0,
        pending: 0,
        followup: 0,
        converted: 0,
        closed: 0
      };

      enquiries.forEach(enquiry => {
        const enquiryDate = enquiry.enquiryDate?.toDate();
        
        if (enquiryDate && enquiryDate >= startOfMonth) {
          stats.thisMonth++;
        }

        switch (enquiry.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'followup':
            stats.followup++;
            break;
          case 'converted':
            stats.converted++;
            break;
          case 'closed':
            stats.closed++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching enquiry stats:', error);
      return {
        total: 0,
        thisMonth: 0,
        pending: 0,
        followup: 0,
        converted: 0,
        closed: 0
      };
    }
  }
}

export const enquiriesService = new EnquiriesService();


