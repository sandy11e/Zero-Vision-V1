/* =========================================================
   ELEMENTS & SELECTORS
========================================================= */

const taskInput = document.getElementById("task");
const runButton = document.getElementById("runButton");
const stopButton = document.getElementById("stopButton");
const statusCard = document.getElementById("status");
const statusText = document.getElementById("statusText");
const statusTitle = document.getElementById("statusTitle");
const statusSpinner = document.getElementById("statusSpinner");
const stepCounter = document.getElementById("stepCounter");
const errorCard = document.getElementById("error");
const errorMessage = document.getElementById("errorMessage");
const chat = document.getElementById("chat");
const clearHistoryButton = document.getElementById("clearHistory");

// Theme Toggle Elements
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIconSun = document.getElementById("themeIconSun");
const themeIconMoon = document.getElementById("themeIconMoon");

// Settings Drawer Elements
const settingsToggleBtn = document.getElementById("settingsToggleBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsDrawer = document.getElementById("settingsDrawer");
const toggleNationalIds = document.getElementById("toggleNationalIds");
const toggleFinancial = document.getElementById("toggleFinancial");
const toggleAuth = document.getElementById("toggleAuth");
const toggleContacts = document.getElementById("toggleContacts");
const toggleNer = document.getElementById("toggleNer");
const customKeywordsInput = document.getElementById("customKeywordsInput");

// Model Drop-Up Elements
const modelDropup = document.getElementById("modelDropup");
const modelDropupBtn = document.getElementById("modelDropupBtn");
const modelDropupMenu = document.getElementById("modelDropupMenu");
const selectedModelLabel = document.getElementById("selectedModelLabel");
const modelSelect = document.getElementById("modelSelect");

// In-App Modal Elements
const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");

/* =========================================================
   CONFIG & STATE
========================================================= */

const BACKEND_URL = "http://127.0.0.1:8000/agent/next";
const CHAT_KEY = "copilotPrivacyVisionSideChat";
const CONFIG_KEY = "copilotPrivacyFilterConfig";
const MODEL_KEY = "copilotSelectedModelChoice";
const THEME_KEY = "shieldUIThemeChoice";

let running = false;
let controller = null;
let currentSettingsVisible = false;

// Default Privacy Config
let activePrivacyConfig = {
    nationalIds: true,
    financial: true,
    auth: true,
    contacts: true,
    ner: true,
    customKeywords: ""
};

/* =========================================================
   IN-APP MODAL (REPLACES NATIVE BROWSER ALERTS / CONFIRMS)
========================================================= */

let modalResolver = null;

function showCustomModal({ title = "Confirm Action", message = "Are you sure?", confirmText = "Confirm", cancelText = "Cancel" }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirmBtn.textContent = confirmText;
    modalCancelBtn.textContent = cancelText;

    customModal.classList.remove("hidden");

    return new Promise((resolve) => {
        modalResolver = resolve;
    });
}

function hideCustomModal() {
    customModal.classList.add("hidden");
    if (modalResolver) {
        modalResolver = null;
    }
}

modalConfirmBtn.addEventListener("click", () => {
    if (modalResolver) modalResolver(true);
    hideCustomModal();
});

modalCancelBtn.addEventListener("click", () => {
    if (modalResolver) modalResolver(false);
    hideCustomModal();
});

/* =========================================================
   THEME (DARK / LIGHT MODE) CONTROLLER
========================================================= */

function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        document.body.classList.add("light-theme");
        if (themeIconSun) themeIconSun.classList.add("hidden");
        if (themeIconMoon) themeIconMoon.classList.remove("hidden");
    } else {
        document.documentElement.removeAttribute("data-theme");
        document.body.classList.remove("light-theme");
        if (themeIconSun) themeIconSun.classList.remove("hidden");
        if (themeIconMoon) themeIconMoon.classList.add("hidden");
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", async () => {
        const isLight = document.body.classList.contains("light-theme");
        const nextTheme = isLight ? "dark" : "light";
        applyTheme(nextTheme);
        await chrome.storage.local.set({ [THEME_KEY]: nextTheme });
    });
}

