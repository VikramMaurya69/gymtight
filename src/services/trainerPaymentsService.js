import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp
} from './sqlFirestoreCompat';

import { trainersService } from './trainersService';
import { getDoc } from './sqlFirestoreCompat';

class TrainerPaymentsService {
  constructor() {
    this.collectionName = 'trainerPayments';
  }

  async getAllPayments(branchId = null) {
    try {
      let q;
      if (branchId) {
        q = query(
          collection(db, this.collectionName),
          where('branchId', '==', branchId)
        );
      } else {
        q = query(collection(db, this.collectionName));
      }

      const snapshot = await getDocs(q);
      const payments = [];
      snapshot.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, data: payments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async addPayment(paymentData) {
    try {
      const docData = {
        ...paymentData,
        paymentDate: Timestamp.fromDate(new Date(paymentData.paymentDate)),
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, this.collectionName), docData);

      // Update trainer's total paid amount
      if (paymentData.trainerId && paymentData.amount) {
        await trainersService.updatePaymentStats(
          paymentData.trainerId,
          parseFloat(paymentData.amount),
          true
        );
      }

      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deletePayment(paymentId) {
    try {
      // First get the payment to know the amount and trainerId
      const paymentRef = doc(db, this.collectionName, paymentId);
      const paymentDoc = await getDoc(paymentRef);

      if (paymentDoc.exists()) {
        const paymentData = paymentDoc.data();

        // Delete the payment
        await deleteDoc(paymentRef);

        // Update trainer's total paid amount (decrement)
        if (paymentData.trainerId && paymentData.amount) {
          await trainersService.updatePaymentStats(
            paymentData.trainerId,
            parseFloat(paymentData.amount),
            false
          );
        }

        return { success: true };
      } else {
        return { success: false, error: 'Payment not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const trainerPaymentsService = new TrainerPaymentsService();


