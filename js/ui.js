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
            this.displayResult(response.output);

        } catch (err) {
            console.error(err);
            this.showError(err.message || 'Failed to generate result');
        } finally {
            this.hideLoading();
        }
    },

    displayResult(result) {
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

        setTimeout(() => {
            this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    },

    clearForm() {
        document.querySelectorAll('input[type="text"], textarea, select')
            .forEach(el => el.value = '');

        this.elements.resultSection.classList.remove('active');
        this.hideError();

        if (this.elements.downloadWordBtn) this.elements.downloadWordBtn.disabled = true;
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
