import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from './sqlFirestoreCompat';

export class BannersService {
  constructor() {
    this.collectionName = 'banners';
  }

  // Get all banners
  async getBanners() {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('priority', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const banners = [];
      
      querySnapshot.forEach((doc) => {
        banners.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { success: true, data: banners };
    } catch (error) {
      console.error('Error fetching banners:', error);
      return { success: false, error: error.message };
    }
  }

  // Add new banner
  async addBanner(bannerData) {
    try {
      const newBanner = {
        title: bannerData.title || '',
        imageUrl: bannerData.imageUrl || '',
        actionUrl: bannerData.actionUrl || '',
        priority: Number(bannerData.priority) || 0,
        isActive: bannerData.isActive !== false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.collectionName), newBanner);
      
      return { 
        success: true, 
        data: { id: docRef.id, ...newBanner },
        message: 'Banner added successfully' 
      };
    } catch (error) {
      console.error('Error adding banner:', error);
      return { success: false, error: error.message };
    }
  }

  // Update banner
  async updateBanner(bannerId, bannerData) {
    try {
      const bannerRef = doc(db, this.collectionName, bannerId);
      
      const updateData = {
        ...bannerData,
        priority: bannerData.priority ? Number(bannerData.priority) : undefined,
        updatedAt: Timestamp.now()
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      await updateDoc(bannerRef, updateData);
      
      return { 
        success: true, 
        message: 'Banner updated successfully' 
      };
    } catch (error) {
      console.error('Error updating banner:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete banner
  async deleteBanner(bannerId) {
    try {
      await deleteDoc(doc(db, this.collectionName, bannerId));
      return { 
        success: true, 
        message: 'Banner deleted successfully' 
      };
    } catch (error) {
      console.error('Error deleting banner:', error);
      return { success: false, error: error.message };
    }
  }
}

export const bannersService = new BannersService();


