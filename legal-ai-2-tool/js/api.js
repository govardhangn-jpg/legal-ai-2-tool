// api.js - Backend API Integration (CLEAN & CORRECT)

/**
 * Call backend Claude endpoint
 */
async function callClaudeAPI(payload) {
    const backendURL =
        window.CONFIG?.API?.BACKEND_URL || 'https://legal-ai-2-tool.onrender.com/api/chat';

        
    console.log('🌐 Calling API:', backendURL);
    console.log('📦 Payload:', payload);

    
const response = await fetch(backendURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(600000)// 5-second timeout
});

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;

        if (contentType.includes('application/json')) {
            const err = await response.json();
            errorMessage = err.error || errorMessage;
        } else {
            const text = await response.text();
            errorMessage = `Non-JSON error from backend:\n${text.substring(0, 200)}`;
        }

        throw new Error(errorMessage);
    }

    const data = await response.json();

    console.log('✅ Backend response received');
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

// 🔥 EXPOSE GLOBALLY
window.callClaudeAPI = callClaudeAPI;
window.checkBackendHealth = checkBackendHealth;
