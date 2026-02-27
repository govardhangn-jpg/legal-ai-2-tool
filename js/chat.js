// chat.js — SAMARTHAA-LEGAL Voice Chat Assistant
// ─────────────────────────────────────────────────────────────────
// Two-way voice chat with:
//   - Full conversation history (multi-turn)
//   - Document context awareness (contract / research / opinion)
//   - General Indian law knowledge
//   - ElevenLabs TTS for AI responses
//   - Web Speech API STT for user input
// ─────────────────────────────────────────────────────────────────

const ChatAssistant = (() => {

    // ── State ──────────────────────────────────────────────────────
    let isOpen          = false;
    let isThinking      = false;
    let conversationHistory = [];   // [{role, content}]
    let documentContext = null;     // { mode, content } of last generated doc
    let currentMode     = null;     // current app mode

    // Voice state
    let recognition     = null;
    let isRecording     = false;
    let chatAudioCtx    = null;
    let chatAudioSrc    = null;
    let isSpeaking      = false;
    let ttsAbortCtrl    = null;

    // ── DOM refs ───────────────────────────────────────────────────
    let triggerBtn, panel, messagesEl, typingEl, chatInput,
        sendBtn, micBtn, contextBanner, contextText, contextClear;

    const hasSpeechRecognition =
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // ── Suggested questions per mode ──────────────────────────────
    const SUGGESTIONS = {
        default: [
            'What are my rights as a tenant in India?',
            'Explain the Indian Contract Act 1872',
            'How to file a consumer complaint?',
            'What is anticipatory bail?'
        ],
        contract: [
            'Explain the key clauses in this contract',
            'What are my obligations under this agreement?',
            'Are there any risky clauses I should know?',
            'What happens if a party breaches this contract?'
        ],
        research: [
            'Summarise the key legal principles found',
            'How does this case law apply to my situation?',
            'What is the current legal position on this?',
            'Which High Court precedent is most relevant?'
        ],
        opinion: [
            'What are my chances of success in court?',
            'What documents do I need to proceed?',
            'Explain this opinion in simple language',
            'What are the next legal steps I should take?'
        ]
    };

    // ══════════════════════════════════════════════════════════════
    //   PANEL OPEN / CLOSE
    // ══════════════════════════════════════════════════════════════
    function open() {
        isOpen = true;
        panel.classList.add('open');
        triggerBtn.innerHTML = '✕';
        triggerBtn.title = 'Close assistant';
        chatInput.focus();

        // Show empty state + suggestions if no messages yet
        if (conversationHistory.length === 0) renderEmptyState();
    }

    function close() {
        isOpen = false;
        panel.classList.remove('open');
        triggerBtn.innerHTML = '⚖️';
        triggerBtn.title = 'Ask SAMARTHAA';
        stopSpeaking();
        stopRecording();
    }

    function toggle() {
        isOpen ? close() : open();
    }

    // ══════════════════════════════════════════════════════════════
    //   DOCUMENT CONTEXT
    // ══════════════════════════════════════════════════════════════

    /** Called by ui.js after a document is generated */
    function setDocumentContext(mode, content) {
        documentContext = { mode, content: content.substring(0, 3000) }; // trim for token efficiency
        currentMode     = mode;

        const labels = { contract: 'Contract', research: 'Case Research', opinion: 'Legal Opinion' };
        contextText.textContent = `Context: ${labels[mode] || mode} loaded`;
        contextBanner.classList.add('visible');

        // Refresh suggestions
        if (conversationHistory.length === 0) renderEmptyState();
    }

    function clearContext() {
        documentContext = null;
        contextBanner.classList.remove('visible');
        if (conversationHistory.length === 0) renderEmptyState();
    }

    // ══════════════════════════════════════════════════════════════
    //   RENDER MESSAGES
    // ══════════════════════════════════════════════════════════════

    function renderEmptyState() {
        messagesEl.innerHTML = '';

        const suggestions = documentContext
            ? SUGGESTIONS[documentContext.mode] || SUGGESTIONS.default
            : SUGGESTIONS.default;

        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'chat-empty';
        emptyDiv.innerHTML = `
            <div class="chat-empty-icon">⚖️</div>
            <h4>SAMARTHAA Legal Assistant</h4>
            <p>Ask me anything about Indian law, or questions about your generated document.</p>
        `;
        messagesEl.appendChild(emptyDiv);

        // Suggestion chips
        const sugDiv = document.createElement('div');
        sugDiv.className = 'chat-suggestions';
        suggestions.forEach(q => {
            const chip = document.createElement('button');
            chip.className = 'chat-suggestion-chip';
            chip.textContent = q;
            chip.addEventListener('click', () => {
                chatInput.value = q;
                sendMessage();
            });
            sugDiv.appendChild(chip);
        });
        messagesEl.appendChild(sugDiv);
    }

    function addMessage(role, text) {
        // Remove empty state if present
        const emptyState = messagesEl.querySelector('.chat-empty');
        if (emptyState) emptyState.remove();
        const sugDiv = messagesEl.querySelector('.chat-suggestions');
        if (sugDiv) sugDiv.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-msg-avatar';
        avatar.textContent = role === 'ai' ? '⚖' : '👤';

        const bubble = document.createElement('div');
        bubble.className = 'chat-msg-bubble';
        bubble.textContent = text;

        // Add speak button for AI messages
        if (role === 'ai') {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'chat-msg-speak';
            speakBtn.innerHTML = '🔊 Listen';
            speakBtn.addEventListener('click', () => {
                if (speakBtn.classList.contains('playing')) {
                    stopSpeaking();
                    speakBtn.classList.remove('playing');
                    speakBtn.innerHTML = '🔊 Listen';
                } else {
                    // Stop any other speaking first
                    stopSpeaking();
                    // Reset all other speak buttons
                    document.querySelectorAll('.chat-msg-speak').forEach(b => {
                        b.classList.remove('playing');
                        b.innerHTML = '🔊 Listen';
                    });
                    speakBtn.classList.add('playing');
                    speakBtn.innerHTML = '⏹ Stop';
                    speakText(text, () => {
                        speakBtn.classList.remove('playing');
                        speakBtn.innerHTML = '🔊 Listen';
                    });
                }
            });
            bubble.appendChild(speakBtn);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        messagesEl.appendChild(msgDiv);

        scrollToBottom();
        return msgDiv;
    }

    function showTyping() {
        typingEl.classList.add('visible');
        scrollToBottom();
    }

    function hideTyping() {
        typingEl.classList.remove('visible');
    }

    function scrollToBottom() {
        setTimeout(() => {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }, 50);
    }

    // ══════════════════════════════════════════════════════════════
    //   SEND MESSAGE
    // ══════════════════════════════════════════════════════════════

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || isThinking) return;

        const token = localStorage.getItem('token');
        if (!token) { alert('Please log in first.'); return; }

        chatInput.value = '';
        autoResizeInput();

        // Add user message to UI and history
        addMessage('user', text);
        conversationHistory.push({ role: 'user', content: text });

        isThinking = true;
        sendBtn.disabled = true;
        showTyping();

        try {
            const baseUrl = 'https://legal-ai-2-tool-1.onrender.com';

            const response = await fetch(`${baseUrl}/api/chat-assistant`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message:     text,
                    history:     conversationHistory.slice(-10), // last 10 turns for context
                    documentContext: documentContext || null,
                    currentMode: currentMode
                })
            });

            if (response.status === 401 || response.status === 403) {
                // Token expired — try to refresh silently, don't reload page
                hideTyping();
                addMessage('ai', 'Your session has expired. Please log out and log in again to continue.');
                isThinking = false;
                sendBtn.disabled = false;
                return;
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Error ${response.status}`);
            }

            const data = await response.json();
            const aiReply = data.reply;

            hideTyping();
            addMessage('ai', aiReply);
            conversationHistory.push({ role: 'assistant', content: aiReply });

            // Auto-speak AI reply
            speakText(aiReply);

        } catch (err) {
            hideTyping();
            if (err.name !== 'AbortError') {
                addMessage('ai', `Sorry, I encountered an error: ${err.message}. Please try again.`);
            }
        } finally {
            isThinking   = false;
            sendBtn.disabled = false;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //   TEXT-TO-SPEECH (ElevenLabs via backend)
    // ══════════════════════════════════════════════════════════════

    async function speakText(text, onFinish) {
        if (!text || !text.trim()) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const baseUrl = 'https://legal-ai-2-tool-1.onrender.com';

        stopSpeaking(); // stop any current audio

        isSpeaking = true;
        triggerBtn.classList.add('speaking');

        try {
            ttsAbortCtrl = new AbortController();

            // Trim to 1500 chars for chat responses (keep it snappy)
            const trimmed = text.trim().substring(0, 1500);

            const response = await fetch(`${baseUrl}/api/tts`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body:   JSON.stringify({ text: trimmed }),
                signal: ttsAbortCtrl.signal
            });

            if (!response.ok) throw new Error('TTS failed');

            const arrayBuffer = await response.arrayBuffer();
            chatAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const decoded = await chatAudioCtx.decodeAudioData(arrayBuffer);

            chatAudioSrc        = chatAudioCtx.createBufferSource();
            chatAudioSrc.buffer = decoded;
            chatAudioSrc.connect(chatAudioCtx.destination);
            chatAudioSrc.onended = () => {
                finishSpeaking();
                if (onFinish) onFinish();
            };
            chatAudioSrc.start(0);

        } catch (err) {
            if (err.name === 'AbortError') return;
            // Fallback to browser TTS
            fallbackSpeak(text, onFinish);
        }
    }

    function stopSpeaking() {
        ttsAbortCtrl && ttsAbortCtrl.abort();
        if (chatAudioSrc) {
            try { chatAudioSrc.stop(); } catch {}
            chatAudioSrc = null;
        }
        if (chatAudioCtx) {
            try { chatAudioCtx.close(); } catch {}
            chatAudioCtx = null;
        }
        window.speechSynthesis && window.speechSynthesis.cancel();
        finishSpeaking();
    }

    function finishSpeaking() {
        isSpeaking   = false;
        ttsAbortCtrl = null;
        if (triggerBtn) triggerBtn.classList.remove('speaking');
    }

    function fallbackSpeak(text, onFinish) {
        if (!window.speechSynthesis) { finishSpeaking(); return; }
        const u    = new SpeechSynthesisUtterance(text.substring(0, 500));
        u.lang     = 'en-IN';
        u.rate     = 0.9;
        u.onend    = () => { finishSpeaking(); if (onFinish) onFinish(); };
        u.onerror  = () => { finishSpeaking(); };
        isSpeaking = true;
        window.speechSynthesis.speak(u);
    }

    // ══════════════════════════════════════════════════════════════
    //   SPEECH-TO-TEXT (mic → chatInput)
    // ══════════════════════════════════════════════════════════════

    function startRecording() {
        if (!hasSpeechRecognition) {
            alert('Voice input requires Chrome or Edge.');
            return;
        }
        if (isRecording) { stopRecording(); return; }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SR();
                recognition.lang           = 'en-IN';
                recognition.continuous     = false;
                recognition.interimResults = true;

                let finalText = '';

                recognition.onstart = () => {
                    isRecording = true;
                    micBtn.classList.add('recording');
                    micBtn.title = 'Stop recording';
                    micBtn.innerHTML = '⏹';
                };

                recognition.onresult = (event) => {
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const t = event.results[i][0].transcript;
                        if (event.results[i].isFinal) finalText += t;
                        else interim += t;
                    }
                    chatInput.value = finalText + interim;
                    autoResizeInput();
                };

                recognition.onerror = () => stopRecording();

                recognition.onend = () => {
                    stopRecording();
                    // Auto-send if we captured something
                    if (chatInput.value.trim()) sendMessage();
                };

                recognition.start();
            })
            .catch(() => alert('Microphone access denied.'));
    }

    function stopRecording() {
        isRecording = false;
        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }
        if (micBtn) {
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '🎤';
            micBtn.title = 'Speak your question';
        }
    }

    // ══════════════════════════════════════════════════════════════
    //   HELPERS
    // ══════════════════════════════════════════════════════════════

    function autoResizeInput() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    }

    function clearConversation() {
        conversationHistory = [];
        renderEmptyState();
    }

    // ══════════════════════════════════════════════════════════════
    //   PUBLIC API
    // ══════════════════════════════════════════════════════════════

    function showTrigger() {
        if (triggerBtn) triggerBtn.classList.add('visible');
        // Re-initialize if coming back from re-login
        if (messagesEl && conversationHistory.length === 0) {
            renderEmptyState();
        }
    }

    function hideTrigger() {
        if (triggerBtn) triggerBtn.classList.remove('visible');
        // Reset state on logout
        conversationHistory = [];
        documentContext = null;
        if (contextBanner) contextBanner.classList.remove('visible');
        close();
    }

    function onModeChange(mode) {
        currentMode = mode;
    }

    // ══════════════════════════════════════════════════════════════
    //   INIT
    // ══════════════════════════════════════════════════════════════

    function init() {
        triggerBtn    = document.getElementById('chatTriggerBtn');
        panel         = document.getElementById('chatPanel');
        messagesEl    = document.getElementById('chatMessages');
        typingEl      = document.getElementById('chatTyping');
        chatInput     = document.getElementById('chatInput');
        sendBtn       = document.getElementById('chatSendBtn');
        micBtn        = document.getElementById('chatMicBtn');
        contextBanner = document.getElementById('chatContextBanner');
        contextText   = document.getElementById('chatContextText');
        contextClear  = document.getElementById('chatContextClear');

        if (!triggerBtn || !panel) return;

        // Trigger button
        triggerBtn.addEventListener('click', toggle);

        // Send button
        sendBtn.addEventListener('click', sendMessage);

        // Enter to send (Shift+Enter for newline)
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        chatInput.addEventListener('input', autoResizeInput);

        // Mic button
        micBtn.addEventListener('click', () => {
            stopSpeaking(); // stop AI speaking before user speaks
            startRecording();
        });

        // Clear context
        contextClear.addEventListener('click', clearContext);

        // Clear conversation button
        const clearBtn = document.getElementById('chatClearBtn');
        if (clearBtn) clearBtn.addEventListener('click', clearConversation);

        // Close button inside panel header
        const closeBtn = document.getElementById('chatCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', close);

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) close();
        });

        // Stop speaking on page hide
        window.addEventListener('beforeunload', stopSpeaking);
    }

    return {
        init,
        showTrigger,
        hideTrigger,
        setDocumentContext,
        onModeChange,
        stopSpeaking,
        clearConversation
    };

})();

document.addEventListener('DOMContentLoaded', () => ChatAssistant.init());
window.ChatAssistant = ChatAssistant;
