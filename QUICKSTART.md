# Quick Start Guide

## Start the Application
```bash
npm start
```
The server will start on `http://localhost:4000`

## Test Flow

### 1. User Registration & Login
1. Visit `http://localhost:4000/`
2. Click **Register** tab
3. Enter:
   - Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123`
4. Click **Register**
5. You're automatically logged in and redirected to dashboard

### 2. User Dashboard
Once logged in, you see:
- **Summary Panel**: User info, document count, verification status
- **Upload Docs Panel**: Upload multiple files (Student ID, License, etc.)
- **Generate QR Panel**: Creates a signed QR code with your user data
- **Verify QR Panel**: Scan QR codes and verify signatures

### 3. Upload Documents
1. Go to "Upload Docs" panel
2. Select multiple files (PDF, images, etc.)
3. Click "Upload Files"
4. Files appear below with download links
5. Data is saved in `database.json`

### 4. Generate & Scan QR Code
1. Go to "Generate QR" panel
2. Click "Generate QR"
3. Your QR code appears with:
   - Name, ID, Timestamp
   - Digital signature (hash)
4. Share the QR code image
5. Go to "Verify QR" panel
6. Click "Start Scanner"
7. Point camera at QR code
8. System shows:
   - **VALID** (green) if signature matches
   - **INVALID** (red) if tampered

### 5. Admin Panel
1. Visit `http://localhost:4000/admin.html`
2. Login with:
   - Email: `admin@example.com`
   - Password: `Admin123!`
3. View all registered users
4. Download user documents
5. Mark users as "Verified"

## File Structure
```
OfflineQRVerification/
├── database.json          ← User data (auto-generated)
├── uploads/               ← Uploaded files
├── public/
│   ├── index.html         ← Login/Register page
│   ├── dashboard.html     ← User panel
│   ├── admin.html         ← Admin panel
│   ├── app.js             ← User logic
│   ├── admin.js           ← Admin logic
│   └── style.css          ← Styling
├── server.js              ← Backend
└── package.json
```

## Test Data Format

### In database.json
```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "password": "$2a$10$...", // bcrypt hash
      "verified": false,
      "documents": [
        {
          "originalName": "student_id.pdf",
          "filename": "550e8400..._1234567890_student_id.pdf",
          "url": "/uploads/550e8400..._1234567890_student_id.pdf",
          "uploadedAt": "2026-05-29T14:30:00.000Z"
        }
      ],
      "createdAt": "2026-05-29T14:20:00.000Z"
    }
  ]
}
```

## QR Code Data Format
```json
{
  "data": {
    "name": "John Doe",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-05-29T14:30:00.000Z"
  },
  "signature": "a1b2c3d4" // hash of data + secret key
}
```

## Features Breakdown

### Frontend (JavaScript)
- **app.js**: User auth, QR generation, QR scanning, document upload
- **admin.js**: Admin login, user listing, verification
- **QR Generation**: Uses QRCode.js library
- **QR Scanning**: Uses html5-qrcode library with camera access

### Backend (Node.js)
- **User Registration**: Hash password with bcryptjs, store in JSON
- **Document Upload**: Save files in /uploads, track in JSON
- **QR Verification**: Recompute signature hash, compare
- **Admin Panel**: No auth required for demo, just hardcoded credentials

### Storage (JSON)
- File: `database.json`
- Auto-created on first server start
- Human-readable format
- Perfect for local development/testing

## Troubleshooting

### Server won't start
```bash
# Make sure port 4000 is free
netstat -ano | findstr :4000
```

### Files not uploading
- Check `/uploads` folder exists
- File size must be < 10MB
- Browser needs to allow file selection

### QR Scanner not working
- Browser needs camera permission
- Only works on HTTPS or localhost
- Allow camera access when prompted

### Database not persisting
- Check `database.json` exists
- Verify file permissions
- Restart server if modified externally

## Extending the Project

### Add more admin features
Edit `public/admin.js` and `server.js` to add:
- Delete user endpoint
- Edit user profile
- Search/filter users

### Add email verification
- Send verification email on register
- Require email confirmation before login

### Add file type restrictions
- In `server.js` multer config
- Only allow specific file extensions

### Add user roles
- Teacher, Student, Admin roles
- Role-based access control

---

**Happy testing!** 🚀
