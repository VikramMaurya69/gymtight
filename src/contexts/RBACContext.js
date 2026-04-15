import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { rbacService, PERMISSIONS, ROLES } from '../services/rbacService';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from '../services/sqlAuthCompat';

// RBAC Context
const RBACContext = createContext();

// RBAC Actions
const RBAC_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ROLE: 'SET_ROLE',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_USER: 'CLEAR_USER'
};

// Initial state
const initialState = {
  loading: true,
  user: null,
  role: null,
  permissions: [],
  error: null,
  isAuthenticated: false,
  isAuthorized: false
};

// RBAC Reducer
function rbacReducer(state, action) {
  switch (action.type) {
    case RBAC_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case RBAC_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload
      };
    
    case RBAC_ACTIONS.SET_ROLE:
      return {
        ...state,
        role: action.payload,
        isAuthorized: !!action.payload
      };
    
    case RBAC_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload
      };
    
    case RBAC_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    case RBAC_ACTIONS.CLEAR_USER:
      return {
        ...initialState,
        loading: false
      };
    
    default:
      return state;
  }
}

// RBAC Provider Component
export function RBACProvider({ children }) {
  const [state, dispatch] = useReducer(rbacReducer, initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch({ type: RBAC_ACTIONS.SET_LOADING, payload: true });
      
      if (user) {
        try {
          dispatch({ type: RBAC_ACTIONS.SET_USER, payload: user });
          
          // Initialize user access and get role/permissions
          const { role, permissions } = await rbacService.initializeUserAccess(user);
          
          dispatch({ type: RBAC_ACTIONS.SET_ROLE, payload: role });
          dispatch({ type: RBAC_ACTIONS.SET_PERMISSIONS, payload: permissions });
          dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: null });
          
        } catch (error) {
          console.error('Error initializing user access:', error);
          dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: error.message });
          
          // Clear user data if unauthorized
          rbacService.clearUserData();
          dispatch({ type: RBAC_ACTIONS.CLEAR_USER });
        }
      } else {
        // User is signed out
        rbacService.clearUserData();
        dispatch({ type: RBAC_ACTIONS.CLEAR_USER });
      }
      
      dispatch({ type: RBAC_ACTIONS.SET_LOADING, payload: false });
    });

    return () => unsubscribe();
  }, []);

  // Memoize functions to prevent re-renders
  const clearError = useCallback(() => {
    dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: null });
  }, []);

  const addManager = useCallback(async (managerData) => {
    try {
      return await rbacService.addManager(managerData);
    } catch (error) {
      dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const updateManagerStatus = useCallback(async (managerId, status) => {
    try {
      return await rbacService.updateManagerStatus(managerId, status);
    } catch (error) {
      dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const removeManager = useCallback(async (managerId) => {
    try {
      return await rbacService.removeManager(managerId);
    } catch (error) {
      dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const getManagers = useCallback(async () => {
    try {
      return await rbacService.getManagers();
    } catch (error) {
      dispatch({ type: RBAC_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Memoize helper functions to prevent infinite re-renders
  const hasPermission = useCallback((permission) => rbacService.hasPermission(permission), []);
  const hasAnyPermission = useCallback((permissions) => rbacService.hasAnyPermission(permissions), []);
  const hasAllPermissions = useCallback((permissions) => rbacService.hasAllPermissions(permissions), []);
  const isOwner = useCallback(() => rbacService.isOwner(), []);
  const isManager = useCallback(() => rbacService.isManager(), []);

  const value = {
    // State
    ...state,
    
    // Helper functions - now memoized
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isManager,
    
    // Manager management (owner only) - now memoized
    addManager,
    updateManagerStatus,
    removeManager,
    getManagers,
    
    // Clear error - now memoized
    clearError
  };

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  );
}

// Hook to use RBAC context
export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}

// Higher-order component for permission-based rendering
export function withPermission(permission) {
  return function PermissionWrapper(Component) {
    return function PermissionComponent(props) {
      const { hasPermission } = useRBAC();
      
      if (!hasPermission(permission)) {
        return (
          <div className="permission-denied">
            <div className="permission-denied-content">
              <h3>Access Denied</h3>
              <p>You don't have permission to access this feature.</p>
            </div>
          </div>
        );
      }
      
      return <Component {...props} />;
    };
  };
}

// Component for conditional rendering based on permissions
export function PermissionGuard({ 
  permission, 
  permissions, 
  requireAll = false, 
  fallback = null, 
  children 
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    hasAccess = true; // No permission required
  }
  
  return hasAccess ? children : fallback;
}

// Role-based guard component
export function RoleGuard({ roles, fallback = null, children }) {
  const { role } = useRBAC();
  
  if (!roles.includes(role)) {
    return fallback;
  }
  
  return children;
}

// Export constants for convenience
export { PERMISSIONS, ROLES };