/* =========================================================
   SETTINGS & MODEL MANAGEMENT
========================================================= */

async function loadPrivacyConfig() {
    const data = await chrome.storage.local.get([CONFIG_KEY, MODEL_KEY, THEME_KEY]);
    if (data[CONFIG_KEY]) {
        activePrivacyConfig = { ...activePrivacyConfig, ...data[CONFIG_KEY] };
    }

    // Apply saved theme or default to dark
    applyTheme(data[THEME_KEY] || "dark");

    // Update UI controls
    toggleNationalIds.checked = activePrivacyConfig.nationalIds;
    toggleFinancial.checked = activePrivacyConfig.financial;
    toggleAuth.checked = activePrivacyConfig.auth;
    toggleContacts.checked = activePrivacyConfig.contacts;
    toggleNer.checked = activePrivacyConfig.ner;
    customKeywordsInput.value = activePrivacyConfig.customKeywords || "";

    const savedModel = data[MODEL_KEY] || "groq/compound-mini";
    if (modelSelect) {
        modelSelect.value = savedModel;
    }
    updateDropupUI(savedModel);
}

function updateDropupUI(val) {
    if (!val || !modelDropupMenu) return;
    const item = modelDropupMenu.querySelector(`.dropup-item[data-value="${val}"]`);
    if (item) {
        modelDropupMenu.querySelectorAll(".dropup-item").forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        if (selectedModelLabel) {
            selectedModelLabel.textContent = item.getAttribute("data-label") || formatModelLabel(val);
        }
    }
}

async function savePrivacyConfig() {
    activePrivacyConfig = {
        nationalIds: toggleNationalIds.checked,
        financial: toggleFinancial.checked,
        auth: toggleAuth.checked,
        contacts: toggleContacts.checked,
        ner: toggleNer.checked,
        customKeywords: customKeywordsInput.value.trim()
    };
    await chrome.storage.local.set({ [CONFIG_KEY]: activePrivacyConfig });
}

// Custom Drop-Up Controller
if (modelDropupBtn && modelDropupMenu) {
    modelDropupBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !modelDropupMenu.classList.contains("hidden");
        if (isOpen) {
            modelDropupMenu.classList.add("hidden");
            modelDropupBtn.classList.remove("open");
        } else {
            modelDropupMenu.classList.remove("hidden");
            modelDropupBtn.classList.add("open");
        }
    });

    document.addEventListener("click", (e) => {
        if (modelDropup && !modelDropup.contains(e.target)) {
            modelDropupMenu.classList.add("hidden");
            modelDropupBtn.classList.remove("open");
        }
    });

    modelDropupMenu.querySelectorAll(".dropup-item").forEach(item => {
        item.addEventListener("click", async (e) => {
            e.stopPropagation();
            const val = item.getAttribute("data-value");
            if (modelSelect) {
                modelSelect.value = val;
            }
            updateDropupUI(val);
            modelDropupMenu.classList.add("hidden");
            modelDropupBtn.classList.remove("open");

            await chrome.storage.local.set({ [MODEL_KEY]: val });
            setStatus(`AI Model set to ${formatModelLabel(val)}`, "stopped");
            setTimeout(() => {
                if (!running) hideStatus();
            }, 1500);
        });
    });
}

settingsToggleBtn.addEventListener("click", () => {
    currentSettingsVisible = !currentSettingsVisible;
    if (currentSettingsVisible) {
        settingsDrawer.classList.remove("hidden");
    } else {
        settingsDrawer.classList.add("hidden");
    }
});

closeSettingsBtn.addEventListener("click", () => {
    currentSettingsVisible = false;
    settingsDrawer.classList.add("hidden");
});

[toggleNationalIds, toggleFinancial, toggleAuth, toggleContacts, toggleNer].forEach(el => {
    el.addEventListener("change", savePrivacyConfig);
});

