"""
PII Guard Web Application
Flask-based web interface for PII detection and redaction
"""

from flask import Flask, render_template, request, jsonify
from pii_detector import PIIDetector
import json

app = Flask(__name__)
detector = PIIDetector()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/detect', methods=['POST'])
def detect_pii_api():
    """API endpoint for PII detection with redaction."""
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        redacted_text, detections = detector.redact_pii(text)
        risk_analysis = detector.analyze_privacy_risk(detections)

        return jsonify({
            'original_text': text,
            'redacted_text': redacted_text,
            'detections': detections,
            'risk_analysis': risk_analysis,
            'safe_to_send': risk_analysis['risk_level'] in ['LOW', 'MEDIUM'],
            'recommendations': get_privacy_recommendations(risk_analysis)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    """API endpoint for PII analysis without redaction."""
    try:
        data = request.get_json()
        text = data.get('text', '')

        detections = detector.detect_all_pii(text)
        risk_analysis = detector.analyze_privacy_risk(detections)

        return jsonify({
            'detections': detections,
            'risk_analysis': risk_analysis,
            'recommendations': get_privacy_recommendations(risk_analysis)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_privacy_recommendations(risk_analysis):
    """Generate privacy recommendations based on risk analysis."""
    recommendations = []

    if risk_analysis['risk_level'] == 'HIGH':
        recommendations.extend([
            "🚨 High privacy risk detected! Avoid sending this prompt to cloud services.",
            "Consider removing or replacing sensitive information before proceeding.",
            "Use our automatic redaction feature to clean the text."
        ])
    elif risk_analysis['risk_level'] == 'MEDIUM':
        recommendations.extend([
            "⚠️ Medium privacy risk. Review detected PII before sending.",
            "Consider if the detected information is necessary for your query.",
            "You may proceed with caution or use redaction."
        ])
    else:
        recommendations.append("✅ Low privacy risk. This text appears safe to send.")

    return recommendations

if __name__ == '__main__':
    app.run(debug=True, port=5000)
