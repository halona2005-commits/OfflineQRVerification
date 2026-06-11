# Offline QR Verification and Document Management System

## Overview
A full stack project with User Panel, Admin Panel, QR generation and verification, and document upload management. **Uses JSON file storage - no database setup required!**

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Storage: JSON file (`database.json`)
- File upload: Multer
- QR code generation: QRCode.js
- QR scanning: html5-qrcode

## Folder Structure

```
OfflineQRVerification/
├── models/
│   └── User.js
├── public/
│   ├── admin.html
│   ├── dashboard.html
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── admin.js
├── uploads/
│   └── (uploaded files stored here)
├── database.json
│   └── (JSON file auto-generated with user data)
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```
## Live Demo
https://offlineqrverification.onrender.com

## GitHub Repository
https://github.com/halona2005-commits/OfflineQRVerification

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the server:
   ```bash
   npm start
   ```
3. Open the app in a browser:
   - User portal: `http://localhost:4000/`
   - Admin portal: `http://localhost:4000/admin.html`

## Admin Login
- Email: `admin@example.com`
- Password: `Admin123!`

## Features
- User registration and login with hashed passwords (bcryptjs)
- Multiple document uploads and file storage
- User dashboard with document list and download links
- QR code generation with signed JSON payload and digital signature
- Camera-based QR scanning and verification
- Admin panel with user management and verification status
- All data persisted in `database.json` file

## Database Structure
Data is stored in `database.json` in this format:
```json
{
  "users": [
    {
      "id": "uuid-string",
      "name": "User Name",
      "email": "user@example.com",
      "password": "bcrypt-hashed",
      "verified": false,
      "documents": [
        {
          "originalName": "file.pdf",
          "filename": "userid_timestamp_file.pdf",
          "url": "/uploads/...",
          "uploadedAt": "2026-05-29T..."
        }
      ],
      "createdAt": "2026-05-29T..."
    }
  ]
}
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /register | Register new user |
| POST | /login | User login |
| POST | /upload/:id | Upload documents for user |
| GET | /users | Get all users (admin) |
| POST | /users/:id/verify | Mark user as verified |
| GET | /me/:id | Get user profile |
| POST | /admin/login | Admin login |

## Notes
- Uploaded files are stored in `/uploads` folder
- Data is persisted in `database.json`
- No external database required
- All code is beginner-friendly with comments

Enjoy building your final-year project!