customKeywordsInput.addEventListener("input", savePrivacyConfig);

/* =========================================================
   EVENT LISTENERS & DYNAMIC GLOW BUTTON
========================================================= */

function updateSendButtonState() {
    const hasText = taskInput.value.trim().length > 0;
    if (hasText && !running) {
        runButton.disabled = false;
        runButton.classList.add("glowing");
    } else {
        runButton.disabled = true;
        runButton.classList.remove("glowing");
    }
}

runButton.addEventListener("click", runAgent);

taskInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateSendButtonState();
});

taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (taskInput.value.trim().length > 0 && !running) {
            runAgent();
        }
    }
});

stopButton.addEventListener("click", () => {
    if (!running) return;
    running = false;
    if (controller) {
        controller.abort();
    }
});

clearHistoryButton.addEventListener("click", clearChatWithPrompt);

async function clearChatWithPrompt() {
    if (running) return;
    const messages = await getChat();
    if (messages.length === 0) return;

    // In-app styled confirmation popup
    const confirmed = await showCustomModal({
        title: "Clear Conversation",
        message: "Are you sure you want to clear your conversation history? This cannot be undone.",
        confirmText: "Clear History",
        cancelText: "Keep Chat"
    });

    if (confirmed) {
        await clearChat();
    }
}

function autoResizeTextarea() {
    taskInput.style.height = "auto";
    taskInput.style.height = `${Math.min(taskInput.scrollHeight, 90)}px`;
}

/* =========================================================
   MAIN AGENT WORKFLOW
========================================================= */

async function runAgent() {
    const task = taskInput.value.trim();
    if (!task) {
        showError("Please enter an instruction or prompt.");
        return;
    }

    if (running) return;

    running = true;
    controller = new AbortController();

    hideError();
    setRunningState();

    await addChatMessage("user", task);
    taskInput.value = "";
    autoResizeTextarea();
    updateSendButtonState();

    try {
        setStatus("Locating active browser tab...");

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab || !tab.id) {
            throw new Error("Could not connect to active browser tab.");
        }

        const tabId = tab.id;
        const history = [];
        const MAX_STEPS = 20;
        const selectedModel = modelSelect ? modelSelect.value : "groq/compound-mini";

        for (let step = 0; step < MAX_STEPS && running; step++) {
            stepCounter.textContent = `Step ${step + 1}/${MAX_STEPS}`;

            // 1. Capture Visible Tab Screenshot
            setStatus(`Capturing tab visual state (Step ${step + 1})...`);

            let rawScreenshotDataUrl = null;
            try {
                rawScreenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
                    format: "png"
                });
            } catch (e) {
                console.warn("captureVisibleTab warning:", e);
            }

            // 2. Extract DOM Context & Scan Sensitive Regions (Passing User Privacy Config)
            setStatus(`Scanning & redacting sensitive PII on-device (Step ${step + 1})...`);

            const pageContextData = await extractPageData(tabId, activePrivacyConfig);
            const rawContext = pageContextData.context;
            const sensitiveData = pageContextData.sensitive;

            // 3. Strict Client-Side Sanitization & Canvas Redaction
            let sanitizedScreenshot = null;
            let sanitizedContext = rawContext;
            let privacyStats = { redactedCount: 0, status: "CLIENT_PROTECTED" };

            if (window.PrivacyShield) {
                const sanitizedResult = window.PrivacyShield.sanitizePageContext(
                    rawContext,
                    sensitiveData.sensitiveRegions || [],
                    activePrivacyConfig
                );
                sanitizedContext = sanitizedResult.sanitizedContext;
                privacyStats = sanitizedResult.privacySummary;

                if (rawScreenshotDataUrl) {
                    sanitizedScreenshot = await window.PrivacyShield.redactScreenshotCanvas(
                        rawScreenshotDataUrl,
                        sensitiveData.sensitiveRegions || [],
                        {
                            width: sensitiveData.viewportWidth,
                            height: sensitiveData.viewportHeight
                        }
                    );
                }
            }

            // 4. Send Sanitized Payload with Selected Model to Backend VLM
            setStatus(`Vision AI (${selectedModel}) reasoning (Step ${step + 1})...`);

            const response = await fetch(BACKEND_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    task: task,
                    page_context: sanitizedContext,
                    screenshot: sanitizedScreenshot,
                    history: history,
                    privacy: privacyStats,
                    model: selectedModel
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Agent failed to determine next action.");
            }

            const action = data.action;

            // 5. Process Decision
            if (action.action === "done") {
                const finalResult = action.result || "Task completed successfully.";
                const activeModelName = data.model_used || selectedModel;
                await addChatMessage("agent", finalResult, activeModelName);
                hideStatus();
                running = false;
                break;
            }

            history.push({
                step: step + 1,
                action: action
            });

            // 6. Execute Action in Tab
            setStatus(`Executing ${action.action}...`);
            const actionResult = await executeActionInTab(tabId, action);

            history.push({
                step: step + 1,
                result: actionResult
            });

            await sleep(800);
        }

        if (running) {
            const limitMsg = "Agent reached the maximum 20-step execution safety limit.";
            await addChatMessage("agent", limitMsg);
            setStatus("Maximum steps reached.", "stopped");
            running = false;
        }
    } catch (err) {
        if (err.name === "AbortError") {
            await addChatMessage("agent", "Workflow execution was cancelled by user.");
            setStatus("Stopped", "stopped");
        } else {
            console.error("Agent execution error:", err);
            await addChatMessage("error", `${err.message || "Unknown error occurred."}`);
            showError(err.message || "Agent execution failed.");
            setStatus("Agent error", "error");
        }
    } finally {
        running = false;
        controller = null;
        setIdleState();
        updateSendButtonState();
        setTimeout(() => {
            if (!running) hideStatus();
        }, 2000);
    }
}

