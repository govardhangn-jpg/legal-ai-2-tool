# Indian Legal AI Assistant - Technical Documentation

## Architecture Overview

This is a single-page web application that integrates directly with Anthropic's Claude API. The architecture is intentionally simple for easy deployment and maintenance.

### Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **API**: Anthropic Messages API (v1)
- **Deployment**: Static hosting (no backend required)

### Key Features

- Zero-backend architecture - runs entirely in browser
- Direct API integration with Anthropic
- Responsive design for desktop and mobile
- Client-side only processing
- No database required
- No user authentication needed

---

## Deployment Options

### Option 1: Local File (Simplest)

```bash
# Just open the HTML file
open indian-legal-ai.html

# Or with Python HTTP server
python -m http.server 8000
# Access at http://localhost:8000/indian-legal-ai.html
```

### Option 2: Nginx/Apache

```nginx
# Nginx configuration
server {
    listen 80;
    server_name legal-ai.yourdomain.com;
    
    root /var/www/legal-ai;
    index indian-legal-ai.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Enable gzip compression
    gzip on;
    gzip_types text/html text/css application/javascript;
}
```

### Option 3: Cloud Hosting

**AWS S3 + CloudFront:**
```bash
# Upload to S3 bucket
aws s3 cp indian-legal-ai.html s3://your-bucket/
aws s3 cp USER_GUIDE.md s3://your-bucket/

# Enable static website hosting
aws s3 website s3://your-bucket/ --index-document indian-legal-ai.html
```

**Netlify/Vercel:**
```bash
# Create netlify.toml
cat > netlify.toml << EOF
[[redirects]]
  from = "/*"
  to = "/indian-legal-ai.html"
  status = 200
EOF

# Deploy
netlify deploy --prod
```

### Option 4: Internal Network

```bash
# For law firm internal network
# Place in shared network drive or intranet server
# Users access via: http://intranet.lawfirm.com/legal-ai.html
```

---

## Configuration

### API Key Management

**Security Best Practices:**

1. **Client-Side Storage** (Current Implementation)
   - User enters API key each session
   - Not stored permanently
   - Cleared on page refresh
   - Suitable for individual use

2. **Enhanced Security Options:**

```javascript
// Option A: Use environment variables (requires build step)
const API_KEY = process.env.ANTHROPIC_API_KEY;

// Option B: Proxy through your backend (recommended for enterprise)
async function callClaudeAPI(prompt) {
    const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });
    return response.json();
}

// Backend endpoint (Node.js example)
app.post('/api/claude', async (req, res) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            messages: [{ role: 'user', content: req.body.prompt }]
        })
    });
    const data = await response.json();
    res.json(data);
});
```

3. **Session Storage** (Optional Enhancement)
```javascript
// Store API key in session storage (clears when browser closes)
sessionStorage.setItem('apiKey', apiKey);
const storedKey = sessionStorage.getItem('apiKey');
```

---

## Customization Guide

### 1. Branding Customization

```css
/* Change colors in CSS :root section */
:root {
    --primary: #1a1a2e;        /* Header background */
    --secondary: #8b4513;      /* Accent color */
    --accent: #d4af37;         /* Highlights */
    --bg: #f8f6f0;             /* Page background */
}

/* Update header */
.header-content h1::before {
    content: '⚖️ ';  /* Change logo/emoji */
}
```

### 2. Adding New Contract Types

```javascript
// In the contractType select element
<option value="Franchise Agreement">Franchise Agreement</option>
<option value="Construction Contract">Construction Contract</option>
<option value="Consultancy Agreement">Consultancy Agreement</option>
// Add more as needed
```

### 3. Customizing Prompts

```javascript
// Modify buildContractPrompt function
function buildContractPrompt(type, details) {
    return `You are an expert Indian legal professional specializing in contract drafting.

[Add your firm-specific instructions here]
- Use our standard clause library
- Reference our precedent database
- Follow our formatting guidelines

Contract Details:
${details}

[Custom requirements...]`;
}
```

### 4. Adding Practice Area Filters

```javascript
// Add practice area selection
<select id="practiceArea">
    <option value="corporate">Corporate Law</option>
    <option value="criminal">Criminal Law</option>
    <option value="property">Property Law</option>
    <option value="family">Family Law</option>
    <option value="ipr">Intellectual Property</option>
</select>

// Modify prompts based on practice area
const practiceArea = document.getElementById('practiceArea').value;
if (practiceArea === 'criminal') {
    // Add criminal law specific instructions
}
```

### 5. Response Formatting

```javascript
// Add custom formatting to output
document.getElementById('resultContent').innerHTML = formatLegalOutput(result);

function formatLegalOutput(text) {
    // Add section numbering
    text = text.replace(/^(\d+\.)/gm, '<strong>$1</strong>');
    
    // Highlight case citations
    text = text.replace(/\b([A-Z][a-z]+ v\. [A-Z][a-z]+.*?\d{4}\))/g, 
                       '<span class="citation">$1</span>');
    
    // Format statutes
    text = text.replace(/\b(Section \d+[A-Z]?)/g, 
                       '<span class="statute">$1</span>');
    
    return text;
}
```

