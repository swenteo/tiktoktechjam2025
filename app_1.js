class PIIGuard {
    constructor() {
        // PII Detection patterns from provided data - improved phone regex
        this.piiPatterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
            ssn: /\b(?!000|666|9\d{2})\d{3}[-.]?(?!00)\d{2}[-.]?(?!0000)\d{4}\b/g,
            creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
            ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
            address: /\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/g
        };

        // Common names from provided data
        this.commonNames = [
            "John Smith", "Sarah Johnson", "Michael Davis", "Emily Chen", "Robert Williams",
            "Lisa Thompson", "David Wilson", "Maria Garcia", "James Brown", "Jennifer Lee",
            "Amanda Rodriguez", "Christopher Taylor", "Michelle Anderson", "Daniel Thomas",
            "Jessica Martinez", "Matthew Jackson", "Ashley White", "Joshua Harris", "Sarah"
        ];

        // Test prompts from provided data
        this.testPrompts = [
            "Hi, I'm John Smith (john.smith@email.com). My SSN is 123-45-6789 and phone is (555) 123-4567. Can you help me write a professional bio?",
            "Contact Sarah Johnson at sarah.j@company.com for the meeting details.",
            "Explain machine learning concepts to a beginner without using any technical jargon."
        ];

        // Risk weights from provided data
        this.riskWeights = {
            EMAIL: 2,
            PHONE: 2,
            SSN: 5,
            CREDIT_CARD: 5,
            PERSON: 1,
            ADDRESS: 3,
            IP_ADDRESS: 3
        };

        // Risk thresholds from provided data
        this.riskThresholds = {
            LOW: { min: 0, max: 3 },
            MEDIUM: { min: 4, max: 7 },
            HIGH: { min: 8, max: 100 }
        };

        // Privacy messages from provided data
        this.privacyMessages = {
            LOW: "✅ Low privacy risk. This text appears safe to send to AI services.",
            MEDIUM: "⚠️ Medium privacy risk. Review detected information before proceeding.",
            HIGH: "🚨 High privacy risk! Avoid sending this to cloud services without redaction."
        };

        this.currentAnalysis = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupListeners());
        } else {
            this.setupListeners();
        }
    }

    setupListeners() {
        // Example buttons
        const exampleButtons = document.querySelectorAll('[data-example]');
        exampleButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const exampleIndex = parseInt(btn.getAttribute('data-example'));
                this.loadExample(exampleIndex);
            });
        });

        // Main action buttons
        const analyzeBtn = document.getElementById('analyzeBtn');
        const redactBtn = document.getElementById('redactBtn');
        const clearBtn = document.getElementById('clearBtn');
        const copyBtn = document.getElementById('copyBtn');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.analyzeText();
            });
        }

        if (redactBtn) {
            redactBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.redactText();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAll();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyToClipboard();
            });
        }

        // Input change handler
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.addEventListener('input', () => this.handleInputChange());
            promptInput.addEventListener('keyup', () => this.handleInputChange());
            promptInput.addEventListener('paste', () => {
                setTimeout(() => this.handleInputChange(), 10);
            });
        }

        // Initialize button states
        this.disableAnalyzeButton();
        this.disableRedactButton();
    }

    loadExample(index) {
        console.log('Loading example:', index);
        
        // Clear all example button styles
        document.querySelectorAll('[data-example]').forEach(btn => {
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--outline');
        });
        
        // Highlight selected button
        const selectedButton = document.querySelector(`[data-example="${index}"]`);
        if (selectedButton) {
            selectedButton.classList.remove('btn--outline');
            selectedButton.classList.add('btn--primary');
        }
        
        // Load example text
        if (index >= 0 && index < this.testPrompts.length) {
            const promptInput = document.getElementById('promptInput');
            if (promptInput) {
                promptInput.value = this.testPrompts[index];
                console.log('Loaded text:', this.testPrompts[index]);
                this.hideResults();
                this.enableAnalyzeButton();
                this.disableRedactButton();
            }
        }
    }

    handleInputChange() {
        const promptInput = document.getElementById('promptInput');
        const input = promptInput ? promptInput.value.trim() : '';
        
        console.log('Input changed:', input.length, 'characters');
        
        if (input) {
            this.enableAnalyzeButton();
        } else {
            this.disableAnalyzeButton();
            this.hideResults();
        }
        
        // Clear example button highlights when typing
        document.querySelectorAll('[data-example]').forEach(btn => {
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--outline');
        });
        
        this.disableRedactButton();
    }

    analyzeText() {
        const inputText = document.getElementById('promptInput').value.trim();
        console.log('Analyzing text:', inputText);
        
        if (!inputText) {
            alert('Please enter some text to analyze.');
            return;
        }

        this.showLoading('analyzeBtn');
        
        // Simulate processing delay for better UX
        setTimeout(() => {
            try {
                const analysis = this.detectPII(inputText);
                console.log('Analysis result:', analysis);
                this.currentAnalysis = analysis;
                this.displayResults(analysis);
                this.hideLoading('analyzeBtn');
                
                // Enable redact button if PII detected
                if (analysis.detectedItems.length > 0) {
                    this.enableRedactButton();
                } else {
                    this.disableRedactButton();
                }
            } catch (error) {
                console.error('Analysis error:', error);
                this.hideLoading('analyzeBtn');
                alert('An error occurred during analysis. Please try again.');
            }
        }, 800);
    }

    detectPII(text) {
        const detectedItems = [];
        let riskScore = 0;

        console.log('Detecting PII in text:', text.substring(0, 50) + '...');

        // Reset regex lastIndex for global patterns
        Object.values(this.piiPatterns).forEach(pattern => {
            if (pattern.global) pattern.lastIndex = 0;
        });

        // Detect emails
        this.piiPatterns.email.lastIndex = 0;
        let match;
        while ((match = this.piiPatterns.email.exec(text)) !== null) {
            detectedItems.push({
                type: 'EMAIL',
                text: match[0],
                position: match.index,
                confidence: 0.95
            });
            riskScore += this.riskWeights.EMAIL;
            console.log('Found email:', match[0]);
        }

        // Detect phone numbers with improved regex
        this.piiPatterns.phone.lastIndex = 0;
        while ((match = this.piiPatterns.phone.exec(text)) !== null) {
            detectedItems.push({
                type: 'PHONE',
                text: match[0],
                position: match.index,
                confidence: 0.92
            });
            riskScore += this.riskWeights.PHONE;
            console.log('Found phone:', match[0]);
        }

        // Additional phone pattern checks for common formats
        const additionalPhonePatterns = [
            /\(\d{3}\)\s*\d{3}-\d{4}/g,  // (555) 123-4567
            /\d{3}-\d{3}-\d{4}/g,        // 555-123-4567
            /\d{3}\.\d{3}\.\d{4}/g,      // 555.123.4567
            /\d{10}/g                     // 5551234567
        ];

        additionalPhonePatterns.forEach(pattern => {
            pattern.lastIndex = 0;
            let phoneMatch;
            while ((phoneMatch = pattern.exec(text)) !== null) {
                // Check if this phone number is already detected
                const alreadyDetected = detectedItems.some(item => 
                    item.type === 'PHONE' && 
                    Math.abs(item.position - phoneMatch.index) < 5
                );
                
                if (!alreadyDetected) {
                    detectedItems.push({
                        type: 'PHONE',
                        text: phoneMatch[0],
                        position: phoneMatch.index,
                        confidence: 0.90
                    });
                    riskScore += this.riskWeights.PHONE;
                    console.log('Found additional phone:', phoneMatch[0]);
                }
            }
        });

        // Detect SSN
        this.piiPatterns.ssn.lastIndex = 0;
        while ((match = this.piiPatterns.ssn.exec(text)) !== null) {
            detectedItems.push({
                type: 'SSN',
                text: match[0],
                position: match.index,
                confidence: 0.98
            });
            riskScore += this.riskWeights.SSN;
            console.log('Found SSN:', match[0]);
        }

        // Detect credit cards
        this.piiPatterns.creditCard.lastIndex = 0;
        while ((match = this.piiPatterns.creditCard.exec(text)) !== null) {
            detectedItems.push({
                type: 'CREDIT_CARD',
                text: match[0],
                position: match.index,
                confidence: 0.96
            });
            riskScore += this.riskWeights.CREDIT_CARD;
            console.log('Found credit card:', match[0]);
        }

        // Detect IP addresses
        this.piiPatterns.ipAddress.lastIndex = 0;
        while ((match = this.piiPatterns.ipAddress.exec(text)) !== null) {
            detectedItems.push({
                type: 'IP_ADDRESS',
                text: match[0],
                position: match.index,
                confidence: 0.90
            });
            riskScore += this.riskWeights.IP_ADDRESS;
            console.log('Found IP address:', match[0]);
        }

        // Detect addresses
        this.piiPatterns.address.lastIndex = 0;
        while ((match = this.piiPatterns.address.exec(text)) !== null) {
            detectedItems.push({
                type: 'ADDRESS',
                text: match[0],
                position: match.index,
                confidence: 0.85
            });
            riskScore += this.riskWeights.ADDRESS;
            console.log('Found address:', match[0]);
        }

        // Detect common names
        this.commonNames.forEach(name => {
            const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            let nameMatch;
            while ((nameMatch = regex.exec(text)) !== null) {
                detectedItems.push({
                    type: 'PERSON',
                    text: nameMatch[0],
                    position: nameMatch.index,
                    confidence: 0.88
                });
                riskScore += this.riskWeights.PERSON;
                console.log('Found name:', nameMatch[0]);
            }
        });

        // Calculate risk level
        const riskLevel = this.calculateRiskLevel(riskScore);
        console.log('Risk score:', riskScore, 'Risk level:', riskLevel);

        return {
            originalText: text,
            detectedItems: detectedItems.sort((a, b) => a.position - b.position),
            riskScore,
            riskLevel,
            recommendations: this.generateRecommendations(detectedItems, riskLevel)
        };
    }

    calculateRiskLevel(score) {
        if (score >= this.riskThresholds.HIGH.min) {
            return 'HIGH';
        } else if (score >= this.riskThresholds.MEDIUM.min) {
            return 'MEDIUM';
        } else {
            return 'LOW';
        }
    }

    generateRecommendations(detectedItems, riskLevel) {
        const recommendations = [];
        const types = [...new Set(detectedItems.map(item => item.type))];

        if (types.includes('SSN')) {
            recommendations.push("Never share Social Security Numbers with AI services");
        }
        if (types.includes('CREDIT_CARD')) {
            recommendations.push("Remove all credit card numbers before sending to any online service");
        }
        if (types.includes('EMAIL')) {
            recommendations.push("Consider using placeholder emails (e.g., 'user@example.com') in your prompts");
        }
        if (types.includes('PHONE')) {
            recommendations.push("Replace phone numbers with generic examples (e.g., '(555) 123-4567')");
        }
        if (types.includes('PERSON')) {
            recommendations.push("Use generic names (e.g., 'John Doe') instead of real names");
        }
        if (types.includes('ADDRESS')) {
            recommendations.push("Replace specific addresses with generic location references");
        }
        if (types.includes('IP_ADDRESS')) {
            recommendations.push("Remove IP addresses or use example IPs (e.g., '192.168.1.1')");
        }

        if (riskLevel === 'HIGH') {
            recommendations.push("Consider rewriting your prompt without any personal information");
        } else if (riskLevel === 'MEDIUM') {
            recommendations.push("Review and redact sensitive information before proceeding");
        }

        if (recommendations.length === 0) {
            recommendations.push("Your text appears safe for AI services - no sensitive information detected");
        }

        return recommendations;
    }

    displayResults(analysis) {
        console.log('Displaying results:', analysis);
        const resultsSection = document.getElementById('resultsSection');
        if (!resultsSection) {
            console.error('Results section not found');
            return;
        }
        
        this.displayRiskIndicator(analysis.riskLevel);
        this.displayDetectedItems(analysis.detectedItems);
        this.displayRecommendations(analysis.recommendations);
        
        resultsSection.classList.remove('hidden');
        
        // Smooth scroll to results
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    displayRiskIndicator(riskLevel) {
        const indicator = document.getElementById('riskIndicator');
        const levelSpan = document.getElementById('riskLevel');
        const messageP = document.getElementById('riskMessage');

        console.log('Displaying risk indicator:', riskLevel);

        if (indicator && levelSpan && messageP) {
            indicator.className = `risk-indicator risk-indicator--${riskLevel.toLowerCase()}`;
            levelSpan.textContent = `${riskLevel} RISK`;
            messageP.textContent = this.privacyMessages[riskLevel];
        } else {
            console.error('Risk indicator elements not found');
        }
    }

    displayDetectedItems(items) {
        const container = document.getElementById('detectedItems');
        if (!container) {
            console.error('Detected items container not found');
            return;
        }
        
        console.log('Displaying detected items:', items);
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-24);">No sensitive information detected! ✅</p>';
            return;
        }

        const itemsHTML = items.map(item => `
            <div class="detection-item">
                <div class="detection-item__info">
                    <span class="detection-item__type">${this.formatPIIType(item.type)}</span>
                    <span class="detection-item__text">${this.escapeHtml(item.text)}</span>
                </div>
                <span class="detection-item__confidence">${Math.round(item.confidence * 100)}% confidence</span>
            </div>
        `).join('');

        container.innerHTML = itemsHTML;
    }

    displayRecommendations(recommendations) {
        const list = document.getElementById('recommendationsList');
        if (!list) {
            console.error('Recommendations list not found');
            return;
        }
        
        console.log('Displaying recommendations:', recommendations);
        const listHTML = recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('');
        list.innerHTML = listHTML;
    }

    redactText() {
        console.log('Redacting text, current analysis:', this.currentAnalysis);
        
        if (!this.currentAnalysis || this.currentAnalysis.detectedItems.length === 0) {
            alert('No sensitive information found to redact!');
            return;
        }

        this.showLoading('redactBtn');

        setTimeout(() => {
            try {
                const cleanedText = this.performRedaction(this.currentAnalysis);
                console.log('Cleaned text:', cleanedText);
                
                const cleanedTextArea = document.getElementById('cleanedText');
                const cleanedSection = document.getElementById('cleanedSection');
                
                if (cleanedTextArea && cleanedSection) {
                    cleanedTextArea.value = cleanedText;
                    cleanedSection.classList.remove('hidden');
                    
                    // Scroll to cleaned section
                    setTimeout(() => {
                        cleanedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else {
                    console.error('Cleaned text elements not found');
                }
                
                this.hideLoading('redactBtn');
            } catch (error) {
                console.error('Redaction error:', error);
                this.hideLoading('redactBtn');
                alert('An error occurred during redaction. Please try again.');
            }
        }, 600);
    }

    performRedaction(analysis) {
        let cleanedText = analysis.originalText;
        
        // Sort items by position in reverse order to avoid position shifts
        const sortedItems = [...analysis.detectedItems].sort((a, b) => b.position - a.position);
        
        console.log('Redacting items:', sortedItems);
        
        sortedItems.forEach(item => {
            const replacement = this.getRedactionReplacement(item.type, item.text);
            cleanedText = cleanedText.substring(0, item.position) + 
                         replacement + 
                         cleanedText.substring(item.position + item.text.length);
        });

        return cleanedText;
    }

    getRedactionReplacement(type, originalText) {
        const replacements = {
            EMAIL: '[EMAIL-REDACTED]',
            PHONE: '[PHONE-REDACTED]',
            SSN: '[SSN-REDACTED]',
            CREDIT_CARD: '[CREDIT-CARD-REDACTED]',
            PERSON: '[NAME-REDACTED]',
            ADDRESS: '[ADDRESS-REDACTED]',
            IP_ADDRESS: '[IP-REDACTED]'
        };

        return replacements[type] || '[REDACTED]';
    }

    copyToClipboard() {
        const cleanedText = document.getElementById('cleanedText');
        if (!cleanedText || !cleanedText.value) {
            alert('No text to copy!');
            return;
        }
        
        console.log('Copying to clipboard:', cleanedText.value.substring(0, 50) + '...');
        
        cleanedText.select();
        cleanedText.setSelectionRange(0, 99999);

        try {
            const success = document.execCommand('copy');
            if (success) {
                this.showCopySuccess();
            } else {
                throw new Error('execCommand failed');
            }
        } catch (err) {
            // Fallback to modern clipboard API
            if (navigator.clipboard) {
                navigator.clipboard.writeText(cleanedText.value).then(() => {
                    this.showCopySuccess();
                }).catch((error) => {
                    console.error('Clipboard API failed:', error);
                    alert('Unable to copy to clipboard. Please copy manually.');
                });
            } else {
                alert('Unable to copy to clipboard. Please copy manually.');
            }
        }
    }

    showCopySuccess() {
        const copyBtn = document.getElementById('copyBtn');
        if (!copyBtn) return;
        
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        copyBtn.classList.add('copy-btn--success');
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copy-btn--success');
        }, 2000);
    }

    clearAll() {
        console.log('Clearing all');
        
        const promptInput = document.getElementById('promptInput');
        if (promptInput) {
            promptInput.value = '';
        }
        
        // Clear example button highlights
        document.querySelectorAll('[data-example]').forEach(btn => {
            btn.classList.remove('btn--primary');
            btn.classList.add('btn--outline');
        });
        
        this.hideResults();
        this.disableAnalyzeButton();
        this.disableRedactButton();
        this.currentAnalysis = null;
    }

    showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.add('btn--loading');
            button.disabled = true;
        }
    }

    hideLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.remove('btn--loading');
            button.disabled = false;
        }
    }

    enableAnalyzeButton() {
        const button = document.getElementById('analyzeBtn');
        if (button) {
            button.disabled = false;
        }
    }

    disableAnalyzeButton() {
        const button = document.getElementById('analyzeBtn');
        if (button) {
            button.disabled = true;
        }
    }

    enableRedactButton() {
        const button = document.getElementById('redactBtn');
        if (button) {
            button.disabled = false;
        }
    }

    disableRedactButton() {
        const button = document.getElementById('redactBtn');
        if (button) {
            button.disabled = true;
        }
    }

    hideResults() {
        const resultsSection = document.getElementById('resultsSection');
        const cleanedSection = document.getElementById('cleanedSection');
        
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
        if (cleanedSection) {
            cleanedSection.classList.add('hidden');
        }
    }

    formatPIIType(type) {
        const typeMap = {
            EMAIL: 'Email',
            PHONE: 'Phone',
            SSN: 'SSN',
            CREDIT_CARD: 'Credit Card',
            PERSON: 'Name',
            ADDRESS: 'Address',
            IP_ADDRESS: 'IP Address'
        };
        return typeMap[type] || type;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing PII Guard');
    const app = new PIIGuard();
    
    // Debug: Make app available globally for testing
    window.piiGuard = app;
});