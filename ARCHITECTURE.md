# System Architecture & Design

## Project Overview

This is a **complete offline QR verification and document management system** built with:
- **Frontend**: HTML, CSS, JavaScript (no frameworks)
- **Backend**: Node.js + Express
- **Storage**: JSON file (database.json)
- **No external dependencies**: Works completely locally

### Key Innovation: JSON File Storage
Instead of MongoDB or any database, all data is stored in a simple `database.json` file that:
- Auto-creates on first server start
- Stores user accounts with hashed passwords
- Tracks uploaded documents
- Persists admin actions (user verification)
- Is human-readable and can be inspected

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │   User Panel     │  │   Admin Panel     │             │
│  │  (index.html)    │  │  (admin.html)     │             │
│  └────────┬─────────┘  └────────┬─────────┘             │
│           │                     │                        │
│  ┌────────▼─────────────────────▼──────┐                │
│  │      JavaScript Logic               │                │
│  │  • app.js (user & QR operations)    │                │
│  │  • admin.js (user management)       │                │
│  └────────┬──────────────────────────┬─┘                │
│           │                          │                   │
│     ┌─────▼────────────────────┬─────▼────┐             │
│     │  QR Generation           │  QR Scan  │             │
│     │  (QRCode.js)             │ (html5...)│             │
│     └────────────────────────────────────┘              │
│                                                          │
└──────────────────────────┬─────────────────────────────┘
                           │
                    HTTP/JSON API
                           │
┌──────────────────────────▼─────────────────────────────┐
│              EXPRESS.JS SERVER                         │
│               (server.js)                              │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Routes:                                              │
│  • POST   /register       ──→ Create user             │
│  • POST   /login          ──→ Authenticate            │
│  • POST   /upload/:id     ──→ Save files              │
│  • GET    /users          ──→ List all users          │
│  • POST   /users/:id/verify ──→ Mark verified        │
│  • GET    /me/:id         ──→ Get profile             │
│  • POST   /admin/login    ──→ Admin auth             │
│                                                        │
│  Middleware:                                          │
│  • Express.json()         (parse JSON)                │
│  • Express.static()       (serve public files)        │
│  • Multer                 (handle file uploads)       │
│                                                        │
└──────────────────────────┬──────────────────────────┘
                           │
                    File System I/O
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
   │database.json│  │  /uploads    │  │  /public     │
   │             │  │   (files)    │  │  (static)    │
   │ Users data  │  │              │  │              │
   └─────────────┘  └──────────────┘  └──────────────┘
```

---

## Data Flow

### 1. User Registration Flow
```
User enters name, email, password
         ↓
    app.js validates
         ↓
  POST /register API
         ↓
   server.js receives
         ↓
   Check email not duplicate
         ↓
   Hash password with bcryptjs
         ↓
   Generate UUID for user ID
         ↓
   Create user object
         ↓
   Read database.json
         ↓
   Add user to users array
         ↓
   Write updated database.json
         ↓
   Return user ID to frontend
         ↓
   Store user ID in localStorage
         ↓
   Redirect to dashboard
```

### 2. Document Upload Flow
```
User selects files on Upload panel
         ↓
   JavaScript collects files
         ↓
POST /upload/:userId (multipart/form-data)
         ↓
   Multer receives file
         ↓
   Save to /uploads folder
   (filename: userId_timestamp_originalname)
         ↓
   server.js receives upload
         ↓
   Read database.json
         ↓
   Find user by ID
         ↓
   Add document info to user.documents[]
   (stores: originalName, filename, url, uploadedAt)
         ↓
   Write updated database.json
         ↓
   Return document list to frontend
         ↓
   Display documents with download links
```

### 3. QR Code Generation & Verification Flow
```
User clicks "Generate QR"
         ↓
   JavaScript gets user data:
   {
     name: "John Doe",
     id: "uuid-string",
     timestamp: "2026-05-29T14:30:00Z"
   }
         ↓
   Create signature using FNV-1a hash:
   hash(JSON.stringify(data) + "|veriscan-signature")
         ↓
   Create payload:
   {
     data: {...},
     signature: "a1b2c3d4"
   }
         ↓
   Generate QR code (QRCode.js)
   containing: JSON.stringify(payload)
         ↓
   Display QR code image


