import { DEVICE_CONFIG } from './fingerprintService';

/**
 * Real Hardware Integration Service for x2008 Fingerprint Device
 * This service handles actual communication with the physical fingerprint device
 */
export class HardwareService {
  constructor() {
    this.device = null;
    this.isConnected = false;
    this.serialPort = null;
    this.networkDevice = null;
    this.connectionType = null; // 'usb', 'network', or null
  }

  /**
   * Detect real fingerprint device
   * Checks for USB and network connections
   */
  async detectRealDevice() {
    console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Scanning for real fingerprint hardware...');
    
    try {
      // Check for USB connection first
      const usbDevice = await this.detectUSBDevice();
      if (usbDevice) {
        this.connectionType = 'usb';
        this.device = usbDevice;
        return {
          success: true,
          deviceInfo: {
            ...DEVICE_CONFIG,
            connectionType: 'USB',
            port: usbDevice.port
          },
          message: `Device detected on USB port: ${usbDevice.port}`
        };
      }

      // Check for network connection
      const networkDevice = await this.detectNetworkDevice();
      if (networkDevice) {
        this.connectionType = 'network';
        this.device = networkDevice;
        return {
          success: true,
          deviceInfo: {
            ...DEVICE_CONFIG,
            connectionType: 'Network',
            ipAddress: networkDevice.ip,
            port: networkDevice.port
          },
          message: `Device detected on network: ${networkDevice.ip}:${networkDevice.port}`
        };
      }

      throw new Error('No x2008 fingerprint device found');
      
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Real device detection failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Detect USB connected fingerprint device
   */
  async detectUSBDevice() {
    try {
      // Check if Web Serial API is supported
      if (!navigator.serial) {
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Web Serial API not supported in this browser');
        // Try alternative USB detection methods
        return await this.detectUSBAlternative();
      }

      // Request available serial ports
      const ports = await navigator.serial.getPorts();
      
      for (const port of ports) {
        const info = port.getInfo();
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Found USB device:', info);
        
        // Check if this matches our x2008 device
        // x2008 typically uses specific vendor/product IDs
        if (this.isX2008Device(info)) {
          return {
            port: port,
            vendorId: info.usbVendorId,
            productId: info.usbProductId,
            type: 'serial'
          };
        }
      }

      // If no existing ports, try to request permission for new device
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± Requesting permission to access USB device...');
      try {
        const port = await navigator.serial.requestPort({
          filters: [
            // Add specific filters for x2008 device
            { usbVendorId: 0x2017 }, // Common fingerprint device vendor
            { usbVendorId: 0x1234 }  // Add your specific vendor ID
          ]
        });
        
        const info = port.getInfo();
        if (this.isX2008Device(info)) {
          return {
            port: port,
            vendorId: info.usbVendorId,
            productId: info.usbProductId,
            type: 'serial'
          };
        }
      } catch (permissionError) {
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ User denied USB device access or no device selected');
      }

      return null;
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ USB detection error:', error);
      return null;
    }
  }

  /**
   * Alternative USB detection for browsers without Web Serial API
   */
  async detectUSBAlternative() {
    try {
      // Check if WebUSB API is available
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        
        for (const device of devices) {
          console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Found WebUSB device:', device);
          
          if (this.isX2008USBDevice(device)) {
            return {
              port: device,
              vendorId: device.vendorId,
              productId: device.productId,
              type: 'webusb'
            };
          }
        }

        // Try to request device access
        try {
          const device = await navigator.usb.requestDevice({
            filters: [
              { vendorId: 0x2017 }, // Add your device's vendor ID
              { vendorId: 0x1234 }
            ]
          });
          
          if (this.isX2008USBDevice(device)) {
            return {
              port: device,
              vendorId: device.vendorId,
              productId: device.productId,
              type: 'webusb'
            };
          }
        } catch (permissionError) {
          console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ User denied WebUSB device access');
        }
      }

      return null;
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Alternative USB detection error:', error);
      return null;
    }
  }

  /**
   * Detect network connected fingerprint device
   */
  async detectNetworkDevice() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Scanning for network fingerprint device...');
      
      // Try common IP addresses and ports for x2008 devices
      const commonAddresses = [
        '192.168.1.100:4370',  // Default x2008 network settings
        '192.168.0.100:4370',
        '10.0.0.100:4370',
        '192.168.1.201:4370'   // Alternative common address
      ];

      for (const address of commonAddresses) {
        const [ip, port] = address.split(':');
        
        try {
          const isReachable = await this.pingDevice(ip, parseInt(port));
          if (isReachable) {
            // Try to establish communication
            const deviceInfo = await this.getNetworkDeviceInfo(ip, parseInt(port));
            if (deviceInfo && this.isX2008NetworkDevice(deviceInfo)) {
              return {
                ip: ip,
                port: parseInt(port),
                deviceInfo: deviceInfo,
                type: 'network'
              };
            }
          }
        } catch (error) {
          console.log(`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to connect to ${address}:`, error.message);
        }
      }

      return null;
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Network detection error:', error);
      return null;
    }
  }

  /**
   * Check if USB device is x2008 fingerprint scanner
   */
  isX2008Device(deviceInfo) {
    // Add specific vendor/product ID checks for x2008
    const knownX2008Configs = [
      { vendorId: 0x2017, productId: 0x0001 }, // Example IDs
      { vendorId: 0x1234, productId: 0x5678 }  // Add actual x2008 IDs
    ];

    return knownX2008Configs.some(config => 
      deviceInfo.usbVendorId === config.vendorId && 
      deviceInfo.usbProductId === config.productId
    );
  }

  /**
   * Check if WebUSB device is x2008 fingerprint scanner
   */
  isX2008USBDevice(device) {
    const knownX2008Configs = [
      { vendorId: 0x2017, productId: 0x0001 },
      { vendorId: 0x1234, productId: 0x5678 }
    ];

    return knownX2008Configs.some(config => 
      device.vendorId === config.vendorId && 
      device.productId === config.productId
    );
  }

  /**
   * Check if network device is x2008 fingerprint scanner
   */
  isX2008NetworkDevice(deviceInfo) {
    // Check device response for x2008 specific identifiers
    return deviceInfo && (
      deviceInfo.model === 'x2008' ||
      deviceInfo.deviceName === 'x2008' ||
      deviceInfo.serialNumber === DEVICE_CONFIG.serialNumber ||
      deviceInfo.macAddress === DEVICE_CONFIG.macAddress
    );
  }

  /**
   * Ping network device to check if it's reachable
   */
  async pingDevice(ip, port) {
    try {
      // Since we can't use ICMP ping in browser, try TCP connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://${ip}:${port}/ping`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors' // To avoid CORS issues
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      // If fetch fails, try WebSocket connection
      try {
        const ws = new WebSocket(`ws://${ip}:${port}`);
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve(false);
          }, 3000);

          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
        });
      } catch (wsError) {
        return false;
      }
    }
  }

  /**
   * Get device information from network device
   */
  async getNetworkDeviceInfo(ip, port) {
    try {
      // Send device info request
      const response = await fetch(`http://${ip}:${port}/api/device/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.ok) {
        return await response.json();
      }

      // If REST API fails, try WebSocket communication
      return await this.getDeviceInfoViaWebSocket(ip, port);
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to get network device info:', error);
      return null;
    }
  }

  /**
   * Get device info via WebSocket
   */
  async getDeviceInfoViaWebSocket(ip, port) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${ip}:${port}`);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket timeout'));
      }, 5000);

      ws.onopen = () => {
        // Send device info request
        ws.send(JSON.stringify({
          command: 'GET_DEVICE_INFO',
          timestamp: Date.now()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.command === 'DEVICE_INFO' && data.deviceInfo) {
            clearTimeout(timeout);
            ws.close();
            resolve(data.deviceInfo);
          }
        } catch (parseError) {
          console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to parse WebSocket response:', parseError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  /**
   * Connect to real hardware device
   */
  async connectToRealDevice() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Connecting to real x2008 device...');

      if (!this.device) {
        throw new Error('No device detected. Please run detectRealDevice() first.');
      }

      if (this.connectionType === 'usb') {
        return await this.connectUSBDevice();
      } else if (this.connectionType === 'network') {
        return await this.connectNetworkDevice();
      } else {
        throw new Error('Unknown connection type');
      }
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Real device connection failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  /**
   * Connect to USB device
   */
  async connectUSBDevice() {
    try {
      const port = this.device.port;

      if (this.device.type === 'serial') {
        // Web Serial API connection
        await port.open({
          baudRate: 115200, // Common baud rate for x2008
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        });

        this.serialPort = port;
        
        // Send initialization command
        await this.sendSerialCommand('INIT');
        
        // Wait for device response
        const response = await this.readSerialResponse();
        
        if (response && response.includes('OK')) {
          this.isConnected = true;
          console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ USB Serial connection established');
          return {
            success: true,
            message: 'USB device connected successfully'
          };
        } else {
          throw new Error('Device initialization failed');
        }
      } else if (this.device.type === 'webusb') {
        // WebUSB connection
        const device = this.device.port;
        
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        
        this.isConnected = true;
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ WebUSB connection established');
        return {
          success: true,
          message: 'USB device connected successfully'
        };
      }
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ USB connection error:', error);
      throw error;
    }
  }

  /**
   * Connect to network device
   */
  async connectNetworkDevice() {
    try {
      const { ip, port } = this.device;
      
      // Try to establish WebSocket connection for real-time communication
      this.networkDevice = new WebSocket(`ws://${ip}:${port}`);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Network connection timeout'));
        }, 10000);

        this.networkDevice.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Network connection established');
          
          // Send authentication/initialization
          this.networkDevice.send(JSON.stringify({
            command: 'AUTHENTICATE',
            credentials: {
              deviceId: DEVICE_CONFIG.serialNumber,
              macAddress: DEVICE_CONFIG.macAddress
            }
          }));
          
          resolve({
            success: true,
            message: 'Network device connected successfully'
          });
        };

        this.networkDevice.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Network connection error:', error);
      throw error;
    }
  }

  /**
   * Send command to USB serial device
   */
  async sendSerialCommand(command) {
    if (!this.serialPort || !this.isConnected) {
      throw new Error('Serial port not connected');
    }

    const writer = this.serialPort.writable.getWriter();
    const encoder = new TextEncoder();
    
    try {
      await writer.write(encoder.encode(command + '\r\n'));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Read response from USB serial device
   */
  async readSerialResponse() {
    if (!this.serialPort || !this.isConnected) {
      throw new Error('Serial port not connected');
    }

    const reader = this.serialPort.readable.getReader();
    const decoder = new TextDecoder();
    
    try {
      const { value, done } = await reader.read();
      if (done) {
        return null;
      }
      return decoder.decode(value);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Capture fingerprint from real device
   */
  async captureFingerprint() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â  Capturing fingerprint from real device...');

      if (!this.isConnected) {
        throw new Error('Device not connected');
      }

      if (this.connectionType === 'usb') {
        return await this.captureUSBFingerprint();
      } else if (this.connectionType === 'network') {
        return await this.captureNetworkFingerprint();
      }
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Fingerprint capture failed:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint from USB device
   */
  async captureUSBFingerprint() {
    try {
      // Send capture command
      await this.sendSerialCommand('CAPTURE_FINGER');
      
      // Wait for finger placement
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â  Please place finger on the scanner...');
      
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (attempts < maxAttempts) {
        const response = await this.readSerialResponse();
        
        if (response && response.includes('FINGER_DETECTED')) {
          console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ Finger detected, processing...');
          
          // Send process command
          await this.sendSerialCommand('PROCESS_FINGER');
          
          // Wait for template data
          const templateResponse = await this.readSerialResponse();
          
          if (templateResponse && templateResponse.includes('TEMPLATE:')) {
            const templateData = templateResponse.split('TEMPLATE:')[1];
            return {
              success: true,
              templateData: templateData.trim(),
              quality: this.extractQuality(templateResponse),
              timestamp: new Date()
            };
          }
        } else if (response && response.includes('ERROR')) {
          throw new Error(`Device error: ${response}`);
        }
        
        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      throw new Error('Capture timeout - no finger detected');
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ USB fingerprint capture error:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint from network device
   */
  async captureNetworkFingerprint() {
    try {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Capture timeout'));
        }, 30000);

        // Set up message handler
        this.networkDevice.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.command === 'FINGERPRINT_CAPTURED') {
              clearTimeout(timeout);
              resolve({
                success: true,
                templateData: data.templateData,
                quality: data.quality,
                timestamp: new Date()
              });
            } else if (data.command === 'ERROR') {
              clearTimeout(timeout);
              reject(new Error(data.message));
            }
          } catch (parseError) {
            console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to parse capture response:', parseError);
          }
        };

        // Send capture command
        this.networkDevice.send(JSON.stringify({
          command: 'CAPTURE_FINGERPRINT',
          timestamp: Date.now()
        }));
        
        console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â  Please place finger on the scanner...');
      });
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Network fingerprint capture error:', error);
      throw error;
    }
  }

  /**
   * Extract quality score from device response
   */
  extractQuality(response) {
    const qualityMatch = response.match(/QUALITY:(\d+)/);
    return qualityMatch ? parseInt(qualityMatch[1]) : 0;
  }

  /**
   * Start listening for fingerprint scans on real device
   */
  async startRealFingerprintListening(onScanCallback) {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ Starting real fingerprint listening...');

      if (!this.isConnected) {
        throw new Error('Device not connected');
      }

      if (this.connectionType === 'usb') {
        return await this.startUSBListening(onScanCallback);
      } else if (this.connectionType === 'network') {
        return await this.startNetworkListening(onScanCallback);
      }
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to start real fingerprint listening:', error);
      throw error;
    }
  }

  /**
   * Start USB fingerprint listening
   */
  async startUSBListening(onScanCallback) {
    try {
      // Send start listening command
      await this.sendSerialCommand('START_SCAN_MODE');
      
      // Set up continuous reading
      this.isListening = true;
      this.usbListeningLoop(onScanCallback);
      
      return {
        success: true,
        message: 'Started USB fingerprint listening'
      };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ USB listening error:', error);
      throw error;
    }
  }

  /**
   * USB listening loop
   */
  async usbListeningLoop(onScanCallback) {
    while (this.isListening && this.isConnected) {
      try {
        const response = await this.readSerialResponse();
        
        if (response && response.includes('SCAN_RESULT:')) {
          const scanData = this.parseUSBScanResult(response);
          if (scanData && onScanCallback) {
            onScanCallback(scanData);
          }
        }
        
        // Small delay to prevent overwhelming the CPU
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ USB listening loop error:', error);
        break;
      }
    }
  }

  /**
   * Parse USB scan result
   */
  parseUSBScanResult(response) {
    try {
      const parts = response.split('SCAN_RESULT:')[1].split('|');
      return {
        matched: parts[0] === 'MATCH',
        templateId: parts[1],
        confidence: parseFloat(parts[2]),
        scanTime: new Date(),
        deviceInfo: DEVICE_CONFIG
      };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to parse USB scan result:', error);
      return null;
    }
  }

  /**
   * Start network fingerprint listening
   */
  async startNetworkListening(onScanCallback) {
    try {
      // Set up message handler for scan results
      this.networkDevice.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.command === 'FINGERPRINT_SCANNED') {
            const scanData = {
              matched: data.matched,
              templateId: data.templateId,
              confidence: data.confidence,
              scanTime: new Date(data.timestamp),
              deviceInfo: DEVICE_CONFIG
            };
            
            if (onScanCallback) {
              onScanCallback(scanData);
            }
          }
        } catch (parseError) {
          console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to parse network scan result:', parseError);
        }
      };

      // Send start listening command
      this.networkDevice.send(JSON.stringify({
        command: 'START_FINGERPRINT_LISTENING',
        timestamp: Date.now()
      }));
      
      this.isListening = true;
      
      return {
        success: true,
        message: 'Started network fingerprint listening'
      };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Network listening error:', error);
      throw error;
    }
  }

  /**
   * Stop fingerprint listening
   */
  async stopRealFingerprintListening() {
    try {
      this.isListening = false;
      
      if (this.connectionType === 'usb') {
        await this.sendSerialCommand('STOP_SCAN_MODE');
      } else if (this.connectionType === 'network') {
        this.networkDevice.send(JSON.stringify({
          command: 'STOP_FINGERPRINT_LISTENING',
          timestamp: Date.now()
        }));
      }
      
      return {
        success: true,
        message: 'Stopped fingerprint listening'
      };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Failed to stop listening:', error);
      throw error;
    }
  }

  /**
   * Disconnect from real device
   */
  async disconnectRealDevice() {
    try {
      console.log('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Disconnecting real device...');
      
      if (this.isListening) {
        await this.stopRealFingerprintListening();
      }
      
      if (this.connectionType === 'usb' && this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      } else if (this.connectionType === 'network' && this.networkDevice) {
        this.networkDevice.close();
        this.networkDevice = null;
      }
      
      this.isConnected = false;
      this.device = null;
      this.connectionType = null;
      
      return {
        success: true,
        message: 'Real device disconnected successfully'
      };
    } catch (error) {
      console.error('ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Real device disconnection failed:', error);
      return {
        success: false,
        message: `Disconnection failed: ${error.message}`
      };
    }
  }

  /**
   * Get real device status
   */
  getRealDeviceStatus() {
    return {
      connected: this.isConnected,
      listening: this.isListening,
      connectionType: this.connectionType,
      deviceInfo: this.device ? {
        ...DEVICE_CONFIG,
        connectionType: this.connectionType,
        ...(this.connectionType === 'network' && {
          ipAddress: this.device.ip,
          port: this.device.port
        }),
        ...(this.connectionType === 'usb' && {
          vendorId: this.device.vendorId,
          productId: this.device.productId
        })
      } : DEVICE_CONFIG
    };
  }
}

// Export singleton instance
export const hardwareService = new HardwareService();


