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
const os           = require('os');
const path         = require('path');
const fs           = require('fs');

// ══════════════════════════════════════════════════════════════════
//   MULTI-SCRIPT FONT SYSTEM
//   Fonts are installed as npm packages — no runtime downloads needed
//   npm install @fontsource/noto-sans-jp @fontsource/noto-sans
// ══════════════════════════════════════════════════════════════════

// Resolve font file paths from npm packages installed in node_modules
function resolveNpmFont(pkg, file) {
    try {
        const dir = path.dirname(require.resolve(pkg + '/package.json'));
        const fontPath = path.join(dir, 'files', file);
        if (fs.existsSync(fontPath)) return fontPath;
    } catch(e) {}
    return null;
}

// Build font map from npm packages
const FONT_PATHS = (() => {
    const map = {};

    // Japanese — @fontsource/noto-sans-jp
    map.japanese = resolveNpmFont('@fontsource/noto-sans-jp', 'noto-sans-jp-japanese-400-normal.woff2')
                || resolveNpmFont('@fontsource/noto-sans-jp', 'noto-sans-jp-400-normal.woff2');

    // Devanagari (Hindi/Marathi) — @fontsource/noto-sans-devanagari
    map.devanagari = resolveNpmFont('@fontsource/noto-sans-devanagari', 'noto-sans-devanagari-devanagari-400-normal.woff2')
                  || resolveNpmFont('@fontsource/noto-sans-devanagari', 'noto-sans-devanagari-400-normal.woff2');

    // Kannada — @fontsource/noto-sans-kannada
    map.kannada = resolveNpmFont('@fontsource/noto-sans-kannada', 'noto-sans-kannada-kannada-400-normal.woff2')
               || resolveNpmFont('@fontsource/noto-sans-kannada', 'noto-sans-kannada-400-normal.woff2');

    // Tamil — @fontsource/noto-sans-tamil
    map.tamil = resolveNpmFont('@fontsource/noto-sans-tamil', 'noto-sans-tamil-tamil-400-normal.woff2')
             || resolveNpmFont('@fontsource/noto-sans-tamil', 'noto-sans-tamil-400-normal.woff2');

    // Telugu — @fontsource/noto-sans-telugu
    map.telugu = resolveNpmFont('@fontsource/noto-sans-telugu', 'noto-sans-telugu-telugu-400-normal.woff2')
              || resolveNpmFont('@fontsource/noto-sans-telugu', 'noto-sans-telugu-400-normal.woff2');

    // Malayalam — @fontsource/noto-sans-malayalam
    map.malayalam = resolveNpmFont('@fontsource/noto-sans-malayalam', 'noto-sans-malayalam-malayalam-400-normal.woff2')
                 || resolveNpmFont('@fontsource/noto-sans-malayalam', 'noto-sans-malayalam-400-normal.woff2');

    // Bengali — @fontsource/noto-sans-bengali
    map.bengali = resolveNpmFont('@fontsource/noto-sans-bengali', 'noto-sans-bengali-bengali-400-normal.woff2')
               || resolveNpmFont('@fontsource/noto-sans-bengali', 'noto-sans-bengali-400-normal.woff2');

    // Gujarati — @fontsource/noto-sans-gujarati
    map.gujarati = resolveNpmFont('@fontsource/noto-sans-gujarati', 'noto-sans-gujarati-gujarati-400-normal.woff2')
                || resolveNpmFont('@fontsource/noto-sans-gujarati', 'noto-sans-gujarati-400-normal.woff2');

    // Gurmukhi/Punjabi — @fontsource/noto-sans-gurmukhi
    map.gurmukhi = resolveNpmFont('@fontsource/noto-sans-gurmukhi', 'noto-sans-gurmukhi-gurmukhi-400-normal.woff2')
                || resolveNpmFont('@fontsource/noto-sans-gurmukhi', 'noto-sans-gurmukhi-400-normal.woff2');

    // Log what was found
    for (const [key, val] of Object.entries(map)) {
        if (val) console.log('✅ Font ready: ' + key + ' → ' + val);
        else     console.warn('⚠️  Font missing: ' + key + ' (install @fontsource/noto-sans-' + key + ')');
    }
    return map;
})();

