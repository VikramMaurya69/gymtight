import { auth, db, getSecondaryAuth } from './firebase';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  signOut
} from './sqlAuthCompat';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from './sqlFirestoreCompat';

// User Management Service
export class UserManagementService {
  constructor() {
    this.collectionName = 'users';
  }

  // Create a new manager with Firebase Auth account
  async createManager(managerData) {
    const { 
      email, 
      displayName, 
      password = this.generateSecurePassword(), // Auto-generate if not provided
      role = 'manager',
      phone = '',
      department = '',
      branchId = null,
      permissions = [],
      sendEmail = true 
    } = managerData;
    
    // Get secondary auth instance (prevents logging out current admin)
    const secondaryAuth = getSecondaryAuth();
    
    try {
      // Step 1: Create Firebase Authentication user with temporary password
      // Using secondary auth prevents logging out the current admin user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const firebaseUser = userCredential.user;
      
      // Step 2: Update the user's display name
      await updateProfile(firebaseUser, {
        displayName: displayName || 'Manager'
      });
      
      // Step 3: Create Firestore user record with role and permissions
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName || 'Manager',
        role: role || 'manager',
        phone: phone || '',
        department: department || '',
        branchId: branchId,
        status: 'active',
        permissions: permissions.length > 0 ? permissions : [
          'view_dashboard',
          'view_members',
          'view_trainers',
          'view_attendance'
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLogin: null,
        isEmailVerified: false,
        temporaryPassword: true // Flag that they need to change password
      };
      
      await setDoc(doc(db, this.collectionName, firebaseUser.uid), userData);
      
      // Step 4: Send welcome email with login instructions
      if (sendEmail) {
        await this.sendWelcomeEmail(email, displayName, password);
      }
      
      // Step 5: Sign out the newly created user from secondary auth
      // This prevents the new user from staying logged in
      await signOut(secondaryAuth);
      
      // Step 6: Log the action
      await this.logUserAction('MANAGER_CREATED', {
        managerId: firebaseUser.uid,
        managerEmail: email,
        managerName: displayName,
        role: role,
        permissionsCount: permissions.length
      });
      
      return {
        success: true,
        uid: firebaseUser.uid,
        message: `Manager account created successfully! Welcome email sent to ${email}.`,
        userRecord: userData
      };
      
    } catch (error) {
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please use a different email.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      
      throw new Error(`Failed to create manager account: ${error.message}`);
    }
  }

  // Update manager details and permissions
  async updateManager(managerId, updateData) {
    try {
      const managerRef = doc(db, this.collectionName, managerId);
      
      // Prepare update object
      const updates = {
        ...updateData,
        updatedAt: Timestamp.now()
      };
      
      // Update Firestore document
      await updateDoc(managerRef, updates);
      
      // Log the action
      await this.logUserAction('MANAGER_UPDATED', {
        managerId,
        updates: Object.keys(updateData)
      });
      
      return {
        success: true,
        message: 'Manager updated successfully!'
      };
      
    } catch (error) {
      throw new Error(`Failed to update manager: ${error.message}`);
    }
  }

  // Send password reset email using Firebase Auth
  async sendPasswordResetLink(email) {
    try {
      // Use Firebase's built-in password reset email
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: false
      });
      