---

## API Integration Details

### Request Structure

```javascript
{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 8000,
    "messages": [{
        "role": "user",
        "content": "[Your legal query prompt]"
    }]
}
```

### Response Structure

```javascript
{
    "id": "msg_xxx",
    "type": "message",
    "role": "assistant",
    "content": [{
        "type": "text",
        "text": "[Generated legal content]"
    }],
    "model": "claude-sonnet-4-20250514",
    "stop_reason": "end_turn",
    "usage": {
        "input_tokens": 1234,
        "output_tokens": 5678
    }
}
```

### Rate Limits

- **Default**: 50 requests per minute
- **Enterprise**: Custom limits available
- Handle rate limiting:

```javascript
async function callClaudeAPIWithRetry(apiKey, prompt, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                // ... request config
            });
            
            if (response.status === 429) {
                // Rate limited, wait and retry
                const retryAfter = response.headers.get('retry-after') || 5;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            
            return await response.json();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
        }
    }
}
```

---

## Performance Optimization

### 1. Response Caching

```javascript
// Cache common queries
const cache = new Map();

async function callClaudeAPI(apiKey, prompt) {
    const cacheKey = hashPrompt(prompt);
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    
    const result = await fetchFromAPI(apiKey, prompt);
    cache.set(cacheKey, result);
    return result;
}

function hashPrompt(prompt) {
    // Simple hash function
    return prompt.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
}
```

### 2. Request Optimization

```javascript
// Compress long prompts
function optimizePrompt(prompt) {
    // Remove excessive whitespace
    prompt = prompt.replace(/\s+/g, ' ').trim();
    
    // Remove redundant phrases
    prompt = prompt.replace(/please\s+/gi, '');
    
    return prompt;
}
```

### 3. Lazy Loading

```html
<!-- Load fonts on demand -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="..." media="print" onload="this.media='all'">
```

---

## Security Considerations

### 1. Input Sanitization

```javascript
function sanitizeInput(input) {
    // Remove potentially dangerous characters
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .trim();
}

// Apply to all user inputs
const details = sanitizeInput(document.getElementById('contractDetails').value);
```

### 2. Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src https://fonts.gstatic.com;
               connect-src https://api.anthropic.com;">
```

### 3. API Key Protection

```javascript
// Don't log API keys
console.log('API Request:', { 
    model: 'claude-sonnet-4',
    // Never log: apiKey 
});

// Clear from memory after use
let apiKey = getAPIKey();
await makeAPICall(apiKey);
apiKey = null; // Clear reference
```

### 4. HTTPS Enforcement

```javascript
// Redirect to HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

---

## Monitoring & Analytics

### 1. Usage Tracking

```javascript
// Track feature usage
function trackUsage(feature, details) {
    // Send to your analytics
    console.log(`Feature: ${feature}`, details);
    
    // Or send to analytics service
    // gtag('event', feature, details);
    // or
    // mixpanel.track(feature, details);
}

// Usage
trackUsage('contract_generated', { 
    type: contractType,
    timestamp: new Date().toISOString()
});
```

### 2. Error Monitoring

```javascript
window.addEventListener('error', (event) => {
    // Log errors for debugging
    logError({
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: new Date().toISOString()
    });
});

async function logError(error) {
    // Send to error tracking service
    // await fetch('/api/log-error', {
    //     method: 'POST',
    //     body: JSON.stringify(error)
    // });
}
```

### 3. Cost Tracking

```javascript
// Track API costs
let totalCost = 0;

function calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000000) * 3;  // $3 per M tokens
    const outputCost = (outputTokens / 1000000) * 15; // $15 per M tokens
    return inputCost + outputCost;
}

// After API call
const usage = response.usage;
const cost = calculateCost(usage.input_tokens, usage.output_tokens);
totalCost += cost;
console.log(`Query cost: $${cost.toFixed(4)}, Total: $${totalCost.toFixed(2)}`);
```

---

## Testing

### Unit Tests (Example)

```javascript
// test-prompts.js
const assert = require('assert');

describe('Prompt Building', () => {
    it('should build contract prompt correctly', () => {
        const prompt = buildContractPrompt('NDA', 'Company A and Company B');
        assert(prompt.includes('Non-Disclosure Agreement'));
        assert(prompt.includes('Indian law'));
    });
    
    it('should sanitize dangerous input', () => {
        const input = '<script>alert("XSS")</script>';
        const sanitized = sanitizeInput(input);
        assert(!sanitized.includes('<script>'));
    });
});
```

### Integration Tests

```javascript
// test-api.js
describe('Claude API Integration', () => {
    it('should successfully call API with valid key', async () => {
        const result = await callClaudeAPI(validAPIKey, 'Test prompt');
        assert(result.content);
        assert(result.content[0].text);
    });
    
    it('should handle rate limiting gracefully', async () => {
        // Mock rate limit response
        // Test retry logic
    });
});
```

---

## Backup & Data Management

