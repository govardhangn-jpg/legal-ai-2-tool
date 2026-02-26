// api.js - Backend API Integration
// SAMARTHAA-LEGAL

/**
 * Call backend Claude endpoint.
 * Automatically attaches JWT token from localStorage.
 */
async function callClaudeAPI(payload) {
    const backendURL =
        window.CONFIG?.API?.BACKEND_URL || 'https://legal-ai-2-tool.onrender.com/api/chat';

    console.log('🌐 Calling API:', backendURL);

    // 🔐 Get JWT token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('You are not logged in. Please log in to continue.');
    }

    const response = await fetch(backendURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`   // ✅ Send token with every request
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(600000)
    });

    const contentType = response.headers.get('content-type') || '';

    // Handle 401/403 — token expired or invalid
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        if (contentType.includes('application/json')) {
            const err = await response.json();
            errorMessage = err.error || errorMessage;
        } else {
            const text = await response.text();
            errorMessage = `Server error: ${text.substring(0, 200)}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Response received');
    console.log('📊 Usage:', data.usage);

    return data; // { success, output, usage }
}

/**
 * Check if backend is running
 */
async function checkBackendHealth() {
    const healthURL =
        window.CONFIG?.API?.HEALTH_CHECK || 'https://legal-ai-2-tool.onrender.com/api/health';

    try {
        const response = await fetch(healthURL);
        return response.ok;
    } catch (err) {
        console.error('Backend health check failed:', err);
        return false;
    }
}

// Expose globally
window.callClaudeAPI = callClaudeAPI;
window.checkBackendHealth = checkBackendHealth;
