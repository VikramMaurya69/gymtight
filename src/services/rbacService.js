import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp
} from './sqlFirestoreCompat';

// Role definitions
export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager'
};

// Permission definitions
export const PERMISSIONS = {
  // Core Management
  VIEW_DASHBOARD: 'view_dashboard',

  // Member Management
  VIEW_MEMBERS: 'view_members',
  ADD_MEMBERS: 'add_members',
  EDIT_MEMBERS: 'edit_members',
  DELETE_MEMBERS: 'delete_members',

  // Trainer Management
  VIEW_TRAINERS: 'view_trainers',
  ADD_TRAINERS: 'add_trainers',
  EDIT_TRAINERS: 'edit_trainers',
  DELETE_TRAINERS: 'delete_trainers',

  // Fingerprint Management
  VIEW_FINGERPRINT: 'view_fingerprint',
  MANAGE_FINGERPRINT_DEVICE: 'manage_fingerprint_device',
  REGISTER_FINGERPRINT: 'register_fingerprint',
  DELETE_FINGERPRINT: 'delete_fingerprint',

  // Subscription Management
  VIEW_SUBSCRIPTIONS: 'view_subscriptions',
  MANAGE_SUBSCRIPTIONS: 'manage_subscriptions',

  // Basic Operations
  VIEW_ATTENDANCE: 'view_attendance',
  MANAGE_ATTENDANCE: 'manage_attendance',

  // Advanced Features
  VIEW_FINANCIALS: 'view_financials',
  MANAGE_FINANCIALS: 'manage_financials',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_PACKAGES: 'manage_packages',
  MANAGE_SHIFTS: 'manage_shifts',

  // Communication
  SEND_SMS: 'send_sms',
  SEND_NOTIFICATIONS: 'send_notifications',
  MANAGE_WHATSAPP: 'manage_whatsapp',

  // System Administration
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_SECURITY: 'view_security',
  MANAGE_SECURITY: 'manage_security',
  SYSTEM_SETTINGS: 'system_settings',

  // App Content Management
  MANAGE_BANNERS: 'manage_banners',
  MANAGE_MESSAGES: 'manage_messages'
};

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    // All permissions for owner
    ...Object.values(PERMISSIONS)
  ],
  [ROLES.MANAGER]: [
    // Basic dashboard access
    PERMISSIONS.VIEW_DASHBOARD,

    // Member management (full access)
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.ADD_MEMBERS,
    PERMISSIONS.EDIT_MEMBERS,
    PERMISSIONS.DELETE_MEMBERS,

    // Trainer management (view and basic operations)
    PERMISSIONS.VIEW_TRAINERS,
    PERMISSIONS.ADD_TRAINERS,
    PERMISSIONS.EDIT_TRAINERS,

    // Fingerprint management (basic operations)
    PERMISSIONS.VIEW_FINGERPRINT,
    PERMISSIONS.REGISTER_FINGERPRINT,
    PERMISSIONS.DELETE_FINGERPRINT,

    // Subscription management (view and basic operations)
    PERMISSIONS.VIEW_SUBSCRIPTIONS,
    PERMISSIONS.MANAGE_SUBSCRIPTIONS,

    // Attendance management
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_ATTENDANCE,

    // Basic communication
    PERMISSIONS.SEND_SMS,
    PERMISSIONS.SEND_NOTIFICATIONS,

    // App Content Management
    PERMISSIONS.MANAGE_BANNERS,
    PERMISSIONS.MANAGE_MESSAGES
  ]
};

// Owner email configuration
export const OWNER_EMAIL = 'griptightfitness@gmail.com';

export class RBACService {
  constructor() {
    this.currentUser = null;
    this.currentUserRole = null;
    this.currentUserPermissions = [];
  }

  // Initialize user role and permissions
  async initializeUserAccess(user) {
    try {
      this.currentUser = user;

      // Check if user is the owner
      if (user.email === OWNER_EMAIL) {
        this.currentUserRole = ROLES.OWNER;
        this.currentUserPermissions = ROLE_PERMISSIONS[ROLES.OWNER];

        // Ensure owner record exists in database
        await this.ensureOwnerRecord(user);
        return { role: ROLES.OWNER, permissions: this.currentUserPermissions };
      }

      // Check if user is a manager or has custom role
      const userDoc = await this.getUserRole(user.uid);
      if (userDoc && userDoc.status === 'active') {
        this.currentUserRole = userDoc.role || ROLES.MANAGER;

        // Use explicit permissions only when they are a non-empty array.
        // This prevents empty persisted arrays from removing all UI access.
        const hasExplicitPermissions = Array.isArray(userDoc.permissions) && userDoc.permissions.length > 0;
        const rolePermissions = ROLE_PERMISSIONS[this.currentUserRole] || ROLE_PERMISSIONS[ROLES.MANAGER];
        this.currentUserPermissions = hasExplicitPermissions ? userDoc.permissions : rolePermissions;

        // Owner should always retain full permissions unless explicitly customized.
        if (this.currentUserRole === ROLES.OWNER && !hasExplicitPermissions) {
          this.currentUserPermissions = ROLE_PERMISSIONS[ROLES.OWNER];
        }

        return { role: this.currentUserRole, permissions: this.currentUserPermissions };
      }

      // Unauthorized user
      throw new Error('You do not have access to this admin panel. Please contact the gym owner for access.');

    } catch (error) {
      throw error;
    }
  }