// Unicode ranges for script detection
const SCRIPT_RANGES = [
    { name: 'japanese',   regex: /[　-鿿豈-﫿＀-￯]/ },
    { name: 'devanagari', regex: /[ऀ-ॿ]/ },
    { name: 'kannada',    regex: /[ಀ-೿]/ },
    { name: 'tamil',      regex: /[஀-௿]/ },
    { name: 'telugu',     regex: /[ఀ-౿]/ },
    { name: 'malayalam',  regex: /[ഀ-ൿ]/ },
    { name: 'bengali',    regex: /[ঀ-৿]/ },
    { name: 'gujarati',   regex: /[઀-૿]/ },
    { name: 'gurmukhi',   regex: /[਀-੿]/ },
];

function detectScript(text) {
    for (const { name, regex } of SCRIPT_RANGES) {
        if (regex.test(text)) return name;
    }
    return null;
}

// Returns the font file path for the script in the given text, or null for Latin
function getFontPath(text) {
    const script = detectScript(text);
    if (!script) return null;
    return FONT_PATHS[script] || null;
}
const multer       = require('multer');
const FormData     = require('form-data');
const upload       = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 3️⃣ Config
const PORT               = process.env.PORT             || 5000;
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // default: "Sarah"
console.log(`🎙️  ElevenLabs Voice ID: ${ELEVENLABS_VOICE_ID}`);

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
        email: 'govardhangn@samarthaa.legal',
        password: bcrypt.hashSync('ownerdemo@!2345', 8)
    },
    {
        id: 2,
        email: 'rekhajayaram20@samarthaa.legal',
        password: bcrypt.hashSync('ownerdemo@!2345', 8)
    },
    {
        id: 3,
        email: 'bopanna@samarthaa.legal',
        password: bcrypt.hashSync('bopannademo@!2345', 8)
    },
    {
        id: 4,
        email: 'demo1@samarthaa.legal',
        password: bcrypt.hashSync('demodemo@!2345', 8)
    },
    {
        id: 5,
        email: 'demo2@samarthaa.legal',
        password: bcrypt.hashSync('demodemo@!2345', 8)
    }
];