      return { 
        success: true, 
        message: 'Password reset email sent successfully! Check your inbox.' 
      };
      
    } catch (error) {
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  // Send welcome email to new manager with password reset link
  async sendWelcomeEmail(email, displayName, temporaryPassword) {
    try {
      // Send Firebase password reset email instead of temporary password
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin,
        handleCodeInApp: false
      });
      
      // Store notification in Firestore for record
      await setDoc(doc(db, 'email_logs', `welcome_${Date.now()}`), {
        to: email,
        displayName,
        type: 'manager_welcome',
        sentAt: Timestamp.now(),
        status: 'sent'
      });
      
      return { 
        success: true, 
        message: 'Welcome email with password reset link sent successfully!' 
      };
      
    } catch (error) {
      // Don't throw here - email failure shouldn't break account creation
      return { 
        success: false, 
        message: 'Account created but email failed to send. You can manually reset the password.' 
      };
    }
  }

  // Get all managers (exclude removed ones)
  async getAllManagers() {
    try {
      // Use a simpler query to avoid composite index requirement
      const managersQuery = query(
        collection(db, this.collectionName),
        where('role', '==', 'manager')
      );
      
      const querySnapshot = await getDocs(managersQuery);
      const managers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out removed managers in JavaScript instead of Firestore query
        if (data.status !== 'removed') {
          managers.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            lastLogin: data.lastLogin?.toDate ? data.lastLogin.toDate() : data.lastLogin
          });
        }
      });
      
      return { success: true, data: managers };
    } catch (error) {
      // Provide more specific error messages
      if (error.code === 'failed-precondition') {
        return { 
          success: false, 
          error: 'Database index required. Please contact support to configure Firestore indexes.' 
        };
      } else if (error.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Permission denied. Please check your access permissions.' 
        };
      } else {
        return { 
          success: false, 
          error: `Failed to load managers: ${error.message}` 
        };
      }
    }
  }

  // Update manager status
  async updateManagerStatus(managerId, status) {
    try {
      const userRef = doc(db, this.collectionName, managerId);
      
      await updateDoc(userRef, {
        status,
        updatedAt: Timestamp.now()
      });
      
      await this.logUserAction('MANAGER_STATUS_UPDATED', {
        managerId,
        newStatus: status
      });
      
      return { success: true, message: `Manager ${status === 'active' ? 'activated' : 'deactivated'} successfully` };
    } catch (error) {
      throw error;
    }
  }

  // Remove manager (marks as removed in Firestore)
  async removeManager(managerId) {
    try {
      // Step 1: Get manager data before removal
      const managerRef = doc(db, this.collectionName, managerId);
      const managerDoc = await getDoc(managerRef);
      
      if (!managerDoc.exists()) {
        throw new Error('Manager not found');
      }
      
      const managerData = managerDoc.data();
      
      // Step 2: Check if this is an owner (prevent removal)
      if (managerData.role === 'owner') {
        throw new Error('Cannot remove owner account');
      }
      
      // Step 3: Mark as removed in Firestore (soft delete)
      await updateDoc(managerRef, {
        status: 'removed',
        removedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Step 4: Queue Firebase Auth deletion request
      // NOTE: Firebase Auth user deletion requires Admin SDK (backend/Cloud Function)
      // We'll create a deletion request that can be processed by a Cloud Function
      try {
        await setDoc(doc(db, 'auth_deletion_requests', `delete_${managerId}_${Date.now()}`), {
          action: 'DELETE_USER',
          userId: managerId,
          userEmail: managerData.email,
          userName: managerData.displayName,
          requestedBy: auth.currentUser?.uid,
          requestedByEmail: auth.currentUser?.email,
          requestedAt: Timestamp.now(),
          reason: 'Manager removed by owner',
          status: 'pending',
          processed: false
        });
        
      } catch (authError) {
        // Don't fail the entire operation if queuing fails
      }
      
      // Step 5: Log the removal action
      await this.logUserAction('MANAGER_REMOVED', {
        managerId,
        managerEmail: managerData.email,
        managerName: managerData.displayName
      });
      
      return { 
        success: true, 
        message: `Manager "${managerData.displayName}" has been removed successfully. Their account access has been disabled.` 
      };
    } catch (error) {
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      
      await this.logUserAction('PASSWORD_RESET_SENT', {
        targetEmail: email
      });
      
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error) {
      console.error('Error sending password reset:', error);
      throw new Error(`Failed to send password reset: ${error.message}`);
    }
  }

  // Log user management actions
  async logUserAction(actionType, actionData) {
    try {
      await setDoc(doc(db, 'user_management_logs', `${actionType}_${Date.now()}`), {
        actionType,
        actionData,
        timestamp: Timestamp.now(),
        performedBy: auth.currentUser?.uid || 'system'
      });
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  }

  // Check if email is already in use
  async isEmailInUse(email) {
    try {
      const usersQuery = query(
        collection(db, this.collectionName),
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  // Generate secure password
  generateSecurePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService();


