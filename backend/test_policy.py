from privacy.detector import detect_text
from privacy.policy import evaluate_detections


text = """
Email: john@example.com

Phone: +91 9876543210

PAN: ABCDE1234F

Aadhaar: 1234 5678 9012

Card: 4111 1111 1111 1111

API key: sk_test_12345678901234567890

AWS key: AKIAIOSFODNN7EXAMPLE

JWT:
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abc123456789
"""


detections = detect_text(text)

decisions = evaluate_detections(
    detections
)


print("\n===== PRIVACY POLICY =====\n")


for decision in decisions:

    print(
        f"{decision.type:18}"
        f" | {decision.action.value:6}"
        f" | confidence={decision.confidence}"
        f" | {decision.reason}"
    )