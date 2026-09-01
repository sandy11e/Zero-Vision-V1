from .detector import Detection


REPLACEMENTS = {
    "EMAIL": "[EMAIL]",
    "PHONE": "[PHONE]",
    "PAN": "[PAN]",
    "AADHAAR": "[AADHAAR]",
    "CARD": "[CARD]",
    "API_KEY": "[API_KEY]",
    "SENSITIVE_FIELD": "[SENSITIVE_FIELD]",
    "PASSPORT": "[PASSPORT]",
    "BANK_ACCOUNT": "[BANK_ACCOUNT]",
    "IFSC": "[IFSC]",
}


def redact_text(
    text: str,
    detections: list[Detection],
) -> str:

    if not text or not detections:
        return text

    # Work backwards so replacing text does not
    # invalidate the positions of earlier detections.
    sorted_detections = sorted(
        detections,
        key=lambda d: d.start,
        reverse=True,
    )

    redacted = text

    for detection in sorted_detections:

        replacement = REPLACEMENTS.get(
            detection.type,
            "[REDACTED]",
        )

        redacted = (
            redacted[:detection.start]
            + replacement
            + redacted[detection.end:]
        )

    return redacted