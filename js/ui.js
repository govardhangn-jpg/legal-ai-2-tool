// ui.js - UI Interactions and State Management
// SAMARTHAA-LEGAL

const UI = {
    selectedMode: null,
    elements: {},
    currentDocumentId: null,

    init() {
        // Guard against double-init (called from both ui.js DOMContentLoaded and app.js)
        if (this._initialized) return;
        this._initialized = true;

        this.elements = {
            modeCards: document.querySelectorAll('.mode-card'),

            inputSection:   document.getElementById('inputSection'),
            resultSection:  document.getElementById('resultSection'),
            sectionTitle:   document.getElementById('sectionTitle'),

            contractFields: document.getElementById('contractFields'),
            researchFields: document.getElementById('researchFields'),
            opinionFields:  document.getElementById('opinionFields'),

            contractType:    document.getElementById('contractType'),
            contractDetails: document.getElementById('contractDetails'),
            legalIssue:      document.getElementById('legalIssue'),
            researchQuery:   document.getElementById('researchQuery'),
            jurisdiction:    document.getElementById('jurisdiction'),
            opinionTopic:    document.getElementById('opinionTopic'),
            opinionQuery:    document.getElementById('opinionQuery'),
            applicableLaws:  document.getElementById('applicableLawsInput'),

            generateBtn:     document.getElementById('generateBtn'),
            clearBtn:        document.getElementById('clearBtn'),
            copyBtn:         document.getElementById('copyBtn'),

            downloadWordBtn: document.getElementById('downloadWordBtn'),
            downloadPdfBtn:  document.getElementById('downloadPdfBtn'),

            loadingIndicator: document.getElementById('loadingIndicator'),
            errorMessage:     document.getElementById('errorMessage'),
            resultTitle:      document.getElementById('resultTitle'),
            resultContent:    document.getElementById('resultContent'),

            elBadge:          document.getElementById('elBadge')
        };

        if (this.elements.downloadWordBtn) this.elements.downloadWordBtn.disabled = true;
        if (this.elements.downloadPdfBtn)  this.elements.downloadPdfBtn.disabled  = true;

        this.attachEventListeners();
    },

    attachEventListeners() {
        this.elements.modeCards.forEach(card => {
            card.addEventListener('click', () => this.selectMode(card));
        });

        this.elements.generateBtn.addEventListener('click',     () => this.handleGenerate());
        this.elements.clearBtn.addEventListener('click',        () => this.clearForm());
        this.elements.copyBtn.addEventListener('click',         () => this.copyToClipboard());
        this.elements.downloadWordBtn.addEventListener('click', () => this.downloadDocument('word'));
        this.elements.downloadPdfBtn.addEventListener('click',  () => this.downloadDocument('pdf'));
    },

    selectMode(card) {
        const mode = card.dataset.mode;
        this.selectedMode  = mode;
        CONFIG.currentMode = mode;

        this.elements.modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        this.elements.inputSection.style.display = 'block';
        this.elements.contractFields.style.display = 'none';
        this.elements.researchFields.style.display = 'none';
        this.elements.opinionFields.style.display  = 'none';

        const cfg = CONFIG.TITLES[mode];
        this.elements.sectionTitle.textContent = cfg.section;
        this.elements.generateBtn.textContent  = cfg.button;

        if (mode === 'contract') this.elements.contractFields.style.display = 'block';
        if (mode === 'research') this.elements.researchFields.style.display = 'block';
        if (mode === 'opinion')  this.elements.opinionFields.style.display  = 'block';

        // Notify voice module
        if (window.Voice) window.Voice.onModeChange(mode);

        // Notify chat assistant of mode change
        if (window.ChatAssistant) window.ChatAssistant.onModeChange(mode);

        this.elements.inputSection.scrollIntoView({ behavior: 'smooth' });
    },

    getFormInputs() {
        if (!this.selectedMode)
            throw new Error(CONFIG.MESSAGES.MODE_NOT_SELECTED);

        const inputs = { mode: this.selectedMode, locale: CONFIG.getLocale() };

        if (this.selectedMode === 'contract') {
            inputs.contractType    = this.elements.contractType.value;
            inputs.contractDetails = this.elements.contractDetails.value;
            if (!inputs.contractType || !inputs.contractDetails)
                throw new Error(CONFIG.MESSAGES.INCOMPLETE_FORM.contract);
        }

        if (this.selectedMode === 'research') {
            inputs.legalIssue    = this.elements.legalIssue.value;
            inputs.researchQuery = this.elements.researchQuery.value;
            inputs.jurisdiction  = this.elements.jurisdiction.value;
            if (!inputs.legalIssue || !inputs.researchQuery)
                throw new Error(CONFIG.MESSAGES.INCOMPLETE_FORM.research);
        }

        if (this.selectedMode === 'opinion') {
            inputs.opinionTopic   = this.elements.opinionTopic.value;
            inputs.opinionQuery   = this.elements.opinionQuery.value;
            inputs.applicableLaws = this.elements.applicableLaws.value;
            if (!inputs.opinionTopic || !inputs.opinionQuery)
                throw new Error(CONFIG.MESSAGES.INCOMPLETE_FORM.opinion);
        }

        return inputs;
    },

    async handleGenerate() {
        try {
            const payload = this.getFormInputs();
            this.showLoading();

            // Stop any voice activity before generating
            if (window.Voice) {
                window.Voice.stopRecording();
                window.Voice.stopSpeaking();
            }

            const response = await callClaudeAPI(payload);

            if (!response || !response.output)
                throw new Error('Empty response from AI service');

            this.currentDocumentId = response.documentId;
            this.displayResult(response.output, response.verifiedSources || []);

        } catch (err) {
            console.error(err);
            this.showError(err.message || 'Failed to generate result');
        } finally {
            this.hideLoading();
        }
    },

    displayResult(result, verifiedSources) {
        this.elements.resultContent.textContent = result;
        this.elements.resultTitle.textContent   = CONFIG.TITLES[this.selectedMode].result;
        this.elements.resultSection.classList.add('active');
        this.hideError();

        if (this.elements.downloadWordBtn) this.elements.downloadWordBtn.disabled = false;
        if (this.elements.downloadPdfBtn)  this.elements.downloadPdfBtn.disabled  = false;

        // Show Read Aloud for ALL modes
        if (window.Voice) window.Voice.showReadAloud();

        // Notify chat assistant of new document context
        if (window.ChatAssistant) {
            window.ChatAssistant.setDocumentContext(this.selectedMode, result);
        }

        // Show ElevenLabs badge
        if (this.elements.elBadge) this.elements.elBadge.style.display = 'inline';

        // Render Indian Kanoon verification panel
        this.renderVerifiedSources(verifiedSources || []);

        setTimeout(() => {
            this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    },

    renderVerifiedSources(sources) {
        // Remove any existing panel
        const existing = document.getElementById('ikVerificationPanel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'ikVerificationPanel';
        panel.style.cssText = 'margin-top:20px;padding:16px 20px;border:1.5px solid #8b6914;border-radius:10px;background:#1e1208;font-family:IBM Plex Sans,sans-serif;font-size:0.875rem';

        if (sources.length === 0) {
            panel.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
                  '<span style="font-size:1.1rem">&#9878;</span>' +
                  '<strong style="color:#c9a84c">Indian Kanoon Citation Check</strong>' +
                  '<span style="margin-left:auto;background:#5a3e1b;color:#f5c842;padding:2px 8px;border-radius:12px;font-size:0.75rem">No citations detected</span>' +
                '</div>' +
                '<p style="color:#b8a888;margin:0;font-size:0.8rem">No specific case citations were detected in this output. ' +
                'If the document references cases, verify them manually at ' +
                '<a href="https://indiankanoon.org" target="_blank" rel="noopener noreferrer" style="color:#c9a84c">indiankanoon.org</a>.</p>';
        } else {
            var rows = sources.map(function(s) {
                return '<div style="padding:10px 0;border-bottom:1px solid #3a2a12">' +
                    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
                        '<span style="background:#1a4d2e;color:#4ade80;padding:2px 7px;border-radius:10px;font-size:0.7rem;font-weight:600">&#10003; VERIFIED</span>' +
                        '<span style="color:#f5e6c8;font-weight:500">' + s.citation + '</span>' +
                    '</div>' +
                    '<div style="color:#c9a84c;font-size:0.78rem;margin-bottom:3px">' + s.title + '</div>' +
                    '<div style="display:flex;gap:12px;align-items:center">' +
                        '<span style="color:#7a6a50;font-size:0.75rem">' + (s.court || '') + '</span>' +
                        '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer" ' +
                           'style="color:#c9a84c;font-size:0.75rem;text-decoration:none;margin-left:auto">View on Indian Kanoon &rarr;</a>' +
                    '</div>' +
                    (s.snippet ? '<div style="color:#9a8a70;font-size:0.75rem;margin-top:4px;font-style:italic">' + s.snippet.substring(0, 150) + '&hellip;</div>' : '') +
                '</div>';
            }).join('');

            panel.innerHTML =
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">' +
                  '<span style="font-size:1.1rem">&#9878;</span>' +
                  '<strong style="color:#c9a84c">Indian Kanoon Citation Verification</strong>' +
                  '<span style="margin-left:auto;background:#1a4d2e;color:#4ade80;padding:2px 8px;border-radius:12px;font-size:0.75rem">' + sources.length + ' verified</span>' +
                '</div>' +
                rows +
                '<p style="color:#7a6a50;margin:10px 0 0;font-size:0.75rem">' +
                'Citations verified against Indian Kanoon database. ' +
                'Always confirm citations with the linked judgments before relying on them in court.' +
                '</p>';
        }

        var resultSection = document.getElementById('resultSection');
        if (resultSection) resultSection.appendChild(panel);
    },

    clearForm() {
        document.querySelectorAll('input[type="text"], textarea, select')
            .forEach(el => el.value = '');

        this.elements.resultSection.classList.remove('active');
        this.hideError();

        // Remove Indian Kanoon verification panel
        const ikPanel = document.getElementById('ikVerificationPanel');
        if (ikPanel) ikPanel.remove();
        if (this.elements.downloadPdfBtn)  this.elements.downloadPdfBtn.disabled  = true;

        if (this.elements.elBadge) this.elements.elBadge.style.display = 'none';

        if (window.Voice) {
            window.Voice.stopSpeaking();
            window.Voice.hideReadAloud();
        }

        // Clear all voice status texts
        document.querySelectorAll('.voice-status').forEach(el => el.textContent = '');
    },

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.elements.resultContent.textContent);
            const original = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = '✓ Copied!';
            setTimeout(() => this.elements.copyBtn.textContent = original, 2000);
        } catch {
            this.showError('Failed to copy to clipboard');
        }
    },

    async downloadDocument(type) {
        const content = this.elements.resultContent.textContent;
        if (!content) { this.showError('No document content available'); return; }

        const token   = localStorage.getItem('token');
        const baseUrl = CONFIG.API.BACKEND_URL.replace('/chat', '');
        const locale  = window.CONFIG?.getLocale() || 'en-IN';

        // Disable button during download
        const btn = type === 'pdf' ? this.elements.downloadPdfBtn : this.elements.downloadWordBtn;
        const origText = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '⏳'; btn.disabled = true; }

        try {
            const response = await fetch(`${baseUrl}/download/${type}`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ content, locale })
            });

            if (!response.ok) { this.showError('Failed to download document'); return; }

            if (type === 'pdf') {
                // PDF endpoint returns HTML — open in new tab, browser prints to PDF
                const html = await response.text();
                const blob = new Blob([html], { type: 'text/html' });
                const url  = URL.createObjectURL(blob);
                const tab  = window.open(url, '_blank');
                if (!tab) {
                    // Popup blocked — download as HTML fallback
                    const a    = document.createElement('a');
                    a.href     = url;
                    a.download = `samarthaa-legal-${Date.now()}.html`;
                    a.click();
                }
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            } else {
                // Word — download blob as .docx
                const blob = await response.blob();
                const url  = window.URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `samarthaa-legal-${Date.now()}.docx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }

            if (btn) { btn.innerHTML = '✓'; setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 2000); }

        } catch (err) {
            if (btn) { btn.innerHTML = origText; btn.disabled = false; }
            this.showError('Download failed: ' + err.message);
        }
    },

    showLoading() {
        this.elements.loadingIndicator.classList.add('active');
        this.elements.generateBtn.disabled = true;
        this.elements.resultSection.classList.remove('active');
        this.hideError();
    },

    hideLoading() {
        this.elements.loadingIndicator.classList.remove('active');
        this.elements.generateBtn.disabled = false;
    },

    showError(message) {
        this.elements.errorMessage.textContent = CONFIG.MESSAGES.ERROR_PREFIX + message;
        this.elements.errorMessage.classList.add('active');
    },

    hideError() {
        this.elements.errorMessage.classList.remove('active');
    }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
window.UI = UI;