// =====================================================
//   Middleware
// =====================================================
const allowedOrigins = [
    'https://legal-ai-2-tool.onrender.com',
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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
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

            const isJapanese = body.locale === 'ja-JP';

            if (isJapanese) {
                prompt = `あなたは日本法を専門とする法律の専門家です。以下の条件に基づき、${body.contractType}の草案を作成してください。

契約の詳細・主要条件：
${body.contractDetails}

要件：
1. 日本の裁判所に適した正式な法律文書の文体を使用すること
2. 日本法に基づき、この種類の契約に必要な標準条項をすべて含めること
3. 民法、借地借家法、労働基準法など、適用される日本の法令を参照すること
4. 印鑑・署名欄を含む適切な締結条項を付けること
5. 日本の裁判所に適した管轄・紛争解決条項を追加すること
6. 印紙税・登記要件への準拠を確認すること
7. 明確な条項と小項目で適切にフォーマットすること

========================
フォーマット指示（必須）
========================
- 文書タイトルは全角大文字（最初の行のみ）
- 番号付き見出しを使用：第1条、第2条、第3条
- 小見出し：第1条第1項、第1条第2項
- 各条項は新しい行から始めること
- 主要セクション間は一行空けること
- マークダウン、箇条書き、特殊記号は使用しないこと
- 絵文字や装飾文字は使用しないこと
- 文は簡潔かつ正式に保つこと
- 印刷に適したプレーンテキストで出力すること
- 文書の末尾に免責事項セクションを付けること
========================`;
            } else {
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
            }

        // ── RESEARCH ──────────────────────────────────────────────────
        } else if (body.mode === 'research') {
            if (!body.legalIssue || !body.researchQuery)
                return res.status(400).json({ success: false, error: 'legalIssue and researchQuery are required' });

            const isJapanese = body.locale === 'ja-JP';

            if (isJapanese) {
                prompt = `あなたは日本法を専門とする法律研究の専門家です。以下の事項について包括的な判例調査を実施してください。

法的問題：
${body.legalIssue}

背景：
${body.researchQuery}

管轄裁判所：
${body.jurisdiction || '全裁判所'}

以下の内容を提供してください：
1. 関連判例：重要判例・最新判例の一覧（事件名、引用、裁判所、年）
2. 法的原則：これらの判例が確立した主要原則
3. 法令規定：適用される法律の該当条文
4. 分析：これらの判例が本件クエリにどう適用されるか
5. 現在の法的立場：現在の主流の見解
6. 実務的適用：裁判所が通常どのように判断するか

最高裁判所および高等裁判所の権威ある判決に焦点を当てること。判例引用は日本の標準形式で記載すること。

========================
フォーマット指示（必須）
========================
- 文書タイトルは全角大文字（最初の行のみ）
- 番号付き見出しを使用：1.、2.、3.
- 小見出し：1.1、1.2、2.1
- 各条項は新しい行から始めること
- 主要セクション間は一行空けること
- マークダウン、箇条書き、特殊記号は使用しないこと
- 絵文字や装飾文字は使用しないこと
- 文は簡潔かつ正式に保つこと
- 印刷に適したプレーンテキストで出力すること
- 文書の末尾に免責事項セクションを付けること
========================`;
            } else {
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
            }

        // ── OPINION ───────────────────────────────────────────────────
        } else if (body.mode === 'opinion') {
            if (!body.opinionTopic || !body.opinionQuery)
                return res.status(400).json({ success: false, error: 'opinionTopic and opinionQuery are required' });

            const isJapanese = body.locale === 'ja-JP';

            if (isJapanese) {
                prompt = `あなたは日本法を専門とするシニア弁護士として、詳細な法律意見書を提供してください。以下の事項を包括的に分析してください。

法的事項：
${body.opinionTopic}

事実関係：
${body.opinionQuery}

適用法令：
${body.applicableLaws || '関連する日本の法令'}

以下を含む包括的な法律意見書を作成してください：

1. 事実の要約：状況の簡潔な概要
2. 法的問題：対処すべき具体的な法的問題の特定
3. 適用法令：関連する法律・条文、主要条項、規則・規制
4. 判例分析：関連する最高裁・高裁の先例、これらの判例の適用、現在の司法動向
5. 法的分析：事件・立場の強み、潜在的な弱点やリスク、想定される反論
6. 意見と助言：法律意見、成功の可能性、推奨される行動方針、代替オプション
7. 実務的考慮事項：手続きの手順、必要書類、スケジュール見積もり、費用見通し
8. 結論：意見と提言の明確な要約

クライアントへの提供に適した正式な法律意見書としてフォーマットすること。徹底的かつバランスのとれた内容で、関連する法的権威を引用すること。

========================
フォーマット指示（必須）
========================
- 文書タイトルは全角大文字（最初の行のみ）
- 番号付き見出しを使用：第1条、第2条、第3条
- 小見出し：第1条第1項、第1条第2項
- 各条項は新しい行から始めること
- 主要セクション間は一行空けること
- マークダウン、箇条書き、特殊記号は使用しないこと
- 絵文字や装飾文字は使用しないこと
- 文は簡潔かつ正式に保つこと
- 印刷に適したプレーンテキストで出力すること
- 文書の末尾に免責事項セクションを付けること
========================`;
            } else {
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
            }

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
//   Returns styled HTML for browser print-to-PDF
//   (Handles all Unicode scripts natively via Google Fonts)
// =====================================================
app.post('/api/download/pdf', requireAuth, (req, res) => {
    const { content, locale } = req.body;
    if (!content) return res.status(400).send('No content provided');

    const isJapanese = locale === 'ja-JP' || /[\u3000-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(content);

    // Detect Indian scripts for appropriate font
    const isDevanagari = /[\u0900-\u097F]/.test(content);
    const isKannada    = /[\u0C80-\u0CFF]/.test(content);
    const isTamil      = /[\u0B80-\u0BFF]/.test(content);
    const isTelugu     = /[\u0C00-\u0C7F]/.test(content);
    const isMalayalam  = /[\u0D00-\u0D7F]/.test(content);
    const isBengali    = /[\u0980-\u09FF]/.test(content);
    const isGujarati   = /[\u0A80-\u0AFF]/.test(content);
    const isGurmukhi   = /[\u0A00-\u0A7F]/.test(content);

    // Pick Google Font based on script
    let googleFont, fontFamily;
    if (isJapanese) {
        googleFont  = 'Noto+Sans+JP:wght@400;700';
        fontFamily  = "'Noto Sans JP', sans-serif";
    } else if (isDevanagari) {
        googleFont  = 'Noto+Sans+Devanagari:wght@400;700';
        fontFamily  = "'Noto Sans Devanagari', sans-serif";
    } else if (isKannada) {
        googleFont  = 'Noto+Sans+Kannada:wght@400;700';
        fontFamily  = "'Noto Sans Kannada', sans-serif";
    } else if (isTamil) {
        googleFont  = 'Noto+Sans+Tamil:wght@400;700';
        fontFamily  = "'Noto Sans Tamil', sans-serif";
    } else if (isTelugu) {
        googleFont  = 'Noto+Sans+Telugu:wght@400;700';
        fontFamily  = "'Noto Sans Telugu', sans-serif";
    } else if (isMalayalam) {
        googleFont  = 'Noto+Sans+Malayalam:wght@400;700';
        fontFamily  = "'Noto Sans Malayalam', sans-serif";
    } else if (isBengali) {
        googleFont  = 'Noto+Sans+Bengali:wght@400;700';
        fontFamily  = "'Noto Sans Bengali', sans-serif";
    } else if (isGujarati) {
        googleFont  = 'Noto+Sans+Gujarati:wght@400;700';
        fontFamily  = "'Noto Sans Gujarati', sans-serif";
    } else if (isGurmukhi) {
        googleFont  = 'Noto+Sans+Gurmukhi:wght@400;700';
        fontFamily  = "'Noto Sans Gurmukhi', sans-serif";
    } else {
        googleFont  = 'Crimson+Pro:wght@400;700';
        fontFamily  = "'Crimson Pro', Georgia, serif";
    }

    const disclaimer = isJapanese
        ? '免責事項：このAI生成文書は、資格を持つ法律の専門家が確認する必要があります。専門的な法律アドバイスの代替ではありません。'
        : 'Disclaimer: This document is AI-generated and must be reviewed by a qualified legal professional before use. Not a substitute for professional legal advice.';

    // Build HTML lines
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] || 'Legal Document';

    const bodyLines = lines.slice(1).map(line => {
        const escaped = line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const isHeading = /^(\d+(\.\d+)*\.|第\d+条|[A-Z\u30A0-\u30FF]{2,})/.test(line);
        if (isHeading) {
            return `<p class="heading">${escaped}</p>`;
        }
        return `<p>${escaped}</p>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="${isJapanese ? 'ja' : 'en'}">
<head>
<meta charset="UTF-8">
<title>${title.replace(/</g,'&lt;')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${googleFont}&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${fontFamily};
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.75;
    padding: 40px 50px;
    background: #fff;
  }
  .doc-header {
    text-align: center;
    border-bottom: 2px solid #c9a84c;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .doc-header h1 {
    font-size: 16pt;
    font-weight: 700;
    color: #2c1a0e;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .doc-header .meta {
    font-size: 9pt;
    color: #7a6a50;
    margin-top: 6px;
  }
  p {
    margin-bottom: 8px;
    text-align: ${isJapanese ? 'left' : 'justify'};
  }
  p.heading {
    font-weight: 700;
    margin-top: 16px;
    margin-bottom: 4px;
    color: #2c1a0e;
  }
  .footer {
    margin-top: 40px;
    padding-top: 12px;
    border-top: 1px solid #d4c9a8;
    font-size: 8pt;
    color: #999;
    text-align: center;
    font-style: italic;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 18mm 15mm; size: A4; }
  }
</style>
</head>
<body>
<div class="doc-header">
  <h1>${title.replace(/</g,'&lt;')}</h1>
  <div class="meta">SAMARTHAA-LEGAL &nbsp;|&nbsp; ${new Date().toLocaleDateString(isJapanese ? 'ja-JP' : 'en-IN', { dateStyle: 'long' })}</div>
</div>
${bodyLines}
<div class="footer">${disclaimer}</div>
<script>
  document.fonts.ready.then(() => { setTimeout(() => window.print(), 400); });
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
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
//   Transcribe Audio  🔐 Protected  (Claude AI)
//   POST /api/transcribe  multipart/form-data  field: audio
// =====================================================
app.post('/api/transcribe', requireAuth, upload.single('audio'), async (req, res) => {
    if (!ANTHROPIC_API_KEY) {
        return res.status(503).json({ text: '', error: 'Transcription not configured — ANTHROPIC_API_KEY missing' });
    }

    if (!req.file) {
        return res.status(400).json({ text: '', error: 'No audio file received' });
    }

    try {
        console.log(`🎙️  Transcribe request from ${req.user.email} — ${req.file.size} bytes (${req.file.mimetype})`);

        // Convert audio buffer to base64
        const audioBase64  = req.file.buffer.toString('base64');
        const mimeType     = req.file.mimetype || 'audio/webm';

        const response = await anthropic.messages.create({
            model:      'claude-opus-4-5',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'document',
                        source: {
                            type:       'base64',
                            media_type: mimeType,
                            data:       audioBase64
                        }
                    },
                    {
                        type: 'text',
                        text: 'Please transcribe the speech in this audio recording. Return ONLY the transcribed text with no explanation, preamble or punctuation changes. Preserve Indian legal terminology, court names, acts and statute names exactly as spoken.'
                    }
                ]
            }]
        });

        const text = response.content[0]?.text?.trim() || '';
        console.log(`✅ Transcribed: "${text.substring(0, 80)}..."`);
        res.json({ text });

    } catch (err) {
        console.error('❌ Claude transcription error:', err.message);
        res.status(500).json({ text: '', error: 'Transcription failed: ' + err.message });
    }
});

// =====================================================
//   Chat Assistant Endpoint  🔐 Protected
//   POST /api/chat-assistant
//   Body: { message, history, documentContext, currentMode }
// =====================================================
app.post('/api/chat-assistant', requireAuth, async (req, res) => {
    try {
        const { message, history = [], documentContext, currentMode, locale } = req.body;

        if (!message || !message.trim())
            return res.status(400).json({ error: 'No message provided' });

        if (!ANTHROPIC_API_KEY)
            return res.status(500).json({ error: 'Anthropic API key not configured' });

        // ── Build system prompt ────────────────────────────────
        const isJapaneseChat = locale === 'ja-JP';

        let systemPrompt = isJapaneseChat
        ? `あなたはSAMARTHAAです。日本法を専門とするシニア法律アシスタントです。以下の分野に深い専門知識を持っています：
- 日本の憲法、民事・刑事訴訟手続き
- 民法、商法、労働基準法、借地借家法、会社法、その他主要な日本の法令
- 最高裁判所および高等裁判所の判決・先例
- 企業法、家族法、不動産法、労働法（日本法域）
- 日本の市民や企業への実務的な法律ガイダンス

コミュニケーションスタイル：
- 法律家でない方にも理解しやすい明確な日本語で回答してください
- 簡単な質問は3〜5文、複雑な質問はより詳しく回答してください
- 関連する日本の法律、条文、判例を必ず引用してください
- 不確かな場合は推測せず、明確にそう伝えてください
- 複雑な回答の末尾に実践的な次のステップの提案を加えてください
- 機密情報が必要なアドバイスは控え、弁護士への相談を勧めてください

重要：あなたは音声アシスタントです。会話的で話し言葉に適した回答を心がけてください。箇条書き、マークダウン、フォーマットは避け、流れるような文章で書いてください。`
        : `You are SAMARTHAA, a senior Indian legal assistant with deep expertise in:
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
