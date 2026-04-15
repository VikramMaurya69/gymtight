import { db } from './firebase';
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
  increment
} from './sqlFirestoreCompat';

// Trainers Service Class
export class TrainersService {
  constructor() {
    this.collectionName = 'trainers';
  }

  // Get all trainers (with optional branch filtering)
  async getAllTrainers(branchId = null) {
    try {
      let trainersQuery;
      
      if (branchId) {
        // Query all trainers and filter in JavaScript to handle trainers without branchId
        trainersQuery = query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Query all trainers with orderBy
        trainersQuery = query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(trainersQuery);
      const trainers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // If branchId is specified, filter to include trainers with matching branchId or no branchId
        if (!branchId || data.branchId === branchId || !data.branchId) {
          trainers.push({
            id: doc.id,
            ...data,
            joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
          });
        }
      });

      // Trainers are already sorted by createdAt from the query
      
      return { success: true, data: trainers };
    } catch (error) {
      console.error('Error fetching trainers:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trainer by ID
  async getTrainerById(trainerId) {
    try {
      const trainerDoc = await getDoc(doc(db, this.collectionName, trainerId));
      
      if (!trainerDoc.exists()) {
        return { success: false, error: 'Trainer not found' };
      }
      
      const data = trainerDoc.data();
      const trainer = {
        id: trainerDoc.id,
        ...data,
        joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      };
      
      return { success: true, data: trainer };
    } catch (error) {
      console.error('Error fetching trainer:', error);
      return { success: false, error: error.message };
    }
  }

  // Add new trainer
  async addTrainer(trainerData) {
    try {
      // Validate required fields
      const requiredFields = ['name', 'email', 'phone', 'specialty'];
      for (const field of requiredFields) {
        if (!trainerData[field]) {
          return { success: false, error: `${field} is required` };
        }
      }

      // Check if email already exists
      const emailQuery = query(
        collection(db, this.collectionName),
        where('email', '==', trainerData.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return { success: false, error: 'Email already exists' };
      }

      // Prepare trainer data
      const newTrainer = {
        name: trainerData.name.trim(),
        email: trainerData.email.trim().toLowerCase(),
        phone: trainerData.phone.trim(),
        specialty: trainerData.specialty,
        experience: trainerData.experience || '',
        certifications: Array.isArray(trainerData.certifications) 
          ? trainerData.certifications 
          : (trainerData.certifications ? [trainerData.certifications] : []),
        status: trainerData.status || 'Active',
        hourlyRate: parseFloat(trainerData.hourlyRate) || 0,
        rating: parseFloat(trainerData.rating) || 0,
        clientsCount: parseInt(trainerData.clientsCount) || 0,
        totalMembers: 0, // Initialize member count
        branchId: trainerData.branchId || null, // Include branchId
        joinDate: trainerData.joinDate ? Timestamp.fromDate(new Date(trainerData.joinDate)) : Timestamp.now(),
        photo: trainerData.photo || null,
        fingerprintRegistered: false,
        fingerprintIds: [], // Array to store multiple fingerprint registration IDs
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.collectionName), newTrainer);
      
      return { 
        success: true, 
        data: { id: docRef.id, ...newTrainer },
        message: 'Trainer added successfully' 
      };
    } catch (error) {
      console.error('Error adding trainer:', error);
      return { success: false, error: error.message };
    }
  }

  // Update trainer
  async updateTrainer(trainerId, trainerData) {
    try {
      const trainerRef = doc(db, this.collectionName, trainerId);
      
      // Prepare update data
      const updateData = {
        ...trainerData,
        updatedAt: Timestamp.now()
      };

      // Convert date strings to Timestamps if provided
      if (trainerData.joinDate) {
        updateData.joinDate = Timestamp.fromDate(new Date(trainerData.joinDate));
      }

      // Handle numeric fields
      if (trainerData.hourlyRate !== undefined) {
        updateData.hourlyRate = parseFloat(trainerData.hourlyRate) || 0;
      }
      if (trainerData.rating !== undefined) {
        updateData.rating = parseFloat(trainerData.rating) || 0;
      }
      if (trainerData.clientsCount !== undefined) {
        updateData.clientsCount = parseInt(trainerData.clientsCount) || 0;
      }

      // Handle certifications array
      if (trainerData.certifications !== undefined) {
        updateData.certifications = Array.isArray(trainerData.certifications) 
          ? trainerData.certifications 
          : (trainerData.certifications ? [trainerData.certifications] : []);
      }

      await updateDoc(trainerRef, updateData);
      
      return { 
        success: true, 
        message: 'Trainer updated successfully' 
      };
    } catch (error) {
      console.error('Error updating trainer:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete trainer
  async deleteTrainer(trainerId) {
    try {
      await deleteDoc(doc(db, this.collectionName, trainerId));
      return { 
        success: true, 
        message: 'Trainer deleted successfully' 
      };
    } catch (error) {
      console.error('Error deleting trainer:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trainer details for fingerprint registration
  async getTrainerDetailsForFingerprint(trainerId) {
    try {
      const trainerRef = doc(db, this.collectionName, trainerId);
      const trainerDoc = await getDoc(trainerRef);
      
      if (!trainerDoc.exists()) {
        return { success: false, error: 'Trainer not found' };
      }

      const data = trainerDoc.data();
      
      return {
        success: true,
        data: {
          trainerId: trainerId,
          personId: trainerId,
          personName: data.name,
          personType: 'trainer',
          mobile: data.phone,
          email: data.email,
          idNumber: data.employeeId || data.id,
          userDetails: {
            trainerId: trainerId,
            mobile: data.phone,
            email: data.email,
            idNumber: data.employeeId || data.id,
            specialization: data.specialization,
            experience: data.experience,
            status: data.status
          }
        }
      };
    } catch (error) {
      console.error('Error getting trainer details for fingerprint:', error);
      return { success: false, error: error.message };
    }
  }

  // Update trainer's fingerprint status
  async updateFingerprintStatus(trainerId, fingerprintId, action = 'add') {
    try {
      const trainerRef = doc(db, this.collectionName, trainerId);
      const trainerDoc = await getDoc(trainerRef);
      
      if (!trainerDoc.exists()) {
        return { success: false, error: 'Trainer not found' };
      }

      const currentData = trainerDoc.data();
      let fingerprintIds = currentData.fingerprintIds || [];

      if (action === 'add') {
        if (!fingerprintIds.includes(fingerprintId)) {
          fingerprintIds.push(fingerprintId);
        }
      } else if (action === 'remove') {
        fingerprintIds = fingerprintIds.filter(id => id !== fingerprintId);
      }

      await updateDoc(trainerRef, {
        fingerprintIds,
        fingerprintRegistered: fingerprintIds.length > 0,
        updatedAt: Timestamp.now()
      });

      return { 
        success: true, 
        message: `Fingerprint ${action === 'add' ? 'registered' : 'removed'} successfully` 
      };
    } catch (error) {
      console.error('Error updating fingerprint status:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trainer statistics
  async getTrainerStats() {
    try {
      const trainersQuery = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(trainersQuery);
      
      let totalTrainers = 0;
      let activeTrainers = 0;
      let totalClients = 0;
      let specialtyCount = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalTrainers++;
        
        if (data.status === 'Active') {
          activeTrainers++;
        }
        
        if (data.clientsCount) {
          totalClients += data.clientsCount;
        }
        
        if (data.specialty) {
          specialtyCount[data.specialty] = (specialtyCount[data.specialty] || 0) + 1;
        }
      });
      
      return {
        success: true,
        data: {
          totalTrainers,
          activeTrainers,
          totalClients,
          specialtyCount
        }
      };
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Search trainers
  async searchTrainers(searchTerm, specialty = 'all') {
    try {
      let q = query(collection(db, this.collectionName));
      
      if (specialty !== 'all') {
        q = query(q, where('specialty', '==', specialty));
      }
      
      const querySnapshot = await getDocs(q);
      const trainers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const trainer = {
          id: doc.id,
          ...data,
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate().toISOString().split('T')[0] : data.joinDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        };
        
        // Apply search filter
        if (!searchTerm || 
            trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trainer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trainer.phone.includes(searchTerm) ||
            trainer.specialty.toLowerCase().includes(searchTerm.toLowerCase())) {
          trainers.push(trainer);
        }
      });
      
      return { success: true, data: trainers };
    } catch (error) {
      console.error('Error searching trainers:', error);
      return { success: false, error: error.message };
    }
  }

  // Increment member/client count when a new member is assigned
  async incrementMemberCount(trainerId) {
    try {
      const docRef = doc(db, this.collectionName, trainerId);
      await updateDoc(docRef, {
        totalMembers: increment(1),
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error incrementing trainer member count:', error);
      return { success: false, error: error.message };
    }
  }

  // Decrement member/client count when a member is removed
  async decrementMemberCount(trainerId) {
    try {
      const docRef = doc(db, this.collectionName, trainerId);
      await updateDoc(docRef, {
        totalMembers: increment(-1),
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error decrementing trainer member count:', error);
      return { success: false, error: error.message };
    }
  }

  // Update payment statistics when a payment is added or removed
  async updatePaymentStats(trainerId, amount, isAddition = true) {
    try {
      const docRef = doc(db, this.collectionName, trainerId);
      const adjustment = isAddition ? amount : -amount;
      
      await updateDoc(docRef, {
        totalPaid: increment(adjustment),
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating trainer payment stats:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
export const trainersService = new TrainersService();


