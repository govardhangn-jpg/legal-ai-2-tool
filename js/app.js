// app.js - Application Entry Point
// SAMARTHAA-LEGAL

const BACKEND         = 'https://legal-ai-2-tool-1.onrender.com';
const SESSION_BACKEND = 'https://samarthaa-session.govardhangn.workers.dev';

// ── Session state ─────────────────────────────────────────────────
let _sessionToken    = null;   // our session token (not the JWT)
let _sessionUserKey  = null;   // email used as the session key
let _sessionWatcher  = null;   // heartbeat interval ID
let _kickOverlay     = null;   // DOM overlay shown on kick
let _offlineFailures = 0;      // heartbeat failures before assuming offline

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
            clearSession();
            localStorage.removeItem('token');
            localStorage.removeItem('samarthaa_locale');
            document.getElementById('mainApp').style.display     = 'none';
            document.getElementById('loginSection').style.display = 'block';
            logoutBtn.style.display = 'none';
            // Reset locale buttons on login screen
            if (window.setAppLocale) setAppLocale('en-IN');
            if (window.ChatAssistant) window.ChatAssistant.hideTrigger();
        });
    }

    // ── AUTO LOGIN (restore saved session) ───────────────────────────
    const loginSection  = document.getElementById('loginSection');
    const mainApp       = document.getElementById('mainApp');
    const savedToken    = localStorage.getItem('token');
    const savedSesToken = localStorage.getItem('legal_session_token');
    const savedSesEmail = localStorage.getItem('legal_session_email');

    if (savedToken && savedSesToken && savedSesEmail) {
        // Validate the cross-device session before allowing in
        const valid = await validateSession(savedSesEmail, savedSesToken);
        if (valid) {
            _sessionToken   = savedSesToken;
            _sessionUserKey = savedSesEmail;
            loginSection.style.display = 'none';
            mainApp.style.display      = 'block';
            if (logoutBtn) logoutBtn.style.display = 'block';
            setTimeout(() => { if (window.ChatAssistant) window.ChatAssistant.showTrigger(); }, 300);
            startSessionWatcher();
        } else {
            // Session was displaced or expired — force re-login
            localStorage.removeItem('token');
            localStorage.removeItem('legal_session_token');
            localStorage.removeItem('legal_session_email');
            if (logoutBtn) logoutBtn.style.display = 'none';
            showLoginError('Your session has ended. Please log in again.');
        }
    } else if (savedToken && !savedSesToken) {
        // Old login without session management — force re-login to register session
        localStorage.removeItem('token');
        if (logoutBtn) logoutBtn.style.display = 'none';
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    // ── LOGIN HANDLER ─────────────────────────────────────────────────
    const loginBtn = document.getElementById('loginBtn');

    async function attemptLogin() {
        const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
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
                    // ── Register cross-device session ──────────────────
                    const sessionTok = generateSessionToken();
                    const device     = getDeviceDescription();

                    setLoginLoading(true, 'Securing session…');

                    const registered = await registerSession(email, sessionTok, device);

                    if (!registered) {
                        // Session backend down — still let them in (fail open, log warning)
                        console.warn('⚠️ Session backend unavailable — proceeding without cross-device lock');
                    } else {
                        _sessionToken   = sessionTok;
                        _sessionUserKey = email;
                        localStorage.setItem('legal_session_token', sessionTok);
                        localStorage.setItem('legal_session_email', email);
                    }

                    localStorage.setItem('token', data.token);
                    // Lock locale to country selected at login
                    if (window.CONFIG) {
                        const savedLocale = localStorage.getItem('samarthaa_locale') || 'en-IN';
                        CONFIG.setLocale(savedLocale);
                        CONFIG.applyLocale();
                        if (window.applyTranslations) applyTranslations();
                    }
                    loginSection.style.display = 'none';
                    mainApp.style.display      = 'block';
                    if (logoutBtn) logoutBtn.style.display = 'block';
                    if (window.ChatAssistant) window.ChatAssistant.showTrigger();
                    clearLoginError();
                    setLoginLoading(false);

                    if (registered) startSessionWatcher();
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

// ══════════════════════════════════════════════════════════════
//   SESSION MANAGEMENT  (Cloudflare Worker)
// ══════════════════════════════════════════════════════════════

/**
 * Register a new session on login.
 * Any existing session on another device is automatically displaced.
 */
async function registerSession(email, sessionToken, device) {
    try {
        const res = await fetch(`${SESSION_BACKEND}/session/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                invitationCode: email,       // email is the unique user key
                token:          sessionToken,
                device:         device,
                expiryDays:     1            // 24h session
            })
        });
        return res.ok;
    } catch (err) {
        console.error('Session register failed:', err);
        return false;
    }
}

/**
 * Validate current session against the KV store.
 * Returns true if still valid, false if displaced or expired.
 */
async function validateSession(email, sessionToken) {
    try {
        const res  = await fetch(`${SESSION_BACKEND}/session/validate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                invitationCode: email,
                token:          sessionToken
            })
        });
        const data = await res.json();
        return data.valid === true;
    } catch (err) {
        // Network error — don't kick, assume offline
        console.warn('Session validate network error:', err);
        return true;
    }
}

/**
 * Notify the session backend on logout so the session key is cleaned up.
 */
