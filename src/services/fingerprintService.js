import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, startAfter, Timestamp, doc, updateDoc } from './sqlFirestoreCompat';
import { hardwareService } from './hardwareService';

// Client's Existing Device Configuration (will be auto-detected from ETimeTrack)
export const DEVICE_CONFIG = {
  deviceName: 'Client ETimeTrack Device',
  serialNumber: 'AUTO-DETECT',
  macAddress: 'AUTO-DETECT',
  fingerprintAlgorithm: 'ETimeTrack Compatible',
  faceAlgorithm: 'ETimeTrack Compatible',
  platform: 'ETimeTrack Integration'
};

// Fingerprint Service Class
export class FingerprintService {
  constructor() {
    this.deviceConnected = false;
    this.isListening = false;
    this.simulationMode = true; // Set to false when using real device
  }

  // Connect to client's existing ETimeTrack device
  async detectDevice() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Connecting to client\'s existing ETimeTrack device...');
      
      if (this.simulationMode) {
        // In simulation mode for testing - client has real device
        const deviceAvailable = Math.random() > 0.7; // Higher success rate for existing device
        
        if (!deviceAvailable) {
          throw new Error('Cannot connect to client\'s ETimeTrack device');
        }
        
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± Client device connected:', DEVICE_CONFIG.deviceName);
        return { 
          success: true, 
          deviceInfo: DEVICE_CONFIG,
          message: `Device ${DEVICE_CONFIG.deviceName} detected` 
        };
      } else {
        // Real device detection using hardware service
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Scanning for real x2008 fingerprint device...');
        const result = await hardwareService.detectRealDevice();
        
        if (result.success) {
          console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± Real device detected:', result.deviceInfo);
          return result;
        } else {
          throw new Error(result.message);
        }
      }
      
    } catch (error) {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Device detection failed:', error.message);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // Simulate device connection (replace with actual device SDK)
  async connectDevice() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Attempting to connect to fingerprint device...');
      
      // First, try to detect the device
      const detection = await this.detectDevice();
      if (!detection.success) {
        throw new Error(detection.message);
      }
      
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± Device Config:', DEVICE_CONFIG);
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ Establishing connection...');
      
      if (this.simulationMode) {
        // Simulate connection process with potential failures
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            // Simulate connection failure sometimes (20% chance)
            if (Math.random() < 0.2) {
              reject(new Error('Connection timeout - device may be busy or out of range'));
              return;
            }
            resolve();
          }, 3000); // Longer delay to simulate real connection
        });
      } else {
        // Real device connection using hardware service
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Connecting to real x2008 device...');
        const connectionResult = await hardwareService.connectToRealDevice();
        
        if (!connectionResult.success) {
          throw new Error(connectionResult.message);
        }
        
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Real device connected:', connectionResult.message);
      }
      
      this.deviceConnected = true;
      
      // Log device connection to Firebase
      await this.logDeviceEvent('DEVICE_CONNECTED', {
        deviceInfo: this.simulationMode ? DEVICE_CONFIG : hardwareService.getRealDeviceStatus().deviceInfo,
        timestamp: new Date(),
        connectionStatus: 'SUCCESS',
        mode: this.simulationMode ? 'SIMULATION' : 'REAL_HARDWARE'
      });

      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Fingerprint device connected successfully');
      return { success: true, message: 'Device connected successfully' };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Device connection failed:', error);
      await this.logDeviceEvent('DEVICE_CONNECTION_FAILED', {
        deviceInfo: DEVICE_CONFIG,
        timestamp: new Date(),
        error: error.message,
        mode: this.simulationMode ? 'SIMULATION' : 'REAL_HARDWARE'
      });
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  // Toggle between simulation and real device mode
  setSimulationMode(enabled) {
    this.simulationMode = enabled;
    console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â½ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Simulation mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (!enabled) {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Real device mode enabled - actual hardware required');
    }
  }

  // Check if we're in simulation mode
  isSimulationMode() {
    return this.simulationMode;
  }

  // Disconnect device
  async disconnectDevice() {
    try {
      if (!this.deviceConnected) {
        return { success: false, message: 'No device connected' };
      }

      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Disconnecting fingerprint device...');
      
      // Disconnect real hardware if not in simulation mode
      if (!this.simulationMode) {
        const disconnectionResult = await hardwareService.disconnectRealDevice();
        if (!disconnectionResult.success) {
          console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Real device disconnection failed:', disconnectionResult.message);
        }
      }
      
      this.deviceConnected = false;
      this.isListening = false;
      
      await this.logDeviceEvent('DEVICE_DISCONNECTED', {
        deviceInfo: this.simulationMode ? DEVICE_CONFIG : hardwareService.getRealDeviceStatus().deviceInfo,
        timestamp: new Date(),
        mode: this.simulationMode ? 'SIMULATION' : 'REAL_HARDWARE'
      });

      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Fingerprint device disconnected');
      return { success: true, message: 'Device disconnected successfully' };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Device disconnection failed:', error);
      return { success: false, message: 'Failed to disconnect device' };
    }
  }

  // Register fingerprint for a person (member or trainer) with ID/Mobile linking
  async registerFingerprint(personId, personType, personName, userDetails = {}) {
    if (!this.deviceConnected) {
      throw new Error('Device not connected. Please connect the fingerprint device first.');
    }

    try {
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Starting fingerprint registration for ${personType}: ${personName}`);
      
      // Extract ID and mobile from userDetails for linking
      const { memberId, trainerId, mobile, email, idNumber } = userDetails;
      
      // Step 1: Generate unique fingerprint template ID
      const fingerprintTemplateId = this.generateFingerprintId(personId, personType);
      
      // Step 2: Start fingerprint capture process
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ Place finger on scanner...');
      
      let fingerprintData;
      if (this.simulationMode) {
        // Simulate fingerprint capture with realistic delays and potential failures
        fingerprintData = await this.simulateFingerprint(fingerprintTemplateId, personName);
      } else {
        // Real fingerprint capture using hardware service
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ Capturing real fingerprint...');
        const captureResult = await hardwareService.captureRealFingerprint();
        
        if (!captureResult.success) {
          throw new Error(captureResult.message);
        }
        
        fingerprintData = captureResult.fingerprintData;
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Real fingerprint captured successfully');
      }

      // Step 3: Quality check
      const quality = fingerprintData.quality;
      if (quality < 60) {
        throw new Error(`Poor fingerprint quality (${quality}%). Please clean your finger and try again.`);
      }

      // Step 4: Prepare registration data for Firebase with ID/Mobile linking
      const registrationData = {
        personId,
        personType,
        personName,
        // Searchable identifiers for easy lookup
        memberId: personType === 'member' ? (memberId || personId) : null,
        trainerId: personType === 'trainer' ? (trainerId || personId) : null,
        mobileNumber: mobile || null,
        emailAddress: email || null,
        idNumber: idNumber || null,
        // Search index for quick lookups
        searchTerms: [
          personName.toLowerCase(),
          mobile,
          email,
          idNumber,
          personType === 'member' ? (memberId || personId) : null,
          personType === 'trainer' ? (trainerId || personId) : null
        ].filter(Boolean),
        
        fingerprintTemplateId,
        fingerprintTemplate: fingerprintData.template, // The actual biometric template
        qualityScore: quality,
        deviceInfo: this.simulationMode ? DEVICE_CONFIG : hardwareService.getRealDeviceStatus().deviceInfo,
        registrationDate: Timestamp.now(),
        status: 'ACTIVE',
        algorithm: DEVICE_CONFIG.fingerprintAlgorithm,
        confidence: quality, // Use real quality from hardware or simulated
        mode: this.simulationMode ? 'SIMULATION' : 'REAL_HARDWARE',
        createdBy: 'admin', // Could be the current user
        notes: `Fingerprint registered for ${personType} ${personName}`,
        lastUpdated: Timestamp.now()
      };

      // Step 5: Store in Firebase
      const docRef = await addDoc(collection(db, 'fingerprint_registrations'), registrationData);
      
      // Step 6: Create fingerprint-to-user mapping for quick search
      await this.createFingerprintMapping(docRef.id, registrationData);
      
      // Step 7: Log the registration event in fingerprint_logs for tracking
      await this.logFingerprintEvent('FINGERPRINT_REGISTERED', {
        registrationId: docRef.id,
        personId,
        personType,
        personName,
        fingerprintTemplateId,
        mobile,
        idNumber,
        timestamp: new Date()
      });

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Fingerprint registered successfully for ${personName}`);
      
      return {
        success: true,
        registrationId: docRef.id,
        fingerprintTemplateId,
        message: `Fingerprint registered successfully for ${personName}`,
        data: registrationData
      };
    } catch (error) {
      console.error('Fingerprint registration error:', error);
      
      await this.logFingerprintEvent('FINGERPRINT_REGISTRATION_ERROR', {
        personId,
        personType,
        personName,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  // Create fingerprint-to-user mapping for quick search
  async createFingerprintMapping(registrationId, registrationData) {
    try {
      const mappingData = {
        registrationId,
        personId: registrationData.personId,
        personName: registrationData.personName,
        personType: registrationData.personType,
        memberId: registrationData.memberId,
        trainerId: registrationData.trainerId,
        mobileNumber: registrationData.mobileNumber,
        emailAddress: registrationData.emailAddress,
        idNumber: registrationData.idNumber,
        fingerprintTemplateId: registrationData.fingerprintTemplateId,
        searchTerms: registrationData.searchTerms,
        status: 'ACTIVE',
        createdAt: Timestamp.now(),
        lastUpdated: Timestamp.now()
      };

      await addDoc(collection(db, 'fingerprint_mappings'), mappingData);
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Fingerprint mapping created for quick search');
    } catch (error) {
      console.error('Error creating fingerprint mapping:', error);
    }
  }

  // Generate mock fingerprint template (in real app, this comes from device)
  generateMockTemplate(templateId) {
    // This would be actual biometric data from the fingerprint scanner
    // For simulation, we create a unique identifier
    return {
      templateId,
      algorithm: 'FingerVX10.0',
      quality: 95,
      minutiae: `mock_template_data_${templateId}`,
      size: 512, // bytes
      encrypted: true
    };
  }

  // Start listening for fingerprint scans
  async startFingerprintListening(onScanCallback) {
    if (!this.deviceConnected) {
      throw new Error('Device not connected');
    }

    this.isListening = true;
    console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ Started listening for fingerprint scans...');

    if (this.simulationMode) {
      // Simulate fingerprint scanning (replace with actual device SDK)
      const scanInterval = setInterval(async () => {
        if (!this.isListening) {
          clearInterval(scanInterval);
          return;
        }

        // Simulate random fingerprint scan detection (10% chance every second)
        if (Math.random() < 0.1) {
          const mockScanData = await this.simulateFingerprintScan();
          if (mockScanData && onScanCallback) {
            onScanCallback(mockScanData);
          }
        }
      }, 1000);
    } else {
      // Start real fingerprint listening using hardware service
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ Starting real fingerprint listening...');
      const result = await hardwareService.startRealFingerprintListening(async (scanData) => {
        // Process real scan data and match with database
        const processedScanData = await this.processRealScanData(scanData);
        if (processedScanData && onScanCallback) {
          onScanCallback(processedScanData);
        }
      });
      
      if (!result.success) {
        this.isListening = false;
        throw new Error(result.message);
      }
    }

    return { success: true, message: 'Started fingerprint listening' };
  }

  // Stop listening for fingerprint scans
  stopFingerprintListening() {
    this.isListening = false;
    console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡ Stopped listening for fingerprint scans');
    
    // Stop real hardware listening if not in simulation mode
    if (!this.simulationMode) {
      hardwareService.stopRealFingerprintListening().catch(error => {
        console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to stop real fingerprint listening:', error);
      });
    }
    
    return { success: true, message: 'Stopped fingerprint listening' };
  }

  // Process real scan data from hardware device
  async processRealScanData(scanData) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Processing real fingerprint scan...');
      
      if (!scanData.matched) {
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Fingerprint not matched by device');
        return {
          matched: false,
          message: 'Fingerprint not recognized',
          scanTime: scanData.scanTime,
          deviceInfo: scanData.deviceInfo
        };
      }

      // Find the registered fingerprint in our database using template ID
      const registrationsQuery = query(
        collection(db, 'fingerprint_registrations'),
        where('fingerprintTemplateId', '==', scanData.templateId),
        where('status', '==', 'ACTIVE')
      );
      
      const registrationsSnapshot = await getDocs(registrationsQuery);
      
      if (registrationsSnapshot.empty) {
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Template ID not found in database:', scanData.templateId);
        return {
          matched: false,
          message: 'Fingerprint template not found in database',
          scanTime: scanData.scanTime,
          deviceInfo: scanData.deviceInfo
        };
      }

      const registrationDoc = registrationsSnapshot.docs[0];
      const registration = { id: registrationDoc.id, ...registrationDoc.data() };
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Real fingerprint matched: ${registration.personName} (${scanData.confidence}% confidence)`);
      
      const processedScanData = {
        matched: true,
        personId: registration.personId,
        personType: registration.personType,
        personName: registration.personName,
        fingerprintTemplateId: registration.fingerprintTemplateId,
        registrationId: registration.id,
        confidence: scanData.confidence,
        scanTime: scanData.scanTime,
        deviceInfo: scanData.deviceInfo,
        mode: 'REAL_HARDWARE'
      };

      // Log the successful scan
      await this.logAttendanceScan(processedScanData);
      
      return processedScanData;
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Real fingerprint scan processing error:', error);
      return null;
    }
  }

  // Simulate fingerprint scan (replace with actual device SDK)
  async simulateFingerprintScan() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Fingerprint detected, processing...');
      
      // Get all registered fingerprints from the database
      const registrationsQuery = query(
        collection(db, 'fingerprint_registrations'),
        where('status', '==', 'ACTIVE')
      );
      
      const registrationsSnapshot = await getDocs(registrationsQuery);
      const registrations = registrationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (registrations.length === 0) {
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ No registered fingerprints found');
        return null;
      }

      // For simulation: randomly select a registered member (in real app, this would be fingerprint matching)
      const matchedRegistration = registrations[Math.floor(Math.random() * registrations.length)];
      
      // Simulate fingerprint matching confidence (in real app, this comes from the device)
      const matchConfidence = 85 + Math.random() * 15; // 85-100% confidence
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Fingerprint matched: ${matchedRegistration.personName} (${matchConfidence.toFixed(1)}% confidence)`);
      
      const scanData = {
        matched: true,
        personId: matchedRegistration.personId,
        personType: matchedRegistration.personType,
        personName: matchedRegistration.personName,
        fingerprintTemplateId: matchedRegistration.fingerprintTemplateId,
        registrationId: matchedRegistration.id,
        confidence: matchConfidence,
        scanTime: new Date(),
        deviceInfo: DEVICE_CONFIG
      };

      // Log the successful scan
      await this.logAttendanceScan(scanData);
      
      return scanData;
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Fingerprint scan simulation error:', error);
      return null;
    }
  }

  // Simulate a specific member scanning their fingerprint for attendance
  async simulateMemberScan(memberId) {
    try {
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Simulating fingerprint scan for member ID: ${memberId}`);
      
      // Find the member's registered fingerprint
      const memberFingerprints = await this.getPersonFingerprints(memberId.toString(), 'member');
      
      if (memberFingerprints.length === 0) {
        console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ No fingerprint registered for member ID: ${memberId}`);
        return { 
          success: false, 
          message: 'No fingerprint registered for this member' 
        };
      }
      
      const fingerprint = memberFingerprints[0]; // Use the first registered fingerprint
      
      // Simulate scan success with high confidence
      const scanData = {
        matched: true,
        personId: fingerprint.personId,
        personType: fingerprint.personType,
        personName: fingerprint.personName,
        fingerprintTemplateId: fingerprint.fingerprintTemplateId,
        registrationId: fingerprint.id,
        confidence: 95 + Math.random() * 5, // 95-100% confidence for known member
        scanTime: new Date(),
        deviceInfo: DEVICE_CONFIG
      };

      // Log the attendance
      await this.logAttendanceScan(scanData);
      
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Attendance logged for ${fingerprint.personName}`);
      
      return { 
        success: true, 
        message: `Welcome ${fingerprint.personName}! Attendance recorded.`,
        data: scanData
      };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error simulating member scan:', error);
      return { 
        success: false, 
        message: 'Scan failed: ' + error.message 
      };
    }
  }

  // Log attendance when fingerprint is scanned
  async logAttendanceScan(scanData) {
    try {
      // Create attendance log entry
      const attendanceData = {
        personId: scanData.personId,
        personType: scanData.personType,
        personName: scanData.personName,
        fingerprintTemplateId: scanData.fingerprintTemplateId,
        registrationId: scanData.registrationId,
        scanTime: Timestamp.fromDate(scanData.scanTime),
        confidence: scanData.confidence,
        deviceInfo: scanData.deviceInfo,
        status: 'CHECKED_IN',
        notes: `Automatic check-in via fingerprint scan`
      };

      // Store in attendance_logs collection
      const attendanceRef = await addDoc(collection(db, 'attendance_logs'), attendanceData);
      
      // Also log in fingerprint_logs for tracking
      await this.logFingerprintEvent('FINGERPRINT_SCAN_SUCCESS', {
        attendanceId: attendanceRef.id,
        personId: scanData.personId,
        personType: scanData.personType,
        personName: scanData.personName,
        confidence: scanData.confidence,
        timestamp: scanData.scanTime
      });

      // Update member's last visit if it's a member
      if (scanData.personType === 'member') {
        await this.updateMemberLastVisit(scanData.personId);
      }

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Attendance logged for ${scanData.personName}`);
      
      return { success: true, attendanceId: attendanceRef.id };
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error logging attendance:', error);
      await this.logFingerprintEvent('ATTENDANCE_LOG_ERROR', {
        personId: scanData.personId,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  // Update member's last visit timestamp
  async updateMemberLastVisit(memberId) {
    try {
      const { membersService } = await import('./membersService');
      await membersService.updateLastVisit(memberId);
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Error updating member last visit:', error);
    }
  }

  // Log device events
  async logDeviceEvent(eventType, eventData) {
  }

  // Log fingerprint events
  async logFingerprintEvent(eventType, eventData) {
    try {
      const logData = {
        eventType,
        eventData,
        timestamp: Timestamp.fromDate(eventData.timestamp),
        deviceInfo: DEVICE_CONFIG
      };

      await addDoc(collection(db, 'fingerprint_events'), logData);
    } catch (error) {
      console.error('Error logging fingerprint event:', error);
    }
  }

  // Get fingerprint logs with pagination
  async getFingerprintLogs(limitCount = 50, lastDoc = null) {
    try {
      let q = query(
        collection(db, 'fingerprint_logs'),
        orderBy('scanTime', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scanTime: doc.data().scanTime.toDate()
      }));

      return {
        logs,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Error fetching fingerprint logs:', error);
      throw error;
    }
  }

  // Get registered fingerprints for a person
  async getPersonFingerprints(personId, personType) {
    try {
      const q = query(
        collection(db, 'fingerprint_registrations'),
        where('personId', '==', personId),
        where('personType', '==', personType),
        where('status', '==', 'ACTIVE')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registrationDate: doc.data().registrationDate.toDate()
      }));
    } catch (error) {
      console.error('Error fetching person fingerprints:', error);
      throw error;
    }
  }

  // Search fingerprints by ID, mobile number, or name
  async searchFingerprints(searchTerm) {
    try {
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Searching fingerprints for: "${searchTerm}"`);
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return { success: false, message: 'Search term must be at least 2 characters' };
      }

      const normalizedSearch = searchTerm.toLowerCase().trim();
      
      // Search in fingerprint_mappings collection for quick results
      const mappingsQuery = query(
        collection(db, 'fingerprint_mappings'),
        where('status', '==', 'ACTIVE')
      );
      
      const mappingsSnapshot = await getDocs(mappingsQuery);
      const results = [];
      
      mappingsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if search term matches any of the searchable fields
        const isMatch = 
          data.personName?.toLowerCase().includes(normalizedSearch) ||
          data.mobileNumber?.includes(searchTerm) ||
          data.emailAddress?.toLowerCase().includes(normalizedSearch) ||
          data.idNumber?.toLowerCase().includes(normalizedSearch) ||
          data.memberId?.toLowerCase().includes(normalizedSearch) ||
          data.trainerId?.toLowerCase().includes(normalizedSearch) ||
          data.searchTerms?.some(term => term?.toLowerCase().includes(normalizedSearch));
        
        if (isMatch) {
          results.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date()
          });
        }
      });

      // Sort results by relevance (exact matches first, then partial matches)
      results.sort((a, b) => {
        const aExact = a.mobileNumber === searchTerm || 
                      a.idNumber?.toLowerCase() === normalizedSearch ||
                      a.memberId?.toLowerCase() === normalizedSearch ||
                      a.trainerId?.toLowerCase() === normalizedSearch;
        const bExact = b.mobileNumber === searchTerm || 
                      b.idNumber?.toLowerCase() === normalizedSearch ||
                      b.memberId?.toLowerCase() === normalizedSearch ||
                      b.trainerId?.toLowerCase() === normalizedSearch;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then sort by name
        return a.personName.localeCompare(b.personName);
      });

      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Found ${results.length} fingerprint records for "${searchTerm}"`);
      
      return {
        success: true,
        data: results,
        count: results.length,
        searchTerm
      };
    } catch (error) {
      console.error('Error searching fingerprints:', error);
      return { success: false, message: error.message };
    }
  }

  // Get fingerprint by specific ID or mobile number
  async getFingerprintByIdentifier(identifier, type = 'auto') {
    try {
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Getting fingerprint by ${type}: ${identifier}`);
      
      let query_condition;
      
      switch (type) {
        case 'mobile':
          query_condition = where('mobileNumber', '==', identifier);
          break;
        case 'memberId':
          query_condition = where('memberId', '==', identifier);
          break;
        case 'trainerId':
          query_condition = where('trainerId', '==', identifier);
          break;
        case 'email':
          query_condition = where('emailAddress', '==', identifier.toLowerCase());
          break;
        case 'idNumber':
          query_condition = where('idNumber', '==', identifier.toLowerCase());
          break;
        default:
          // Auto-detect type based on identifier format
          if (/^\d{10}$/.test(identifier)) {
            query_condition = where('mobileNumber', '==', identifier);
          } else if (identifier.includes('@')) {
            query_condition = where('emailAddress', '==', identifier.toLowerCase());
          } else {
            // Try searching in multiple fields
            return await this.searchFingerprints(identifier);
          }
      }

      const mappingsQuery = query(
        collection(db, 'fingerprint_mappings'),
        query_condition,
        where('status', '==', 'ACTIVE')
      );
      
      const snapshot = await getDocs(mappingsQuery);
      const results = [];
      
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          lastUpdated: doc.data().lastUpdated?.toDate ? doc.data().lastUpdated.toDate() : new Date()
        });
      });

      return {
        success: true,
        data: results,
        count: results.length
      };
    } catch (error) {
      console.error('Error getting fingerprint by identifier:', error);
      return { success: false, message: error.message };
    }
  }

  // Get all fingerprint registrations with search and filter options
  async getAllFingerprintRegistrations(options = {}) {
    try {
      const {
        personType = null,
        status = 'ACTIVE',
        limit_count = 100,
        searchTerm = null
      } = options;

      let fingerprintQuery = query(
        collection(db, 'fingerprint_mappings'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      if (personType) {
        fingerprintQuery = query(
          collection(db, 'fingerprint_mappings'),
          where('status', '==', status),
          where('personType', '==', personType),
          orderBy('createdAt', 'desc')
        );
      }

      if (limit_count > 0) {
        fingerprintQuery = query(fingerprintQuery, limit(limit_count));
      }

      const snapshot = await getDocs(fingerprintQuery);
      let results = [];
      
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          lastUpdated: doc.data().lastUpdated?.toDate ? doc.data().lastUpdated.toDate() : new Date()
        });
      });

      // Apply search filter if provided
      if (searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase().trim();
        results = results.filter(item =>
          item.personName?.toLowerCase().includes(normalizedSearch) ||
          item.mobileNumber?.includes(searchTerm) ||
          item.emailAddress?.toLowerCase().includes(normalizedSearch) ||
          item.idNumber?.toLowerCase().includes(normalizedSearch) ||
          item.memberId?.toLowerCase().includes(normalizedSearch) ||
          item.trainerId?.toLowerCase().includes(normalizedSearch)
        );
      }

      return {
        success: true,
        data: results,
        count: results.length,
        filters: options
      };
    } catch (error) {
      console.error('Error getting all fingerprint registrations:', error);
      return { success: false, message: error.message };
    }
  }

  // Update fingerprint mapping when user details change
  async updateFingerprintMapping(personId, personType, updatedDetails) {
    try {
      const mappingsQuery = query(
        collection(db, 'fingerprint_mappings'),
        where('personId', '==', personId),
        where('personType', '==', personType),
        where('status', '==', 'ACTIVE')
      );
      
      const snapshot = await getDocs(mappingsQuery);
      
      const updatePromises = [];
      snapshot.forEach((doc) => {
        const updateData = {
          ...updatedDetails,
          searchTerms: [
            updatedDetails.personName?.toLowerCase(),
            updatedDetails.mobile,
            updatedDetails.email,
            updatedDetails.idNumber,
            personType === 'member' ? updatedDetails.memberId : updatedDetails.trainerId
          ].filter(Boolean),
          lastUpdated: Timestamp.now()
        };
        
        updatePromises.push(updateDoc(doc.ref, updateData));
      });
      
      await Promise.all(updatePromises);
      console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Updated fingerprint mappings for ${personType} ${personId}`);
      
      return { success: true, message: 'Fingerprint mappings updated' };
    } catch (error) {
      console.error('Error updating fingerprint mapping:', error);
      return { success: false, message: error.message };
    }
  }

  // Delete fingerprint registration
  async deleteFingerprint(registrationId) {
    try {
      const registrationRef = doc(db, 'fingerprint_registrations', registrationId);
      await updateDoc(registrationRef, {
        status: 'DELETED',
        deletedAt: Timestamp.now()
      });

      await this.logFingerprintEvent('FINGERPRINT_DELETED', {
        registrationId,
        timestamp: new Date()
      });

      return { success: true, message: 'Fingerprint deleted successfully' };
    } catch (error) {
      console.error('Error deleting fingerprint:', error);
      throw error;
    }
  }

  // Get device status
  getDeviceStatus() {
    if (this.simulationMode) {
      return {
        connected: this.deviceConnected,
        listening: this.isListening,
        simulationMode: this.simulationMode,
        deviceInfo: DEVICE_CONFIG
      };
    } else {
      // Get real device status from hardware service
      const hardwareStatus = hardwareService.getRealDeviceStatus();
      return {
        connected: this.deviceConnected && hardwareStatus.connected,
        listening: this.isListening && hardwareStatus.listening,
        simulationMode: this.simulationMode,
        deviceInfo: hardwareStatus.deviceInfo,
        connectionType: hardwareStatus.connectionType
      };
    }
  }
}

// Export singleton instance
export const fingerprintService = new FingerprintService();


