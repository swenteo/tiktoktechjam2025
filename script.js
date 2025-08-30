document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const redactBtn = document.getElementById('redactBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsSection = document.getElementById('resultsSection');
    const riskIndicator = document.getElementById('riskIndicator');
    const detectionsList = document.getElementById('detectionsList');
    const recommendationsList = document.getElementById('recommendationsList');
    const cleanedText = document.getElementById('cleanedText');

    // Test prompts for examples
    const testPrompts = [
        "Hi, I'm John Smith (john.smith@email.com). My SSN is 123-45-6789 and phone is (555) 123-4567. Can you help me write a professional bio?",
        "Contact Sarah Johnson at sarah.j@company.com for the meeting details.",
        "Explain machine learning concepts to a beginner without using any technical jargon."
    ];

    // Example button handlers
    const exampleButtons = document.querySelectorAll('[data-example]');
    exampleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const exampleIndex = parseInt(button.getAttribute('data-example'));
            inputText.value = testPrompts[exampleIndex];
        });
    });

    // Main button event listeners
    analyzeBtn.addEventListener('click', () => {
        const text = inputText.value.trim();
        if (!text) {
            alert('Please enter some text to analyze.');
            return;
        }
        analyzeText(text, false);
    });

    redactBtn.addEventListener('click', () => {
        const text = inputText.value.trim();
        if (!text) {
            alert('Please enter some text to redact.');
            return;
        }
        analyzeText(text, true);
    });

    clearBtn.addEventListener('click', () => {
        inputText.value = '';
        resultsSection.style.display = 'none';
        clearResults();
    });

    function clearResults() {
        riskIndicator.textContent = '';
        riskIndicator.className = 'risk-indicator';
        detectionsList.innerHTML = '';
        recommendationsList.innerHTML = '';
        cleanedText.innerHTML = '';
    }

    function analyzeText(text, shouldRedact) {
        // Show loading state
        setLoadingState(true);

        // Simulate API call with client-side processing
        setTimeout(() => {
            try {
                const result = processTextClientSide(text, shouldRedact);
                displayResults(result, shouldRedact);
            } catch (error) {
                alert('An error occurred during analysis. Please try again.');
                console.error('Analysis error:', error);
            } finally {
                setLoadingState(false);
            }
        }, 500); // Small delay to show loading state
    }

    function setLoadingState(isLoading) {
        analyzeBtn.disabled = isLoading;
        redactBtn.disabled = isLoading;

        if (isLoading) {
            analyzeBtn.innerHTML = '🔄 Analyzing...';
        } else {
            analyzeBtn.innerHTML = '🔍 Analyze Privacy Risk';
        }
    }

    function processTextClientSide(text, shouldRedact) {
        // Client-side PII detection patterns
        const patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
            ssn: /\b(?!000|666|9\d{2})\d{3}[-.]?(?!00)\d{2}[-.]?(?!0000)\d{4}\b/g,
            creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
            ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
            address: /\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/g
        };

        const commonNames = [
            "John Smith", "Sarah Johnson", "Michael Davis", "Emily Chen", "Robert Williams",
            "Lisa Thompson", "David Wilson", "Maria Garcia", "James Brown", "Jennifer Lee",
            "Amanda Rodriguez", "Christopher Taylor", "Michelle Anderson", "Daniel Thomas",
            "Jessica Martinez", "Matthew Jackson", "Ashley White", "Joshua Harris", "Sarah"
        ];

        const riskWeights = {
            EMAIL: 2,
            PHONE: 2,
            SSN: 5,
            CREDIT_CARD: 5,
            PERSON: 1,
            ADDRESS: 3,
            IP_ADDRESS: 3
        };

        let detections = [];
        let redactedText = text;

        // Detect PII using patterns
        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                detections.push({
                    entity_type: type.toUpperCase(),
                    entity_text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.95
                });
            }
        }

        // Detect common names
        for (const name of commonNames) {
            const index = text.indexOf(name);
            if (index !== -1) {
                detections.push({
                    entity_type: 'PERSON',
                    entity_text: name,
                    start: index,
                    end: index + name.length,
                    confidence: 0.90
                });
            }
        }

        // Remove duplicates and sort by position
        detections = detections
            .filter((detection, index, self) => 
                index === self.findIndex(d => d.start === detection.start && d.end === detection.end)
            )
            .sort((a, b) => a.start - b.start);

        // Calculate risk
        const totalRisk = detections.reduce((sum, detection) => {
            return sum + (riskWeights[detection.entity_type] || 1);
        }, 0);

        let riskLevel;
        if (totalRisk >= 8 || detections.length >= 5) {
            riskLevel = 'HIGH';
        } else if (totalRisk >= 4 || detections.length >= 3) {
            riskLevel = 'MEDIUM';
        } else {
            riskLevel = 'LOW';
        }

        // Redact text if requested
        if (shouldRedact && detections.length > 0) {
            const sortedDetections = [...detections].sort((a, b) => b.start - a.start);
            for (const detection of sortedDetections) {
                redactedText = redactedText.substring(0, detection.start) + 
                              '[REDACTED]' + 
                              redactedText.substring(detection.end);
            }
        }

        const riskMessages = {
            LOW: "✅ Low privacy risk. This text appears safe to send to AI services.",
            MEDIUM: "⚠️ Medium privacy risk. Review detected information before proceeding.",
            HIGH: "🚨 High privacy risk! Avoid sending this to cloud services without redaction."
        };

        return {
            original_text: text,
            redacted_text: redactedText,
            detections: detections,
            risk_analysis: {
                risk_level: riskLevel,
                risk_score: totalRisk,
                pii_count: detections.length,
                detected_types: [...new Set(detections.map(d => d.entity_type))],
                message: riskMessages[riskLevel]
            },
            recommendations: getRecommendations(riskLevel)
        };
    }

    function getRecommendations(riskLevel) {
        const recommendations = [];

        if (riskLevel === 'HIGH') {
            recommendations.push(
                "🚨 High privacy risk detected! Avoid sending this prompt to cloud services.",
                "Consider removing or replacing sensitive information before proceeding.",
                "Use our automatic redaction feature to clean the text."
            );
        } else if (riskLevel === 'MEDIUM') {
            recommendations.push(
                "⚠️ Medium privacy risk. Review detected PII before sending.",
                "Consider if the detected information is necessary for your query.",
                "You may proceed with caution or use redaction."
            );
        } else {
            recommendations.push("✅ Low privacy risk. This text appears safe to send.");
        }

        return recommendations;
    }

    function displayResults(data, isRedacted) {
        resultsSection.style.display = 'block';

        // Display risk indicator
        const riskLevel = data.risk_analysis.risk_level.toLowerCase();
        riskIndicator.className = `risk-indicator risk-${riskLevel}`;
        riskIndicator.textContent = `${data.risk_analysis.message} (Score: ${data.risk_analysis.risk_score})`;

        // Display detections
        if (data.detections && data.detections.length > 0) {
            detectionsList.innerHTML = '<h3>Detected PII:</h3>';
            data.detections.forEach(detection => {
                const item = document.createElement('div');
                item.className = 'detection-item';
                item.innerHTML = `
                    <strong>${detection.entity_type}</strong>: "${detection.entity_text}" 
                    <span style="color: #666; font-size: 0.9em;">(Confidence: ${Math.round(detection.confidence * 100)}%)</span>
                `;
                detectionsList.appendChild(item);
            });
        } else {
            detectionsList.innerHTML = '<h3>No PII detected ✅</h3>';
        }

        // Display recommendations
        if (data.recommendations && data.recommendations.length > 0) {
            recommendationsList.innerHTML = '<h3>Privacy Recommendations:</h3><ul>';
            data.recommendations.forEach(rec => {
                recommendationsList.innerHTML += `<li>${rec}</li>`;
            });
            recommendationsList.innerHTML += '</ul>';
        }

        // Display cleaned text if redaction was performed
        if (isRedacted && data.redacted_text !== data.original_text) {
            cleanedText.innerHTML = `
                <h3>Cleaned Text (Safe to send):</h3>
                <div style="background: rgba(240,240,240,0.5); padding: 16px; border-radius: 8px; margin: 12px 0; white-space: pre-wrap; border: 1px solid #ddd;">${data.redacted_text}</div>
                <button onclick="copyToClipboard('${escapeQuotes(data.redacted_text)}')" style="background: var(--color-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">📋 Copy Cleaned Text</button>
            `;
        } else if (isRedacted) {
            cleanedText.innerHTML = '<h3>✅ No PII found - Original text is safe to send!</h3>';
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    function escapeQuotes(text) {
        return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.textContent = 'Text copied to clipboard!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-success);
            color: #2d5a2d;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('Could not copy text to clipboard. Please copy manually.');
    });
}

// CSS animation for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
