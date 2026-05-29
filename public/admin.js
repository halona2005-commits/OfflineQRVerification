const adminTokenKey = 'veriscan-admin-token';
const apiBase = '';

function select(selector) {
  return document.querySelector(selector);
}

function getAdminToken() {
  return localStorage.getItem(adminTokenKey);
}

function setAdminToken(token) {
  if (token) {
    localStorage.setItem(adminTokenKey, token);
  } else {
    localStorage.removeItem(adminTokenKey);
  }
}

function showMessage(element, message, type = 'neutral') {
  if (!element) return;
  element.textContent = message;
  element.style.color = type === 'error' ? '#ff9aa2' : type === 'success' ? '#b4ffd8' : 'var(--muted)';
}

async function adminLogin(email, password) {
  const response = await fetch(`${apiBase}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json().then((result) => ({ ok: response.ok, result }));
}

// --- Signature helpers (same algorithm as user app) ---
function hashText(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
    hash = ((hash << 5) | (hash >>> 27)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function createSignature(payload) {
  return hashText(`${payload}|veriscan-signature`);
}

// --- QR scanner logic for admin verification ---
let adminScanner = null;
let adminScannerActive = false;

function updateAdminVerifyStatus(message, style = '') {
  const el = select('#adminVerifyStatus');
  el.className = 'status-panel';
  if (style === 'success') el.classList.add('success-panel');
  if (style === 'danger') el.classList.add('danger-panel');
  el.innerHTML = `<p>${message}</p>`;
}

function onAdminScanSuccess(decodedText) {
  // Stop scanner on first successful read
  stopAdminScanner();
  let parsed;
  try {
    parsed = JSON.parse(decodedText);
  } catch (err) {
    updateAdminVerifyStatus('Scanned QR does not contain valid JSON.', 'danger');
    return;
  }

  if (!parsed.data || !parsed.signature) {
    updateAdminVerifyStatus('QR missing required fields.', 'danger');
    return;
  }

  const expected = createSignature(JSON.stringify(parsed.data));
  if (expected === parsed.signature) {
    updateAdminVerifyStatus(`VALID — ${parsed.data.name} (${parsed.data.id})`, 'success');
  } else {
    updateAdminVerifyStatus('INVALID — signature mismatch detected.', 'danger');
  }
}

function onAdminScanError(err) {
  console.warn('Admin scanner error:', err);
}

async function startAdminScanner() {
  if (adminScannerActive || !select('#adminReader')) return;
  adminScanner = new Html5Qrcode('adminReader');
  const config = { fps: 10, qrbox: 260 };
  try {
    await adminScanner.start({ facingMode: 'environment' }, config, onAdminScanSuccess, onAdminScanError);
    adminScannerActive = true;
    select('#adminStartScannerBtn').classList.add('hidden');
    select('#adminStopScannerBtn').classList.remove('hidden');
    updateAdminVerifyStatus('Scanner running — point camera at a QR code.');
  } catch (err) {
    updateAdminVerifyStatus('Unable to access camera. Check permissions.', 'danger');
    console.error(err);
  }
}

async function stopAdminScanner() {
  if (!adminScannerActive || !adminScanner) return;
  try {
    await adminScanner.stop();
    adminScanner.clear();
  } catch (err) {
    console.warn('Error stopping admin scanner', err);
  }
  adminScannerActive = false;
  select('#adminStartScannerBtn').classList.remove('hidden');
  select('#adminStopScannerBtn').classList.add('hidden');
  updateAdminVerifyStatus('Scanner stopped. Click Start Scanner to resume.');
}

async function loadUsers() {
  const token = getAdminToken();
  if (!token) return;

  try {
    const response = await fetch(`${apiBase}/users`);
    if (!response.ok) {
      throw new Error('Unable to load users');
    }
    const data = await response.json();
    renderUsers(data.users);
  } catch (error) {
    console.error(error);
    showMessage(select('#adminAuthMessage'), 'Unable to load admin dashboard.', 'error');
  }
}

function renderUsers(users) {
  const container = select('#adminUsersList');
  container.innerHTML = '';
  if (!users.length) {
    container.innerHTML = '<p class="muted">No registered users yet.</p>';
    return;
  }

  users.forEach((user) => {
    const card = document.createElement('article');
    card.className = 'user-card';
    card.innerHTML = `
      <header>
        <div>
          <h3>${user.name}</h3>
          <p class="muted">${user.email}</p>
        </div>
        <span class="status-pill ${user.verified ? 'verified' : 'pending'}">${user.verified ? 'Verified' : 'Pending'}</span>
      </header>
      <p><strong>User ID:</strong> ${user.id}</p>
      <div class="user-actions">
        <button class="btn secondary-btn verify-btn" data-id="${user.id}" ${user.verified ? 'disabled' : ''}>${user.verified ? 'Verified' : 'Mark as verified'}</button>
      </div>
      <div class="docs-grid">
        ${user.documents.length ? user.documents.map((doc) => `
          <div class="doc-card">
            <p>${doc.originalName}</p>
            <a href="${doc.url}" target="_blank" rel="noreferrer noopener">Download</a>
          </div>
        `).join('') : '<p class="muted">No documents uploaded</p>'}
      </div>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll('.verify-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.id;
      button.textContent = 'Verifying...';
      button.disabled = true;
      await verifyUser(userId);
    });
  });
}

async function verifyUser(userId) {
  try {
    const response = await fetch(`${apiBase}/users/${userId}/verify`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Unable to verify user');
    }
    await loadUsers();
    showMessage(select('#adminAuthMessage'), `User ${data.user.name} is now verified.`, 'success');
  } catch (error) {
    console.error(error);
    showMessage(select('#adminAuthMessage'), error.message || 'Verification failed.', 'error');
  }
}

function showAdminPanel() {
  select('#adminLoginPanel').classList.add('hidden');
  select('#adminDashboardPanel').classList.remove('hidden');
}

function hideAdminPanel() {
  select('#adminLoginPanel').classList.remove('hidden');
  select('#adminDashboardPanel').classList.add('hidden');
}

function initAdminPage() {
  const loginBtn = select('#adminLoginBtn');
  const logoutBtn = select('#adminLogoutBtn');
  const authMessage = select('#adminAuthMessage');

  const token = getAdminToken();
  if (token) {
    showAdminPanel();
    loadUsers();
  }

  loginBtn.addEventListener('click', async () => {
    const email = select('#adminEmail').value.trim();
    const password = select('#adminPassword').value.trim();
    if (!email || !password) {
      showMessage(authMessage, 'Admin email and password are required.', 'error');
      return;
    }

    const { ok, result } = await adminLogin(email, password);
    if (!ok) {
      showMessage(authMessage, result.message || 'Invalid admin login.', 'error');
      return;
    }

    setAdminToken(result.token);
    showMessage(authMessage, 'Admin signed in.', 'success');
    showAdminPanel();
    loadUsers();
  });

  logoutBtn.addEventListener('click', () => {
    setAdminToken(null);
    showMessage(authMessage, 'Signed out.', 'neutral');
    hideAdminPanel();
  });

  // Attach scanner buttons
  const startBtn = select('#adminStartScannerBtn');
  const stopBtn = select('#adminStopScannerBtn');
  if (startBtn) startBtn.addEventListener('click', startAdminScanner);
  if (stopBtn) stopBtn.addEventListener('click', stopAdminScanner);
}

initAdminPage();
