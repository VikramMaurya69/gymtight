/**
 * Shared Firebase Configuration for Server-side Services
 * Prevents duplicate initialization and ensures consistent config
 */

const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config({ path: '../.env.local' });

class FirebaseConfig {
  constructor() {
    this.app = null;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize Firebase Admin SDK (singleton pattern)
   */
  async initialize() {
    if (this.initialized && this.app) {
      return { app: this.app, db: this.db };
    }

    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        this.app = admin.apps[0];
        this.db = admin.firestore();
        this.initialized = true;
        console.log('✅ Using existing Firebase Admin app');
        return { app: this.app, db: this.db };
      }

      // Initialize new Firebase Admin app
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
      
      if (!fs.existsSync(serviceAccountPath)) {
        console.warn('⚠️  Firebase service account file not found. Please add firebase-service-account.json');
        console.warn('📝 Run "npm run setup" to configure Firebase credentials');
        return null;
      }

      const serviceAccount = require(serviceAccountPath);
      
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });

      this.db = admin.firestore();
      this.initialized = true;

      console.log('✅ Firebase Admin initialized successfully');
      console.log(`📊 Project: ${process.env.FIREBASE_PROJECT_ID}`);
      
      return { app: this.app, db: this.db };

    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      return null;
    }
  }

  /**
   * Get Firebase instance (initialize if needed)
   */
  async getInstance() {
    if (!this.initialized) {
      return await this.initialize();
    }
    return { app: this.app, db: this.db };
  }

  /**
   * Close Firebase connection
   */
  async close() {
    if (this.app) {
      await this.app.delete();
      this.initialized = false;
      this.app = null;
      this.db = null;
      console.log('🔒 Firebase connection closed');
    }
  }
}

// Export singleton instance
module.exports = new FirebaseConfig();