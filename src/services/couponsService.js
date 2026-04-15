import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy
} from './sqlFirestoreCompat';

export class CouponsService {
  constructor() {
    this.usersCollection = 'users';
    this.membersCollection = 'members';
  }

  // Assign a coupon to a member
  async assignCouponToMember(memberId, couponData) {
    try {
      // 1. Get Member Details to find email/phone
      const membersQuery = query(collection(db, this.membersCollection));
      // Note: We can't query by docId in WHERE clause easily if we don't have the doc ref, 
      // but since we usually have the ID, we could use getDoc. 
      // However, assuming memberId passed here is the Firestore Doc ID.
      // But let's be safe and try to find the linked user first.
      
      // Actually, let's fetch the member doc content first.
      // But since I don't want to import membersService (circular dependency risk), 
      // I'll just query if I have to, or perform the logic here.
      // Ideally I should pass the member object, but passing ID is cleaner API.
      
      // Let's assume the UI passes the full member object or I fetch it.
      // I'll implementation fetching by ID.
    } catch (error) {
       // Placeholder
    }
  }

  // Revised implementation:
  
  async assignCoupon(member, couponData) {
    try {
      if (!member) throw new Error('Member details are required');
      
      // Strategy: Find Member Document by Email (Preferred) or Phone
      // User specified to search in 'members' table, not 'users'.
      // This implies the Mobile App uses the 'members' collection for auth profiles.
      
      let targetQuery;
      let identifierType = '';
      const collectionName = this.membersCollection; // Switching to 'members'

      if (member.email && member.email !== 'N/A' && member.email.includes('@')) {
        targetQuery = query(
          collection(db, collectionName), 
          where('email', '==', member.email.toLowerCase().trim())
        );
        identifierType = 'email';
      } else if (member.phone && member.phone !== 'N/A') {
        targetQuery = query(
          collection(db, collectionName), 
          where('contact', '==', member.phone.trim()) // membersService uses 'contact' often, let's check both
        );
        // We will execute and if empty try 'phone'
        identifierType = 'contact/phone';
      } else {
        throw new Error('Member does not have a valid Email or Phone to link to App Account');
      }

      let querySnapshot = await getDocs(targetQuery);
      
      // If searching by phone/contact, try alternative field name if first failed
      if (querySnapshot.empty && identifierType.includes('phone')) {
         const altQuery = query(
          collection(db, collectionName), 
          where('phone', '==', member.phone.trim()) 
        );
        querySnapshot = await getDocs(altQuery);
      }
      
      if (querySnapshot.empty) {
        throw new Error(`No Member account found with this ${identifierType.split('/')[0]} (checked 'members' collection)`);
      }

      // We might find the Admin-created doc (current member) OR the App-created doc.
      // If they are duplicated, we ideally want the one the App uses.
      // Usually, the App-created one has a 'uid' field or matches the Auth UID.
      // For now, we'll pick the one that IS NOT the current one (if possible) or just the first found?
      // Actually, if we add it to ALL matching docs, it guarantees the user gets it.
      // But let's stick to the first one found for now, or maybe the one with a 'uid' field if present.
      
      let targetDoc = querySnapshot.docs.find(d => d.data().uid) || querySnapshot.docs[0];
      
      // If we only found the admin doc itself (and it has no uid), we just add it there.
      // Assuming the App reads this doc.
      const targetId = targetDoc.id;

      // Prepare Coupon Data
      const newCoupon = {
        code: couponData.code || this.generateCouponCode(),
        description: couponData.description || 'Special Discount',
        discountAmount: Number(couponData.discount) || 0,
        discountType: couponData.discountType || 'percentage', // or 'fixed'
        expiresAt: couponData.expiresAt ? Timestamp.fromDate(new Date(couponData.expiresAt)) : null,
        isRedeemed: false,
        createdAt: Timestamp.now(),
        issuedBy: 'Admin Panel',
        sourceMemberId: member.id // Track which admin record initiated this
      };

      // Add to members/{targetId}/coupons
      const couponsRef = collection(db, collectionName, targetId, 'coupons');
      await addDoc(couponsRef, newCoupon);

      return { 
        success: true, 
        message: 'Coupon assigned successfully',
        couponCode: newCoupon.code,
        targetDocId: targetId
      };

    } catch (error) {
      console.error('Error assigning coupon:', error);
      return { success: false, error: error.message };
    }
  }

  generateCouponCode() {
    return 'VIGOUR' + Math.floor(1000 + Math.random() * 9000);
  }

  // Get coupons for a member
  async getMemberCoupons(memberId) {
    try {
      const couponsRef = collection(db, this.membersCollection, memberId, 'coupons');
      const q = query(couponsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const coupons = [];
      snapshot.forEach(doc => {
        coupons.push({
           id: doc.id,
           ...doc.data(),
           createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
           expiresAt: doc.data().expiresAt?.toDate ? doc.data().expiresAt.toDate() : doc.data().expiresAt
        });
      });
      
      return { success: true, data: coupons };
    } catch (error) {
      console.error('Error fetching member coupons:', error);
      return { success: false, error: error.message };
    }
  }
}

export const couponsService = new CouponsService();


