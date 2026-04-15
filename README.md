# GymTight Fitness Admin Panel

**Version 1.0.0** | **Status: PRODUCTION READY**

A professional, enterprise-grade gym management system with integrated fingerprint authentication, real-time attendance tracking, comprehensive member management, and advanced security features.

## Features

### Member & Trainer Management
- Complete member registration with subscription tracking
- Trainer management with specializations and schedules
- Real-time status updates and profile management
- Advanced search and filtering capabilities
- Package and subscription management

### Fingerprint Integration
- **ZKTeco Device Support**: x2008, K40, and ETimeTrack-compatible devices
- **Real-time Biometric Authentication**: Instant fingerprint scanning
- **ID/Mobile Linking**: Search fingerprints by name, mobile, email, or ID
- **Dual Registration**: Both members and trainers can register fingerprints
- **Auto-sync**: Seamless integration with Firebase database

### Dashboard & Analytics
- Real-time attendance tracking
- Comprehensive reporting and analytics
- Member visit history and patterns
- Trainer activity monitoring
- Revenue and subscription analytics

### Enterprise Security Features
- **Role-Based Access Control**: 21 granular permissions across 7 categories
- **Input Sanitization**: XSS and injection attack prevention
- **Session Management**: 30-minute inactivity timeout with warning
- **Audit Logging**: Complete trail of all actions
- **Firestore Security Rules**: Backend permission validation
- **Error Boundary**: Graceful error handling
- **Data Encryption**: Secure storage and transmission

### Email & Notifications
- **Password Reset Emails**: Automatic password reset links sent to new managers
- **Auto-generated Passwords**: Secure temporary passwords with immediate reset
- **Email Activity Logging**: Track all emails sent via email_logs collection
- **Customizable Templates**: Modify email templates in Firebase Console
- **No Session Interruption**: Creating managers doesn't log out current admin

### User Management
- **Dual Auth System**: Uses secondary Firebase auth instance for creating users
- **Session Preservation**: Admin stays logged in when creating new managers
- **Soft Delete**: Removed managers are marked as inactive (not deleted)
- **Access Control**: Removed managers cannot access the system (RBAC enforced)
- **Delete Tracking**: All deletion requests logged for audit purposes

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React.js with modern UI components |
| Backend | Firebase Firestore (real-time database) |
| Authentication | Firebase Auth with RBAC |
| Deployment | Netlify (web hosting) |
| Hardware Bridge | Node.js + ETimeTrack integration |

## Quick Start

### Web Application Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   - Update src/services/firebase.js with your Firebase config
   - Set up Firestore security rules

3. **Configure Email (for password resets):**
   - Enable email provider in Firebase Console
   - Customize password reset email templates
   - Test email delivery before production

4. **Build and deploy:**
   ```bash
   npm run build
   # Deploy to Netlify
   ```

### Hardware Bridge Server

1. **Setup bridge server:**
   ```bash
   cd server
   npm install
   ```

2. **Start the bridge:**
   ```bash
   node sql-server.js
   ```

### Professional Installation (Recommended)

For gym owners and technical users:

**Manual Installation:**
```bash
cd server
npm install
npm start
```

This starts the hardware bridge server that:
- Connects to fingerprint devices
- Provides real-time attendance tracking
- Integrates with the web application
- Supports multiple gym locations

## Database Configuration

### SQL Server Setup
- Default database: vigourzone.sql.json
- Supports both JSON and SQLite formats
- Automatic hydration on startup
- Session persistence for user authentication

### Firestore Integration
- Real-time database synchronization
- Collection-based document storage
- Role-based security rules
- Audit logging support

## Project Structure

```
GymTight Fitness-adminpanel/
├── src/                    # React application
├── server/                 # SQL and API servers
├── public/                 # Static assets
├── package.json            # Frontend dependencies
└── README.md              # This file
```

## Production Deployment

### For Gym Businesses:
1. Web Panel: Deploy to Netlify for easy hosting
2. SQL Server: Deploy on Windows PC or dedicated server
3. Hardware: Purchase recommended ZKTeco devices
4. Setup: Follow integration guide in documentation

### For Developers:
1. Clone repository
2. Configure Firebase project
3. Update environment variables
4. Deploy web app and server

## Security Features

- Encrypted Communication: All data encrypted in transit
- Role-Based Access: Different permissions for admin/staff
- Audit Logging: Complete activity tracking
- Secure Storage: Fingerprint templates encrypted in Firebase
- Session Management: 30-minute inactivity timeout
- Input Validation: XSS and injection prevention

## Email Configuration

### Setting up Email for Password Resets

1. **Enable Email Provider in Firebase:**
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Email/Password provider if not already enabled
   - Go to Templates tab to customize email templates

2. **Customize Password Reset Template:**
   - Click Password reset template
   - Customize subject line and message
   - Add your gym branding/logo
   - Save changes

3. **Test Email Delivery:**
   - Create a test manager account in User Management
   - Verify email is received
   - Test the password reset link works
   - Check email_logs collection in Firestore for tracking

4. **Production Notes:**
   - Emails are sent automatically when new managers are created
   - Temporary passwords are auto-generated for security
   - All email activity is logged in the email_logs collection
   - Manager receives a secure password reset link via email

## API Documentation

The application includes both Firebase Firestore and SQL Server endpoints:
- REST API on port 3001 (sql-server.js)
- Firestore integration via Firebase SDK
- Real-time synchronization across database layers

## Support

For setup assistance, hardware integration, or troubleshooting:
- Check the documentation in the project repository
- Review server logs for error details
- Verify Firebase configuration and security rules

## License

MIT License - see LICENSE file for details.

---

**Production Ready**: This is a complete, professional gym management solution with enterprise-grade security and fingerprint integration. Perfect for gyms, fitness centers, and sports facilities of any size.