/* =========================================================
   PAGE CONTEXT EXTRACTION & SENSITIVE SCANNING
========================================================= */

async function extractPageData(tabId, userConfig = {}) {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (cfg) => {
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const dpr = window.devicePixelRatio || 1;

            // 1. Interactive Elements
            const elements = [];
            const interactive = document.querySelectorAll(
                'button, input, textarea, select, a, [role="button"], [role="link"], [role="textbox"], [role="combobox"]'
            );

            interactive.forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (
                    rect.width === 0 ||
                    rect.height === 0 ||
                    rect.bottom < 0 ||
                    rect.top > viewportHeight
                ) {
                    return;
                }

                elements.push({
                    tag: el.tagName.toLowerCase(),
                    text: (el.innerText || el.textContent || el.value || "").trim().slice(0, 200),
                    type: el.getAttribute("type"),
                    placeholder: el.getAttribute("placeholder"),
                    ariaLabel: el.getAttribute("aria-label"),
                    name: el.getAttribute("name"),
                    id: el.id || null,
                    role: el.getAttribute("role"),
                    href: el.tagName.toLowerCase() === "a" ? el.href : null,
                    rect: {
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    }
                });
            });

            const context = {
                url: window.location.href,
                title: document.title,
                text: document.body.innerText.slice(0, 12000),
                elements: elements.slice(0, 200)
            };

            // 2. Sensitive Scanner with User Preferences
            const sensitiveRegions = [];
            const SENSITIVE_KEYWORDS = [];
            if (cfg.auth !== false) {
                SENSITIVE_KEYWORDS.push("password", "passwd", "pass", "pin", "otp", "security_code", "secret", "api_key", "apikey", "access_token", "auth_token");
            }
            if (cfg.financial !== false) {
                SENSITIVE_KEYWORDS.push("cvv", "cvc", "credit_card", "card_number", "cardnumber", "bank_account", "account_number");
            }
            if (cfg.nationalIds !== false) {
                SENSITIVE_KEYWORDS.push("aadhaar", "aadhar", "pan", "passport", "ssn", "date_of_birth", "dob");
            }

            if (cfg.contacts !== false) {
                SENSITIVE_KEYWORDS.push("email", "mail", "phone", "mobile", "tel", "contact");
            }
            if (cfg.ner !== false) {
                SENSITIVE_KEYWORDS.push("name", "fullname", "first_name", "last_name", "city", "address", "location", "organization", "org", "company");
            }

            // Add custom user keywords
            if (cfg.customKeywords) {
                const customWords = cfg.customKeywords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
                SENSITIVE_KEYWORDS.push(...customWords);
            }

            const PATTERNS = {};
            if (cfg.auth !== false) {
                PATTERNS.API_KEY = /\b(?:sk|pk|api|key|token|secret)[_-][A-Za-z0-9_-]{16,}\b/gi;
                PATTERNS.AWS_ACCESS_KEY = /\bAKIA[0-9A-Z]{16}\b/g;
                PATTERNS.JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
            }
            if (cfg.financial !== false) {
                PATTERNS.CARD = /(?<!\d)(?:\d{4}[\s-]?){3}\d{4}(?!\d)/g;
                PATTERNS.IFSC = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
                PATTERNS.BANK_ACCOUNT = /(?<!\d)\d{9,18}(?!\d)/g;
            }
            if (cfg.nationalIds !== false) {
                PATTERNS.AADHAAR = /(?<!\d)\d{4}[\s-]\d{4}[\s-]\d{4}(?!\d)/g;
                PATTERNS.PAN = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
                PATTERNS.PASSPORT = /\b[A-Z][0-9]{7}\b/g;
            }
            if (cfg.contacts !== false) {
                PATTERNS.EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
                PATTERNS.PHONE = /(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g;
            }

            const LABELS = {
                PASSWORD: "REDACTED_PASSWORD",
                PIN: "REDACTED_PIN",
                OTP: "REDACTED_OTP",
                CVV: "REDACTED_CVV",
                CARD: "REDACTED_CARD",
                AADHAAR: "REDACTED_AADHAAR",
                PAN: "REDACTED_PAN",
                PASSPORT: "REDACTED_PASSPORT",
                BANK_ACCOUNT: "REDACTED_BANK_ACCOUNT",
                IFSC: "REDACTED_IFSC",
                EMAIL: "REDACTED_EMAIL",
                PHONE: "REDACTED_PHONE",
                API_KEY: "REDACTED_API_KEY",
                AWS_ACCESS_KEY: "REDACTED_AWS_KEY",
                JWT: "REDACTED_JWT",
                PER: "REDACTED_PERSON",
                LOC: "REDACTED_LOCATION",
                ORG: "REDACTED_ORGANIZATION",
                SENSITIVE_FIELD: "REDACTED_FIELD"
            };

            // Scan Form Elements
            document.querySelectorAll("input, textarea, select").forEach((input) => {
                const rect = input.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > viewportHeight) return;

                const type = (input.getAttribute("type") || "").toLowerCase();
                
                let labelText = "";
                try {
                    if (input.labels && input.labels.length > 0) {
                        labelText = Array.from(input.labels).map(l => l.innerText || l.textContent || "").join(" ");
                    }
                    if (!labelText && input.id) {
                        const associatedLabel = document.querySelector(`label[for="${input.id}"]`);
                        if (associatedLabel) labelText = associatedLabel.innerText || associatedLabel.textContent || "";
                    }
                    if (!labelText && input.closest) {
                        const parentLabel = input.closest("label") || input.parentElement?.querySelector("label");
                        if (parentLabel) labelText = parentLabel.innerText || parentLabel.textContent || "";
                    }
                } catch (e) {}

                const nameOrPlaceholder = `${input.name || ""} ${input.id || ""} ${input.placeholder || ""} ${input.getAttribute("aria-label") || ""} ${labelText}`.toLowerCase();

                let isSens = type === "password";
                let cat = isSens ? "PASSWORD" : null;

                // Check custom keywords first
                if (!isSens && cfg.customKeywords) {
                    const customWords = cfg.customKeywords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean);
                    for (const kw of customWords) {
                        const normalizedKw = kw.replace(/[-_\s]/g, "");
                        const normalizedTarget = nameOrPlaceholder.replace(/[-_\s]/g, "");
                        if (normalizedTarget.includes(normalizedKw)) {
                            isSens = true;
                            cat = "CUSTOM_SECRET";
                            break;
                        }
                    }
                }

                if (!isSens) {
                    for (const kw of SENSITIVE_KEYWORDS) {
                        if (nameOrPlaceholder.includes(kw)) {
                            isSens = true;
                            if (kw.includes("pass")) cat = "PASSWORD";
                            else if (kw.includes("card") || kw.includes("cvv")) cat = "CARD";
                            else if (kw.includes("otp") || kw.includes("pin")) cat = "PIN";
                            else if (kw.includes("aadhaar") || kw.includes("aadhar")) cat = "AADHAAR";
                            else if (kw.includes("pan")) cat = "PAN";
                            else if (kw.includes("email") || kw.includes("mail")) cat = "EMAIL";
                            else if (kw.includes("phone") || kw.includes("mobile") || kw.includes("tel")) cat = "PHONE";
                            else if (kw.includes("name")) cat = "PER";
                            else if (kw.includes("city") || kw.includes("address") || kw.includes("location")) cat = "LOC";
                            else cat = "SENSITIVE_FIELD";
                            break;
                        }
                    }
                }

                // Check input value against regex patterns & NER
                if (!isSens && input.value) {
                    const val = input.value;
                    for (const [type, regex] of Object.entries(PATTERNS)) {
                        regex.lastIndex = 0;
                        if (regex.test(val)) {
                            isSens = true;
                            cat = type;
                            break;
                        }
                    }
                    if (!isSens && cfg.ner !== false && typeof window !== "undefined" && window.ClientNER) {
                        const nerList = window.ClientNER.extractEntities(val);
                        if (nerList.length > 0) {
                            isSens = true;
                            cat = nerList[0].type;
                        }
                    }
                }

                if (isSens) {
                    sensitiveRegions.push({
                        category: cat || "SENSITIVE_FIELD",
                        label: LABELS[cat] || "REDACTED",
                        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                    });
                }
            });

            // Scan Text Nodes via DOM Range
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                    const tag = (node.parentElement?.tagName || "").toLowerCase();
                    if (tag === "script" || tag === "style" || tag === "noscript") return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            let currNode;
            while ((currNode = walker.nextNode())) {
                const text = currNode.textContent;
                const parentRect = currNode.parentElement?.getBoundingClientRect();
                if (parentRect && (parentRect.bottom < 0 || parentRect.top > viewportHeight)) continue;

                // Check active regex patterns
                for (const [type, regex] of Object.entries(PATTERNS)) {
                    regex.lastIndex = 0;
                    let m;
                    while ((m = regex.exec(text)) !== null) {
                        try {
                            const range = document.createRange();
                            range.setStart(currNode, m.index);
                            range.setEnd(currNode, m.index + m[0].length);
                            const r = range.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                sensitiveRegions.push({
                                    category: type,
                                    label: LABELS[type] || "REDACTED",
                                    rect: { x: r.x, y: r.y, width: r.width, height: r.height }
                                });
                            }
                        } catch (e) {
                            if (parentRect && parentRect.width > 0) {
                                sensitiveRegions.push({
                                    category: type,
                                    label: LABELS[type] || "REDACTED",
                                    rect: { x: parentRect.x, y: parentRect.y, width: parentRect.width, height: parentRect.height }
                                });
                            }
                        }
                    }
                }

                // Check custom keywords in text
                if (cfg.customKeywords) {
                    const customWords = cfg.customKeywords.split(",").map(w => w.trim()).filter(Boolean);
                    for (const kw of customWords) {
                        const kwRegex = new RegExp(`\\b${kw}\\b`, "gi");
                        let m;
                        while ((m = kwRegex.exec(text)) !== null) {
                            try {
                                const range = document.createRange();
                                range.setStart(currNode, m.index);
                                range.setEnd(currNode, m.index + m[0].length);
                                const r = range.getBoundingClientRect();
                                if (r.width > 0 && r.height > 0) {
                                    sensitiveRegions.push({
                                        category: "CUSTOM_SECRET",
                                        label: "REDACTED_SECRET",
                                        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
                                    });
                                }
                            } catch (e) {}
                        }
                    }
                }

                // Check on-device NER entities if enabled
                if (cfg.ner !== false && typeof window !== "undefined" && window.ClientNER) {
                    const nerEntities = window.ClientNER.extractEntities(text);
                    nerEntities.forEach(ent => {
                        try {
                            const range = document.createRange();
                            range.setStart(currNode, ent.start);
                            range.setEnd(currNode, ent.end);
                            const r = range.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                sensitiveRegions.push({
                                    category: ent.type,
                                    label: LABELS[ent.type] || "REDACTED",
                                    rect: { x: r.x, y: r.y, width: r.width, height: r.height }
                                });
                            }
                        } catch (e) {}
                    });
                }
            }

            return {
                context,
                sensitive: {
                    sensitiveRegions,
                    dpr,
                    viewportWidth,
                    viewportHeight
                }
            };
        },
        args: [userConfig]
    });

    const output = results[0]?.result;
    if (!output || !output.context) {
        throw new Error("Could not access or read current browser tab context.");
    }
    return output;
}

