// DOM Elements
const elements = {
    password: document.getElementById('password'),
    copyBtn: document.getElementById('copy-btn'),
    generateBtn: document.getElementById('generate-btn'),
    exportBtn: document.getElementById('export-btn'),
    qrBtn: document.getElementById('qr-btn'),
    decryptBtn: document.getElementById('decrypt-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    lengthSlider: document.getElementById('length'),
    lengthValue: document.getElementById('length-value'),
    uppercase: document.getElementById('uppercase'),
    lowercase: document.getElementById('lowercase'),
    numbers: document.getElementById('numbers'),
    symbols: document.getElementById('symbols'),
    strengthBar: document.querySelector('.bar'),
    strengthText: document.getElementById('strength-text'),
    leakStatus: document.getElementById('leak-status'),
    expiry: document.getElementById('expiry'),
    historyList: document.getElementById('history-list'),
    encryptedFile: document.getElementById('encrypted-file'),
    decryptionKey: document.getElementById('decryption-key'),
    decryptedPassword: document.getElementById('decrypted-password'),
    qrContainer: document.getElementById('qr-container')
};

// Global variables
let currentPassword = '';
let expiryDate = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Set up event listeners
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.lengthSlider.addEventListener('input', updateLength);
    elements.generateBtn.addEventListener('click', generatePassword);
    elements.copyBtn.addEventListener('click', copyPassword);
    elements.exportBtn.addEventListener('click', exportPassword);
    elements.qrBtn.addEventListener('click', generateQRCode);
    elements.decryptBtn.addEventListener('click', decryptFile);
    
    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generatePassword();
    });
    
    // Load password history
    loadHistory();
    
    // Generate first password
    generatePassword();
});

// Update length display
function updateLength() {
    elements.lengthValue.textContent = elements.lengthSlider.value;
}

// Generate password
function generatePassword() {
    const length = elements.lengthSlider.value;
    const options = {
        upper: elements.uppercase.checked,
        lower: elements.lowercase.checked,
        number: elements.numbers.checked,
        symbol: elements.symbols.checked
    };
    
    currentPassword = createPassword(length, options);
    elements.password.value = currentPassword;
    
    // Set expiry date (30 days from now)
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    updateExpiryDisplay();
    
    // Update security info
    checkStrength(currentPassword);
    checkBreaches(currentPassword);
    addToHistory(currentPassword);
    
    // Clear QR code
    elements.qrContainer.innerHTML = '';
}

// Create password
function createPassword(length, options) {
    let chars = '';
    if (options.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (options.number) chars += '0123456789';
    if (options.symbol) chars += '!@#$%^&*()_+-=';
    
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Check password strength
function checkStrength(password) {
    let strength = 0;
    
    // Length
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 2;
    if (password.length >= 16) strength += 2;
    
    // Complexity
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 2;
    
    // Unique chars
    const unique = new Set(password).size;
    if (unique / password.length > 0.7) strength += 1;
    
    // Update UI
    let strengthLevel, color;
    if (strength <= 3) {
        strengthLevel = 'Weak';
        color = 'var(--danger)';
    } else if (strength <= 6) {
        strengthLevel = 'Medium';
        color = 'var(--warning)';
    } else {
        strengthLevel = 'Strong';
        color = 'var(--primary)';
    }
    
    elements.strengthBar.style.width = `${(strength / 10) * 100}%`;
    elements.strengthBar.style.backgroundColor = color;
    elements.strengthText.textContent = strengthLevel;
    elements.strengthText.style.color = color;
}

// Check password breaches
async function checkBreaches(password) {
    elements.leakStatus.textContent = 'Checking breaches...';
    elements.leakStatus.style.color = 'var(--muted)';
    
    try {
        const hash = await sha256(password);
        const prefix = hash.substring(0, 5);
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        const hashes = await response.text();
        
        if (hashes.includes(hash.substring(5).toUpperCase())) {
            elements.leakStatus.textContent = '⚠️ Found in breaches';
            elements.leakStatus.style.color = 'var(--danger)';
        } else {
            elements.leakStatus.textContent = '✅ Not found in breaches';
            elements.leakStatus.style.color = 'var(--primary)';
        }
    } catch {
        elements.leakStatus.textContent = '🔒 Could not check breaches';
        elements.leakStatus.style.color = 'var(--muted)';
    }
}

// SHA-256 hash
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Expiry display
function updateExpiryDisplay() {
    if (!expiryDate) return;
    
    const now = new Date();
    const diff = expiryDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days <= 0) {
        elements.expiry.textContent = '⚠️ Password expired';
        elements.expiry.style.color = 'var(--danger)';
        return;
    }
    
    let color = 'var(--primary)';
    if (days <= 7) color = 'var(--warning)';
    if (days <= 3) color = 'var(--danger)';
    
    elements.expiry.textContent = `Expires in ${days} day${days !== 1 ? 's' : ''}`;
    elements.expiry.style.color = color;
}

// Password history
function addToHistory(password) {
    const history = JSON.parse(localStorage.getItem('passwordHistory') || '[]');
    history.unshift({
        password,
        time: new Date().toLocaleTimeString(),
        strength: elements.strengthText.textContent
    });
    
    // Keep only last 5 items
    localStorage.setItem('passwordHistory', JSON.stringify(history.slice(0, 5)));
    loadHistory();
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('passwordHistory') || []);
    elements.historyList.innerHTML = history.map(item => `
        <li>
            <span class="pwd">${item.password}</span>
            <span class="info">
                <span class="strength" style="color: ${
                    item.strength === 'Strong' ? 'var(--primary)' : 
                    item.strength === 'Medium' ? 'var(--warning)' : 'var(--danger)'
                }">${item.strength}</span>
                <span class="time">${item.time}</span>
            </span>
        </li>
    `).join('');
    
    // Click to reuse password
    document.querySelectorAll('#history-list li').forEach(li => {
        li.addEventListener('click', () => {
            const password = li.querySelector('.pwd').textContent;
            elements.password.value = password;
            currentPassword = password;
            checkStrength(password);
        });
    });
}

