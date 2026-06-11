// Offline QR Verification System - JSON File Storage Backend

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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_PATH));

// ========== DATABASE UTILITIES ==========

function initializeDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = { users: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    console.log('Database initialized');
  }
}

function readDatabase() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [] };
  }
}

function writeDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function findUserByEmail(email) {
  return readDatabase().users.find(u => u.email === email.toLowerCase());
}

function findUserById(id) {
  return readDatabase().users.find(u => u.id === id);
}

function createUser(name, email, password) {
  const db = readDatabase();
  const user = {
    id: uuidv4(),
    name,
    email: email.toLowerCase(),
    password: bcrypt.hashSync(password, 10),
    verified: false,
    documents: [],
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDatabase(db);
  return user;
}

function addDocumentToUser(userId, originalName, filename) {
  const db = readDatabase();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('User not found');

  user.documents.push({
    originalName,
    filename,
    url: `/uploads/${encodeURIComponent(filename)}`,
    uploadedAt: new Date().toISOString()
  });

  writeDatabase(db);
  return user;
}

function verifyUser(userId) {
  const db = readDatabase();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new Error('User not found');

  user.verified = true;
  writeDatabase(db);
  return user;
}

// ========== MULTER ==========

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_PATH),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${req.params.id}_${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ========== ROUTES ==========

// ✅ Homepage fix (VERY IMPORTANT)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register
app.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    if (findUserByEmail(email))
      return res.status(409).json({ message: 'Email already exists' });

    const user = createUser(name, email, password);

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, verified: user.verified }
    });
  } catch {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
app.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    const user = findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Upload
app.post('/upload/:id', upload.array('documents', 5), (req, res) => {
  try {
    if (!req.files.length)
      return res.status(400).json({ message: 'No files uploaded' });

    let user = findUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.files.forEach(f => {
      user = addDocumentToUser(req.params.id, f.originalname, f.filename);
    });

    res.json({ documents: user.documents });
  } catch {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// Get users
app.get('/users', (req, res) => {
  const users = readDatabase().users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    verified: u.verified,
    documents: u.documents
  }));
  res.json({ users });
});

// Verify user
app.post('/users/:id/verify', (req, res) => {
  try {
    const user = verifyUser(req.params.id);
    res.json({ message: 'Verified', user });
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
});

// Admin login ✅ FIXED
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  const ADMIN_EMAIL = 'admin@example.com';
  const ADMIN_PASSWORD = 'Admin123!';

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ token: 'admin-token' });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});

// ========== START SERVER ==========

initializeDatabase();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});