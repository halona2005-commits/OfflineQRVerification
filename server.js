// Offline QR Verification System - JSON File Storage Backend
// Node.js + Express server with fs-based JSON database

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'database.json');
const UPLOADS_PATH = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_PATH));

// ========== DATABASE UTILITIES ==========

// Initialize database.json if it doesn't exist
function initializeDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = { users: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    console.log('Database initialized at', DB_PATH);
  }
}

// Read database from file
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [] };
  }
}

// Write database to file
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database:', error);
    throw error;
  }
}

// Find user by email
function findUserByEmail(email) {
  const db = readDatabase();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

// Find user by ID
function findUserById(id) {
  const db = readDatabase();
  return db.users.find((user) => user.id === id);
}

// Create new user
function createUser(name, email, password) {
  const db = readDatabase();
  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = {
    id,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    verified: false,
    documents: [],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDatabase(db);
  return newUser;
}

// Add document to user
function addDocumentToUser(userId, originalName, filename) {
  const db = readDatabase();
  const user = db.users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('User not found');
  }

  const document = {
    originalName,
    filename,
    url: `/uploads/${encodeURIComponent(filename)}`,
    uploadedAt: new Date().toISOString(),
  };

  user.documents.push(document);
  writeDatabase(db);
  return user;
}

// Verify user (mark as verified)
function verifyUser(userId) {
  const db = readDatabase();
  const user = db.users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.verified = true;
  writeDatabase(db);
  return user;
}


// ========== MULTER CONFIGURATION ==========

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_PATH),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    cb(null, `${req.params.id}_${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ========== API ENDPOINTS ==========

// POST /register - Register a new user
app.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = createUser(name, email, password);
    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /login - User login
app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        documents: user.documents,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// POST /upload/:id - Upload documents for a user
app.post('/upload/:id', upload.array('documents', 5), (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    let user = findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add all uploaded files to user
    req.files.forEach((file) => {
      user = addDocumentToUser(userId, file.originalname, file.filename);
    });

    return res.json({
      documents: user.documents,
      message: 'Files uploaded successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Upload failed' });
  }
});

// GET /users - Get all users (for admin panel)
app.get('/users', (req, res) => {
  try {
    const db = readDatabase();
    // Return users without passwords for security
    const safeUsers = db.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      documents: user.documents,
      createdAt: user.createdAt,
    }));
    return res.json({ users: safeUsers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch users' });
  }
});

// POST /users/:id/verify - Mark user as verified
app.post('/users/:id/verify', (req, res) => {
  try {
    const userId = req.params.id;
    const user = verifyUser(userId);
    return res.json({
      message: 'User verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(404).json({ message: error.message || 'User not found' });
  }
});

// GET /me/:id - Get current user profile
app.get('/me/:id', (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        documents: user.documents,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to load profile' });
  }
});

// GET /admin/login - Admin login (simple hardcoded credentials)
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  // Hardcoded admin credentials
  const ADMIN_EMAIL = 'admin@example.com';
  const ADMIN_PASSWORD = 'Admin123!';

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ token: 'admin-token-' + Date.now(), message: 'Admin login successful' });
  }

  return res.status(401).json({ message: 'Invalid admin credentials' });
});

// Catch-all for serving SPA
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).send('Not Found');
});

// ========== SERVER STARTUP ==========

initializeDatabase();

app.listen(PORT, () => {
  console.log(`\n✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ Database: ${DB_PATH}`);
  console.log(`✓ Uploads: ${UPLOADS_PATH}\n`);
});