  // Ensure owner record exists in database
  async ensureOwnerRecord(user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Gym Owner',
          role: ROLES.OWNER,
          status: 'active',
          permissions: ROLE_PERMISSIONS[ROLES.OWNER],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: 'system'
        });
      }
    } catch (error) {
      // Silent error handling for owner record
    }
  }

  // Get user role from database
  async getUserRole(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Add a new manager (only owner can do this)
  async addManager(managerData) {
    if (!this.hasPermission(PERMISSIONS.MANAGE_USERS)) {
      throw new Error('You do not have permission to add managers');
    }

    try {
      const { uid, email, displayName } = managerData;

      // Check if user already exists
      const existingUser = await this.getUserRole(uid);
      if (existingUser) {
        throw new Error('User already exists in the system');
      }

      // Create manager record
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid,
        email,
        displayName: displayName || 'Manager',
        role: ROLES.MANAGER,
        status: 'active',
        permissions: ROLE_PERMISSIONS[ROLES.MANAGER],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: this.currentUser.uid
      });

      // Log the action
      await this.logUserAction('MANAGER_ADDED', {
        targetUserId: uid,
        targetUserEmail: email,
        addedBy: this.currentUser.email
      });

      return { success: true, message: 'Manager added successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Update manager status (activate/deactivate)
  async updateManagerStatus(managerId, status) {
    if (!this.hasPermission(PERMISSIONS.MANAGE_USERS)) {
      throw new Error('You do not have permission to manage users');
    }

    try {
      const userRef = doc(db, 'users', managerId);
      await updateDoc(userRef, {
        status,
        updatedAt: Timestamp.now(),
        updatedBy: this.currentUser.uid
      });

      await this.logUserAction('MANAGER_STATUS_UPDATED', {
        targetUserId: managerId,
        newStatus: status,
        updatedBy: this.currentUser.email
      });

      return { success: true, message: `Manager ${status === 'active' ? 'activated' : 'deactivated'} successfully` };
    } catch (error) {
      throw error;
    }
  }

  // Remove manager (only owner can do this)
  async removeManager(managerId) {
    if (!this.hasPermission(PERMISSIONS.MANAGE_USERS)) {
      throw new Error('You do not have permission to remove managers');
    }

    try {
      const userRef = doc(db, 'users', managerId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Manager not found');
      }

      const userData = userDoc.data();
      if (userData.role === ROLES.OWNER) {
        throw new Error('Cannot remove owner account');
      }

      await deleteDoc(userRef);

      await this.logUserAction('MANAGER_REMOVED', {
        targetUserId: managerId,
        targetUserEmail: userData.email,
        removedBy: this.currentUser.email
      });

      return { success: true, message: 'Manager removed successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get all managers (only owner can see this)
  async getManagers() {
    if (!this.hasPermission(PERMISSIONS.MANAGE_USERS)) {
      throw new Error('You do not have permission to view managers');
    }

    try {
      const managersQuery = query(
        collection(db, 'users'),
        where('role', '==', ROLES.MANAGER)
      );

      const querySnapshot = await getDocs(managersQuery);
      const managers = [];

      querySnapshot.forEach((doc) => {
        managers.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate()
        });
      });

      return managers;
    } catch (error) {
      throw error;
    }
  }

  // Check if current user has a specific permission
  hasPermission(permission) {
    return this.currentUserPermissions.includes(permission);
  }

  // Check if current user has any of the specified permissions
  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  // Check if current user has all specified permissions
  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  // Get current user role
  getCurrentRole() {
    return this.currentUserRole;
  }

  // Get current user permissions
  getCurrentPermissions() {
    return this.currentUserPermissions;
  }

  // Check if current user is owner
  isOwner() {
    return this.currentUserRole === ROLES.OWNER;
  }

  // Check if current user is manager
  isManager() {
    return this.currentUserRole === ROLES.MANAGER;
  }

  // Log user actions for audit trail
  async logUserAction(action, details) {
    try {
      await setDoc(doc(collection(db, 'user_actions')), {
        action,
        details,
        performedBy: this.currentUser.uid,
        performedByEmail: this.currentUser.email,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      // Silent error handling for user action logging
    }
  }

  // Get filtered menu items based on permissions
  getAuthorizedMenuItems(allMenuItems) {
    return allMenuItems.filter(item => {
      if (!item.requiredPermission) return true;
      return this.hasPermission(item.requiredPermission);
    });
  }

  // Clear user data on logout
  clearUserData() {
    this.currentUser = null;
    this.currentUserRole = null;
    this.currentUserPermissions = [];
  }
}

// Export singleton instance
export const rbacService = new RBACService();


