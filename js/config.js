// config.js - Configuration and Constants
// SAMARTHAA-LEGAL — Bilingual: English (India) + Japanese (Japan)

window.CONFIG = {
    currentMode: null,
    APP_NAME: 'SAMARTHAA-LEGAL',

    // API Configuration (backend proxy)
    API: {
        BACKEND_URL:  'https://legal-ai-2-tool-1.onrender.com/api/chat',
        HEALTH_CHECK: 'https://legal-ai-2-tool-1.onrender.com/api/health'
    },

    // ── Locale helpers ────────────────────────────────────────────
    getLocale() {
        return localStorage.getItem('samarthaa_locale') || 'en-IN';
    },
    setLocale(locale) {
        localStorage.setItem('samarthaa_locale', locale);
    },
    isJapanese() {
        return this.getLocale() === 'ja-JP';
    },

    // ── Translations ──────────────────────────────────────────────
    I18N: {
        'en-IN': {
            appSubtitle:   'Contract Drafting • Case Research • Legal Opinions',
            howToTitle:    '📋 How to Use',
            howTo: [
                '<strong>Contract Drafting:</strong> Select contract type and fill in key terms — tap 🎤 to speak any field.',
                '<strong>Case Research:</strong> Enter legal issue and context — voice input on every field.',
                '<strong>Legal Opinion:</strong> Describe your matter, type or speak, then 🔊 listen to the result via ElevenLabs.'
            ],
            selectService: 'Select Legal Service',
            modes: {
                contract: { title: '📝 Contract Drafting',  desc: 'Generate sale deeds, lease agreements, NDAs, employment contracts and more. Voice input enabled.' },
                research: { title: '🔍 Case Research',      desc: 'Research Indian case law and precedents. Speak your query hands-free and get results read aloud.' },
                opinion:  { title: '⚖️ Legal Opinion',      desc: 'Detailed legal opinions with full voice interaction — speak your facts, listen to the analysis.' }
            },
            contractTypeLabel:    'Contract Type',
            contractTypePlaceholder: 'Select Contract Type',
            contractDetailsLabel: 'Contract Details & Key Terms',
            contractDetailsPlaceholder: 'Parties, obligations, payment terms, duration — or tap mic',
            legalIssueLabel:      'Legal Issue / Topic',
            legalIssuePlaceholder:'e.g., Anticipatory Bail under Section 438 CrPC',
            researchQueryLabel:   'Research Query & Context',
            researchQueryPlaceholder: 'Describe the legal issue and context...',
            jurisdictionLabel:    'Preferred Jurisdiction',
            opinionTopicLabel:    'Legal Matter / Question',
            opinionTopicPlaceholder: 'e.g., Enforceability of Oral Agreement for Property Sale',
            opinionQueryLabel:    'Detailed Query & Facts',
            opinionQueryPlaceholder: 'Provide comprehensive details, or tap mic to speak your facts...',
            applicableLawsLabel:  'Applicable Laws (if known)',
            applicableLawsPlaceholder: 'e.g., Transfer of Property Act 1882, Indian Contract Act 1872',
            generateBtn:   'Generate Legal Document',
            clearBtn:      'Clear Form',
            processing:    'Processing your request…',
            readAloud:     '🔊 Read Aloud',
            stopReading:   '⏹ Stop Reading',
            copyBtn:       '📋 Copy',
            wordBtn:       '📥 Word',
            pdfBtn:        '📥 PDF',
            resultTitle:   'Generated Result',
            disclaimer:    '<strong>Disclaimer:</strong> This AI tool provides general legal information and drafts. Always consult a qualified legal professional before acting on any AI-generated content. Not a substitute for professional legal advice.',
            TITLES: {
                contract: { section: '📝 Contract Details',      button: 'Generate Contract', result: '📝 Contract Draft'          },
                research: { section: '🔍 Case Research Query',   button: 'Research Cases',    result: '🔍 Case Research Results'   },
                opinion:  { section: '⚖️ Legal Opinion Request', button: 'Generate Opinion',  result: '⚖️ Legal Opinion'           }
            },
            MESSAGES: {
                MODE_NOT_SELECTED: 'Please select a legal service mode',
                INCOMPLETE_FORM: {
                    contract: 'Please select contract type and provide details',
                    research: 'Please provide legal issue and research query',
                    opinion:  'Please provide legal matter and detailed query'
                },
                ERROR_PREFIX: 'Error: '
            },
            contractTypes: [
                'Sale Deed', 'Lease Agreement', 'Employment Contract',
                'Service Agreement', 'Partnership Deed',
                'Non-Disclosure Agreement (NDA)', 'Memorandum of Understanding (MOU)',
                'Loan Agreement', 'License Agreement', 'Franchise Agreement', 'Other'
            ],
            jurisdictions: [
                'All Indian Courts', 'Supreme Court of India', 'Delhi High Court',
                'Bombay High Court', 'Madras High Court', 'Karnataka High Court',
                'Calcutta High Court', 'Other High Courts'
            ],
            chatPlaceholder:   'Ask about Indian law or your document…',
            chatSubtitle:      'Indian Legal AI • Voice & Text',
            loginTitle:        '🔐 Login Required',
            loginEmailPh:      'Email',
            loginPasswordPh:   'Password',
            loginBtn:          'Login',
            countryLabel:      'Country / Jurisdiction',
            speakBtn:          '🎤 Speak',
            stopBtn:           '⏹ Stop'
        },

        'ja-JP': {
            appSubtitle:   '契約書作成 • 判例調査 • 法律意見書',
            howToTitle:    '📋 使い方',
            howTo: [
                '<strong>契約書作成：</strong>契約の種類を選択し、主な条件を入力してください。🎤 をタップして音声入力も可能です。',
                '<strong>判例調査：</strong>法的問題と背景を入力してください。各フィールドで音声入力が使えます。',
                '<strong>法律意見書：</strong>案件の詳細を入力するか音声で話し、🔊 でElevenLabsによる読み上げをお聞きください。'
            ],
            selectService: '法律サービスを選択',
            modes: {
                contract: { title: '📝 契約書作成',   desc: '売買契約書、賃貸借契約書、NDA、雇用契約書などを作成します。音声入力対応。' },
                research: { title: '🔍 判例調査',    desc: '日本の判例・先例を調査します。ハンズフリーで質問でき、結果を読み上げます。' },
                opinion:  { title: '⚖️ 法律意見書',  desc: '音声によるフル対話で詳細な法律意見書を作成します。事実を話し、分析を聞いてください。' }
            },
            contractTypeLabel:    '契約の種類',
            contractTypePlaceholder: '契約の種類を選択',
            contractDetailsLabel: '契約の詳細・主要条件',
            contractDetailsPlaceholder: '当事者、義務、支払条件、期間など — またはマイクをタップ',
            legalIssueLabel:      '法的問題 / テーマ',
            legalIssuePlaceholder:'例：刑事訴訟法における保釈申請',
            researchQueryLabel:   '調査クエリ・背景',
            researchQueryPlaceholder: '法的問題と背景を詳しく記載してください...',
            jurisdictionLabel:    '管轄裁判所',
            opinionTopicLabel:    '法的事項 / 質問',
            opinionTopicPlaceholder: '例：口頭による不動産売買契約の法的拘束力',
            opinionQueryLabel:    '詳細なクエリ・事実関係',
            opinionQueryPlaceholder: '詳細をご記入ください。またはマイクをタップして事実を話してください...',
            applicableLawsLabel:  '適用法令（わかる場合）',
            applicableLawsPlaceholder: '例：民法、借地借家法、労働基準法',
            generateBtn:   '法的文書を生成',
            clearBtn:      'フォームをクリア',
            processing:    'リクエストを処理中…',
            readAloud:     '🔊 読み上げ',
            stopReading:   '⏹ 停止',
            copyBtn:       '📋 コピー',
            wordBtn:       '📥 Word',
            pdfBtn:        '📥 PDF',
            resultTitle:   '生成結果',
            disclaimer:    '<strong>免責事項：</strong>このAIツールは一般的な法的情報と草案を提供します。AIが生成したコンテンツに基づいて行動する前に、必ず資格を持つ法律の専門家に相談してください。専門的な法的アドバイスの代替ではありません。',
            TITLES: {
                contract: { section: '📝 契約の詳細',    button: '契約書を生成',   result: '📝 契約書草案'    },
                research: { section: '🔍 判例調査クエリ', button: '判例を調査',     result: '🔍 判例調査結果'  },
                opinion:  { section: '⚖️ 法律意見書依頼', button: '意見書を生成',   result: '⚖️ 法律意見書'   }
            },
            MESSAGES: {
                MODE_NOT_SELECTED: '法律サービスのモードを選択してください',
                INCOMPLETE_FORM: {
                    contract: '契約の種類を選択し、詳細を入力してください',
                    research: '法的問題と調査クエリを入力してください',
                    opinion:  '法的事項と詳細なクエリを入力してください'
                },
                ERROR_PREFIX: 'エラー: '
            },
            contractTypes: [
                '売買契約書', '賃貸借契約書', '雇用契約書', '業務委託契約書',
                '組合契約書', '秘密保持契約書（NDA）', '基本合意書（MOU）',
                '金銭消費貸借契約書', 'ライセンス契約書', 'フランチャイズ契約書', 'その他'
            ],
            jurisdictions: [
                '全裁判所', '最高裁判所', '東京高等裁判所', '大阪高等裁判所',
                '名古屋高等裁判所', '福岡高等裁判所', '地方裁判所', 'その他'
            ],
            chatPlaceholder:   '日本の法律やあなたの文書について質問してください…',
            chatSubtitle:      '日本法律AI • 音声 & テキスト',
            loginTitle:        '🔐 ログインが必要です',
            loginEmailPh:      'メールアドレス',
            loginPasswordPh:   'パスワード',
            loginBtn:          'ログイン',
            countryLabel:      '国 / 管轄',
            speakBtn:          '🎤 話す',
            stopBtn:           '⏹ 停止'
        }
    },

    // ── Convenience getter ────────────────────────────────────────
    t() {
        return this.I18N[this.getLocale()] || this.I18N['en-IN'];
    },

    TITLES: {},   // dynamically set by applyLocale()
    MESSAGES: {}, // dynamically set by applyLocale()

    // Apply current locale to CONFIG.TITLES and CONFIG.MESSAGES
    applyLocale() {
        const tr = this.t();
        this.TITLES   = tr.TITLES;
        this.MESSAGES = tr.MESSAGES;
    }
};

// Initialise on load
window.CONFIG.applyLocale();
const CONFIG = window.CONFIG;