User scans QR code
         ↓
   html5-qrcode reads camera
         ↓
   Detects QR and extracts JSON
         ↓
   Parse JSON to get data & signature
         ↓
   Recalculate expected signature
   hash(JSON.stringify(data) + "|veriscan-signature")
         ↓
   Compare signatures:
   
   If match → VALID (green UI)
   If different → INVALID (red UI)
```

### 4. Admin User Verification Flow
```
Admin logs in with email/password
         ↓
POST /admin/login (hardcoded check)
         ↓
   Server validates credentials
         ↓
   Return admin token (localStorage)
         ↓
GET /users (no auth required in demo)
         ↓
   server.js reads database.json
         ↓
   Return all users (without passwords)
         ↓
   admin.js displays user cards
         ↓
Admin clicks "Mark as verified"
         ↓
POST /users/:id/verify
         ↓
   server.js finds user
         ↓
   Set user.verified = true
         ↓
   Write to database.json
         ↓
   Reload user list
         ↓
   User shows "Verified" status
```

---

## File Organization

### Backend Files
```
server.js (450 lines)
├── Imports & Setup
│   ├── Express, fs, bcryptjs, multer, uuid
│   ├── Port, database path, uploads path
│   └── Middleware setup
│
├── Database Utilities
│   ├── initializeDatabase() - Create empty database.json
│   ├── readDatabase() - Read from file
│   ├── writeDatabase() - Write to file
│   ├── findUserByEmail() - Query users
│   ├── findUserById() - Query by ID
│   ├── createUser() - Hash password & save
│   ├── addDocumentToUser() - Add file to user
│   └── verifyUser() - Mark as verified
│
├── Multer Configuration
│   └── diskStorage setup for file uploads
│
└── API Routes (7 endpoints)
    ├── POST /register
    ├── POST /login
    ├── POST /upload/:id
    ├── GET /users
    ├── POST /users/:id/verify
    ├── GET /me/:id
    └── POST /admin/login
```

### Frontend Files
```
public/index.html (Auth page)
├── Login tab
├── Register tab
└── Form validation

public/dashboard.html (User panel)
├── Sidebar navigation
├── Summary panel (profile)
├── Upload documents panel
├── Generate QR panel
├── Verify QR panel
└── QR scanner container

public/admin.html (Admin panel)
├── Admin login form
├── Users list (card layout)
├── User cards showing:
│   ├── Name, email, status
│   ├── User ID
│   ├── Verification button
│   └── Downloaded documents
└── Admin logout

public/app.js (User logic)
├── Auth functions
│   ├── handleAuthPage()
│   ├── Login/register listeners
│   └── Token storage
│
├── QR functions
│   ├── hashText() - FNV-1a hash
│   ├── createSignature()
│   ├── buildQrPayload()
│   ├── renderQr()
│   ├── onScanSuccess()
│   └── Scanner controls
│
├── Dashboard functions
│   ├── initDashboard()
│   ├── renderUserProfile()
│   ├── renderDocuments()
│   ├── uploadDocuments()
│   └── Panel navigation
│
└── Page routing
    ├── Detect page type
    └── Initialize appropriate handler

public/admin.js (Admin logic)
├── Auth functions
│   ├── adminLogin()
│   └── Token storage
│
├── User management
│   ├── loadUsers() - Fetch from /users
│   ├── renderUsers() - Display in cards
│   ├── verifyUser() - Mark verified
│   └── showAdminPanel()
│
└── Event listeners
    ├── Login button
    ├── Logout button
    └── Verify buttons (per user)

public/style.css (Styling)
├── CSS variables (colors, shadows)
├── Base styles
├── Layout (grid, sidebar)
├── Components (cards, buttons, forms)
├── Animations
├── Dark theme
└── Responsive media queries
```

### Data Files
```
database.json
{
  "users": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "password": "bcrypt_hash",
      "verified": boolean,
      "documents": [
        {
          "originalName": "string",
          "filename": "string",
          "url": "string",
          "uploadedAt": "ISO_timestamp"
        }
      ],
      "createdAt": "ISO_timestamp"
    }
  ]
}

