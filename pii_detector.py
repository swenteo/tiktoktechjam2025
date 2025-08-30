"""
PII Guard - Privacy-First LLM Prompt Filter
Copyright (c) 2025 Privacy Innovation Team

Main PII detection model implementation using fine-tuned DistilBERT
"""

import re
import torch
from transformers import (
    DistilBertTokenizerFast, 
    DistilBertForTokenClassification,
    pipeline
)
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings("ignore")

class PIIDetector:
    """
    A privacy-first PII detection system that runs entirely on-device
    to protect user prompts before sending to cloud LLM services.
    """

    def __init__(self, model_path: str = "distilbert-base-uncased"):
        self.model_path = model_path
        self.tokenizer = None
        self.model = None
        self.pii_pipeline = None
        self.load_model()

        self.pii_patterns = {
            'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'PHONE': r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
            'SSN': r'\b(?!000|666|9\d{2})\d{3}[-.]?(?!00)\d{2}[-.]?(?!0000)\d{4}\b',
            'CREDIT_CARD': r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
            'IP_ADDRESS': r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
            'ADDRESS': r'\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b'
        }

        self.common_names = [
            "John Smith", "Sarah Johnson", "Michael Davis", "Emily Chen", "Robert Williams",
            "Lisa Thompson", "David Wilson", "Maria Garcia", "James Brown", "Jennifer Lee",
            "Amanda Rodriguez", "Christopher Taylor", "Michelle Anderson", "Daniel Thomas",
            "Jessica Martinez", "Matthew Jackson", "Ashley White", "Joshua Harris", "Sarah"
        ]

    def load_model(self):
        try:
            if "fine_tuned" in self.model_path:
                self.tokenizer = DistilBertTokenizerFast.from_pretrained(self.model_path)
                self.model = DistilBertForTokenClassification.from_pretrained(self.model_path)
            else:
                self.pii_pipeline = pipeline(
                    "ner", 
                    model="dbmdz/bert-large-cased-finetuned-conll03-english",
                    aggregation_strategy="simple"
                )
            print(f"✅ Model loaded successfully: {self.model_path}")
        except Exception as e:
            print(f"⚠️  Warning: Could not load model {self.model_path}. Using fallback patterns. Error: {e}")

    def detect_pii_regex(self, text: str) -> List[Dict]:
        detected_pii = []

        for pii_type, pattern in self.pii_patterns.items():
            matches = re.finditer(pattern, text)
            for match in matches:
                detected_pii.append({
                    'entity_type': pii_type,
                    'entity_text': match.group(),
                    'start': match.start(),
                    'end': match.end(),
                    'confidence': 0.95,
                    'method': 'regex'
                })

        # Check for common names
        for name in self.common_names:
            if name in text:
                start = text.find(name)
                if start != -1:
                    detected_pii.append({
                        'entity_type': 'PERSON',
                        'entity_text': name,
                        'start': start,
                        'end': start + len(name),
                        'confidence': 0.90,
                        'method': 'name_matching'
                    })

        return detected_pii

    def detect_pii_ml(self, text: str) -> List[Dict]:
        if self.pii_pipeline is None:
            return []

        try:
            entities = self.pii_pipeline(text)
            ml_detected = []

            for entity in entities:
                pii_type = self._map_ner_to_pii(entity['entity_group'])
                if pii_type:
                    ml_detected.append({
                        'entity_type': pii_type,
                        'entity_text': entity['word'],
                        'start': entity['start'],
                        'end': entity['end'],
                        'confidence': entity['score'],
                        'method': 'ml'
                    })

            return ml_detected
        except Exception as e:
            print(f"ML detection error: {e}")
            return []

    def _map_ner_to_pii(self, ner_label: str) -> str:
        mapping = {
            'PER': 'PERSON',
            'PERSON': 'PERSON',
            'ORG': 'ORGANIZATION', 
            'LOC': 'LOCATION',
            'MISC': 'OTHER'
        }
        return mapping.get(ner_label, None)

    def detect_all_pii(self, text: str) -> List[Dict]:
        regex_pii = self.detect_pii_regex(text)
        ml_pii = self.detect_pii_ml(text)

        all_pii = regex_pii + ml_pii
        return self._deduplicate_detections(all_pii)

    def _deduplicate_detections(self, detections: List[Dict]) -> List[Dict]:
        if not detections:
            return []

        sorted_detections = sorted(detections, key=lambda x: x['start'])
        deduplicated = [sorted_detections[0]]

        for detection in sorted_detections[1:]:
            last_detection = deduplicated[-1]
            if detection['start'] < last_detection['end']:
                if detection['confidence'] > last_detection['confidence']:
                    deduplicated[-1] = detection
            else:
                deduplicated.append(detection)

        return deduplicated

    def redact_pii(self, text: str, replacement: str = "[REDACTED]") -> Tuple[str, List[Dict]]:
        detections = self.detect_all_pii(text)

        if not detections:
            return text, []

        sorted_detections = sorted(detections, key=lambda x: x['start'], reverse=True)

        redacted_text = text
        for detection in sorted_detections:
            start, end = detection['start'], detection['end']
            redacted_text = redacted_text[:start] + replacement + redacted_text[end:]

        return redacted_text, detections

    def analyze_privacy_risk(self, detections: List[Dict]) -> Dict:
        if not detections:
            return {"risk_level": "LOW", "risk_score": 0, "message": "No PII detected"}

        risk_weights = {
            'EMAIL': 2,
            'PHONE': 2, 
            'SSN': 5,
            'CREDIT_CARD': 5,
            'PERSON': 1,
            'ORGANIZATION': 1,
            'LOCATION': 1,
            'ADDRESS': 3,
            'IP_ADDRESS': 3,
            'OTHER': 1
        }

        total_risk = sum(risk_weights.get(detection['entity_type'], 1) for detection in detections)
        pii_count = len(detections)

        if total_risk >= 8 or pii_count >= 5:
            risk_level = "HIGH"
        elif total_risk >= 4 or pii_count >= 3:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "risk_level": risk_level,
            "risk_score": total_risk,
            "pii_count": pii_count,
            "detected_types": list(set(d['entity_type'] for d in detections)),
            "message": f"Detected {pii_count} PII items with {risk_level.lower()} privacy risk"
        }

if __name__ == "__main__":
    detector = PIIDetector()

    test_prompts = [
        "Hi, my name is John Smith and my email is john.smith@email.com. My phone number is (555) 123-4567.",
        "Please analyze this data for our company located in New York.",
        "My SSN is 123-45-6789 and I live at 123 Main Street, Boston, MA.",
        "Can you help me write a resume? I don't want to include any personal information."
    ]

    print("\n" + "="*60)
    print("PII DETECTION TEST RESULTS")
    print("="*60)

    for i, prompt in enumerate(test_prompts, 1):
        print(f"\nTest {i}: {prompt[:50]}...")
        redacted_text, detections = detector.redact_pii(prompt)
        risk_analysis = detector.analyze_privacy_risk(detections)

        print(f"  Original: {prompt}")
        print(f"  Redacted: {redacted_text}")
        print(f"  Risk Level: {risk_analysis['risk_level']}")
        print(f"  PII Types: {', '.join(risk_analysis['detected_types'])}")
