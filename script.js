// Offline QR Verification System script.js
// Contains generator, scanner, hash, and navigation logic.

const navLinks = document.querySelectorAll('.nav-link');
const generateView = document.getElementById('generateView');
const verifyView = document.getElementById('verifyView');
const pageTitle = document.getElementById('pageTitle');
const generateBtnAction = document.getElementById('generateBtnAction');
const startScannerBtn = document.getElementById('startScannerBtn');
const stopScannerBtn = document.getElementById('stopScannerBtn');
const qrDetails = document.getElementById('qrDetails');
const qrCodeContainer = document.getElementById('qrcode');
const verifyStatus = document.getElementById('verifyStatus');
const nameInput = document.getElementById('nameInput');
const idInput = document.getElementById('idInput');

let qrCodeInstance = null;
let html5QrScanner = null;
let isScannerActive = false;
const SIGNATURE_KEY = 'offline-qr-verify-key';

function navigateTo(view) {
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.view === view);
  });

  if (view === 'generate') {
    pageTitle.textContent = 'Generate QR';
    generateView.classList.remove('hidden');
    verifyView.classList.add('hidden');
    stopScanner();
  } else {
    pageTitle.textContent = 'Verify QR';
    generateView.classList.add('hidden');
    verifyView.classList.remove('hidden');
  }
}

function simpleHash(text) {
  // Simple deterministic hash function for offline signature.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
    hash = ((hash << 5) | (hash >>> 27)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function createSignature(payload) {
  return simpleHash(`${payload}|${SIGNATURE_KEY}`);
}

function buildQrPayload(name, id) {
  const data = {
    name: name.trim(),
    id: id.trim(),
    timestamp: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(data);
  const signature = createSignature(payloadString);

  return {
    data,
    signature,
    payload: JSON.stringify({ data, signature }),
  };
}

function showQr(payload) {
  qrCodeContainer.innerHTML = '';
  if (qrCodeInstance) {
    qrCodeInstance.clear();
  }

  qrCodeInstance = new QRCode(qrCodeContainer, {
    text: payload.payload,
    width: 250,
    height: 250,
    colorDark: '#e8ebff',
    colorLight: 'transparent',
    correctLevel: QRCode.CorrectLevel.H,
  });

  qrDetails.innerHTML = `
    <p><strong>Name:</strong> ${payload.data.name}</p>
    <p><strong>ID:</strong> ${payload.data.id}</p>
    <p><strong>Signature:</strong> ${payload.signature}</p>
    <p class="muted">Generated: ${new Date(payload.data.timestamp).toLocaleString()}</p>
  `;
}

function validateInputFields() {
  const name = nameInput.value.trim();
  const id = idInput.value.trim();
  if (!name || !id) {
    qrDetails.innerHTML = '<p class="muted">Please enter both Name and ID before generating a QR code.</p>';
    return false;
  }
  return true;
}

function generateQrCode() {
  if (!validateInputFields()) {
    return;
  }

  const payload = buildQrPayload(nameInput.value, idInput.value);
  showQr(payload);
}

function parseQrRawData(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    return null;
  }
}

function verifyPayload(parsed) {
  if (!parsed || !parsed.data || !parsed.signature) {
    return false;
  }

  const payloadString = JSON.stringify(parsed.data);
  const verifiedSignature = createSignature(payloadString);
  return verifiedSignature === parsed.signature;
}

function displayVerificationResult(isValid, parsed) {
  verifyStatus.classList.toggle('success-card', isValid);
  verifyStatus.classList.toggle('danger-card', !isValid);

  if (isValid) {
    verifyStatus.innerHTML = `
      <div class="result-label result-valid">VALID QR</div>
      <p><strong>Name:</strong> ${parsed.data.name}</p>
      <p><strong>ID:</strong> ${parsed.data.id}</p>
      <p class="muted">Verified timestamp: ${new Date().toLocaleString()}</p>
    `;
  } else {
    verifyStatus.innerHTML = `
      <div class="result-label result-invalid">INVALID QR</div>
      <p>The scanned code has incorrect or tampered payload.</p>
      <p class="muted">Try scanning a proper signed QR code from this app.</p>
    `;
  }
}

function updateVerifyMessage(message) {
  verifyStatus.classList.remove('success-card', 'danger-card');
  verifyStatus.innerHTML = `<p class="muted">${message}</p>`;
}

function onScanSuccess(decodedText) {
  stopScanner();

  const parsed = parseQrRawData(decodedText);
  if (!parsed) {
    updateVerifyMessage('The QR code does not contain valid JSON content.');
    return;
  }

  const result = verifyPayload(parsed);
  displayVerificationResult(result, parsed);
}

function onScanError(error) {
  // Optional: ignore intermittent scan errors while scanning.
  console.warn('QR scan error:', error);
}

function startScanner() {
  if (isScannerActive) {
    return;
  }

  if (!document.getElementById('reader')) {
    updateVerifyMessage('Scanner component is unavailable.');
    return;
  }

  html5QrScanner = new Html5Qrcode('reader');
  const config = { fps: 10, qrbox: 260 };

  html5QrScanner
    .start({ facingMode: 'environment' }, config, onScanSuccess, onScanError)
    .then(() => {
      isScannerActive = true;
      startScannerBtn.classList.add('hidden');
      stopScannerBtn.classList.remove('hidden');
      updateVerifyMessage('Scanning active. Point your camera at a QR code now.');
    })
    .catch((error) => {
      updateVerifyMessage('Camera permission denied or device not supported.');
      console.error('Unable to start scanner:', error);
      if (html5QrScanner) {
        html5QrScanner.clear();
      }
    });
}

function stopScanner() {
  if (!isScannerActive || !html5QrScanner) {
    startScannerBtn.classList.remove('hidden');
    stopScannerBtn.classList.add('hidden');
    return;
  }

  html5QrScanner
    .stop()
    .then(() => {
      html5QrScanner.clear();
      isScannerActive = false;
      startScannerBtn.classList.remove('hidden');
      stopScannerBtn.classList.add('hidden');
      updateVerifyMessage('Scanner stopped. Tap Start Scanner to resume.');
    })
    .catch((error) => {
      console.error('Error stopping scanner:', error);
      isScannerActive = false;
      startScannerBtn.classList.remove('hidden');
      stopScannerBtn.classList.add('hidden');
    });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => navigateTo(link.dataset.view));
});

generateBtnAction.addEventListener('click', generateQrCode);
startScannerBtn.addEventListener('click', startScanner);
stopScannerBtn.addEventListener('click', stopScanner);

window.addEventListener('beforeunload', () => {
  if (isScannerActive) {
    stopScanner();
  }
});

// Initialize default view
navigateTo('generate');
