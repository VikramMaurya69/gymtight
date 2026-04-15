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

// Package types available in the system
export const PACKAGE_TYPES = [
  'General Subscription (GS)',
  'PT Subscription (PT)', 
  'Group Training',
  'Consultancy / therapy Subscription'
];

class PackagesService {
  constructor() {
    this.collectionName = 'packages';
  }

  // Get all packages
  async getAllPackages() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Fetching all packages...');
      
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      
      const packages = [];
      querySnapshot.forEach((doc) => {
        packages.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        });
      });
      
      // Sort on frontend to avoid Firebase composite index requirement
      packages.sort((a, b) => {
        if (a.packageType !== b.packageType) {
          return a.packageType.localeCompare(b.packageType);
        }
        return a.packageName.localeCompare(b.packageName);
      });
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Fetched ${packages.length} packages successfully`);
      return { success: true, data: packages };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching packages:', error);
      return { 
        success: false, 
        error: error.message, 
        data: [] 
      };
    }
  }

  // Get packages by type
  async getPackagesByType(packageType) {
    try {
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Fetching packages for type: ${packageType}`);
      
      const q = query(
        collection(db, this.collectionName),
        where('packageType', '==', packageType),
        where('status', '==', 'Active')
      );
      
      const querySnapshot = await getDocs(q);
      const packages = [];
      
      querySnapshot.forEach((doc) => {
        packages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by package name on frontend
      packages.sort((a, b) => a.packageName.localeCompare(b.packageName));
      
      return { success: true, data: packages };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching packages by type:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Get active packages for dropdown
  async getActivePackages() {
    try {
      // Fetch all packages since Firestore query is case-sensitive
      // We'll filter on the client side for case-insensitive matching
      const q = query(collection(db, this.collectionName));
      
      const querySnapshot = await getDocs(q);
      const packages = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include packages with active status (case-insensitive)
        if ((data.status || 'active').toLowerCase() === 'active') {
          packages.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      // Sort on frontend to avoid composite index requirement
      packages.sort((a, b) => {
        if (a.packageType !== b.packageType) {
          return a.packageType.localeCompare(b.packageType);
        }
        return (a.price || 0) - (b.price || 0);
      });
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ getActivePackages: Found ${packages.length} active packages`);
      return { success: true, data: packages };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error fetching active packages:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Create new package
  async createPackage(packageData) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Creating new package:', packageData.packageName);
      
      const newPackage = {
        ...packageData,
        status: packageData.status || 'Active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.collectionName), newPackage);
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Package created successfully with ID:', docRef.id);
      return { 
        success: true, 
        data: { id: docRef.id, ...newPackage },
        message: 'Package created successfully' 
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error creating package:', error);
      return { success: false, error: error.message };
    }
  }

  // Update package
  async updatePackage(packageId, updateData) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Updating package:', packageId);
      
      const packageRef = doc(db, this.collectionName, packageId);
      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(packageRef, updatePayload);
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Package updated successfully');
      return { 
        success: true, 
        message: 'Package updated successfully' 
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error updating package:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete package
  async deletePackage(packageId) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ Deleting package:', packageId);
      
      // Check if it's a default package
      const packageRef = doc(db, this.collectionName, packageId);
      const packageSnapshot = await getDoc(packageRef);
      
      if (!packageSnapshot.exists()) {
        return { success: false, error: 'Package not found' };
      }
      
      const packageData = packageSnapshot.data();
      if (packageData.isDefault) {
        return { success: false, error: 'Cannot delete default packages' };
      }
      
      await deleteDoc(packageRef);
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Package deleted successfully');
      return { 
        success: true, 
        message: 'Package deleted successfully' 
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error deleting package:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate package pricing with discount
  calculatePackagePrice(packageData, discountPercent = 0, customDiscount = 0) {
    const basePrice = packageData.price || 0;
    const maxDiscount = packageData.maxDiscount || 0;
    
    // Calculate percentage discount
    const percentageDiscount = Math.min(
      (basePrice * discountPercent) / 100,
      maxDiscount
    );
    
    // Apply custom discount (but not exceed max discount)
    const totalDiscount = Math.min(
      percentageDiscount + customDiscount,
      maxDiscount
    );
    
    const finalPrice = Math.max(0, basePrice - totalDiscount);
    
    return {
      basePrice,
      discount: totalDiscount,
      finalPrice,
      maxDiscount,
      savings: totalDiscount
    };
  }

  // Get package types for filtering
  getPackageTypes() {
    return PACKAGE_TYPES;
  }

  // Search packages
  async searchPackages(searchTerm) {
    try {
      const allPackagesResult = await this.getAllPackages();
      
      if (!allPackagesResult.success) {
        return allPackagesResult;
      }
      
      const filteredPackages = allPackagesResult.data.filter(pkg =>
        pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.packageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return { success: true, data: filteredPackages };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error searching packages:', error);
      return { success: false, error: error.message, data: [] };
    }
  }
}

export const packagesService = new PackagesService();

