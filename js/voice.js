// voice.js — Full Two-Way Voice for SAMARTHAA-LEGAL (All Modules)
// ─────────────────────────────────────────────────────────────────
// INPUT  : Web Speech API SpeechRecognition  →  fills any textarea/input
// OUTPUT : ElevenLabs TTS via backend /api/tts  →  streams audio
// ─────────────────────────────────────────────────────────────────

const Voice = (() => {

    // ── State ──────────────────────────────────────────────────────
    let recognition      = null;
    let isRecording      = false;
    let currentMode      = null;   // 'contract' | 'research' | 'opinion'
    let activeTargetEl   = null;   // textarea/input being filled right now

    let audioContext     = null;
    let audioSource      = null;
    let isPlaying        = false;
    let ttsAbortCtrl     = null;   // AbortController for in-flight TTS fetch

    // ── DOM ID maps per mode ───────────────────────────────────────
    // Each mode may have multiple mic targets (one per field)
    const MODE_MIC_TARGETS = {
        contract: [
            { btnId: 'micContractDetails', targetId: 'contractDetails',  label: 'Contract Details' }
        ],
        research: [
            { btnId: 'micLegalIssue',   targetId: 'legalIssue',   label: 'Legal Issue' },
            { btnId: 'micResearchQuery', targetId: 'researchQuery', label: 'Research Query' }
        ],
        opinion: [
            { btnId: 'micOpinionTopic', targetId: 'opinionTopic', label: 'Legal Matter' },
            { btnId: 'micOpinionQuery', targetId: 'opinionQuery', label: 'Query & Facts' }
        ]
    };

    // ── Browser support ────────────────────────────────────────────
    const hasSpeechRecognition =
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // ══════════════════════════════════════════════════════════════
    //   SPEECH-TO-TEXT  (mic → field)
    // ══════════════════════════════════════════════════════════════

    function buildRecognition(targetEl, statusEl, micBtn) {
        const SR   = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec  = new SR();
        rec.lang           = 'en-IN';
        rec.continuous     = true;
        rec.interimResults = true;

        let finalText = targetEl.value || '';

        rec.onstart = () => {
            isRecording   = true;
            activeTargetEl = targetEl;
            setMicBtnUI(micBtn, true);
            setStatus(statusEl, '🔴 Recording… speak now', true);
        };

        rec.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += (finalText ? ' ' : '') + t;
                } else {
                    interim += t;
                }
            }
            targetEl.value = finalText + (interim ? ' ' + interim : '');
        };

        rec.onerror = (event) => {
            const msgs = {
                'no-speech'    : 'No speech detected.',
                'not-allowed'  : 'Microphone access denied.',
                'audio-capture': 'No microphone found.',
                'network'      : 'Network error.',
                'aborted'      : 'Recording cancelled.'
            };
            setStatus(statusEl, msgs[event.error] || `Error: ${event.error}`, false);
            stopRecording(micBtn, statusEl);
        };

        rec.onend = () => {
            if (isRecording && recognition === rec) {
                try { rec.start(); } catch { stopRecording(micBtn, statusEl); }
            }
        };

        return rec;
    }

    function startRecording(targetId, micBtn, statusEl) {
        if (!hasSpeechRecognition) {
            alert('Voice input requires Chrome or Edge browser.');
            return;
        }

        // If already recording, toggle off
        if (isRecording) {
            stopRecording(micBtn, statusEl);
            return;
        }

        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                recognition = buildRecognition(targetEl, statusEl, micBtn);
                try { recognition.start(); }
                catch (e) { console.error('Recognition start failed:', e); }
            })
            .catch(() => {
                setStatus(statusEl, 'Microphone access denied. Please allow mic in your browser.', false);
            });
    }

    function stopRecording(micBtn, statusEl) {
        isRecording    = false;
        activeTargetEl = null;

        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }

        if (micBtn) setMicBtnUI(micBtn, false);
        if (statusEl) setStatus(statusEl, 'Recording stopped.', false);
    }

    function setMicBtnUI(btn, active) {
        if (!btn) return;
        if (active) {
            btn.textContent = '⏹ Stop';
            btn.classList.add('recording');
        } else {
            btn.textContent = '🎤 Speak';
            btn.classList.remove('recording');
        }
    }

    function setStatus(el, msg, active) {
        if (!el) return;
        el.textContent = msg;
        el.className   = 'voice-status' + (active ? ' active' : '');
    }

    // ══════════════════════════════════════════════════════════════
    //   TEXT-TO-SPEECH via ElevenLabs (backend proxy)
    // ══════════════════════════════════════════════════════════════

    async function readAloud(text) {
        if (!text || !text.trim()) return;

        // Toggle off if already playing
        if (isPlaying) { stopSpeaking(); return; }

        const token = localStorage.getItem('token');
        if (!token) { alert('Please log in first.'); return; }

        const baseBackend = (window.CONFIG?.API?.BACKEND_URL || 'https://legal-ai-2-tool.onrender.com/api/chat');
        const ttsUrl = baseBackend.replace('/api/chat', '/api/tts');

        setReadAloudUI(true);

        try {
            ttsAbortCtrl = new AbortController();

            const response = await fetch(ttsUrl, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body:   JSON.stringify({ text: text.trim() }),
                signal: ttsAbortCtrl.signal
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `TTS error ${response.status}`);
            }

            // Decode the streamed audio/mpeg via Web Audio API
            const arrayBuffer = await response.arrayBuffer();

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const decoded = await audioContext.decodeAudioData(arrayBuffer);

            audioSource          = audioContext.createBufferSource();
            audioSource.buffer   = decoded;
            audioSource.connect(audioContext.destination);

            audioSource.onended = () => finishSpeaking();
            audioSource.start(0);
            isPlaying = true;

        } catch (err) {
            if (err.name === 'AbortError') return; // user cancelled — silent
            console.error('TTS error:', err);
            // Graceful fallback to browser TTS
            fallbackTTS(text);
        }
    }

    function stopSpeaking() {
        ttsAbortCtrl && ttsAbortCtrl.abort();
        if (audioSource) {
            try { audioSource.stop(); } catch {}
            audioSource = null;
        }
        if (audioContext) {
            try { audioContext.close(); } catch {}
            audioContext = null;
        }
        window.speechSynthesis && window.speechSynthesis.cancel();
        finishSpeaking();
    }

    function finishSpeaking() {
        isPlaying    = false;
        ttsAbortCtrl = null;
        setReadAloudUI(false);
    }

    // Browser TTS fallback (if ElevenLabs fails or key not set)
    function fallbackTTS(text) {
        if (!window.speechSynthesis) { finishSpeaking(); return; }

        const words  = text.trim().split(/\s+/);
        const chunks = [];
        for (let i = 0; i < words.length; i += 180)
            chunks.push(words.slice(i, i + 180).join(' '));

        let idx = 0;

        function next() {
            if (!isPlaying || idx >= chunks.length) { finishSpeaking(); return; }
            const u    = new SpeechSynthesisUtterance(chunks[idx]);
            u.lang     = 'en-IN';
            u.rate     = 0.9;
            u.onend    = () => { idx++; next(); };
            u.onerror  = () => finishSpeaking();
            window.speechSynthesis.speak(u);
        }

        isPlaying = true;
        next();
    }

    function setReadAloudUI(playing) {
        // Update ALL read-aloud buttons (only one shows at a time per result)
        const btn  = document.getElementById('btnReadAloud');
        const ind  = document.getElementById('speakingIndicator');

        if (!btn) return;
        if (playing) {
            btn.textContent = '⏹ Stop Reading';
            btn.classList.add('stop-mode');
            if (ind) ind.style.display = 'block';
        } else {
            btn.textContent = '🔊 Read Aloud';
            btn.classList.remove('stop-mode');
            if (ind) ind.style.display = 'none';
        }
    }

    // ══════════════════════════════════════════════════════════════
    //   VOICE PANEL — rendered per mode
    // ══════════════════════════════════════════════════════════════

    /**
     * Show the correct voice input panel for the active mode.
     * Called by UI.selectMode().
     */
    function onModeChange(mode) {
        currentMode = mode;

        // Stop anything in progress
        stopRecording(null, null);
        stopSpeaking();
        hideReadAloud();

        // Hide all panels, show only the active one
        document.querySelectorAll('.voice-panel').forEach(p => p.classList.remove('visible'));

        const panel = document.getElementById(`voicePanel_${mode}`);
        if (panel) panel.classList.add('visible');
    }

    function showReadAloud() {
        const btn = document.getElementById('btnReadAloud');
        if (btn) btn.classList.add('visible');
    }

    function hideReadAloud() {
        const btn = document.getElementById('btnReadAloud');
        if (btn) {
            btn.classList.remove('visible');
            stopSpeaking();
        }
    }

    // ── Wire up mic buttons for a mode ─────────────────────────────
    function wireModeMicButtons(mode) {
        const targets = MODE_MIC_TARGETS[mode] || [];

        targets.forEach(({ btnId, targetId, label }) => {
            const btn      = document.getElementById(btnId);
            const statusEl = document.getElementById(`${btnId}_status`);

            if (!btn) return;

            if (!hasSpeechRecognition) {
                btn.textContent = '🎤 (unsupported)';
                btn.disabled    = true;
                btn.title       = 'Use Chrome or Edge for voice input';
                return;
            }

            btn.addEventListener('click', () => {
                // If another mic is recording, stop it first
                if (isRecording && activeTargetEl !== document.getElementById(targetId)) {
                    stopRecording(null, null);
                    // find all mic buttons and reset them
                    document.querySelectorAll('.btn-mic').forEach(b => setMicBtnUI(b, false));
                }
                startRecording(targetId, btn, statusEl);
            });
        });
    }

    // ── Init ───────────────────────────────────────────────────────
    function init() {
        // Wire mic buttons for all modes
        ['contract', 'research', 'opinion'].forEach(wireModeMicButtons);

        // Read Aloud button
        const btnReadAloud = document.getElementById('btnReadAloud');
        if (btnReadAloud) {
            btnReadAloud.addEventListener('click', () => {
                const content = document.getElementById('resultContent');
                if (content) readAloud(content.textContent);
            });
        }

        // Stop everything on page unload
        window.addEventListener('beforeunload', () => {
            stopRecording(null, null);
            stopSpeaking();
        });
    }

    return {
        init,
        onModeChange,
        showReadAloud,
        hideReadAloud,
        stopSpeaking,
        stopRecording: () => stopRecording(null, null)
    };

})();

document.addEventListener('DOMContentLoaded', () => Voice.init());
window.Voice = Voice;
