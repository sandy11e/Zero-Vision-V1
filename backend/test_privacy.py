from privacy.detector import detect_text


text = """
Name: John Doe

Email: john@example.com

Phone: +91 9876543210

PAN: ABCDE1234F

Aadhaar: 1234 5678 9012

Passport: A1234567

Card: 4111 1111 1111 1111

IFSC: SBIN0001234

Bank Account: 123456789012

API key: sk_test_12345678901234567890

AWS key: AKIAIOSFODNN7EXAMPLE

JWT:
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abc123456789

Password: mySecretPassword123
"""


detections = detect_text(text)


print("\n===== PRIVACY DETECTIONS =====\n")


for detection in detections:

    print(
        f"{detection.type:18}"
        f" | {detection.value}"
        f" | confidence={detection.confidence}"
    )


print(
    f"\nTotal detections: {len(detections)}"
)