uploads/
├── userid_timestamp_filename1.pdf
├── userid_timestamp_filename2.jpg
└── ...
```

---

## Security Considerations

### ✅ Implemented
- **Password Hashing**: bcryptjs with 10 rounds
- **File Naming**: Unique by combining user ID + timestamp
- **Input Validation**: Check for empty fields
- **File Size Limits**: 10MB per file
- **Error Messages**: Generic to avoid info leakage
- **Signature Verification**: Detect tampered QR codes

### ⚠️ Not Implemented (Demo Only)
- JWT tokens (simple localStorage ID)
- HTTPS/SSL
- Rate limiting
- Email verification
- Two-factor authentication
- CORS restrictions
- SQL injection prevention (N/A - no SQL)
- CSRF tokens
- Admin authentication (hardcoded)

---

## Performance Characteristics

### Advantages
- **Fast File I/O**: Synchronous reads/writes (simple)
- **Low Memory**: No database driver overhead
- **Easy Debugging**: JSON is readable and inspectable
- **Zero Setup**: No database installation needed

### Limitations
- **Concurrent Writes**: File might corrupt if multiple writes happen simultaneously
- **Scalability**: Not suitable for 1000+ users
- **Query Speed**: Linear search through array (no indexing)
- **File Growth**: Single file grows with data (consider splitting)

### Optimization Tips
1. For 100+ users: Add basic indexing in memory
2. For 1000+ users: Move to MongoDB/PostgreSQL
3. For file uploads: Consider cloud storage (AWS S3)
4. For performance: Add caching layer (Redis)

---

## Extending the System

### Add Email Verification
```javascript
// In server.js, after user creation:
const verificationToken = crypto.randomBytes(32).toString('hex');
user.emailVerificationToken = verificationToken;
// Send email with verification link
```

### Add Payment Integration
```javascript
// Add Stripe/PayPal routes
POST /payment/checkout
POST /payment/webhook
// Track payment status in user object
```

### Add File Encryption
```javascript
// Use crypto module to encrypt uploaded files
// Store encryption key separately
```

### Add Audit Logs
```javascript
// Track all admin actions
{
  adminEmail: "admin@example.com",
  action: "verified_user",
  userId: "uuid",
  timestamp: "ISO_timestamp"
}
```

### Add Real-time Notifications
```javascript
// Add WebSocket (Socket.io)
// Notify users when verified
// Notify admin of new uploads
```

---

## Development Notes

### Code Quality
- Simple, beginner-friendly code
- Well-commented for learning
- No external frameworks (vanilla JS)
- RESTful API design
- Consistent naming conventions

### Testing Strategy
1. **Manual Testing**: Use the UI
2. **API Testing**: Use cURL or Postman
3. **File Testing**: Check uploads folder
4. **Data Testing**: Inspect database.json

### Common Issues & Solutions
| Issue | Cause | Solution |
|-------|-------|----------|
| Port 4000 in use | Another app using it | `netstat -ano \| findstr :4000` |
| Files not uploading | Folder permissions | Check `/uploads` writable |
| Database not saving | File write error | Check disk space & permissions |
| QR scanner not working | Camera permission | Allow browser camera access |
| Signature mismatch | Hash algorithm diff | Verify FNV-1a implementation |

---

## Deployment Considerations

### Local Network
```bash
# Access from another machine
http://192.168.x.x:4000
# Allows team testing
```

### Docker Containerization
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 4000
CMD ["npm", "start"]
```

### Cloud Deployment (Heroku)
```bash
# Requires persistent storage solution
# database.json will be lost on restart
# Consider MongoDB Atlas instead
```

### Environment Variables
```bash
# Create .env file:
PORT=3000
NODE_ENV=production
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=StrongPassword123
```

---

**End of Documentation**

For questions or improvements, refer to the code comments in `server.js`, `app.js`, and `admin.js`.
