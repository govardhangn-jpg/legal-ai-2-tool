// app.js - Application Entry Point
// SAMARTHAA-LEGAL

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 SAMARTHAA-LEGAL - Initializing...');

    if (!window.UI) {
        console.error('❌ UI is not loaded. Check script order in index.html.');
        return;
    }

    // Check backend health
    console.log('🔍 Checking backend server...');
    let backendHealthy = false;
    try {
        backendHealthy = await checkBackendHealth();
    } catch (err) {
        console.error('Backend health check failed:', err);
    }

    if (!backendHealthy) {
        console.warn('⚠️ Backend server is not responding!');
        showBackendWarning();
    } else {
        console.log('✅ Backend server is running');
    }

    // Initialize UI
    UI.init();

    console.log('✅ SAMARTHAA-LEGAL initialized');

    // ── LOGOUT ──────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Stop voice if active
            if (window.Voice) {
                window.Voice.stopSpeaking();
                window.Voice.stopRecording();
            }
            localStorage.removeItem('token');
            document.getElementById('mainApp').style.display    = 'none';
            document.getElementById('loginSection').style.display = 'block';
            logoutBtn.style.display = 'none';
            if (window.ChatAssistant) window.ChatAssistant.hideTrigger();
        });
    }

    // ── LOGIN ────────────────────────────────────────────────────────
    const loginBtn     = document.getElementById('loginBtn');
    const loginSection = document.getElementById('loginSection');
    const mainApp      = document.getElementById('mainApp');

    if (loginBtn) {
        // Auto-login if valid token exists
        const token = localStorage.getItem('token');
        if (token) {
            loginSection.style.display = 'none';
            mainApp.style.display      = 'block';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (window.ChatAssistant) window.ChatAssistant.showTrigger();
        } else {
            if (logoutBtn) logoutBtn.style.display = 'none';
        }

        loginBtn.addEventListener('click', async () => {
            const email    = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorEl  = document.getElementById('loginError');

            if (!email || !password) {
                errorEl.innerText = 'Please enter email and password.';
                return;
            }

            try {
                const response = await fetch('https://legal-ai-2-tool.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    loginSection.style.display = 'none';
                    mainApp.style.display      = 'block';
                    if (logoutBtn) logoutBtn.style.display = 'block';
                    errorEl.innerText = '';
                } else {
                    errorEl.innerText = data.message || 'Login failed';
                }
            } catch (error) {
                errorEl.innerText = 'Login failed. Please check your connection.';
            }
        });

        // Allow Enter key on password field
        document.getElementById('loginPassword').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }
});

// ── Backend warning ────────────────────────────────────────────────────
function showBackendWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className   = 'error-message';
    warningDiv.style.display  = 'block';
    warningDiv.style.margin   = '20px auto';
    warningDiv.style.maxWidth = '800px';
    warningDiv.innerHTML = `
        <strong>⚠️ Backend Server Not Running</strong><br><br>
        The backend server is not responding. Please ensure:<br>
        1. Started the backend server: <code>npm start</code><br>
        2. Backend is running on <code>http://localhost:5000</code>
    `;
    const container = document.querySelector('.container');
    if (container) container.insertBefore(warningDiv, container.firstChild);
}

// ── Global error handler ───────────────────────────────────────────────
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// ── Browser compatibility check ────────────────────────────────────────
(function checkBrowserCompatibility() {
    const features = {
        fetch:        typeof fetch !== 'undefined',
        promises:     typeof Promise !== 'undefined',
        classList:    'classList' in document.createElement('div'),
        localStorage: typeof localStorage !== 'undefined'
    };
    const unsupported = Object.entries(features)
        .filter(([, ok]) => !ok)
        .map(([f]) => f);
    if (unsupported.length > 0) {
        console.warn('Unsupported browser features:', unsupported);
    }
})();