### Export Functionality

```javascript
function exportResult(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Add export button
document.getElementById('exportBtn').addEventListener('click', () => {
    const content = document.getElementById('resultContent').textContent;
    const timestamp = new Date().toISOString().split('T')[0];
    exportResult(content, `legal-doc-${selectedMode}-${timestamp}.txt`);
});
```

### Session History

```javascript
// Store query history in localStorage
function saveToHistory(mode, query, result) {
    const history = JSON.parse(localStorage.getItem('legalAIHistory') || '[]');
    history.push({
        id: Date.now(),
        mode,
        query,
        result,
        timestamp: new Date().toISOString()
    });
    
    // Keep last 50 queries
    if (history.length > 50) {
        history.shift();
    }
    
    localStorage.setItem('legalAIHistory', JSON.stringify(history));
}
```

---

## Troubleshooting Guide

### Common Issues

**1. CORS Errors**
- Anthropic API requires proper headers
- Check API key format
- Verify network allows API calls

**2. Timeout Issues**
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

try {
    const response = await fetch(url, {
        signal: controller.signal,
        // ... other options
    });
} catch (error) {
    if (error.name === 'AbortError') {
        showError('Request timed out. Please try again.');
    }
} finally {
    clearTimeout(timeoutId);
}
```

**3. Memory Leaks**
```javascript
// Clean up event listeners
const cleanup = () => {
    document.querySelectorAll('.mode-card').forEach(card => {
        card.removeEventListener('click', handleModeSelect);
    });
};

window.addEventListener('beforeunload', cleanup);
```

---

## Scaling Considerations

### For Enterprise Deployment

1. **Backend Proxy Layer**
   - Centralized API key management
   - Usage monitoring and rate limiting
   - Audit logging
   - Cost allocation per user/department

2. **Database Integration**
   - Store generated documents
   - User query history
   - Template library
   - Analytics data

3. **Multi-tenancy**
   - Separate API keys per firm/department
   - Custom branding per tenant
   - Usage quotas

4. **Advanced Features**
   - Document version control
   - Collaborative editing
   - Integration with document management systems
   - Email delivery of results

---

## API Cost Management

### Budget Controls

```javascript
const MONTHLY_BUDGET = 10000; // USD
let currentSpend = 0;

function checkBudget(estimatedCost) {
    if (currentSpend + estimatedCost > MONTHLY_BUDGET) {
        throw new Error('Monthly budget exceeded');
    }
}

// Before API call
const estimatedTokens = prompt.length * 1.3; // Rough estimate
const estimatedCost = calculateCost(estimatedTokens, 4000);
checkBudget(estimatedCost);
```

### Cost Optimization

```javascript
// Use shorter model for simple queries
function selectModel(queryComplexity) {
    if (queryComplexity === 'simple') {
        return 'claude-haiku-4-5-20251001'; // Cheaper
    }
    return 'claude-sonnet-4-20250514'; // Default
}
```

---

## Maintenance

### Regular Updates

1. **Monthly Tasks:**
   - Update case law references in prompts
   - Review and update contract templates
   - Check for API version updates
   - Review error logs

2. **Quarterly Tasks:**
   - Legal framework review
   - User feedback incorporation
   - Performance optimization
   - Security audit

3. **Annual Tasks:**
   - Major version upgrades
   - Comprehensive testing
   - Legal compliance review
   - Cost-benefit analysis

---

## License & Compliance

### Software License
- Tool: Open for customization
- Claude API: Subject to Anthropic Terms of Service
- Usage: Professional legal services only

### Legal Compliance
- Bar Council of India guidelines
- Data protection laws
- Client confidentiality requirements
- Professional indemnity insurance

---

## Support Resources

### Documentation
- Anthropic API Docs: https://docs.anthropic.com
- Claude AI Documentation: https://www.anthropic.com/claude

### Community
- Anthropic Discord: https://www.anthropic.com/discord
- GitHub Discussions: [Your repository]

---

## Changelog

**Version 1.0 (January 2025)**
- Initial release
- Contract drafting module
- Case research module
- Legal opinion module
- Claude Sonnet 4 integration

---

## Future Roadmap

**Planned Features:**
- [ ] Document template library
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Integration with legal databases (SCC, Manupatra)
- [ ] Automated citation verification
- [ ] Document comparison tool
- [ ] Voice input for mobile users
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode with cached templates

**Technical Improvements:**
- [ ] React/Vue.js migration for better state management
- [ ] Backend API for centralized management
- [ ] WebSocket for real-time streaming responses
- [ ] Advanced caching mechanisms
- [ ] Multi-file upload support
- [ ] PDF generation from results

---

## Contributing

If you want to contribute improvements:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request with documentation

**Areas for Contribution:**
- Additional contract types
- Regional language support
- Legal database integrations
- UI/UX improvements
- Performance optimizations

---

## Contact

For technical support or feature requests:
- Email: [Your support email]
- Issues: [GitHub Issues URL]
- Documentation: [Your documentation site]

---

*Built with Claude AI for Indian Legal Professionals*