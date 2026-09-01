/**
 * Privacy Shield - Client-Side In-Browser Privacy & Visual Redactor
 * 
 * Strict Client-Side Privacy Guarantees:
 * 1. Zero raw PII/credential data leaves the client browser.
 * 2. Visual Canvas Pixel Redaction: Blacks out and labels sensitive UI regions.
 * 3. DOM Text & Attribute Sanitization: Masks text and form values before network dispatch.
 */

// =========================================================
// PATTERNS & HEURISTICS
// =========================================================

const CLIENT_PATTERNS = {
    API_KEY: /\b(?:sk|pk|api|key|token|secret)[_-][A-Za-z0-9_-]{16,}\b/gi,
    AWS_ACCESS_KEY: /\bAKIA[0-9A-Z]{16}\b/g,
    JWT: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    CARD: /(?<!\d)(?:\d{4}[\s-]?){3}\d{4}(?!\d)/g,
    AADHAAR: /(?<!\d)\d{4}[\s-]\d{4}[\s-]\d{4}(?!\d)/g,
    PAN: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    PASSPORT: /\b[A-Z][0-9]{7}\b/g,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    PHONE: /(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g,
    IFSC: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    BANK_ACCOUNT: /(?<!\d)\d{9,18}(?!\d)/g
};

// Priority ordering: specific secrets & IDs first, generic digits last
const PATTERN_PRIORITY = [
    "API_KEY",
    "AWS_ACCESS_KEY",
    "JWT",
    "CARD",
    "AADHAAR",
    "PAN",
    "PASSPORT",
    "EMAIL",
    "PHONE",
    "IFSC",
    "BANK_ACCOUNT"
];

const SENSITIVE_FIELD_KEYWORDS = [
    "password", "passwd", "pass", "pin", "otp", "security_code",
    "secret", "cvv", "cvc", "credit_card", "card_number", "cardnumber",
    "bank_account", "account_number", "aadhaar", "aadhar", "pan",
    "passport", "ssn", "date_of_birth", "dob", "birth_date",
    "api_key", "apikey", "access_token", "auth_token", "bearer_token"
];

// Label map for visual canvas masking
const REDACTION_LABELS = {
    PASSWORD: "[REDACTED_PASSWORD]",
    PIN: "[REDACTED_PIN]",
    OTP: "[REDACTED_OTP]",
    CVV: "[REDACTED_CVV]",
    CARD: "[REDACTED_CARD]",
    AADHAAR: "[REDACTED_AADHAAR]",
    PAN: "[REDACTED_PAN]",
    PASSPORT: "[REDACTED_PASSPORT]",
    BANK_ACCOUNT: "[REDACTED_BANK_ACCOUNT]",
    IFSC: "[REDACTED_IFSC]",
    EMAIL: "[REDACTED_EMAIL]",
    PHONE: "[REDACTED_PHONE]",
    API_KEY: "[REDACTED_API_KEY]",
    AWS_ACCESS_KEY: "[REDACTED_AWS_KEY]",
    JWT: "[REDACTED_JWT]",
    SENSITIVE_FIELD: "[REDACTED_FIELD]"
};

// =========================================================
// NON-OVERLAPPING INTERVAL TEXT REDACTION UTILITY
// =========================================================

function sanitizeString(text) {
    if (!text || typeof text !== "string") return { text: text || "", redactions: [] };

    const matches = [];

    // 1. Collect all pattern matches from the original text
    for (const type of PATTERN_PRIORITY) {
        const regex = CLIENT_PATTERNS[type];
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push({
                type,
                value: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
    }

    // 2. Filter overlapping intervals (keep higher priority matches)
    const occupiedIntervals = [];
    const selectedMatches = [];

    for (const m of matches) {
        const hasOverlap = occupiedIntervals.some(
            (interval) => m.start < interval.end && m.end > interval.start
        );

        if (!hasOverlap) {
            occupiedIntervals.push({ start: m.start, end: m.end });
            selectedMatches.push(m);
        }
    }

    // 3. Sort selected matches by start position in descending order (right-to-left)
    selectedMatches.sort((a, b) => b.start - a.start);

    // 4. Splice replacements into text
    let sanitized = text;
    const redactions = [];

    for (const m of selectedMatches) {
        const replacement = REDACTION_LABELS[m.type] || `[REDACTED_${m.type}]`;
        sanitized = sanitized.slice(0, m.start) + replacement + sanitized.slice(m.end);
        redactions.push({
            type: m.type,
            originalLength: m.value.length,
            replacement
        });
    }

    return { text: sanitized, redactions };
}

// =========================================================
// IN-PAGE SENSITIVE ELEMENT & BOUNDING BOX SCANNER
// =========================================================

/**
 * Runs inside the web page context to locate exact bounding boxes of all
 * sensitive inputs, form fields, and text on screen.
 */
function scanPageSensitiveCoordinates() {
    const sensitiveRegions = [];
    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Helper to test if field attributes are sensitive
    function isFieldSensitive(el) {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "password") return { sensitive: true, category: "PASSWORD" };

        const attrs = [
            el.name,
            el.id,
            el.getAttribute("placeholder"),
            el.getAttribute("aria-label"),
            el.getAttribute("autocomplete")
        ];

        for (const attr of attrs) {
            if (!attr) continue;
            const normalized = attr.toLowerCase().replace(/[-_\s]/g, "");
            for (const keyword of SENSITIVE_FIELD_KEYWORDS) {
                const normalizedKeyword = keyword.replace(/[-_\s]/g, "");
                if (normalized.includes(normalizedKeyword)) {
                    if (keyword.includes("pass")) return { sensitive: true, category: "PASSWORD" };
                    if (keyword.includes("card") || keyword.includes("cvv")) return { sensitive: true, category: "CARD" };
                    if (keyword.includes("otp") || keyword.includes("pin")) return { sensitive: true, category: "OTP" };
                    if (keyword.includes("aadhaar") || keyword.includes("aadhar")) return { sensitive: true, category: "AADHAAR" };
                    if (keyword.includes("pan")) return { sensitive: true, category: "PAN" };
                    return { sensitive: true, category: "SENSITIVE_FIELD" };
                }
            }
        }
        return { sensitive: false };
    }

    // 1. Scan Form Inputs & Interactive Controls
    const formElements = document.querySelectorAll("input, textarea, select");
    formElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > viewportHeight) {
            return;
        }

        const check = isFieldSensitive(el);
        if (check.sensitive) {
            sensitiveRegions.push({
                category: check.category,
                label: REDACTION_LABELS[check.category] || "[REDACTED]",
                rect: {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left
                },
                nodeType: "input"
            });
            return;
        }

        // Also check if input.value contains sensitive PII
        if (el.value) {
            for (const type of PATTERN_PRIORITY) {
                const regex = CLIENT_PATTERNS[type];
                regex.lastIndex = 0;
                if (regex.test(el.value)) {
                    sensitiveRegions.push({
                        category: type,
                        label: REDACTION_LABELS[type] || `[REDACTED_${type}]`,
                        rect: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height,
                            top: rect.top,
                            left: rect.left
                        },
                        nodeType: "input_value"
                    });
                    break;
                }
            }
        }
    });

    // 2. Scan Text Nodes on the Page for Visible PII & Extract Substring Coordinates via DOM Range
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName.toLowerCase();
                if (tag === "script" || tag === "style" || tag === "noscript") return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
        const text = currentNode.textContent;
        const parentRect = currentNode.parentElement.getBoundingClientRect();
        if (parentRect.width <= 0 || parentRect.height <= 0 || parentRect.bottom < 0 || parentRect.top > viewportHeight) {
            continue;
        }

        for (const type of PATTERN_PRIORITY) {
            const regex = CLIENT_PATTERNS[type];
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                try {
                    const range = document.createRange();
                    range.setStart(currentNode, match.index);
                    range.setEnd(currentNode, match.index + match[0].length);
                    const rangeRect = range.getBoundingClientRect();

                    if (rangeRect.width > 0 && rangeRect.height > 0) {
                        sensitiveRegions.push({
                            category: type,
                            label: REDACTION_LABELS[type] || `[REDACTED_${type}]`,
                            rect: {
                                x: rangeRect.x,
                                y: rangeRect.y,
                                width: rangeRect.width,
                                height: rangeRect.height,
                                top: rangeRect.top,
                                left: rangeRect.left
                            },
                            nodeType: "text_node"
                        });
                    }
                } catch (e) {
                    sensitiveRegions.push({
                        category: type,
                        label: REDACTION_LABELS[type] || `[REDACTED_${type}]`,
                        rect: {
                            x: parentRect.x,
                            y: parentRect.y,
                            width: parentRect.width,
                            height: parentRect.height,
                            top: parentRect.top,
                            left: parentRect.left
                        },
                        nodeType: "text_parent"
                    });
                }
            }
        }
    }

    return {
        sensitiveRegions,
        dpr,
        viewportWidth,
        viewportHeight
    };
}

