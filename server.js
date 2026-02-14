// server.js
// ================================
// Indian Legal AI Backend Server (AI)
// ================================

// 1️⃣ Load environment variables FIRST
require('dotenv').config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_this";

// 2️⃣ Imports
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { Document, Packer, Paragraph } = require('docx');

// 3️⃣ Config
const PORT = process.env.PORT || 5000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 4️⃣ Validate API key ONCE
if (!ANTHROPIC_API_KEY) {
    console.warn('⚠️  WARNING: API key not configured!');
    console.warn('   Please set ANTHROPIC_API_KEY in backend/.env');
} else {
    console.log('🔑 API key loaded successfully');
}

// 5️⃣ Create Anthropic client
const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY
});



// 6️⃣ Create Express app (ONLY ONCE)
const app = express();

const users = [
  {
    id: 1,
    email: "admin@just-law.tech",
    password: bcrypt.hashSync("pwd@123", 8)
  }
];

// Middleware
app.use(cors());
app.use(express.json());

/* =====================================================
   Health Check
===================================================== */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Legal AI Backend Running',
        timestamp: new Date().toISOString()
    });
});


app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = bcrypt.compareSync(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token });
});


/* =====================================================
   Main Chat / Generate Endpoint
===================================================== */
app.post('/api/chat', async (req, res) => {
    try {
        const body = req.body;

        if (!body || typeof body !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body'
            });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'API key not configured. Please set ANTHROPIC_API_KEY in backend/.env'
            });
        }

        let prompt = '';

        /* =========================
           CONTRACT MODE
        ========================= */
        if (body.mode === 'contract') {
            if (!body.contractType || !body.contractDetails) {
                return res.status(400).json({
                    success: false,
                    error: 'contractType and contractDetails are required'
                });
            }

            prompt = `
You are an expert Indian legal professional specializing in contract drafting. Draft a ${body.contractType} according to Indian law in P Mogha format.

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

Generate a complete, professional contract draft in the P Mogha format that is ready for lawyer review and customization.
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

========================


`}


        /* =========================
           RESEARCH MODE
        ========================= */
        else if (body.mode === 'research') {
            prompt = `
You are an expert Indian legal researcher. Conduct comprehensive case law research on the following matter by referring to manupatra legal database only and do not include scc legal database.

Legal Issue:

${body.legalIssue || 'Not specified'}

Context:
${body.researchQuery || 'Not specified'}

Preferred Jurisdiction:
${body.jurisdiction || 'India'}

Please provide:
1. **Relevant Case Law**: List landmark and recent cases with citations (Party Names, Citation, Court, Year)
2. **Legal Principles**: Key principles established by these cases
3. **Statutory Provisions**: Applicable sections of relevant acts
4. **Analysis**: How these cases apply to the query
5. **Current Legal Position**: What is the prevailing view
6. **Practical Application**: How courts typically rule on such matters

Focus on authoritative Indian Supreme Court and High Court judgments. Include both landmark precedents and recent decisions. Provide case citations in standard Indian format.
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

========================


`;
        }

        /* =========================
           OPINION MODE
        ========================= */
        else if (body.mode === 'opinion') {
            prompt = `
You are a senior Indian advocate providing a detailed legal opinion. Analyze the following matter comprehensively.


Topic:
${body.opinionTopic || 'Not specified'}

Facts:
${body.opinionQuery || 'Not specified'}

Applicable Laws:
${body.applicableLaws || 'Relevant Indian laws'}

Please provide a comprehensive legal opinion including:

1. **Summary of Facts**: Brief recap of the situation

2. **Legal Issues**: Identify specific legal questions to be addressed

3. **Applicable Law**: 
   - Relevant statutes and sections
   - Key provisions that apply
   - Any rules or regulations

4. **Case Law Analysis**:
   - Relevant Supreme Court and High Court precedents
   - How these cases apply to this matter
   - Current judicial trends

5. **Legal Analysis**:
   - Strengths of the case/position
   - Potential weaknesses or risks
   - Counter-arguments to anticipate

6. **Opinion & Advice**:
   - Your legal opinion on the matter
   - Likelihood of success
   - Recommended course of action
   - Alternative options

7. **Practical Considerations**:
   - Procedural steps
   - Documentation required
   - Timeline estimates
   - Cost implications

8. **Conclusion**: Clear summary of your opinion and recommendations

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

========================

`;
        }

        else {
            return res.status(400).json({
                success: false,
                error: 'Invalid mode'
            });
        }

        if (typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Failed to construct prompt'
            });
        }

        console.log(`📨 ${body.mode.toUpperCase()} request received`);

        // 7️⃣ Call Anthropic Messages API (CORRECT FORMAT)
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 24000,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        }
                    ]
                }
            ]
        });

        console.log('✅ Claude response generated');
        console.log('Tokens used:', response.usage);

        // 8️⃣ Send response back to client
        const crypto = require('crypto');
        res.json({
    success: true,
    documentId: crypto.randomUUID(),
    output: response.content[0].text,
    usage: response.usage
});


    } catch (error) {
        console.error('❌ Server Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/*
app.get('/api/download/word/:id', async (req, res) => {
    const text = documents.get(req.params.id);

    if (!text) {
        return res.status(404).send('Document not found');
    }

    const doc = new Document({
        sections: [{
            children: text.split('\n').map(
                line => new Paragraph(line)
            )
        }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition',
        'attachment; filename=legal-document.docx');

    res.send(buffer);
});
*/

const PDFDocument = require('pdfkit');

/*p.get('/api/download/pdf/:id', (req, res) => {
    const text = documents.get(req.params.id);

    if (!text) {
        return res.status(404).send('Document not found');
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
        'attachment; filename=legal-document.pdf');

    doc.pipe(res);
    doc.fontSize(11).text(text);
    doc.end();
});
*/

// ===== Stateless Word Download ====
app.post('/api/download/pdf', (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).send('No content provided');
    }

    const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        'attachment; filename=legal-document.pdf'
    );

    doc.pipe(res);

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    // ---- Title ----
    doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(lines[0], { align: 'center' });

    doc.moveDown(2);

    // ---- Body ----
    lines.slice(1).forEach(line => {
        if (/^\d+(\.\d+)*\./.test(line)) {
            // Clause / sub-clause
            doc
                .moveDown(0.5)
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(line, { align: 'left' });
        } else {
            // Normal paragraph
            doc
                .moveDown(0.3)
                .fontSize(11)
                .font('Helvetica')
                .text(line, {
                    align: 'justify',
                    lineGap: 4
                });
        }
    });

    // ---- Footer ----
    doc.moveDown(2);
    doc
        .fontSize(8)
        .font('Helvetica')
        .text(
            'Disclaimer: This document is AI-generated and must be reviewed by a qualified legal professional.',
            { align: 'center' }
        );

    doc.end();
    
});

app.post('/api/download/word', async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).send('No content provided');
    }

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    const paragraphs = [];

    // ---- Title ----
    paragraphs.push(
        new Paragraph({
            text: lines[0],
            heading: 'Title',
            alignment: 'center'
        })
    );

    // ---- Body ----
    lines.slice(1).forEach(line => {
        if (/^\d+(\.\d+)*\./.test(line)) {
            paragraphs.push(
                new Paragraph({
                    text: line,
                    bold: true,
                    spacing: { before: 200 }
                })
            );
        } else {
            paragraphs.push(
                new Paragraph({
                    text: line,
                    spacing: { after: 120 }
                })
            );
        }
    });

    // ---- Footer disclaimer ----
    paragraphs.push(
        new Paragraph({
            text:
                'Disclaimer: This document is AI-generated and must be reviewed by a qualified legal professional.',
            italics: true,
            spacing: { before: 400 }
        })
    );

    const doc = new Document({
        sections: [{ children: paragraphs }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
        'Content-Disposition',
        'attachment; filename=legal-document.docx'
    );

    res.send(buffer);
});

/* =====================================================
   Start Server
===================================================== */
app.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log('   Legal AI Backend Server Started!');
    console.log('========================================');
    console.log(`📡 Server: https://legal-ai-2-japan-1.onrender.com}`);
    console.log(`🔧 API endpoint: https://legal-ai-2-japan-1.onrender.com/api/chat`);
    console.log(`💚 Health check: https://legal-ai-2-japan-1.onrender.com/api/health`);
    console.log('========================================\n');
});
