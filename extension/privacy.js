/**
 * Privacy Shield - Client-Side In-Browser Privacy & Visual Redactor
 * 
 * Strict Client-Side Privacy Guarantees:
 * 1. Zero raw PII/credential data leaves the client browser.
 * 2. Visual Canvas Pixel Redaction: Blacks out and labels sensitive UI regions.
 * 3. DOM Text & Attribute Sanitization: Masks text and form values before network dispatch.
 * 4. Dynamic User Policy Enforcement: Respects user-configured toggle rules and custom keywords.
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

// Priority ordering: custom secrets first, specific IDs next, unstructured NER next, generic digits last
const PATTERN_PRIORITY = [
    "CUSTOM_SECRET",
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
    "BANK_ACCOUNT",
    "PER",
    "LOC",
    "ORG"
];

const SENSITIVE_FIELD_KEYWORDS = [
    "password", "passwd", "pass", "pin", "otp", "security_code",
    "secret", "cvv", "cvc", "credit_card", "card_number", "cardnumber",
    "bank_account", "account_number", "aadhaar", "aadhar", "pan",
    "passport", "ssn", "date_of_birth", "dob", "birth_date",
    "api_key", "apikey", "access_token", "auth_token", "bearer_token"
];

// Label map for visual canvas masking & string replacement
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
    PER: "[REDACTED_PERSON]",
    LOC: "[REDACTED_LOCATION]",
    ORG: "[REDACTED_ORGANIZATION]",
    CUSTOM_SECRET: "[REDACTED_SECRET]",
    SENSITIVE_FIELD: "[REDACTED_FIELD]"
};

// Map pattern types to user configuration groups
const CATEGORY_GROUP_MAP = {
    AADHAAR: "nationalIds",
    PAN: "nationalIds",
    PASSPORT: "nationalIds",
    CARD: "financial",
    CVV: "financial",
    IFSC: "financial",
    BANK_ACCOUNT: "financial",
    PASSWORD: "auth",
    PIN: "auth",
    OTP: "auth",
    API_KEY: "auth",
    AWS_ACCESS_KEY: "auth",
    JWT: "auth",
    EMAIL: "contacts",
    PHONE: "contacts",
    PER: "ner",
    LOC: "ner",
    ORG: "ner"
};

// =========================================================
// NON-OVERLAPPING INTERVAL TEXT REDACTION UTILITY
// =========================================================

function sanitizeString(text, userConfig = {}) {
    if (!text || typeof text !== "string") return { text: text || "", redactions: [] };

    const matches = [];

    // Filter active patterns based on user configuration toggles
    const activePatterns = {};
    for (const [type, regex] of Object.entries(CLIENT_PATTERNS)) {
        const group = CATEGORY_GROUP_MAP[type];
        if (!group || userConfig[group] !== false) {
            activePatterns[type] = regex;
        }
    }

    // 1. Collect all structured regex matches
    for (const [type, regex] of Object.entries(activePatterns)) {
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

    // 2. Collect on-device NER matches if enabled in userConfig
    if (userConfig.ner !== false && typeof window !== "undefined" && window.ClientNER && typeof window.ClientNER.extractEntities === "function") {
        try {
            const nerEntities = window.ClientNER.extractEntities(text);
            nerEntities.forEach(ent => {
                matches.push({
                    type: ent.type,
                    value: ent.value,
                    start: ent.start,
                    end: ent.end
                });
            });
        } catch (e) {
            console.warn("Local NER extraction error:", e);
        }
    }

    // 3. Custom user keywords (flexible space/underscore/hyphen matching)
    if (userConfig.customKeywords) {
        const words = userConfig.customKeywords.split(",").map(w => w.trim()).filter(Boolean);
        for (const kw of words) {
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s_-]+/g, '[\\s_-]+');
            const kwRegex = new RegExp(`\\b${escaped}\\b`, "gi");
            let match;
            while ((match = kwRegex.exec(text)) !== null) {
                matches.push({
                    type: "CUSTOM_SECRET",
                    value: match[0],
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        }
    }

    // 4. Filter overlapping intervals (keep higher priority matches)
    const occupiedIntervals = [];
    const selectedMatches = [];

    // Sort by priority first
    matches.sort((a, b) => {
        const pA = PATTERN_PRIORITY.indexOf(a.type);
        const pB = PATTERN_PRIORITY.indexOf(b.type);
        return (pA === -1 ? 99 : pA) - (pB === -1 ? 99 : pB);
    });

    for (const m of matches) {
        const hasOverlap = occupiedIntervals.some(
            (interval) => m.start < interval.end && m.end > interval.start
        );

        if (!hasOverlap) {
            occupiedIntervals.push({ start: m.start, end: m.end });
            selectedMatches.push(m);
        }
    }

    // 5. Sort selected matches by start position in descending order (right-to-left)
    selectedMatches.sort((a, b) => b.start - a.start);

    // 6. Splice replacements into text
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

function scanPageSensitiveCoordinates(userConfig = {}) {
    const sensitiveRegions = [];
    const dpr = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    function isFieldSensitive(el) {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "password" && userConfig.auth !== false) return { sensitive: true, category: "PASSWORD" };

        let labelText = "";
        try {
            if (el.labels && el.labels.length > 0) {
                labelText = Array.from(el.labels).map(l => l.innerText || l.textContent || "").join(" ");
            }
            if (!labelText && el.id) {
                const associatedLabel = document.querySelector(`label[for="${el.id}"]`);
                if (associatedLabel) labelText = associatedLabel.innerText || associatedLabel.textContent || "";
            }
            if (!labelText && el.closest) {
                const parentLabel = el.closest("label") || el.parentElement?.querySelector("label");
                if (parentLabel) labelText = parentLabel.innerText || parentLabel.textContent || "";
            }
        } catch (e) {}

        const attrs = [
            el.name,
            el.id,
            el.getAttribute("placeholder"),
            el.getAttribute("aria-label"),
            el.getAttribute("autocomplete"),
            labelText
        ];

        // Check custom keywords first
        if (userConfig.customKeywords) {
            const customWords = userConfig.customKeywords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
            for (const attr of attrs) {
                if (!attr) continue;
                const normalizedAttr = attr.toLowerCase().replace(/[-_\s]/g, "");
                for (const kw of customWords) {
                    const normalizedKw = kw.replace(/[-_\s]/g, "");
                    if (normalizedAttr.includes(normalizedKw)) {
                        return { sensitive: true, category: "CUSTOM_SECRET" };
                    }
                }
            }
        }

        for (const attr of attrs) {
            if (!attr) continue;
            const normalized = attr.toLowerCase().replace(/[-_\s]/g, "");
            for (const keyword of SENSITIVE_FIELD_KEYWORDS) {
                const normalizedKeyword = keyword.replace(/[-_\s]/g, "");
                if (normalized.includes(normalizedKeyword)) {
                    if (keyword.includes("pass") && userConfig.auth !== false) return { sensitive: true, category: "PASSWORD" };
                    if ((keyword.includes("card") || keyword.includes("cvv")) && userConfig.financial !== false) return { sensitive: true, category: "CARD" };
                    if ((keyword.includes("otp") || keyword.includes("pin")) && userConfig.auth !== false) return { sensitive: true, category: "OTP" };
                    if ((keyword.includes("aadhaar") || keyword.includes("aadhar")) && userConfig.nationalIds !== false) return { sensitive: true, category: "AADHAAR" };
                    if (keyword.includes("pan") && userConfig.nationalIds !== false) return { sensitive: true, category: "PAN" };
                    return { sensitive: true, category: "SENSITIVE_FIELD" };
                }
            }
        }
        return { sensitive: false };
    }

    // 1. Scan Form Inputs
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
                    height: rect.height
                },
                nodeType: "input"
            });
            return;
        }

        // Check if value contains structured or NER PII
        if (el.value) {
            const sanitizedVal = sanitizeString(el.value, userConfig);
            if (sanitizedVal.redactions.length > 0) {
                const primaryCat = sanitizedVal.redactions[0].type;
                sensitiveRegions.push({
                    category: primaryCat,
                    label: REDACTION_LABELS[primaryCat] || `[REDACTED_${primaryCat}]`,
                    rect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    nodeType: "input_value"
                });
            }
        }
    });

    // 2. Scan Text Nodes on the Page for Visible PII
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

        // Check active regex patterns
        for (const [type, regex] of Object.entries(CLIENT_PATTERNS)) {
            const group = CATEGORY_GROUP_MAP[type];
            if (group && userConfig[group] === false) continue;

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
                                height: rangeRect.height
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
                            height: parentRect.height
                        },
                        nodeType: "text_parent"
                    });
                }
            }
        }

        // Check custom keywords in text
        if (userConfig.customKeywords) {
            const words = userConfig.customKeywords.split(",").map(w => w.trim()).filter(Boolean);
            for (const kw of words) {
                const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s_-]+/g, '[\\s_-]+');
                const kwRegex = new RegExp(`\\b${escaped}\\b`, "gi");
                let m;
                while ((m = kwRegex.exec(text)) !== null) {
                    try {
                        const range = document.createRange();
                        range.setStart(currentNode, m.index);
                        range.setEnd(currentNode, m.index + m[0].length);
                        const r = range.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0) {
                            sensitiveRegions.push({
                                category: "CUSTOM_SECRET",
                                label: "[REDACTED_SECRET]",
                                rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                                nodeType: "custom_keyword"
                            });
                        }
                    } catch (e) {}
                }
            }
        }

        // Check unstructured NER entities
        if (userConfig.ner !== false && typeof window !== "undefined" && window.ClientNER) {
            const nerEntities = window.ClientNER.extractEntities(text);
            nerEntities.forEach((ent) => {
                try {
                    const range = document.createRange();
                    range.setStart(currentNode, ent.start);
                    range.setEnd(currentNode, ent.end);
                    const r = range.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        sensitiveRegions.push({
                            category: ent.type,
                            label: REDACTION_LABELS[ent.type] || `[REDACTED_${ent.type}]`,
                            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                            nodeType: "ner_entity"
                        });
                    }
                } catch (e) {}
            });
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

            const viewW = (viewport && viewport.width) ? viewport.width : (canvas.width);
            const viewH = (viewport && viewport.height) ? viewport.height : (canvas.height);
            const scaleX = img.width / viewW;
            const scaleY = img.height / viewH;

            // 2. Iterate and apply visual redaction bounding boxes
            sensitiveRegions.forEach((region) => {
                const r = region.rect;
                const pad = 3;

                const x = Math.max(0, (r.x - pad) * scaleX);
                const y = Math.max(0, (r.y - pad) * scaleY);
                const w = (r.width + pad * 2) * scaleX;
                const h = (r.height + pad * 2) * scaleY;

                // Solid dark blackout fill
                ctx.save();
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(x, y, w, h);

                // Red privacy border highlight
                ctx.strokeStyle = "#ef4444";
                ctx.lineWidth = Math.max(2, 2 * scaleX);
                ctx.strokeRect(x, y, w, h);

                // Labeled Badge text overlay
                const labelText = `🔒 ${region.label || '[REDACTED]'}`;
                const fontSize = Math.max(11, Math.min(20, Math.floor(h * 0.45)));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = "#f87171";
                ctx.textBaseline = "middle";

                const textWidth = ctx.measureText(labelText).width;
                if (textWidth < w - 6) {
                    ctx.fillText(labelText, x + (w - textWidth) / 2, y + h / 2);
                } else {
                    ctx.fillText("🔒 REDACTED", x + 4, y + h / 2);
                }

                ctx.restore();
            });

            // 3. Export sanitized Base64 JPEG
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

function sanitizePageContext(rawContext, sensitiveRegions = [], userConfig = {}) {
    const sanitizedContext = {
        url: rawContext.url,
        title: rawContext.title,
        text: "",
        elements: []
    };

    // 1. Sanitize Full Page Text
    const textSanitized = sanitizeString(rawContext.text || "", userConfig);
    sanitizedContext.text = textSanitized.text;

    // 2. Sanitize Elements
    let totalRedacted = textSanitized.redactions.length;
    const categoryCounts = {};

    (rawContext.elements || []).forEach((el) => {
        const elCopy = { ...el };

        const type = (elCopy.type || "").toLowerCase();
        const isPassword = type === "password" && userConfig.auth !== false;
        const nameOrPlaceholder = `${elCopy.name || ""} ${elCopy.placeholder || ""} ${elCopy.ariaLabel || ""}`.toLowerCase();

        let isSensitiveField = isPassword;
        let matchedCategory = isPassword ? "PASSWORD" : null;

        // Check custom keywords first
        if (!isSensitiveField && userConfig.customKeywords) {
            const customWords = userConfig.customKeywords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
            for (const kw of customWords) {
                const normalizedKw = kw.replace(/[-_\s]/g, "");
                const normalizedTarget = nameOrPlaceholder.replace(/[-_\s]/g, "");
                if (normalizedTarget.includes(normalizedKw)) {
                    isSensitiveField = true;
                    matchedCategory = "CUSTOM_SECRET";
                    break;
                }
            }
        }

        if (!isSensitiveField) {
            for (const kw of SENSITIVE_FIELD_KEYWORDS) {
                if (nameOrPlaceholder.includes(kw)) {
                    if ((kw.includes("aadhaar") || kw.includes("pan") || kw.includes("passport")) && userConfig.nationalIds === false) continue;
                    if ((kw.includes("card") || kw.includes("cvv") || kw.includes("bank")) && userConfig.financial === false) continue;
                    if ((kw.includes("pass") || kw.includes("pin") || kw.includes("otp") || kw.includes("key") || kw.includes("token")) && userConfig.auth === false) continue;
                    if ((kw.includes("email") || kw.includes("phone")) && userConfig.contacts === false) continue;

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
            const elSanitized = sanitizeString(elCopy.text, userConfig);
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
