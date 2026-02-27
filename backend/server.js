// server.js
// ================================
// SAMARTHAA-LEGAL — Indian Legal AI Backend
// ================================

// 1️⃣ Load environment variables FIRST
require('dotenv').config();

const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET is not set in .env. Server cannot start securely.');
    process.exit(1);
}

// 2️⃣ Imports
const express      = require('express');
const cors         = require('cors');
const Anthropic    = require('@anthropic-ai/sdk');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const PDFDocument  = require('pdfkit');
const crypto       = require('crypto');
const https        = require('https');

// 3️⃣ Config
const PORT               = process.env.PORT             || 5000;
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // default: "Sarah"

// 4️⃣ Validate keys
if (!ANTHROPIC_API_KEY)  console.warn('⚠️  ANTHROPIC_API_KEY not set in .env');
else                     console.log('🔑 Anthropic API key loaded');

if (!ELEVENLABS_API_KEY) console.warn('⚠️  ELEVENLABS_API_KEY not set — TTS will be unavailable');
else                     console.log('🔑 ElevenLabs API key loaded');

// 5️⃣ Create Anthropic client
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// 6️⃣ Create Express app
const app = express();

// =====================================================
//   Users (hardcoded — move to DB for production)
// =====================================================
const users = [
    {
        id: 1,
        email: 'admin@just-law.tech',
        password: bcrypt.hashSync('pwd@123', 8)
    }
];

// =====================================================
//   Middleware
// =====================================================
const allowedOrigins = [
    'https://legal-ai-2-tool-1.onrender.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5500',
    'https://samarthaa-legal.netlify.app'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));

app.use(express.json({ limit: '5mb' })); // larger limit for TTS text

// =====================================================
//   JWT Auth Middleware
// =====================================================
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, error: 'Authentication required' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
}

// =====================================================
//   Health Check (public)
// =====================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'SAMARTHAA-LEGAL Backend Running',
        tts: !!ELEVENLABS_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// =====================================================
//   Login (public)
// =====================================================
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' });

    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password))
        return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
});

