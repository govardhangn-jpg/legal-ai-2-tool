// app.js - Application Entry Point
// SAMARTHAA-LEGAL

const BACKEND = 'https://legal-ai-2-tool-1.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 SAMARTHAA-LEGAL - Initializing...');

    if (!window.UI) {
        console.error('❌ UI is not loaded. Check script order in index.html.');
        return;
    }

    UI.init();
    console.log('✅ SAMARTHAA-LEGAL initialized');

    // ── LOGOUT ──────────────────────────────────────────────────────
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.Voice) {
                window.Voice.stopSpeaking();
                window.Voice.stopRecording();
            }
            localStorage.removeItem('token');
            document.getElementById('mainApp').style.display     = 'none';
            document.getElementById('loginSection').style.display = 'block';
            logoutBtn.style.display = 'none';
            if (window.ChatAssistant) window.ChatAssistant.hideTrigger();
        });
    }

    // ── AUTO LOGIN ───────────────────────────────────────────────────
    const loginSection = document.getElementById('loginSection');
    const mainApp      = document.getElementById('mainApp');
    const savedToken   = localStorage.getItem('token');

    if (savedToken) {
        loginSection.style.display = 'none';
        mainApp.style.display      = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
        // Wait for chat.js to finish initializing
        setTimeout(() => { if (window.ChatAssistant) window.ChatAssistant.showTrigger(); }, 300);
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    // ── LOGIN HANDLER ─────────────────────────────────────────────────
    const loginBtn = document.getElementById('loginBtn');

    async function attemptLogin() {
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showLoginError('Please enter email and password.');
            return;
        }

        const MAX_RETRIES = 3;
        let lastError = '';

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt === 1) {
                    setLoginLoading(true, 'Logging in…');
                } else {
                    setLoginLoading(true, `Server waking up… (${attempt}/${MAX_RETRIES})`);
                    await sleep(3000);
                }

                const controller = new AbortController();
                const timeout    = setTimeout(() => controller.abort(), 20000);

                const response = await fetch(`${BACKEND}/api/login`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ email, password }),
                    signal:  controller.signal
                });

                clearTimeout(timeout);
                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    loginSection.style.display = 'none';
                    mainApp.style.display      = 'block';
                    if (logoutBtn) logoutBtn.style.display = 'block';
                    if (window.ChatAssistant) window.ChatAssistant.showTrigger();
                    clearLoginError();
                    setLoginLoading(false);
                    return;
                } else {
                    lastError = data.message || 'Invalid email or password.';
                    break; // Wrong credentials — no retry
                }

            } catch (err) {
                lastError = err.name === 'AbortError'
                    ? 'Server is slow to respond — still trying…'
                    : 'Network error. Check your connection.';
                console.warn(`Login attempt ${attempt} failed:`, err.message);
            }
        }

        setLoginLoading(false);
        showLoginError(`${lastError} Please wait 30 seconds and try again.`);
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', attemptLogin);
        document.getElementById('loginEmail').addEventListener('keydown',    e => { if (e.key === 'Enter') attemptLogin(); });
        document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
    }

    // Silent backend wake-up on page load
    wakeUpBackend();
});

// ── Wake backend silently on page load ────────────────────────────────
async function wakeUpBackend() {
    try {
        const res = await fetch(`${BACKEND}/api/health`);
        if (res.ok) console.log('✅ Backend server is running');
    } catch {
        console.warn('⚠️ Backend waking up...');
        setTimeout(wakeUpBackend, 6000);
    }
}

// ── Helpers ───────────────────────────────────────────────────────────
function setLoginLoading(loading, msg = 'Login') {
    const btn = document.getElementById('loginBtn');
    if (!btn) return;
    btn.disabled      = loading;
    btn.textContent   = msg;
    btn.style.opacity = loading ? '0.75' : '1';
}

function showLoginError(msg) {
    const el = document.getElementById('loginError');
    if (el) el.innerText = msg;
}

function clearLoginError() {
    const el = document.getElementById('loginError');
    if (el) el.innerText = '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

window.addEventListener('error', e => console.error('Global error:', e.error));
