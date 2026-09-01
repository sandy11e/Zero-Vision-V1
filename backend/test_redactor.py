from privacy.detector import detect_text
from privacy.redactor import redact_text


text = """
My name is John.

Email: john@example.com

Phone: +91 9876543210

PAN: ABCDE1234F

Aadhaar: 1234 5678 9012

Card: 4111 1111 1111 1111

API key: sk_test_12345678901234567890
"""


detections = detect_text(text)

redacted = redact_text(
    text,
    detections,
)


print("\n===== ORIGINAL =====\n")
print(text)

print("\n===== REDACTED =====\n")
print(redacted)

print("\n===== DETECTIONS =====\n")

for detection in detections:
    print(
        f"{detection.type:15}"
        f" | {detection.value}"
    )