async function logoutSession(email, sessionToken) {
    try {
        await fetch(`${SESSION_BACKEND}/session/logout`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                invitationCode: email,
                token:          sessionToken
            })
        });
    } catch (err) {
        console.warn('Session logout notify failed:', err);
    }
}

/**
 * Start the 20-second heartbeat that polls session validity.
 * Shows a "kicked" overlay if another device logged in as this user.
 */
function startSessionWatcher() {
    if (_sessionWatcher) clearInterval(_sessionWatcher);
    _offlineFailures = 0;

    _sessionWatcher = setInterval(async () => {
        if (!_sessionToken || !_sessionUserKey) return;

        try {
            const res  = await fetch(`${SESSION_BACKEND}/session/validate`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    invitationCode: _sessionUserKey,
                    token:          _sessionToken
                })
            });
            const data = await res.json();
            _offlineFailures = 0;

            if (!data.valid) {
                const reason = data.reason || 'session_ended';
                stopSessionWatcher();

                if (reason === 'session_displaced') {
                    showKickedOverlay(
                        '🔒 Session Ended',
                        'Your account was signed in from another device. Only one session is allowed at a time.'
                    );
                } else if (reason === 'session_expired') {
                    showKickedOverlay(
                        '⏰ Session Expired',
                        'Your session has expired. Please log in again to continue.'
                    );
                } else {
                    showKickedOverlay(
                        '⚠️ Session Ended',
                        'Your session is no longer active. Please log in again.'
                    );
                }
            }

        } catch (err) {
            // Count consecutive failures — tolerate up to 3 before ignoring
            _offlineFailures++;
            if (_offlineFailures <= 3) {
                console.warn(`Session heartbeat failed (${_offlineFailures}/3):`, err.message);
            }
            // After 3 failures we stay quiet (user is likely just offline)
        }

    }, 20000); // every 20 seconds
}

function stopSessionWatcher() {
    if (_sessionWatcher) {
        clearInterval(_sessionWatcher);
        _sessionWatcher = null;
    }
}

/**
 * Full session clear — called on manual logout.
 */
function clearSession() {
    stopSessionWatcher();

    if (_sessionToken && _sessionUserKey) {
        logoutSession(_sessionUserKey, _sessionToken);
    }

    _sessionToken    = null;
    _sessionUserKey  = null;
    _offlineFailures = 0;

    localStorage.removeItem('legal_session_token');
    localStorage.removeItem('legal_session_email');

    if (_kickOverlay) {
        _kickOverlay.remove();
        _kickOverlay = null;
    }
}

/**
 * Show a full-screen overlay when the session is displaced or expired.
 * User must click "Login Again" — they cannot dismiss it otherwise.
 */
function showKickedOverlay(title, message) {
    // Don't show twice
    if (_kickOverlay) return;

    // Stop any voice activity
    if (window.Voice) {
        window.Voice.stopSpeaking();
        window.Voice.stopRecording();
    }
    if (window.ChatAssistant) window.ChatAssistant.stopSpeaking();

    // Clear JWT so any in-flight requests fail cleanly
    localStorage.removeItem('token');
    localStorage.removeItem('legal_session_token');
    localStorage.removeItem('legal_session_email');

    _kickOverlay = document.createElement('div');
    _kickOverlay.id = 'sessionKickOverlay';
    _kickOverlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'bottom:0',
        'background:rgba(28,14,7,0.96)',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'z-index:99999',
        'font-family:"IBM Plex Sans",sans-serif',
        'padding:24px',
        'text-align:center'
    ].join(';');

    _kickOverlay.innerHTML = `
        <div style="
            background:#2c1a0e;
            border:1.5px solid #8b6914;
            border-radius:16px;
            padding:40px 36px;
            max-width:420px;
            width:100%;
            box-shadow:0 8px 40px rgba(0,0,0,0.6);
        ">
            <div style="font-size:3rem;margin-bottom:16px">⚖️</div>
            <h2 style="color:#c9a84c;font-family:'Crimson Pro',serif;font-size:1.5rem;margin:0 0 12px">${title}</h2>
            <p style="color:#b8a888;font-size:0.95rem;line-height:1.6;margin:0 0 28px">${message}</p>
            <button
                id="kickLoginAgainBtn"
                style="
                    background:linear-gradient(135deg,#8b6914,#c9a84c);
                    color:#2c1a0e;
                    border:none;
                    padding:14px 32px;
                    border-radius:8px;
                    font-size:1rem;
                    font-weight:700;
                    cursor:pointer;
                    width:100%;
                    letter-spacing:0.03em;
                "
            >
                🔑 Login Again
            </button>
        </div>
    `;

    document.body.appendChild(_kickOverlay);

    document.getElementById('kickLoginAgainBtn').addEventListener('click', () => {
        _kickOverlay.remove();
        _kickOverlay = null;
        // Hide main app, show login
        const mainApp = document.getElementById('mainApp');
        if (mainApp) mainApp.style.display = 'none';
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (window.ChatAssistant) window.ChatAssistant.hideTrigger();
        document.getElementById('loginSection').style.display = 'block';
        clearLoginError();
        setLoginLoading(false);
    });
}

// ── Session token generator ───────────────────────────────────────
function generateSessionToken() {
    return 'LEGAL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function getDeviceDescription() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/macintosh/i.test(ua)) return 'Mac';
    if (/windows/i.test(ua)) return 'Windows';
    return 'Browser';
}

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

// ── Helpers ───────────────────────────────────────────────────────
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
