const apiBase = '';
const userIdKey = 'veriscan-user-id';

function select(selector) {
  return document.querySelector(selector);
}

function showMessage(element, message, type = 'neutral') {
  if (!element) return;
  element.textContent = message;
  element.style.color = type === 'error' ? '#ff9aa2' : type === 'success' ? '#b4ffd8' : 'var(--muted)';
}

function getUserId() {
  return localStorage.getItem(userIdKey);
}

function setUserId(id) {
  if (id) {
    localStorage.setItem(userIdKey, id);
  } else {
    localStorage.removeItem(userIdKey);
  }
}

function redirectToDashboard() {
  window.location.href = 'dashboard.html';
}

function handleAuthPage() {
  const loginView = select('#loginView');
  const registerView = select('#registerView');
  const tabButtons = document.querySelectorAll('.tab-button');
  const authMessage = select('#authMessage');

  if (getUserId()) {
    redirectToDashboard();
    return;
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      if (button.dataset.view === 'login') {
        loginView.classList.remove('hidden');
        registerView.classList.add('hidden');
      } else {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
      }
      showMessage(authMessage, '');
    });
  });

  select('#loginBtn').addEventListener('click', async () => {
    const email = select('#loginEmail').value.trim();
    const password = select('#loginPassword').value.trim();
    if (!email || !password) {
      showMessage(authMessage, 'Please enter email and password.', 'error');
      return;
    }

    try {
      const response = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        showMessage(authMessage, result.message || 'Login failed.', 'error');
        return;
      }
      setUserId(result.user.id);
      redirectToDashboard();
    } catch (error) {
      showMessage(authMessage, 'Unable to complete login.', 'error');
    }
  });

  select('#registerBtn').addEventListener('click', async () => {
    const name = select('#registerName').value.trim();
    const email = select('#registerEmail').value.trim();
    const password = select('#registerPassword').value.trim();
    if (!name || !email || !password) {
      showMessage(authMessage, 'Please complete all fields.', 'error');
      return;
    }

    try {
      const response = await fetch(`${apiBase}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        showMessage(authMessage, result.message || 'Registration failed.', 'error');
        return;
      }
      setUserId(result.user.id);
      redirectToDashboard();
    } catch (error) {
      showMessage(authMessage, 'Unable to create account.', 'error');
    }
  });
}

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

function buildQrPayload(user) {
  const data = {
    name: user.name,
    id: user.id,
    timestamp: new Date().toISOString(),
  };
  const payloadString = JSON.stringify(data);
  const signature = createSignature(payloadString);
  return { data, signature, payload: JSON.stringify({ data, signature }) };
}

function renderUserProfile(user) {
  select('#userName').textContent = user.name;
  select('#userEmail').textContent = user.email;
  select('#userId').textContent = user.id;
  select('#userVerified').textContent = user.verified ? 'Verified' : 'Pending';
  select('#userVerified').classList.toggle('verified', user.verified);
  select('#userVerified').classList.toggle('pending', !user.verified);
  select('#userDocsCount').textContent = `${user.documents.length} file${user.documents.length === 1 ? '' : 's'}`;
  renderDocuments(user.documents);
}

function renderDocuments(documents) {
  const container = select('#documentsList');
  container.innerHTML = '';
  if (!documents.length) {
    container.innerHTML = '<p class="muted">No uploaded documents yet. Upload files to see them here.</p>';
    return;
  }

  documents.forEach((doc) => {
    const card = document.createElement('article');
    card.className = 'doc-card';
    card.innerHTML = `
      <h4>${doc.originalName}</h4>
      <p class="muted">Uploaded ${new Date(doc.uploadedAt).toLocaleString()}</p>
      <a href="${doc.url}" target="_blank" rel="noreferrer noopener">Download file</a>
    `;
    container.appendChild(card);
  });
}

async function loadUserProfile() {
  const userId = getUserId();
  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch(`${apiBase}/me/${userId}`);
    if (!response.ok) {
      setUserId(null);
      window.location.href = 'index.html';
      return;
    }
    const result = await response.json();
    renderUserProfile(result.user);
    return result.user;
  } catch (error) {
    setUserId(null);
    window.location.href = 'index.html';
  }
}

async function uploadDocuments(user) {
  const fileInput = select('#fileInput');
  const uploadStatus = select('#uploadStatus');

  if (!fileInput.files.length) {
    showMessage(uploadStatus, 'Select at least one document to upload.', 'error');
    return;
  }

  const formData = new FormData();
  Array.from(fileInput.files).forEach((file) => {
    formData.append('documents', file);
  });

  try {
    const response = await fetch(`${apiBase}/upload/${user.id}`, {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) {
      showMessage(uploadStatus, result.message || 'Upload failed.', 'error');
      return;
    }
    showMessage(uploadStatus, 'Upload successful. Your documents are now available below.', 'success');
    fileInput.value = '';
    renderDocuments(result.documents);
    select('#userDocsCount').textContent = `${result.documents.length} file${result.documents.length === 1 ? '' : 's'}`;
  } catch (error) {
    showMessage(uploadStatus, 'Upload request failed.', 'error');
  }
}

function initDashboard() {
  const panelButtons = document.querySelectorAll('.menu-link');
  const panels = {
    summary: select('#summaryPanel'),
    upload: select('#uploadPanel'),
    qrcode: select('#qrPanel'),
  };
  const logoutBtn = select('#logoutBtn');
  const uploadForm = select('#uploadForm');
  const generateQrBtn = select('#generateQrBtn');
  const qrMeta = select('#qrMeta');
  const qrTarget = select('#qrcode');

  let userData = null;
  let scanner = null;
  let scannerActive = false;

  function showPanel(name) {
    panelButtons.forEach((button) => button.classList.toggle('active', button.dataset.panel === name));
    Object.entries(panels).forEach(([key, element]) => {
      element.classList.toggle('hidden', key !== name);
    });
  }

  // No scanner UI on the user dashboard; notifications will show inside the QR meta area.

  async function renderQr() {
    if (!userData) return;
    const payload = buildQrPayload(userData);
    qrTarget.innerHTML = '';
    new QRCode(qrTarget, {
      text: payload.payload,
      width: 240,
      height: 240,
      colorDark: '#e8ebff',
      colorLight: 'transparent',
      correctLevel: QRCode.CorrectLevel.H,
    });
    qrMeta.innerHTML = `
      <p><strong>Name:</strong> ${payload.data.name}</p>
      <p><strong>ID:</strong> ${payload.data.id}</p>
      <p><strong>Signature:</strong> ${payload.signature}</p>
      <p class="muted">Generated at ${new Date(payload.data.timestamp).toLocaleString()}</p>
    `;
  }

  // QR verification/scanner intentionally omitted from user dashboard.

  panelButtons.forEach((button) => {
    button.addEventListener('click', () => showPanel(button.dataset.panel));
  });

  logoutBtn.addEventListener('click', () => {
    setUserId(null);
    window.location.href = 'index.html';
  });

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!userData) return;
    await uploadDocuments(userData);
  });

  generateQrBtn.addEventListener('click', async () => {
    if (!userData) {
      qrMeta.innerHTML = '<p class="muted">Load your profile first before generating a QR.</p>';
      return;
    }
    renderQr();
  });

  window.addEventListener('beforeunload', () => {});
  return loadUserProfile().then((user) => {
    if (!user) return;
    userData = user;
    renderQr();
  });
}

function initPage() {
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('public/')) {
    handleAuthPage();
  }
  if (window.location.pathname.endsWith('dashboard.html')) {
    initDashboard();
  }
}

initPage();