// Copy password
function copyPassword() {
    if (!currentPassword) return;
    
    navigator.clipboard.writeText(currentPassword).then(() => {
        const originalText = elements.copyBtn.textContent;
        elements.copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            elements.copyBtn.textContent = originalText;
        }, 2000);
    });
}

// Export password
async function exportPassword() {
    if (!currentPassword) return;
    
    const key = prompt('Enter encryption key (16+ characters):');
    if (!key || key.length < 16) {
        alert('Key must be at least 16 characters');
        return;
    }
    
    try {
        const encrypted = await encrypt(currentPassword, key);
        const blob = new Blob([JSON.stringify(encrypted)], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `password_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Export failed: ' + error.message);
    }
}

// Encrypt password
async function encrypt(text, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        {name: 'AES-GCM'},
        false,
        ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv},
        cryptoKey,
        data
    );
    
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
        timestamp: new Date().toISOString()
    };
}

// Generate QR code
function generateQRCode() {
    if (!currentPassword) return;
    
    elements.qrContainer.innerHTML = '';
    QRCode.toCanvas(currentPassword, {
        width: 180,
        color: {
            dark: document.body.classList.contains('dark-mode') ? '#ffffff' : '#000000',
            light: '#00000000'
        }
    }, (err, canvas) => {
        if (err) {
            console.error(err);
            elements.qrContainer.textContent = 'QR generation failed';
            return;
        }
        elements.qrContainer.appendChild(canvas);
    });
}

// Decrypt file
async function decryptFile() {
    const file = elements.encryptedFile.files[0];
    if (!file) {
        alert('Please select a file first');
        return;
    }
    
    const key = elements.decryptionKey.value;
    if (!key) {
        alert('Please enter the decryption key');
        return;
    }
    
    try {
        const encrypted = JSON.parse(await readFile(file));
        const decrypted = await decrypt(encrypted, key);
        
        elements.decryptedPassword.textContent = decrypted;
        elements.decryptedPassword.style.color = 'var(--primary)';
    } catch (error) {
        elements.decryptedPassword.textContent = 'Decryption failed: ' + error.message;
        elements.decryptedPassword.style.color = 'var(--danger)';
    }
}

// Decrypt data
async function decrypt(encrypted, key) {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        {name: 'AES-GCM'},
        false,
        ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: new Uint8Array(encrypted.iv)},
        cryptoKey,
        new Uint8Array(encrypted.data)
    );
    
    return new TextDecoder().decode(decrypted);
}

// Read file
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    
    // Regenerate QR code if exists to match theme
    if (elements.qrContainer.firstChild) {
        generateQRCode();
    }
}

// Update expiry display every minute
setInterval(() => {
    if (expiryDate) {
        updateExpiryDisplay();
    }
}, 60000);