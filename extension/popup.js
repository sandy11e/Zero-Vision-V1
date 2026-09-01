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
const exampleButtons = document.querySelectorAll(".sugg-chip");

const redactedCountBadge = document.getElementById("redactedCountBadge");
const togglePreviewBtn = document.getElementById("togglePreviewBtn");
const togglePreviewText = document.getElementById("togglePreviewText");
const previewContainer = document.getElementById("previewContainer");
const redactedPreviewImg = document.getElementById("redactedPreviewImg");

/* =========================================================
   CONFIG & STATE
========================================================= */

const BACKEND_URL = "http://127.0.0.1:8000/agent/next";
const CHAT_KEY = "copilotPrivacyVisionSideChat";

let running = false;
let controller = null;
let currentPreviewVisible = false;

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

exampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const text = button.querySelector("span")?.textContent || button.textContent;
        taskInput.value = text.trim();
        autoResizeTextarea();
        updateSendButtonState();
        taskInput.focus();
    });
});

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

togglePreviewBtn.addEventListener("click", () => {
    currentPreviewVisible = !currentPreviewVisible;
    if (currentPreviewVisible) {
        previewContainer.classList.remove("hidden");
        togglePreviewText.textContent = "Hide Mask";
    } else {
        previewContainer.classList.add("hidden");
        togglePreviewText.textContent = "Inspect Mask";
    }
});

clearHistoryButton.addEventListener("click", clearChatWithPrompt);

async function clearChatWithPrompt() {
    if (running) return;
    const messages = await getChat();
    if (messages.length === 0) return;
    if (confirm("Clear conversation history?")) {
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

            // 2. Extract DOM Context & Scan Sensitive Regions
            setStatus(`Scanning & redacting sensitive PII on-device (Step ${step + 1})...`);

            const pageContextData = await extractPageData(tabId);
            const rawContext = pageContextData.context;
            const sensitiveData = pageContextData.sensitive;

            // 3. Strict Client-Side Sanitization & Canvas Redaction
            let sanitizedScreenshot = null;
            let sanitizedContext = rawContext;
            let privacyStats = { redactedCount: 0, status: "CLIENT_PROTECTED" };

            if (window.PrivacyShield) {
                const sanitizedResult = window.PrivacyShield.sanitizePageContext(
                    rawContext,
                    sensitiveData.sensitiveRegions || []
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

                    redactedPreviewImg.src = sanitizedScreenshot;
                }
            }

            const totalRedacted = privacyStats.redactedCount || sensitiveData.sensitiveRegions.length || 0;
            redactedCountBadge.textContent = `${totalRedacted} items`;

            // 4. Send Sanitized Payload to Backend VLM
            setStatus(`Vision AI reasoning (Step ${step + 1})...`);

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
                    privacy: privacyStats
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
                await addChatMessage("agent", finalResult);
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

async function extractPageData(tabId) {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
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

            // 2. Sensitive Scanner
            const sensitiveRegions = [];
            const SENSITIVE_KEYWORDS = [
                "password", "passwd", "pass", "pin", "otp", "security_code",
                "secret", "cvv", "cvc", "credit_card", "card_number", "cardnumber",
                "bank_account", "account_number", "aadhaar", "aadhar", "pan",
                "passport", "ssn", "date_of_birth", "dob", "birth_date",
                "api_key", "apikey", "access_token", "auth_token", "bearer_token"
            ];

            const PATTERNS = {
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
                SENSITIVE_FIELD: "REDACTED_FIELD"
            };

            // Scan Form Elements
            document.querySelectorAll("input, textarea, select").forEach((input) => {
                const rect = input.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0 || rect.bottom < 0 || rect.top > viewportHeight) return;

                const type = (input.getAttribute("type") || "").toLowerCase();
                const nameOrPlaceholder = `${input.name || ""} ${input.id || ""} ${input.placeholder || ""} ${input.getAttribute("aria-label") || ""}`.toLowerCase();

                let isSens = type === "password";
                let cat = isSens ? "PASSWORD" : null;

                if (!isSens) {
                    for (const kw of SENSITIVE_KEYWORDS) {
                        if (nameOrPlaceholder.includes(kw)) {
                            isSens = true;
                            if (kw.includes("pass")) cat = "PASSWORD";
                            else if (kw.includes("card") || kw.includes("cvv")) cat = "CARD";
                            else if (kw.includes("otp") || kw.includes("pin")) cat = "PIN";
                            else if (kw.includes("aadhaar") || kw.includes("aadhar")) cat = "AADHAAR";
                            else if (kw.includes("pan")) cat = "PAN";
                            else if (kw.includes("email")) cat = "EMAIL";
                            else if (kw.includes("phone")) cat = "PHONE";
                            else cat = "SENSITIVE_FIELD";
                            break;
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
        }
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

async function addChatMessage(role, content) {
    const messages = await getChat();
    messages.push({
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: Date.now()
    });
    await saveChat(messages);
    renderChat();
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                </div>
                <div class="placeholder-title">Privacy Vision Agent</div>
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span>Privacy Agent</span>
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
    await renderChat();
    updateSendButtonState();
    taskInput.focus();
});