/* =========================================================
   ACTION EXECUTION
========================================================= */

async function executeActionInTab(tabId, action) {
    if (action.action === "navigate") {
        if (!action.url) throw new Error("Navigate action missing target URL.");
        await chrome.tabs.update(tabId, { url: action.url });
        return { success: true, message: `Navigated to ${action.url}` };
    }

    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (agentAction) => {
            const elements = [];
            document.querySelectorAll(
                'button, input, textarea, select, a, [role="button"], [role="link"], [role="textbox"], [role="combobox"]'
            ).forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (
                    rect.width === 0 ||
                    rect.height === 0 ||
                    rect.bottom < 0 ||
                    rect.top > window.innerHeight
                ) {
                    return;
                }
                elements.push(el);
            });

            if (agentAction.action === "click") {
                const element = elements[agentAction.index];
                if (!element) throw new Error(`Element ${agentAction.index} not found.`);
                element.scrollIntoView({ behavior: "instant", block: "center" });
                element.click();
                return { success: true, message: `Clicked element ${agentAction.index}` };
            }

            if (agentAction.action === "type") {
                const element = elements[agentAction.index];
                if (!element) throw new Error(`Element ${agentAction.index} not found.`);
                element.focus();

                const prototype = Object.getPrototypeOf(element);
                const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
                if (valueSetter) {
                    valueSetter.call(element, agentAction.text);
                } else {
                    element.value = agentAction.text;
                }

                element.dispatchEvent(new Event("input", { bubbles: true }));
                element.dispatchEvent(new Event("change", { bubbles: true }));
                return { success: true, message: `Typed into element ${agentAction.index}` };
            }

            if (agentAction.action === "press") {
                const key = agentAction.key;
                const target = document.activeElement || document.body;
                target.dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
                target.dispatchEvent(new KeyboardEvent("keyup", { key, code: key, bubbles: true, cancelable: true }));
                return { success: true, message: `Pressed ${key}` };
            }

            if (agentAction.action === "scroll") {
                const amount = agentAction.direction === "up" ? -600 : 600;
                window.scrollBy({ top: amount, behavior: "smooth" });
                return { success: true, message: `Scrolled ${agentAction.direction}` };
            }

            throw new Error(`Unsupported action: ${agentAction.action}`);
        },
        args: [action]
    });

    return results[0]?.result || { success: true };
}