// =====================================================
//   ElevenLabs TTS Endpoint  🔐 Protected
//   POST /api/tts  { text: string }
//   Returns: audio/mpeg stream
// =====================================================
app.post('/api/tts', requireAuth, async (req, res) => {
    const { text } = req.body;

    if (!text || !text.trim())
        return res.status(400).json({ error: 'No text provided' });

    if (!ELEVENLABS_API_KEY)
        return res.status(503).json({ error: 'TTS service not configured on server' });

    // Trim text to 5000 chars per ElevenLabs limit per request
    const trimmedText = text.trim().substring(0, 4900);

    const payload = JSON.stringify({
        text: trimmedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
            stability: 0.50,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true
        }
    });

    const options = {
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        method: 'POST',
        headers: {
            'Accept':       'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key':   ELEVENLABS_API_KEY,
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    console.log(`🔊 TTS request from ${req.user.email} — ${trimmedText.length} chars`);

    const elReq = https.request(options, (elRes) => {
        if (elRes.statusCode !== 200) {
            let errBody = '';
            elRes.on('data', d => errBody += d);
            elRes.on('end', () => {
                console.error('❌ ElevenLabs error:', elRes.statusCode, errBody);
                if (!res.headersSent) {
                    res.status(elRes.statusCode).json({
                        error: `ElevenLabs error ${elRes.statusCode}`,
                        detail: errBody.substring(0, 300)
                    });
                }
            });
            return;
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');
        elRes.pipe(res);
    });

    elReq.on('error', (err) => {
        console.error('❌ ElevenLabs request error:', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: 'TTS request failed: ' + err.message });
    });

    elReq.write(payload);
    elReq.end();
});

// =====================================================
//   Main Chat / Generate Endpoint  🔐 Protected
// =====================================================
app.post('/api/chat', requireAuth, async (req, res) => {
    try {
        const body = req.body;

        if (!body || typeof body !== 'object')
            return res.status(400).json({ success: false, error: 'Invalid request body' });

        if (!ANTHROPIC_API_KEY)
            return res.status(500).json({ success: false, error: 'Anthropic API key not configured' });

        let prompt = '';

        // ── CONTRACT ──────────────────────────────────────────────────
        if (body.mode === 'contract') {
            if (!body.contractType || !body.contractDetails)
                return res.status(400).json({ success: false, error: 'contractType and contractDetails are required' });

            prompt = `You are an expert Indian legal professional specializing in contract drafting. Draft a ${body.contractType} according to Indian law in P Mogha format.

Contract Details & Key Terms:
${body.contractDetails}

Requirements:
1. Use formal legal language appropriate for Indian courts
2. Include all standard clauses relevant to this contract type under Indian law
3. Reference applicable Indian statutes (Indian Contract Act 1872, Transfer of Property Act 1882, etc.)
4. Include proper execution clauses with witness requirements
5. Add jurisdiction and dispute resolution clauses suitable for Indian courts
6. Ensure compliance with Indian stamp duty and registration requirements where applicable
7. Format properly with clear sections and subsections
8. Include appropriate schedules/annexures if needed

Generate a complete, professional contract draft in the P Mogha format ready for lawyer review and customization.

========================
FORMAT INSTRUCTIONS (MANDATORY)
========================
- Use ALL CAPS for the document title (first line only)
- Use numbered headings: 1., 2., 3.
- Use sub-headings: 1.1, 1.2, 2.1
- Each clause must start on a NEW LINE
- Leave ONE blank line between major sections
- Do NOT use markdown, bullets, or special symbols
- Do NOT use emojis or decorative characters
- Keep sentences concise and formal
- Output must be plain text suitable for printing
- End the document with a DISCLAIMER section
========================`;

        // ── RESEARCH ──────────────────────────────────────────────────
        } else if (body.mode === 'research') {
            if (!body.legalIssue || !body.researchQuery)
                return res.status(400).json({ success: false, error: 'legalIssue and researchQuery are required' });

            prompt = `You are an expert Indian legal researcher. Conduct comprehensive case law research on the following matter by referring to the Manupatra legal database only.

Legal Issue:
${body.legalIssue}

Context:
${body.researchQuery}

Preferred Jurisdiction:
${body.jurisdiction || 'All Indian Courts'}

Please provide:
1. Relevant Case Law: List landmark and recent cases with citations (Party Names, Citation, Court, Year)
2. Legal Principles: Key principles established by these cases
3. Statutory Provisions: Applicable sections of relevant acts
4. Analysis: How these cases apply to the query
5. Current Legal Position: What is the prevailing view
6. Practical Application: How courts typically rule on such matters

Focus on authoritative Indian Supreme Court and High Court judgments. Provide case citations in standard Indian format.

========================
FORMAT INSTRUCTIONS (MANDATORY)
========================
- Use ALL CAPS for the document title (first line only)
- Use numbered headings: 1., 2., 3.
- Use sub-headings: 1.1, 1.2, 2.1
- Each clause must start on a NEW LINE
- Leave ONE blank line between major sections
- Do NOT use markdown, bullets, or special symbols
- Do NOT use emojis or decorative characters
- Keep sentences concise and formal
- Output must be plain text suitable for printing
- End the document with a DISCLAIMER section
========================`;

        // ── OPINION ───────────────────────────────────────────────────
        } else if (body.mode === 'opinion') {
            if (!body.opinionTopic || !body.opinionQuery)
                return res.status(400).json({ success: false, error: 'opinionTopic and opinionQuery are required' });

            prompt = `You are a senior Indian advocate providing a detailed legal opinion. Analyze the following matter comprehensively.

Topic:
${body.opinionTopic}

Facts:
${body.opinionQuery}

Applicable Laws:
${body.applicableLaws || 'Relevant Indian laws'}

Please provide a comprehensive legal opinion including:

1. Summary of Facts: Brief recap of the situation
2. Legal Issues: Identify specific legal questions to be addressed
3. Applicable Law: Relevant statutes and sections, key provisions, rules or regulations
4. Case Law Analysis: Relevant Supreme Court and High Court precedents, how these cases apply, current judicial trends
5. Legal Analysis: Strengths of the case, potential weaknesses or risks, counter-arguments to anticipate
6. Opinion & Advice: Your legal opinion, likelihood of success, recommended course of action, alternative options
7. Practical Considerations: Procedural steps, documentation required, timeline estimates, cost implications
8. Conclusion: Clear summary of your opinion and recommendations

Format this as a formal legal opinion suitable for client delivery. Be thorough, balanced, and cite relevant legal authorities.

========================
FORMAT INSTRUCTIONS (MANDATORY)
========================
- Use ALL CAPS for the document title (first line only)
- Use numbered headings: 1., 2., 3.
- Use sub-headings: 1.1, 1.2, 2.1
- Each clause must start on a NEW LINE
- Leave ONE blank line between major sections
- Do NOT use markdown, bullets, or special symbols
- Do NOT use emojis or decorative characters
- Keep sentences concise and formal
- Output must be plain text suitable for printing
- End the document with a DISCLAIMER section
========================`;

        } else {
            return res.status(400).json({ success: false, error: 'Invalid mode. Must be contract, research, or opinion.' });
        }

        console.log(`📨 ${body.mode.toUpperCase()} request from: ${req.user.email}`);

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5',
            max_tokens: 8000,
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
        });

        console.log('✅ Claude response generated');
        console.log('📊 Tokens used:', response.usage);

        res.json({
            success: true,
            documentId: crypto.randomUUID(),
            output: response.content[0].text,
            usage: response.usage
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
});

// =====================================================
//   PDF Download  🔐 Protected
// =====================================================
app.post('/api/download/pdf', requireAuth, (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).send('No content provided');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=legal-document.pdf');
    doc.pipe(res);

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    doc.fontSize(16).font('Helvetica-Bold').text(lines[0], { align: 'center' });
    doc.moveDown(2);

    lines.slice(1).forEach(line => {
        if (/^\d+(\.\d+)*\./.test(line)) {
            doc.moveDown(0.5).fontSize(11).font('Helvetica-Bold').text(line, { align: 'left' });
        } else {
            doc.moveDown(0.3).fontSize(11).font('Helvetica').text(line, { align: 'justify', lineGap: 4 });
        }
    });

    doc.moveDown(2).fontSize(8).font('Helvetica')
        .text('Disclaimer: This document is AI-generated and must be reviewed by a qualified legal professional.', { align: 'center' });

    doc.end();
});

// =====================================================
//   Word Download  🔐 Protected
// =====================================================
app.post('/api/download/word', requireAuth, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).send('No content provided');

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const paragraphs = [];

    paragraphs.push(new Paragraph({
        children: [new TextRun({ text: lines[0], bold: true, size: 32 })],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
    }));

    lines.slice(1).forEach(line => {
        const isHeading = /^\d+(\.\d+)*\./.test(line);
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: line, bold: isHeading, size: isHeading ? 24 : 22 })],
            spacing: { before: isHeading ? 200 : 0, after: 120 },
            alignment: AlignmentType.JUSTIFIED
        }));
    });

    paragraphs.push(new Paragraph({
        children: [new TextRun({
            text: 'Disclaimer: This document is AI-generated and must be reviewed by a qualified legal professional.',
            italics: true, size: 18, color: '666666'
        })],
        spacing: { before: 400 }
    }));

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=legal-document.docx');
    res.send(buffer);
});


