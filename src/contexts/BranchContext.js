import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { branchService } from '../services/branchService';

const BranchContext = createContext();

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const result = await branchService.getAllBranches();
      
      if (result.success && result.data.length > 0) {
        setBranches(result.data);
        
        // Get stored branch from localStorage or use first branch
        const storedBranchId = localStorage.getItem('selectedBranchId');
        const storedBranch = storedBranchId 
          ? result.data.find(branch => branch.id === storedBranchId)
          : result.data[0];
        
        setCurrentBranch(storedBranch || result.data[0]);
      } else {
        // Create default branch if none exist
        await createDefaultBranch();
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      // Create default branch on error
      await createDefaultBranch();
    } finally {
      setLoading(false);
    }
  }, []);

  // Load branches on component mount
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const createDefaultBranch = async () => {
    try {
      const defaultBranch = {
        name: 'Main Branch',
        address: 'Head Office',
        phone: '',
        email: '',
        manager: 'Admin',
        status: 'Active'
      };
      
      const result = await branchService.createBranch(defaultBranch);
      if (result.success) {
        const newBranch = { id: result.data.id, ...defaultBranch };
        setBranches([newBranch]);
        setCurrentBranch(newBranch);
      }
    } catch (error) {
      console.error('Error creating default branch:', error);
    }
  };

  const switchBranch = (branch) => {
    setCurrentBranch(branch);
    localStorage.setItem('selectedBranchId', branch.id);
  };

  const addBranch = (newBranch) => {
    setBranches(prev => [...prev, newBranch]);
  };

  const updateBranch = (branchId, updatedData) => {
    setBranches(prev => 
      prev.map(branch => 
        branch.id === branchId 
          ? { ...branch, ...updatedData }
          : branch
      )
    );
    
    if (currentBranch?.id === branchId) {
      setCurrentBranch(prev => ({ ...prev, ...updatedData }));
    }
  };

  const removeBranch = (branchId) => {
    setBranches(prev => prev.filter(branch => branch.id !== branchId));
    
    if (currentBranch?.id === branchId && branches.length > 1) {
      const remainingBranches = branches.filter(branch => branch.id !== branchId);
      setCurrentBranch(remainingBranches[0]);
      localStorage.setItem('selectedBranchId', remainingBranches[0].id);
    }
  };

  const value = {
    branches,
    currentBranch,
    loading,
    switchBranch,
    addBranch,
    updateBranch,
    removeBranch,
    loadBranches
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

