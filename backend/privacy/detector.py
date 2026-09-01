import re
from dataclasses import dataclass, asdict


@dataclass
class Detection:
    type: str
    value: str
    start: int
    end: int
    confidence: float


# =========================================================
# REGEX PATTERNS
# =========================================================

PATTERNS = {

    # -------------------------
    # Contact information
    # -------------------------

    "EMAIL": re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    ),

    "PHONE": re.compile(
        r"(?<!\d)"
        r"(?:\+91[\s-]?)?"
        r"[6-9]\d{9}"
        r"(?!\d)"
    ),

    # -------------------------
    # Indian identity documents
    # -------------------------

    "PAN": re.compile(
        r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"
    ),

    "AADHAAR": re.compile(
    r"(?<!\d)"
    r"\d{4}[\s-]\d{4}[\s-]\d{4}"
    r"(?!\d)"
),

    "PASSPORT": re.compile(
        r"\b[A-Z][0-9]{7}\b"
    ),

    # -------------------------
    # Financial information
    # -------------------------

    "CARD": re.compile(
        r"(?<!\d)"
        r"(?:\d{4}[\s-]?){3}\d{4}"
        r"(?!\d)"
    ),

    "BANK_ACCOUNT": re.compile(
        r"(?i)"
        r"(?<!\d)"
        r"\d{9,18}"
        r"(?!\d)"
    ),

    "IFSC": re.compile(
        r"\b[A-Z]{4}0[A-Z0-9]{6}\b"
    ),

    # -------------------------
    # Secrets / credentials
    # -------------------------

    "API_KEY": re.compile(
        r"\b(?:sk|pk|api|key|token|secret)[_-]"
        r"[A-Za-z0-9_-]{16,}\b",
        re.IGNORECASE,
    ),

    "AWS_ACCESS_KEY": re.compile(
        r"\bAKIA[0-9A-Z]{16}\b"
    ),

    "JWT": re.compile(
        r"\beyJ[A-Za-z0-9_-]{10,}\."
        r"[A-Za-z0-9_-]{10,}\."
        r"[A-Za-z0-9_-]{10,}\b"
    ),

}


# =========================================================
# SENSITIVE FIELD NAMES
# =========================================================

SENSITIVE_FIELD_NAMES = {

    # Authentication
    "password",
    "passwd",
    "pass",
    "pin",
    "otp",
    "security_code",
    "secret",

    # API / tokens
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "auth_token",
    "bearer_token",
    "token",

    # Financial
    "credit_card",
    "card_number",
    "cardnumber",
    "cvv",
    "cvc",
    "bank_account",
    "account_number",

    # Identity
    "aadhaar",
    "aadhar",
    "pan",
    "passport",
    "ssn",

    # Personal
    "date_of_birth",
    "dob",
    "birth_date",

}


# =========================================================
# HELPER
# =========================================================

def _overlaps(
    start: int,
    end: int,
    ranges: list[tuple[int, int]],
) -> bool:

    return any(
        start < existing_end
        and end > existing_start
        for existing_start, existing_end in ranges
    )


# =========================================================
# DETECT TEXT
# =========================================================

def detect_text(text: str) -> list[Detection]:

    if not text:
        return []

    detections = []

    occupied_ranges = []


    # -----------------------------------------------------
    # Detection priority
    #
    # More specific patterns run first.
    # -----------------------------------------------------

    priority = [
        "EMAIL",
        "PHONE",
        "CARD",
        "PAN",
        "AADHAAR",
        "IFSC",
        "AWS_ACCESS_KEY",
        "JWT",
        "API_KEY",
        "PASSPORT",
        "BANK_ACCOUNT",
    ]


    for entity_type in priority:

        pattern = PATTERNS[entity_type]

        for match in pattern.finditer(text):

            start = match.start()
            end = match.end()

            # Prevent overlapping classifications.
            if _overlaps(
                start,
                end,
                occupied_ranges,
            ):
                continue


            detection = Detection(
                type=entity_type,
                value=match.group(0),
                start=start,
                end=end,
                confidence=0.95,
            )

            detections.append(detection)

            occupied_ranges.append(
                (start, end)
            )


    # Keep detections ordered by their location
    # in the original text.

    detections.sort(
        key=lambda d: d.start
    )

    return detections


# =========================================================
# DETECT ELEMENT
# =========================================================

def detect_element(element) -> list[Detection]:

    detections = []


    fields = [
        element.get("name"),
        element.get("placeholder"),
        element.get("ariaLabel"),
        element.get("type"),
    ]


    for field in fields:

        if not field:
            continue


        normalized = (
            field
            .strip()
            .lower()
            .replace("-", "_")
            .replace(" ", "_")
        )


        if normalized in SENSITIVE_FIELD_NAMES:

            detections.append(
                Detection(
                    type="SENSITIVE_FIELD",
                    value=field,
                    start=0,
                    end=len(field),
                    confidence=0.99,
                )
            )


    # Check visible text.

    text = element.get("text") or ""

    detections.extend(
        detect_text(text)
    )


    return detections


# =========================================================
# DETECT PAGE
# =========================================================

def detect_page(page_context: dict) -> list[Detection]:

    detections = []


    # Page text

    page_text = page_context.get(
        "text",
        "",
    )

    detections.extend(
        detect_text(page_text)
    )


    # Interactive elements

    elements = page_context.get(
        "elements",
        [],
    )


    for element in elements:

        detections.extend(
            detect_element(element)
        )


    return detections


# =========================================================
# SERIALIZATION
# =========================================================

def detection_to_dict(
    detection: Detection,
) -> dict:

    return asdict(detection)


def detections_to_dict(
    detections: list[Detection],
) -> list[dict]:

    return [
        detection_to_dict(d)
        for d in detections
    ]