// =====================================================
//   Chat Assistant Endpoint  🔐 Protected
//   POST /api/chat-assistant
//   Body: { message, history, documentContext, currentMode }
// =====================================================
app.post('/api/chat-assistant', requireAuth, async (req, res) => {
    try {
        const { message, history = [], documentContext, currentMode } = req.body;

        if (!message || !message.trim())
            return res.status(400).json({ error: 'No message provided' });

        if (!ANTHROPIC_API_KEY)
            return res.status(500).json({ error: 'Anthropic API key not configured' });

        // ── Build system prompt ────────────────────────────────
        let systemPrompt = `You are SAMARTHAA, a senior Indian legal assistant with deep expertise in:
- Indian constitutional law, civil and criminal procedure
- Indian Contract Act 1872, Transfer of Property Act 1882, CPC, CrPC, IPC, and all major Indian statutes
- Supreme Court and High Court judgments and precedents
- Corporate law, family law, property law, labour law under Indian jurisdiction
- Practical legal guidance for Indian citizens and businesses

Your communication style:
- Respond in clear, plain English that non-lawyers can understand
- Keep responses concise (3-5 sentences for simple questions, more for complex ones)
- Always cite the relevant Indian law, section, or case when applicable
- When uncertain, say so clearly rather than guessing
- End complex answers with a practical next-step recommendation
- Never provide advice that requires knowing specific confidential facts — suggest consulting a lawyer

IMPORTANT: You are a voice assistant. Keep responses conversational and spoken-word friendly. Avoid bullet points, markdown, or formatting — write in flowing sentences.`;

        // ── Inject document context if available ──────────────
        if (documentContext && documentContext.content) {
            const modeLabel = {
                contract: 'Legal Contract',
                research: 'Case Law Research',
                opinion:  'Legal Opinion'
            }[documentContext.mode] || 'Legal Document';

            systemPrompt += `

DOCUMENT CONTEXT: The user has generated the following ${modeLabel} in this session. You can answer questions about it, explain its clauses, and provide related legal guidance:

--- START OF DOCUMENT ---
${documentContext.content}
--- END OF DOCUMENT ---

When answering questions about this document, reference specific clauses or sections where relevant.`;
        }

        // ── Build message history ──────────────────────────────
        // Filter to only valid roles for Claude API
        const validHistory = (history || [])
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-10)  // last 10 turns max
            .map(m => ({
                role:    m.role,
                content: [{ type: 'text', text: String(m.content) }]
            }));

        // Add current message
        validHistory.push({
            role:    'user',
            content: [{ type: 'text', text: message.trim() }]
        });

        console.log(`💬 Chat assistant request from ${req.user.email} — "${message.substring(0, 60)}..."`);

        const response = await anthropic.messages.create({
            model:      'claude-sonnet-4-5',
            max_tokens: 1024,
            system:     systemPrompt,
            messages:   validHistory
        });

        const reply = response.content[0].text;
        console.log(`✅ Chat assistant replied (${reply.length} chars)`);

        res.json({ reply, usage: response.usage });

    } catch (error) {
        console.error('❌ Chat assistant error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// =====================================================
//   Start Server
// =====================================================
app.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log('   SAMARTHAA-LEGAL Backend Started!');
    console.log('========================================');
    console.log(`📡 Server:        http://localhost:${PORT}`);
    console.log(`🔧 API endpoint:  http://localhost:${PORT}/api/chat`);
    console.log(`🔊 TTS endpoint:  http://localhost:${PORT}/api/tts`);
    console.log(`💚 Health check:  http://localhost:${PORT}/api/health`);
    console.log('========================================\n');
});
