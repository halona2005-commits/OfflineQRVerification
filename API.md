# API Documentation

## Overview
RESTful API for the Offline QR Verification System. All endpoints use JSON for request/response.

## Base URL
```
http://localhost:4000
```

---

## Authentication
- **User endpoints**: Use user ID stored in localStorage
- **Admin endpoints**: Simple credential check (hardcoded email/password)
- **Document upload**: No token needed, just user ID in URL

---

## Endpoints

### 1. User Registration
**POST** `/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "verified": false
  },
  "message": "Registration successful"
}
```

**Error Responses:**
- `400`: Missing fields
- `409`: Email already registered
- `500`: Server error

---

### 2. User Login
**POST** `/login`

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "verified": false,
    "documents": [
      {
        "originalName": "id.pdf",
        "filename": "550e8400..._1234567890_id.pdf",
        "url": "/uploads/550e8400..._1234567890_id.pdf",
        "uploadedAt": "2026-05-29T14:30:00.000Z"
      }
    ]
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials
- `500`: Server error

---

### 3. Upload Documents
**POST** `/upload/:id`

Upload one or more documents for a specific user.

**URL Parameters:**
- `id` (string): User ID (UUID)

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `documents` (can be multiple files)
- Max file size: 10MB per file

**Response (200):**
```json
{
  "documents": [
    {
      "originalName": "student_id.pdf",
      "filename": "550e8400..._1234567890_student_id.pdf",
      "url": "/uploads/550e8400..._1234567890_student_id.pdf",
      "uploadedAt": "2026-05-29T14:35:00.000Z"
    }
  ],
  "message": "Files uploaded successfully"
}
```

**Error Responses:**
- `400`: No files uploaded
- `404`: User not found
- `500`: Upload failed

**Example cURL:**
```bash
curl -X POST \
  -F "documents=@file1.pdf" \
  -F "documents=@file2.jpg" \
  http://localhost:4000/upload/550e8400-e29b-41d4-a716-446655440000
```

---

### 4. Get All Users
**GET** `/users`

Retrieve all registered users (for admin panel).

**Response (200):**
```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "verified": false,
      "documents": [],
      "createdAt": "2026-05-29T14:20:00.000Z"
    },
    {
      "id": "650f9401-f30c-42e5-b827-557766551111",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "verified": true,
      "documents": [...],
      "createdAt": "2026-05-29T14:25:00.000Z"
    }
  ]
}
```

**Notes:**
- Passwords are NOT included in response
- Sorted by creation date (newest first)
- No authentication required (demo mode)

---

### 5. Mark User as Verified
**POST** `/users/:id/verify`

Change user's verification status to `true`.

**URL Parameters:**
- `id` (string): User ID (UUID)

**Request Body:** None (send empty POST)

**Response (200):**
```json
{
  "message": "User verified successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "verified": true
  }
}
```

**Error Responses:**
- `404`: User not found

**Example cURL:**
```bash
curl -X POST http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000/verify
```

---

### 6. Get User Profile
**GET** `/me/:id`

Retrieve profile data for a specific user.

**URL Parameters:**
- `id` (string): User ID (UUID)

**Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "verified": false,
    "documents": [
      {
        "originalName": "id.pdf",
        "filename": "550e8400..._1234567890_id.pdf",
        "url": "/uploads/550e8400..._1234567890_id.pdf",
        "uploadedAt": "2026-05-29T14:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses:**
- `404`: User not found

---

### 7. Admin Login
**POST** `/admin/login`

Authenticate admin user (hardcoded credentials).

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

**Response (200):**
```json
{
  "token": "admin-token-1234567890",
  "message": "Admin login successful"
}
```

**Error Response (401):**
```json
{
  "message": "Invalid admin credentials"
}
```

**Default Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

---

## Error Handling

All errors return JSON with `message` field:

```json
{
  "message": "Description of error"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid credentials)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate email)
- `500`: Server Error

---

## Data Models

### User
```typescript
{
  id: string,           // UUID
  name: string,         // User full name
  email: string,        // Unique email (lowercase)
  password: string,     // bcrypt hashed
  verified: boolean,    // Admin verification status
  documents: Document[],
  createdAt: string     // ISO timestamp
}
```

### Document
```typescript
{
  originalName: string, // Original filename
  filename: string,     // Saved filename (with timestamp)
  url: string,          // Download URL path
  uploadedAt: string    // ISO timestamp
}
```

### QR Code Payload
```typescript
{
  data: {
    name: string,       // User name
    id: string,         // User UUID
    timestamp: string   // ISO timestamp when QR generated
  },
  signature: string     // FNV-1a hash for verification
}
```

---

## Examples

### Register and Login
```bash
# Register
curl -X POST http://localhost:4000/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "mypassword"
  }'

# Response contains user.id, e.g.: "550e8400-e29b-41d4-a716-446655440000"

# Login
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "mypassword"
  }'
```

### Upload Files
```bash
curl -X POST http://localhost:4000/upload/550e8400-e29b-41d4-a716-446655440000 \
  -F "documents=@passport.pdf" \
  -F "documents=@license.jpg"
```

### Get All Users (Admin)
```bash
curl http://localhost:4000/users
```

### Verify User (Admin)
```bash
curl -X POST http://localhost:4000/users/550e8400-e29b-41d4-a716-446655440000/verify
```

---

## Notes

### Security
- Passwords are hashed with bcryptjs (10 salt rounds)
- Admin credentials are hardcoded (for demo only)
- No JWT tokens used - simple session-based auth via localStorage
- Signature uses FNV-1a hash (not cryptographically secure, for learning only)

### File Storage
- Uploaded files stored in `/uploads` folder
- Filenames include user ID and timestamp for uniqueness
- Files served as static assets at `/uploads/filename`

### Database
- All data stored in `database.json`
- File updated synchronously on every change
- Passwords never sent in responses

---

## Future Enhancements
1. Add JWT tokens for better security
2. Add email verification on registration
3. Add file type validation (whitelist extensions)
4. Add soft delete for users/documents
5. Add pagination for user list
6. Add search/filter by name or email
7. Add audit logs for admin actions
8. Add rate limiting for API endpoints
9. Add two-factor authentication
10. Move to real database (MongoDB, PostgreSQL)
