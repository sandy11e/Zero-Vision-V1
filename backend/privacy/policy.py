from dataclasses import dataclass
from enum import Enum

from .detector import Detection


class Action(str, Enum):
    ALLOW = "ALLOW"
    REDACT = "REDACT"
    BLOCK = "BLOCK"


@dataclass
class PolicyDecision:
    type: str
    action: Action
    reason: str
    confidence: float


# =========================================================
# POLICY
# =========================================================

POLICY = {
    # Secrets & Tokens - Redacted with placeholders
    "API_KEY": Action.REDACT,
    "AWS_ACCESS_KEY": Action.REDACT,
    "JWT": Action.REDACT,

    # Authentication & Sensitive Fields - Redacted with placeholders
    "SENSITIVE_FIELD": Action.REDACT,

    # Personal Information - Redacted with placeholders
    "EMAIL": Action.REDACT,
    "PHONE": Action.REDACT,
    "PAN": Action.REDACT,
    "AADHAAR": Action.REDACT,
    "PASSPORT": Action.REDACT,

    # Financial Information - Redacted with placeholders
    "CARD": Action.REDACT,
    "BANK_ACCOUNT": Action.REDACT,
    "IFSC": Action.REDACT,
}


REASONS = {
    Action.ALLOW:
        "No sensitive information detected.",

    Action.REDACT:
        "Sensitive personal, financial, or credential data has been sanitized by the Privacy Shield.",

    Action.BLOCK:
        "Critical unmasked credential violation detected.",
}


# =========================================================
# EVALUATE ONE DETECTION
# =========================================================

def evaluate_detection(
    detection: Detection,
) -> PolicyDecision:

    action = POLICY.get(
        detection.type,
        Action.REDACT,
    )

    return PolicyDecision(
        type=detection.type,
        action=action,
        reason=REASONS[action],
        confidence=detection.confidence,
    )


# =========================================================
# EVALUATE ALL DETECTIONS
# =========================================================

def evaluate_detections(
    detections: list[Detection],
) -> list[PolicyDecision]:

    return [
        evaluate_detection(detection)
        for detection in detections
    ]