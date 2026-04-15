import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  serverTimestamp 
} from './sqlFirestoreCompat';
import { db } from './firebase';

class BranchService {
  constructor() {
    this.collectionName = 'branches';
  }

  // Get all branches
  async getAllBranches() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Fetching all branches...');
      
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      
      const branches = [];
      querySnapshot.forEach((doc) => {
        branches.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        });
      });
      
      // Sort by name
      branches.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Fetched ${branches.length} branches successfully`);
      return { success: true, data: branches };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching branches:', error);
      return { 
        success: false, 
        error: error.message, 
        data: [] 
      };
    }
  }

  // Get branch by ID
  async getBranchById(branchId) {
    try {
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Fetching branch: ${branchId}`);
      
      const branchRef = doc(db, this.collectionName, branchId);
      const branchSnapshot = await getDoc(branchRef);
      
      if (branchSnapshot.exists()) {
        const branchData = {
          id: branchSnapshot.id,
          ...branchSnapshot.data(),
          createdAt: branchSnapshot.data().createdAt?.toDate() || new Date(),
          updatedAt: branchSnapshot.data().updatedAt?.toDate() || new Date()
        };
        
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Branch fetched successfully');
        return { success: true, data: branchData };
      } else {
        return { success: false, error: 'Branch not found', data: null };
      }
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching branch:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  // Create new branch
  async createBranch(branchData) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Creating new branch:', branchData.name);
      
      const newBranch = {
        ...branchData,
        status: branchData.status || 'Active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.collectionName), newBranch);
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Branch created successfully with ID:', docRef.id);
      return { 
        success: true, 
        data: { id: docRef.id, ...newBranch },
        message: 'Branch created successfully' 
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error creating branch:', error);
      return { success: false, error: error.message };
    }
  }

  // Update branch
  async updateBranch(branchId, updateData) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Updating branch:', branchId);
      
      const branchRef = doc(db, this.collectionName, branchId);
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(branchRef, updatePayload);
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Branch updated successfully');
      return { 
        success: true, 
        message: 'Branch updated successfully',
        data: { id: branchId, ...updatePayload }
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error updating branch:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete branch
  async deleteBranch(branchId) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ Deleting branch:', branchId);
      
      // Check if branch has members before deletion
      const membersCheck = await this.checkBranchMembers(branchId);
      if (membersCheck.hasMembers) {
        return { 
          success: false, 
          error: `Cannot delete branch. It has ${membersCheck.count} members. Please transfer or remove members first.` 
        };
      }
      
      const branchRef = doc(db, this.collectionName, branchId);
      await deleteDoc(branchRef);
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Branch deleted successfully');
      return { 
        success: true, 
        message: 'Branch deleted successfully' 
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error deleting branch:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if branch has members
  async checkBranchMembers(branchId) {
    try {
      const q = query(
        collection(db, 'members'),
        where('branchId', '==', branchId)
      );
      const querySnapshot = await getDocs(q);
      
      return {
        hasMembers: !querySnapshot.empty,
        count: querySnapshot.size
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error checking branch members:', error);
      return { hasMembers: false, count: 0 };
    }
  }

  // Get active branches only
  async getActiveBranches() {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'Active')
      );
      
      const querySnapshot = await getDocs(q);
      const branches = [];
      
      querySnapshot.forEach((doc) => {
        branches.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      branches.sort((a, b) => a.name.localeCompare(b.name));
      
      return { success: true, data: branches };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching active branches:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Search branches
  async searchBranches(searchTerm) {
    try {
      const allBranchesResult = await this.getAllBranches();
      
      if (!allBranchesResult.success) {
        return allBranchesResult;
      }
      
      const filteredBranches = allBranchesResult.data.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.manager.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return { success: true, data: filteredBranches };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error searching branches:', error);
      return { success: false, error: error.message, data: [] };
    }
  }
}

export const branchService = new BranchService();

