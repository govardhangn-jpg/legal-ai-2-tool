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
    let mediaRecorder   = null;
    let audioChunks     = [];
    let isRecording     = false;
    let useMediaRecorder = false; // will be set based on browser capability
    let chatAudioCtx    = null;
    let chatAudioSrc    = null;
    let isSpeaking      = false;
    let ttsAbortCtrl    = null;

    // ── DOM refs ───────────────────────────────────────────────────
    let triggerBtn, panel, messagesEl, typingEl, chatInput,
        sendBtn, micBtn, contextBanner, contextText, contextClear;

    const hasSpeechRecognition =
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Detect Android — Web Speech API unreliable on Android Chrome
    const isAndroid = /android/i.test(navigator.userAgent);

    // ── Locale helper ─────────────────────────────────────────────
    function getLocale() {
        return window.CONFIG?.getLocale() || localStorage.getItem('samarthaa_locale') || 'en-IN';
    }
    function isJapanese() { return getLocale() === 'ja-JP'; }

    // ── UI string helper ──────────────────────────────────────────
    function T(en, ja) { return isJapanese() ? ja : en; }

    // ── Suggested questions per mode ──────────────────────────────
    const SUGGESTIONS_EN = {
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
        ],
        default: [
            'What are the key legal points to know?',
            'Explain this legal concept simply',
            'What are my rights in this situation?',
            'What are the next steps I should take?'
        ]
    };
    const SUGGESTIONS_JA = {
        contract: [
            'この契約の主要条項を説明してください',
            'この契約における私の義務は何ですか？',
            '注意すべきリスクのある条項はありますか？',
            '当事者が契約違反した場合はどうなりますか？'
        ],
        research: [
            'この判例の主要な法的原則をまとめてください',
            'この判例法は私の状況にどう適用されますか？',
            'この問題に関する現在の法的立場は何ですか？',
            '最も関連性の高い高裁判例はどれですか？'
        ],
        opinion: [
            '裁判で勝訴する可能性はどのくらいですか？',
            '手続きを進めるために必要な書類は何ですか？',
            'この意見書をわかりやすく説明してください',
            '次にどのような法的手続きを取るべきですか？'
        ],
        default: [
            '知っておくべき重要な法的ポイントは何ですか？',
            'この法的概念をわかりやすく説明してください',
            'この状況における私の権利は何ですか？',
            '次にどのような手順を踏むべきですか？'
        ]
    };
    const SUGGESTIONS = isJapanese() ? SUGGESTIONS_JA : SUGGESTIONS_EN;

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
            <h4>${T('SAMARTHAA Legal Assistant', 'SAMARTHAA 法律アシスタント')}</h4>
            <p id="chatWelcomeMsg">${T(
                T('Ask me anything about Indian law, or questions about your generated document.', '日本の法律についてご質問いただくか、生成した文書についてお尋ねください。'),
                '日本の法律についてご質問いただくか、生成した文書についてお尋ねください。'
            )}</p>
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
                    currentMode: currentMode,
                    locale:      window.CONFIG?.getLocale() || 'en-IN'
                })
            });

            if (response.status === 401 || response.status === 403) {
                // Token expired — try to refresh silently, don't reload page
                hideTyping();
                addMessage('ai', T('Your session has expired. Please log out and log in again to continue.', 'セッションが期限切れです。ログアウトして再度ログインしてください。'));
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
                addMessage('ai', T(`Sorry, I encountered an error: ${err.message}. Please try again.`, `エラーが発生しました：${err.message}。もう一度お試しください。`));
            }
        } finally {
            isThinking   = false;
            sendBtn.disabled = false;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //   TEXT-TO-SPEECH (ElevenLabs via backend)
    // ══════════════════════════════════════════════════════════════

    // ── Speak-latest guard ──────────────────────────────────────────
    // Each speakText() call gets a unique ID. If a newer call arrives
    // while we are still fetching/playing, the older one is abandoned.
    let _speakSeq = 0;

    async function speakText(text, onFinish) {
        if (!text || !text.trim()) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const baseUrl = 'https://legal-ai-2-tool-1.onrender.com';

        // Increment sequence — any in-flight call with an older ID will bail out
        const mySeq = ++_speakSeq;

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

            // A newer speakText() was called while we were fetching — abandon this one
            if (mySeq !== _speakSeq) return;

            chatAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const decoded = await chatAudioCtx.decodeAudioData(arrayBuffer);

            // GainNode for volume boost (1.0 = normal, 2.0 = double, 3.0 = triple)
            const gainNode = chatAudioCtx.createGain();
            gainNode.gain.value = 3.75;
            gainNode.connect(chatAudioCtx.destination);

            chatAudioSrc        = chatAudioCtx.createBufferSource();
            chatAudioSrc.buffer = decoded;
            chatAudioSrc.connect(gainNode);
            chatAudioSrc.onended = () => {
                finishSpeaking();
                if (onFinish) onFinish();
            };
            chatAudioSrc.start(0);

        } catch (err) {
            if (err.name === 'AbortError') return;
            // Only fallback if still the latest request
            if (mySeq !== _speakSeq) return;
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
        u.lang     = getLocale();
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
        if (isRecording) { stopRecording(); return; }

        // Android: always use MediaRecorder + Whisper (Web Speech is unreliable on Android)
        if (isAndroid) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => startMediaRecorder(stream))
                .catch(err => {
                    console.error('Mic permission error:', err);
                    showMicStatus(T('Mic blocked. Allow microphone in Chrome Site Settings.', 'マイクがブロックされています。Chromeのサイト設定でマイクを許可してください。'));
                    setTimeout(() => showMicStatus(''), 5000);
                });
            return;
        }

        // Desktop/iOS: use Web Speech API
        if (!hasSpeechRecognition) {
            showMicStatus(T('Voice not supported. Please type your question.', '音声入力は対応していません。テキストで入力してください。'));
            return;
        }

        // Request mic permission first
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // Release the stream — Web Speech API manages its own mic
                stream.getTracks().forEach(t => t.stop());
                startWebSpeech();
            })
            .catch(err => {
                console.error('Mic permission error:', err);
                showMicStatus(T('Mic blocked. Go to Chrome Settings → Site Settings → Microphone → Allow this site.', 'マイクがブロックされています。Chrome設定 → サイト設定 → マイク → このサイトを許可してください。'));
                setTimeout(() => showMicStatus(''), 5000);
            });
    }

    // ── Web Speech API (desktop Chrome) ───────────────────────────
    function startWebSpeech() {
        const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang           = getLocale();
        recognition.continuous     = false;
        recognition.interimResults = true;

        let finalText = '';

        recognition.onstart = () => {
            isRecording = true;
            setMicRecording(true, 'Listening…');
        };

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += (finalText ? ' ' : '') + t.trim();
                else interim += t;
            }
            chatInput.value = finalText + (interim ? ' ' + interim : '');
            autoResizeInput();
        };

        recognition.onerror = (e) => {
            console.warn('Web Speech error:', e.error);
            stopRecording();
        };

        recognition.onend = () => {
            setMicRecording(false);
            isRecording = false;
            recognition = null;
            setTimeout(() => {
                if (chatInput.value.trim()) sendMessage();
            }, 200);
        };

        try { recognition.start(); }
        catch(e) { console.error('Could not start recognition:', e); }
    }

    // ── MediaRecorder API (Android + fallback) ─────────────────────
    function startMediaRecorder(stream) {
        audioChunks  = [];
        useMediaRecorder = true;

        // Pick best supported format
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4';

        mediaRecorder = new MediaRecorder(stream, { mimeType });

        mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstart = () => {
            isRecording = true;
            setMicRecording(true, 'Recording…');
        };

        mediaRecorder.onstop = async () => {
            setMicRecording(false, 'Transcribing…');
            stream.getTracks().forEach(t => t.stop());

            const audioBlob = new Blob(audioChunks, { type: mimeType });
            await transcribeAudio(audioBlob);

            useMediaRecorder = false;
            isRecording = false;
        };

        mediaRecorder.onerror = () => {
            stopRecording();
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
    }

    // ── Send audio to backend for Whisper transcription ────────────
    async function transcribeAudio(audioBlob) {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');

            const baseUrl = 'https://legal-ai-2-tool-1.onrender.com';
            const response = await fetch(`${baseUrl}/api/transcribe`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body:    formData
            });

            if (response.ok) {
                const data = await response.json();
                if (data.text && data.text.trim()) {
                    chatInput.value = data.text.trim();
                    autoResizeInput();
                    setMicRecording(false);
                    setTimeout(() => sendMessage(), 100);
                } else {
                    setMicRecording(false);
                    chatInput.placeholder = 'Could not hear clearly. Try again.';
                    setTimeout(() => chatInput.placeholder = T('Ask about Indian law or your document…', '日本の法律やあなたの文書について質問してください…'), 3000);
                }
            } else {
                // Transcription failed — fallback: show input for manual typing
                setMicRecording(false);
                chatInput.placeholder = 'Voice failed — please type your question';
                setTimeout(() => chatInput.placeholder = T('Ask about Indian law or your document…', '日本の法律やあなたの文書について質問してください…'), 4000);
            }
        } catch (err) {
            console.error('Transcription error:', err);
            setMicRecording(false);
        }
    }

    function stopRecording() {
        isRecording = false;
        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try { mediaRecorder.stop(); } catch {}
        }
        mediaRecorder = null;
        setMicRecording(false);
    }

    function setMicRecording(active, label) {
        if (!micBtn) return;
        if (active) {
            micBtn.classList.add('recording');
            micBtn.innerHTML = '⏹';
            micBtn.title = 'Tap to stop';
            if (label) chatInput.placeholder = label;
        } else {
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '🎤';
            micBtn.title = 'Speak your question';
            chatInput.placeholder = T('Ask about Indian law or your document…', '日本の法律やあなたの文書について質問してください…');
        }
    }

    function showMicStatus(msg) {
        chatInput.placeholder = msg || T('Ask about Indian law or your document…', '日本の法律やあなたの文書について質問してください…');
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

    // ══════════════════════════════════════════════════════════════
    //   DOWNLOAD CHAT AS PDF
    // ══════════════════════════════════════════════════════════════

    async function downloadChatPDF() {
        if (conversationHistory.length === 0) {
            alert(isJapanese() ? '会話履歴がありません。' : 'No conversation to download yet.');
            return;
        }

        const now    = new Date().toLocaleString(getLocale(), { dateStyle: 'long', timeStyle: 'short' });
        const mode   = documentContext
            ? ({ contract: isJapanese() ? '契約書作成' : 'Contract Drafting',
                 research: isJapanese() ? '判例調査'   : 'Case Research',
                 opinion:  isJapanese() ? '法律意見書' : 'Legal Opinion' })[documentContext.mode] || documentContext.mode
            : (isJapanese() ? '一般' : 'General');

        const ja       = isJapanese();
        const fontUrl  = ja
            ? 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap'
            : 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700&display=swap';
        const fontFamily = ja ? "'Noto Sans JP', sans-serif" : "'Crimson Pro', serif";

        // Build HTML rows from conversation history
        const rows = conversationHistory.map(msg => {
            const isUser   = msg.role === 'user';
            const speaker  = isUser ? (ja ? 'あなた' : 'YOU') : 'SAMARTHAA AI';
            const bg       = isUser ? '#f0ebe0' : '#ffffff';
            const label    = isUser ? (ja ? 'ご質問' : 'Question') : (ja ? '回答' : 'Answer');
            const escaped  = msg.content
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/\n/g,'<br>');
            return `
            <div style="margin-bottom:20px;padding:14px 18px;background:${bg};border-radius:8px;border-left:4px solid ${isUser ? '#c9a84c' : '#2c6e49'};">
                <div style="font-size:10px;font-weight:700;color:${isUser ? '#8b6914' : '#2c6e49'};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${speaker} — ${label}</div>
                <div style="font-size:12px;line-height:1.7;color:#2a2a2a;">${escaped}</div>
            </div>`;
        }).join('');

        const disclaimer = ja
            ? '免責事項：このAIが生成した会話は情報提供のみを目的としており、法的アドバイスを構成するものではありません。必ず資格を持つ法律の専門家にご相談ください。'
            : 'Disclaimer: This AI-generated conversation is for informational purposes only and does not constitute legal advice. Always consult a qualified legal professional.';

        const html = `<!DOCTYPE html>
<html lang="${ja ? 'ja' : 'en'}">
<head>
<meta charset="UTF-8">
<title>SAMARTHAA-LEGAL ${ja ? 'チャット記録' : 'Chat Transcript'}</title>
<link rel="stylesheet" href="${fontUrl}">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontFamily}; font-size: 12px; color: #1a1a1a; padding: 40px; background: #fff; }
  .header { text-align: center; border-bottom: 2px solid #c9a84c; padding-bottom: 18px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; color: #2c1a0e; letter-spacing: 0.05em; }
  .header .meta { font-size: 11px; color: #7a6a50; margin-top: 6px; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #d4c9a8; font-size: 9px; color: #999; text-align: center; font-style: italic; }
  @media print {
    body { padding: 20px; }
    @page { margin: 15mm; size: A4; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>⚖️ SAMARTHAA-LEGAL</h1>
  <div class="meta">
    ${ja ? 'モード' : 'Mode'}: ${mode} &nbsp;|&nbsp; ${ja ? '日時' : 'Date'}: ${now}
  </div>
</div>
${rows}
<div class="footer">${disclaimer}</div>
<script>
  // Auto-trigger print dialog once fonts load
  document.fonts.ready.then(() => {
    setTimeout(() => { window.print(); }, 300);
  });
</script>
</body>
</html>`;

        // Open in new tab — browser renders with full Unicode support, user saves as PDF
        const blob   = new Blob([html], { type: 'text/html' });
        const url    = URL.createObjectURL(blob);
        const tab    = window.open(url, '_blank');
        if (!tab) {
            // Popup blocked — fallback: download the HTML file
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `samarthaa-chat-${Date.now()}.html`;
            a.click();
        }

        const btn = document.getElementById('chatDownloadBtn');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓';
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
        }
    }

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

        // Download chat as PDF
        const downloadBtn = document.getElementById('chatDownloadBtn');
        if (downloadBtn) downloadBtn.addEventListener('click', downloadChatPDF);

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
