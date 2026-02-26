// app.js - Application Entry Point

/**
 * Initialize application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Indian Legal AI Assistant - Initializing...');

    // Safety check: UI must already be loaded
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

    // Initialize UI (ONLY ONCE)
    UI.init();

    console.log('✅ Application initialized successfully');


    // ================= LOGOUT SYSTEM =================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        document.getElementById("mainApp").style.display = "none";
        document.getElementById("loginSection").style.display = "block";
        logoutBtn.style.display = "none";
    });
}


    // ================= LOGIN SYSTEM =================

const loginBtn = document.getElementById("loginBtn");
const loginSection = document.getElementById("loginSection");
const mainApp = document.getElementById("mainApp");

if (loginBtn) {

    // Check if token already exists
    const token = localStorage.getItem("token");

    if (token) {
    loginSection.style.display = "none";
    mainApp.style.display = "block";
    logoutBtn.style.display = "block";
} else {
    logoutBtn.style.display = "none";
}


    loginBtn.addEventListener("click", async () => {

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const response = await fetch("https://legal-ai-2-tool.onrender.com/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                loginSection.style.display = "none";
                mainApp.style.display = "block";
                logoutBtn.style.display = "block";
            } else {
                document.getElementById("loginError").innerText = data.message;
            }

        } catch (error) {
            document.getElementById("loginError").innerText = "Login failed";
        }
    });
}


});

/**
 * Show warning if backend is not running
 */
function showBackendWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'error-message';
    warningDiv.style.display = 'block';
    warningDiv.style.margin = '20px auto';
    warningDiv.style.maxWidth = '800px';
    warningDiv.innerHTML = `
        <strong>⚠️ Backend Server Not Running</strong><br><br>
        The backend server is not responding. Please ensure you have:<br>
        1. Started the backend server: <code>cd backend && npm start</code><br>
        2. Backend is running on <code>http://localhost:5000</code><br><br>
        See <strong>README.md</strong> for complete setup instructions.
    `;

    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(warningDiv, container.firstChild);
    }
}

/**
 * Handle global JS errors
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

/**
 * Check browser compatibility
 */
function checkBrowserCompatibility() {
    const features = {
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        classList: 'classList' in document.createElement('div'),
        localStorage: typeof localStorage !== 'undefined'
    };

    const unsupported = Object.entries(features)
        .filter(([, supported]) => !supported)
        .map(([feature]) => feature);

    if (unsupported.length > 0) {
        console.warn('Unsupported browser features:', unsupported);
        return false;
    }

    return true;
}

// Run compatibility check immediately
checkBrowserCompatibility();