/* =========================================================
   UI HELPERS & COPILOT CHAT RENDERER
========================================================= */

function setRunningState() {
    runButton.disabled = true;
    runButton.classList.remove("glowing");
    stopButton.classList.remove("hidden");
    statusCard.classList.remove("hidden");
}

function setIdleState() {
    stopButton.classList.add("hidden");
    updateSendButtonState();
}

function setStatus(message, state = "running") {
    statusCard.classList.remove("hidden");
    statusDetail(message);

    if (state === "running") {
        statusTitle.textContent = "Thinking";
        statusSpinner.classList.remove("hidden");
    } else {
        statusSpinner.classList.add("hidden");
        if (state === "stopped") statusTitle.textContent = "Cancelled";
        if (state === "error") statusTitle.textContent = "Error";
    }
}

function statusDetail(msg) {
    statusText.textContent = msg;
}

function hideStatus() {
    statusCard.classList.add("hidden");
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorCard.classList.remove("hidden");
}

function hideError() {
    errorCard.classList.add("hidden");
}

async function getChat() {
    const data = await chrome.storage.local.get(CHAT_KEY);
    return data[CHAT_KEY] || [];
}

async function saveChat(messages) {
    await chrome.storage.local.set({ [CHAT_KEY]: messages });
}

async function addChatMessage(role, content, model = null) {
    const messages = await getChat();
    messages.push({
        id: crypto.randomUUID(),
        role,
        content,
        model,
        timestamp: Date.now()
    });
    await saveChat(messages);
    renderChat();
}