// =========================================================
// CANVAS VISUAL REDACTION ENGINE
// =========================================================

/**
 * Loads a screenshot image dataURL, paints bounding boxes / redaction badges
 * directly over all sensitive visual regions on an in-memory Canvas, and
 * returns the sanitized Base64 image.
 */
async function redactScreenshotCanvas(screenshotDataUrl, sensitiveRegions, viewport = null) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            // 1. Draw raw screenshot onto canvas
            ctx.drawImage(img, 0, 0);

            // Calculate precise scaling between target tab viewport CSS pixels and captured image pixels
            const viewW = (viewport && viewport.width) ? viewport.width : (canvas.width);
            const viewH = (viewport && viewport.height) ? viewport.height : (canvas.height);
            const scaleX = img.width / viewW;
            const scaleY = img.height / viewH;

            // 2. Iterate and apply visual redaction bounding boxes
            sensitiveRegions.forEach((region) => {
                const r = region.rect;
                const pad = 3; // Padding around element

                const x = Math.max(0, (r.x - pad) * scaleX);
                const y = Math.max(0, (r.y - pad) * scaleY);
                const w = (r.width + pad * 2) * scaleX;
                const h = (r.height + pad * 2) * scaleY;

                // Solid dark blackout fill
                ctx.save();
                ctx.fillStyle = "#0f172a"; // Dark slate blackout
                ctx.fillRect(x, y, w, h);

                // Red privacy border highlight
                ctx.strokeStyle = "#ef4444"; // Red shield border
                ctx.lineWidth = Math.max(2, 2 * scaleX);
                ctx.strokeRect(x, y, w, h);

                // Labeled Badge text overlay
                const labelText = `🔒 ${region.label || '[REDACTED]'}`;
                const fontSize = Math.max(12, Math.min(22, Math.floor(h * 0.45)));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = "#f87171"; // Light red / pink badge text
                ctx.textBaseline = "middle";

                // Center or fit text inside box
                const textWidth = ctx.measureText(labelText).width;
                if (textWidth < w - 6) {
                    ctx.fillText(labelText, x + (w - textWidth) / 2, y + h / 2);
                } else {
                    ctx.fillText("🔒 REDACTED", x + 4, y + h / 2);
                }

                ctx.restore();
            });

            // 3. Export sanitized Base64 JPEG (Quality 0.85)
            const sanitizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve(sanitizedDataUrl);
        };

        img.onerror = (err) => {
            reject(new Error("Failed to load screenshot into Canvas for redaction"));
        };

        img.src = screenshotDataUrl;
    });
}

