/**
 * ETimeTrack Integration Service
 * Frontend service to communicate with ETimeTrack Bridge API
 */

const BRIDGE_API_BASE = process.env.REACT_APP_BRIDGE_API_URL || 'http://localhost:3001/api';

class ETimeTrackIntegrationService {
  constructor() {
    this.baseUrl = BRIDGE_API_BASE;
    this.isConnected = false;
    this.syncStatus = {
      isRunning: false,
      lastSync: null
    };
  }

  /**
   * Test connection to ETimeTrack database
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/test-connection`);
      const result = await response.json();
      this.isConnected = result.success;
      return result;
    } catch (error) {
      console.error('Connection test failed:', error);
      this.isConnected = false;
      return {
        success: false,
        message: 'Bridge API unreachable',
        error: error.message
      };
    }
  }

  /**
   * Discover ETimeTrack database schema
   */
  async discoverSchema() {
    try {
      const response = await fetch(`${this.baseUrl}/discover-schema`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Schema discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get attendance records from ETimeTrack
   */
  async getAttendanceRecords(startDate, endDate, tableName = null) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (tableName) params.append('tableName', tableName);

      const response = await fetch(`${this.baseUrl}/attendance?${params}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch attendance records');
      }
      
      return result.records;
    } catch (error) {
      console.error('Failed to get attendance records:', error);
      throw error;
    }
  }

  /**
   * Get employee list from ETimeTrack
   */
  async getEmployees(tableName = null) {
    try {
      const params = new URLSearchParams();
      if (tableName) params.append('tableName', tableName);

      const response = await fetch(`${this.baseUrl}/employees?${params}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch employees');
      }
      
      return result.employees;
    } catch (error) {
      console.error('Failed to get employees:', error);
      throw error;
    }
  }

  /**
   * Trigger manual sync to Firebase
   */
  async triggerSync() {
    try {
      const response = await fetch(`${this.baseUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }
      
      return result;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  /**
   * Start automatic sync
   */
  async startAutoSync() {
    try {
      const response = await fetch(`${this.baseUrl}/sync/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.syncStatus.isRunning = true;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to start auto sync:', error);
      throw error;
    }
  }

  /**
   * Stop automatic sync
   */
  async stopAutoSync() {
    try {
      const response = await fetch(`${this.baseUrl}/sync/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.syncStatus.isRunning = false;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to stop auto sync:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/sync/status`);
      const result = await response.json();
      
      if (result.success) {
        this.syncStatus = {
          isRunning: result.isRunning,
          lastSync: result.lastSync ? new Date(result.lastSync) : null,
          syncInterval: result.syncInterval
        };
      }
      
      return this.syncStatus;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(config) {
    try {
      const response = await fetch(`${this.baseUrl}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Configuration update failed');
      }
      
      return result;
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Check if bridge API is available
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      const result = await response.json();
      return result.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get real-time data for dashboard
   */
  async getDashboardData() {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      const [syncStatus, todayRecords] = await Promise.all([
        this.getSyncStatus(),
        this.getAttendanceRecords(yesterday, today)
      ]);
      
      return {
        syncStatus,
        todayRecords,
        isConnected: this.isConnected
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const etimeTrackIntegration = new ETimeTrackIntegrationService();

export { etimeTrackIntegration };
export default ETimeTrackIntegrationService;