function formatModelLabel(id) {
    if (!id) return "Groq Vision";
    if (id.includes("compound-mini")) return "Compound Mini";
    if (id.includes("120b")) return "GPT-OSS 120B";
    if (id.includes("20b")) return "GPT-OSS 20B";
    if (id.includes("qwen")) return "Qwen 27B";
    return id.split("/")[1] || id;
}

async function clearChat() {
    await chrome.storage.local.remove(CHAT_KEY);
    renderChat();
}

async function renderChat() {
    const messages = await getChat();
    chat.innerHTML = "";

    if (messages.length === 0) {
        chat.innerHTML = `
            <div class="chat-placeholder">
                <div class="placeholder-icon">
                    <img src="logo.png" alt="S.H.I.E.L.D Logo" class="placeholder-logo-img">
                </div>
                <div class="placeholder-title">S.H.I.E.L.D</div>
                <div class="placeholder-desc">
                    Automate tasks on your active browser tab. All sensitive form data, credentials, and screen pixels are masked locally before AI processing.
                </div>
            </div>
        `;
        return;
    }

    messages.forEach((m) => {
        const item = document.createElement("div");
        item.className = `msg-block ${m.role}`;

        if (m.role === "user") {
            item.innerHTML = `
                <div class="msg-content">${escapeHtml(m.content)}</div>
                <div class="msg-timestamp">${formatTime(m.timestamp)}</div>
            `;
        } else if (m.role === "agent") {
            item.innerHTML = `
                <div class="agent-label-row">
                    <img src="logo.png" alt="S.H.I.E.L.D" class="agent-avatar-img">
                    <span>S.H.I.E.L.D</span>
                </div>
                <div class="msg-content">${formatAgentResponse(m.content)}</div>
                <div class="msg-timestamp">${formatTime(m.timestamp)}</div>
            `;
        } else if (m.role === "error") {
            item.innerHTML = `
                <div class="msg-content">${escapeHtml(m.content)}</div>
                <div class="msg-timestamp">${formatTime(m.timestamp)}</div>
            `;
        }

        chat.appendChild(item);
    });

    chat.scrollTop = chat.scrollHeight;
}

function formatAgentResponse(content) {
    if (!content) return "";
    let safe = escapeHtml(content);
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-family: var(--font-code); font-size: 11px;">$1</code>');
    return safe;
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
    const p = document.createElement("p");
    p.textContent = str;
    return p.innerHTML;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadPrivacyConfig();
    await renderChat();
    updateSendButtonState();
    taskInput.focus();
});