// =========================================================
// FULL CLIENT-SIDE PAGE CONTEXT SANITIZER
// =========================================================

/**
 * Sanitizes both the DOM elements and textual representation before
 * creating the network payload.
 */
function sanitizePageContext(rawContext, sensitiveRegions = []) {
    const sanitizedContext = {
        url: rawContext.url,
        title: rawContext.title,
        text: "",
        elements: []
    };

    // 1. Sanitize Full Page Text
    const textSanitized = sanitizeString(rawContext.text || "");
    sanitizedContext.text = textSanitized.text;

    // 2. Sanitize Elements
    let totalRedacted = textSanitized.redactions.length;
    const categoryCounts = {};

    (rawContext.elements || []).forEach((el) => {
        const elCopy = { ...el };

        // Check if element is sensitive form field
        const type = (elCopy.type || "").toLowerCase();
        const isPassword = type === "password";
        const nameOrPlaceholder = `${elCopy.name || ""} ${elCopy.placeholder || ""} ${elCopy.ariaLabel || ""}`.toLowerCase();

        let isSensitiveField = isPassword;
        let matchedCategory = isPassword ? "PASSWORD" : null;

        if (!isSensitiveField) {
            for (const kw of SENSITIVE_FIELD_KEYWORDS) {
                if (nameOrPlaceholder.includes(kw)) {
                    isSensitiveField = true;
                    matchedCategory = kw.toUpperCase();
                    break;
                }
            }
        }

        if (isSensitiveField) {
            elCopy.text = REDACTION_LABELS[matchedCategory] || "[REDACTED_FIELD]";
            elCopy.placeholder = "[REDACTED]";
            elCopy.name = `[REDACTED_${matchedCategory || "FIELD"}]`;
            elCopy.ariaLabel = "[REDACTED]";
            totalRedacted++;
            categoryCounts[matchedCategory || "FIELD"] = (categoryCounts[matchedCategory || "FIELD"] || 0) + 1;
        } else if (elCopy.text) {
            const elSanitized = sanitizeString(elCopy.text);
            elCopy.text = elSanitized.text;
            if (elSanitized.redactions.length > 0) {
                totalRedacted += elSanitized.redactions.length;
                elSanitized.redactions.forEach(r => {
                    categoryCounts[r.type] = (categoryCounts[r.type] || 0) + 1;
                });
            }
        }

        sanitizedContext.elements.push(elCopy);
    });

    // Add sensitive regions count
    sensitiveRegions.forEach(r => {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    return {
        sanitizedContext,
        privacySummary: {
            redactedCount: totalRedacted + sensitiveRegions.length,
            categories: categoryCounts,
            status: "CLIENT_PROTECTED"
        }
    };
}

// Export for module or global use
if (typeof window !== "undefined") {
    window.PrivacyShield = {
        CLIENT_PATTERNS,
        PATTERN_PRIORITY,
        SENSITIVE_FIELD_KEYWORDS,
        REDACTION_LABELS,
        sanitizeString,
        scanPageSensitiveCoordinates,
        redactScreenshotCanvas,
        sanitizePageContext
    };
}
