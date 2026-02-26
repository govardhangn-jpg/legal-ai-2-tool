// config.js - Configuration and Constants

// Make CONFIG global
window.CONFIG = {
    // Current mode
    currentMode: null,

    // API Configuration (for backend proxy)
    API: {
        BACKEND_URL: 'https://legal-ai-2-tool.onrender.com/api/chat',
        HEALTH_CHECK: 'https://legal-ai-2-tool.onrender.com/api/health'
    },

    // Mode titles and descriptions
    MODES: {
        contract: {
            title: '📝 Contract Drafting',
            sectionTitle: 'Contract Details',
            buttonText: 'Generate Contract'
        },
        research: {
            title: '🔍 Case Research',
            sectionTitle: 'Research Query',
            buttonText: 'Research Cases'
        },
        opinion: {
            title: '⚖️ Legal Opinion',
            sectionTitle: 'Legal Opinion Request',
            buttonText: 'Generate Opinion'
        }
    },

    // Contract types
    CONTRACT_TYPES: [
        'Sale Deed',
        'Lease Agreement',
        'Employment Contract',
        'Service Agreement',
        'Partnership Deed',
        'Non-Disclosure Agreement',
        'Memorandum of Understanding',
        'Loan Agreement',
        'License Agreement',
        'Franchise Agreement'
    ],

    JURISDICTIONS: [
        'All Indian Courts',
        'Supreme Court of India',
        'Delhi High Court',
        'Bombay High Court',
        'Madras High Court',
        'Karnataka High Court',
        'Calcutta High Court',
        'Other High Courts'
    ],

    TITLES: {
        contract: {
            section: '📝 Contract Details',
            button: 'Generate Contract',
            result: '📝 Contract Draft'
        },
        research: {
            section: '🔍 Case Research Query',
            button: 'Research Cases',
            result: '🔍 Case Research Results'
        },
        opinion: {
            section: '⚖️ Legal Opinion Request',
            button: 'Generate Opinion',
            result: '⚖️ Legal Opinion'
        }
    },

    MESSAGES: {
        MODE_NOT_SELECTED: 'Please select a legal service mode',
        INCOMPLETE_FORM: {
            contract: 'Please select contract type and provide details',
            research: 'Please provide legal issue and research query',
            opinion: 'Please provide legal matter and detailed query'
        },
        PROCESSING: 'Processing your request...',
        ERROR_PREFIX: 'Error: '
    },

    // Error messages
    ERRORS: {
        NO_MODE: 'Please select a legal service mode first.',
        EMPTY_FIELDS: 'Please fill in all required fields.',
        API_ERROR: 'Error communicating with AI service. Please try again.',
        NETWORK_ERROR: 'Network error. Please check your internet connection and ensure the backend server is running.',
        BACKEND_DOWN: 'Backend server is not running. Please start the backend server first.'
    },

    // Success messages
    SUCCESS: {
        GENERATED: 'Document generated successfully!',
        COPIED: 'Content copied to clipboard!'
    }
};

// Also create const reference for backward compatibility
const CONFIG = window.CONFIG;