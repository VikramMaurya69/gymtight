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

### Dashboard & Analytics
- Real-time attendance tracking
- Comprehensive reporting and analytics
- Member visit history and patterns
- Trainer activity monitoring
- Revenue and subscription analytics
- 
### Enterprise Security Features
- **Role-Based Access Control**: 21 granular permissions across 7 categories
- **Input Sanitization**: XSS and injection attack prevention
- **Session Management**: 30-minute inactivity timeout with warning
- **Audit Logging**: Complete trail of all actions
- **SQL Security**: Secure authentication and permission validation
- **Error Boundary**: Graceful error handling
- **Data Encryption**: Secure storage and transmission

### Email & Notifications
- **Password Reset Emails**: Automatic password reset links sent to new managers
- **Auto-generated Passwords**: Secure temporary passwords with immediate reset
- **Email Activity Logging**: Track all emails sent via audit logs
- **Customizable Settings**: Configure email settings in SQL server config
- **No Session Interruption**: Creating managers doesn't log out current admin

### User Management
- **SQL Auth System**: Uses SQL database for user authentication and management
- **Session Preservation**: Admin stays logged in when creating new managers
- **Soft Delete**: Removed managers are marked as inactive (not deleted)
- **Access Control**: Removed managers cannot access the system (RBAC enforced)
- **Delete Tracking**: All deletion requests logged for audit purposes

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React.js with modern UI components |
| Backend | SQL Server with Node.js |
| Authentication | SQL-based Auth with RBAC |
| Deployment | Self-hosted or Node.js hosting |
| Hardware Bridge | Node.js + ETimeTrack integration |

## Quick Start

### Web Application Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start SQL Server:**
   ```bash
   cd server
   npm install
   node sql-server.js
   ```
   The server will start on http://localhost:3001

3. **Configure backend:**
   - SQL database: vigourzone.sql.json
   - Default credentials: admin123 / admin1234
   - Update .env in server directory if needed

4. **Build and deploy:**
   ```bash
   npm run build
   # Deploy to hosting of your choice
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
- AlaSQL for in-memory operations
- Built-in auth endpoints on port 3001

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
2. Install dependencies: npm install
3. Setup SQL server: cd server && npm install && node sql-server.js
4. Configure environment variables in .env
5. Deploy web app and SQL server

## Security Features

## Security Features

- Encrypted Communication: All data encrypted in transit
- Role-Based Access: Different permissions for admin/staff
- Audit Logging: Complete activity tracking
- Secure Storage: Data persisted securely in SQL database
- Session Management: 30-minute inactivity timeout
- Input Validation: XSS and injection prevention
- Rate Limiting: Protection against brute-force attacks

## Email & Password Management

### Default Credentials
- **Username**: admin123
- **Password**: admin1234
- Change on first login through your account settings

### Password Reset
- Use "Forgot Password?" to request a password reset
- Reset link validation required
- Session automatically managed by SQL server

## API Documentation

The application includes SQL Server REST endpoints:
- **Auth Endpoint**: POST /sql/auth/login (port 3001)
- **User Management**: CRUD operations via API
- **Data Persistence**: AlaSQL with JSON serialization

## Support

For setup assistance, hardware integration, or troubleshooting:
- Check the documentation in the project repository
- Review server logs for error details
- Verify Firebase configuration and security rules

## License

MIT License - see LICENSE file for details.

---

**Production Ready**: This is a complete, professional gym management solution with enterprise-grade security and fingerprint integration. Perfect for gyms, fitness centers, and sports facilities of any size.
