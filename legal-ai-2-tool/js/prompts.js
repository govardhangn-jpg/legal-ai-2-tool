// prompts.js - Legal Prompt Templates

const PromptBuilder = {
    /**
     * Build prompt for contract drafting
     */
    /* buildContractPrompt(type, details) {
        return `You are an expert Indian legal professional specializing in contract drafting. Draft a comprehensive ${type} according to Indian law.

Contract Details:
${details}

Requirements:
1. Use formal legal language appropriate for Indian courts
2. Include all standard clauses relevant to this contract type under Indian law
3. Reference applicable Indian statutes (Indian Contract Act 1872, Transfer of Property Act 1882, etc.)
4. Include proper execution clauses with witness requirements
5. Add jurisdiction and dispute resolution clauses suitable for Indian courts
6. Ensure compliance with Indian stamp duty and registration requirements where applicable
7. Format properly with clear sections and subsections
8. Include appropriate schedules/annexures if needed

Generate a complete, professional contract draft that is ready for lawyer review and customization.`;
    },
*/
    /**
     * Build prompt for case research
     */
/*    buildResearchPrompt(issue, query, jurisdiction) {
        return `You are an expert Indian legal researcher. Conduct comprehensive case law research on the following matter.

Legal Issue: ${issue}

Research Query:
${query}

Preferred Jurisdiction: ${jurisdiction}

Please provide:
1. **Relevant Case Law**: List landmark and recent cases with citations (Party Names, Citation, Court, Year)
2. **Legal Principles**: Key principles established by these cases
3. **Statutory Provisions**: Applicable sections of relevant acts
4. **Analysis**: How these cases apply to the query
5. **Current Legal Position**: What is the prevailing view
6. **Practical Application**: How courts typically rule on such matters

Focus on authoritative Indian Supreme Court and High Court judgments. Include both landmark precedents and recent decisions. Provide case citations in standard Indian format.`;
    },

*/
    /**
     * Build prompt for legal opinion
     */
/*
    buildOpinionPrompt(topic, query, laws) {
        const lawsSection = laws ? `\n\nApplicable Laws Mentioned: ${laws}` : '';
        
        return `You are a senior Indian advocate providing a detailed legal opinion. Analyze the following matter comprehensively.

Legal Matter: ${topic}

Facts and Query:
${query}${lawsSection}

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

Format this as a formal legal opinion suitable for client delivery. Be thorough, balanced, and cite relevant legal authorities.`;
    },
*/
    /**
     * Sanitize user input to prevent injection
     */
    sanitizeInput(input) {
        if (!input) return '';
        return input
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '');
    },

    /**
     * Validate inputs for a given mode
     */
    validateInputs(mode, inputs) {
        switch(mode) {
            case 'contract':
                return inputs.type && inputs.details;
            case 'research':
                return inputs.issue && inputs.query;
            case 'opinion':
                return inputs.topic && inputs.query;
            default:
                return false;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptBuilder;
}
