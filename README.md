# 🛡️ S.H.I.E.L.D — Privacy-Preserving AI Browser Vision Agent



> **Autonomous Vision-driven Web Navigation with Zero-Leakage Client-Side Privacy Guarantees.**  
> Execute complex browser workflows, fill forms, and interact with dynamic web applications without ever sending raw passwords, payment cards, national identity documents (Aadhaar, PAN, Passport), or credentials to cloud LLMs/VLMs.

---

## 📑 Table of Contents

- [The Core Problem](#-the-core-problem)
- [How S.H.I.E.L.D Solves It](#-how-shield-solves-it)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Key Features](#-key-features)
- [Privacy & Redaction Matrix](#-privacy--redaction-matrix)
- [Repository Structure](#-repository-structure)
- [Prerequisites](#-prerequisites)
- [Quickstart Guide](#-quickstart-guide)
  - [1. Backend Service Setup](#1-backend-service-setup)
  - [2. Chrome Extension Installation](#2-chrome-extension-installation)
  - [3. Running the Verification Testbed](#3-running-the-verification-testbed)
- [Live Telemetry & Compliance Dashboard](#-live-telemetry--compliance-dashboard)
- [API Reference](#-api-reference)
- [Automated Testing & Quality Assurance](#-automated-testing--quality-assurance)
- [License & Contribution](#-license--contribution)

---

## 🚨 The Core Problem

Autonomous Vision Agents (such as standard implementations of `browser-use`, Multimodal Web Agents, and visual RPA bots) operate by capturing full-resolution screenshots of the browser tab and piping both raw images and unmasked DOM trees directly to third-party cloud Vision-Language Models (VLMs).

When navigating real-world sites—such as banking portals, government KYC forms, healthcare systems, e-commerce checkouts, and internal dashboards—these agents inadvertently transmit:

- 🔑 **Passwords, PINs, OTPs, and API Keys**
- 💳 **Credit/Debit Card Numbers, CVVs, Bank Accounts, and IFSC Codes**
- 🆔 **National ID Numbers (Indian Aadhaar, PAN Card, Passports, SSNs)**
- 📞 **Personal Identifiable Information (Full Names, Phone Numbers, Emails, Addresses)**

This creates an unacceptable compliance and privacy risk under **GDPR, CCPA, and DPDP regulations**, exposing sensitive credentials to remote model prompts, server logs, and external training sets.

---

## 🛡️ How S.H.I.E.L.D Solves It

**S.H.I.E.L.D** (*Secure Heuristic & In-browser Entity Level Defense*) introduces an **on-device client privacy perimeter** directly inside Google Chrome before any payload is dispatched over the network.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 LOCAL BROWSER RUNTIME                                  │
│                                                                                        │
│  [ Web Page DOM + Screen ]                                                             │
│             │                                                                          │
│             ▼                                                                          │
│  [ In-Page Scanner & Coordinate Detector ]                                             │
│             │                                                                          │
│             ├──► On-Device NER Engine (WebAssembly / WebGPU, 0 Network Calls)          │
│             ├──► Regex Pattern Engine (Aadhaar, PAN, Cards, Credentials, etc.)         │
│             └──► Custom Confidential Keywords Filter                                   │
│             │                                                                          │
│             ▼                                                                          │
│  [ Privacy Shield Sanitization Pipeline ]                                              │
│             ├──► Canvas Visual Redactor: Blackout boxes + labeled security borders     │
│             └──► DOM Tree Sanitizer: Masks attributes, inputs, and visible text        │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │
                    [ Sanitized Base64 Screenshot + Redacted DOM Context ]
                    (ZERO Raw PII Leaves the Client Device)
                                              │
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                FASTAPI BACKEND SERVICE                                 │
│                                                                                        │
│  [ Secondary Defense-in-Depth Backstop (Halts on unmasked credentials) ]               │
│                                             │                                          │
│                                             ▼                                          │
│  [ Resilient Groq VLM Decision Engine (Waterfall failover across candidate models) ]   │
│                                             │                                          │
│                                             ▼                                          │
│  [ Atomic Action JSON Validation (click / type / navigate / press / scroll / done) ]   │
│                                             │                                          │
│                                             ▼                                          │
│  [ Telemetry Store (Live Metrics, Histogram, & Screenshot Frame Inspector) ]           │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │
                                    [ Action Instruction ]
                                              │
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CHROME CONTENT SCRIPT                                    │
│                                                                                        │
│  [ Safe Execution in Tab (Synthetic Event Dispatch, Smooth Scroll, Focus/Click) ]      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Pixel-Perfect Canvas Redaction**: Before screenshots are serialized, coordinates of sensitive fields and text spans are calculated. An HTML5 Canvas renders solid dark blackout rectangles with bright red borders and badges (e.g. `🔒 [REDACTED_PASSWORD]`, `🔒 [REDACTED_CARD]`) over those exact pixel regions.
2. **DOM & Context Sanitization**: Page text, form input values, placeholders, and interactive element labels are replaced with token placeholders before the request is built.
3. **On-Device NER (Named Entity Recognition)**: Unstructured entities (Person Names, Locations, Organizations) are identified purely in the browser engine via token context heuristics and honorific classifications—without sending text to an external NLP API.
4. **Server-Side Defense-in-Depth**: The backend runs a second privacy evaluation backstop. If any critical unmasked credential is detected in the payload, execution immediately aborts with status `BLOCKED`.
5. **Real-Time Audit Transparency**: Every redaction count and sanitized screenshot frame is streamed to an enterprise live audit dashboard for full human oversight.

---

## ⚡ Key Features

- **🔒 Zero Cloud PII Leakage**: 100% of sensitive detection and visual masking occurs in Chrome before network dispatch.
- **🎨 HTML5 Canvas Blackout Engine**: High-fidelity visual bounding-box redaction preserving agent spatial awareness while obscuring secret pixel data.
- **🧠 On-Device NER Engine (`ner.js`)**: Fast, client-side NLP classifying Person Names (`PER`), Locations (`LOC`), and Organizations (`ORG`).
- **🇮🇳 Comprehensive Indian & International PII Support**:
  - **Aadhaar Numbers**: `\d{4}[\s-]\d{4}[\s-]\d{4}`
  - **PAN Cards**: `[A-Z]{5}[0-9]{4}[A-Z]`
  - **Passports & Bank Details**: Bank Accounts, IFSC Codes, Credit/Debit Cards, CVVs
  - **Authentication Data**: Passwords, PINs, OTPs, API keys, AWS access keys (`AKIA...`), JWT tokens
  - **Contacts**: Personal Emails, Mobile numbers (`+91` Indian mobile formats)
- **⚙️ Dynamic User Privacy Preferences**: Slide-out configuration drawer in the extension to toggle individual privacy categories and define custom confidential words on the fly.
- **🤖 High-Speed Multi-Model Groq Engine**: Resilient failover among ultralow-latency models:
  - `groq/compound-mini` (Fast Default)
  - `openai/gpt-oss-20b` (Deep Reasoning)
  - `openai/gpt-oss-120b` (Complex Workflows)
  - `qwen/qwen3.6-27b` (High-Precision Vision)
- **🎙️ Native Voice Input (Speech-to-Text)**: Speak browser commands hands-free via Chrome's native Web Speech API with real-time text streaming and pulsing audio wave feedback.
- **🖥️ Native Manifest V3 Chrome Side Panel**: Clean Copilot-style persistent side panel UI with dark/light mode, live execution progress badges, model selector, and styled in-app confirmation modals.
- **📊 Real-Time Compliance Audit Dashboard**: Interactive web dashboard at `/dashboard` featuring live VLM frame view, category histograms, timeline audits, and an interactive PII sandbox.

---

## 📊 Privacy & Redaction Matrix

| Category | Entities Covered | Client Detection Method | Visual Canvas Behavior | Cloud VLM Visibility |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Passwords, PINs, OTPs, Security Codes | Input type, field name keywords, regex | Blackout box + `🔒 [REDACTED_PASSWORD]` | Completely Obscured |
| **Identity Documents** | Indian Aadhaar, PAN, Passports | Strict non-overlapping regex | Blackout box + `🔒 [REDACTED_AADHAAR]` | Completely Obscured |
| **Financial PII** | Credit/Debit Cards, CVVs, Bank A/C, IFSC | Regex pattern + field keyword heuristics | Blackout box + `🔒 [REDACTED_CARD]` | Completely Obscured |
| **Secrets & Keys** | API Keys, AWS Access Keys, JWTs | Key prefix patterns (`sk-`, `AKIA`, `eyJ...`) | Blackout box + `🔒 [REDACTED_API_KEY]` | Completely Obscured |
| **Contacts** | Emails, Phone Numbers (+91) | RFC-compliant email regex, mobile patterns | Blackout box + `🔒 [REDACTED_EMAIL]` | Completely Obscured |
| **Unstructured Entities** | Person Names, Locations, Orgs | On-device NER gazetteer + honorific parsing | Blackout box + `🔒 [REDACTED_PERSON]` | Completely Obscured |
| **User Custom Secrets** | Proprietary project codes, internal IDs | Dynamic normalized keyword matcher | Blackout box + `🔒 [REDACTED_SECRET]` | Completely Obscured |

---

## 📂 Repository Structure

```
privacy-browser-agent/
├── README.md                      # Project documentation and guide
├── logo.png                       # S.H.I.E.L.D shield emblem logo
├── demo_secure_form.html          # Interactive KYC banking testbed
│
├── backend/                       # FastAPI AI Decision Engine & Telemetry Server
│   ├── .env                       # API keys and configuration
│   ├── .gitignore                 # Environment exclusions
│   ├── requirements.txt           # Python dependency specifications
│   ├── main.py                    # FastAPI application, agent loop, API endpoints
│   ├── dashboard.py               # Enterprise live telemetry & audit dashboard HTML/JS
│   ├── agent.py                   # Standalone browser-use reference script
│   ├── test_api_flow.py           # Integration tests for FastAPI endpoints
│   ├── test_client_privacy.js     # Node.js automated unit tests for privacy shield
│   ├── test_privacy.py            # Unit tests for backend detector patterns
│   ├── test_policy.py             # Unit tests for policy decision rules
│   ├── test_redactor.py           # Unit tests for backend text redaction
│   └── privacy/                   # Server-side defense-in-depth privacy package
│       ├── __init__.py            # Package initialization
│       ├── detector.py            # Backend pattern detection & element scanner
│       ├── policy.py              # Policy engine (ALLOW, REDACT, BLOCK)
│       └── redactor.py            # Position-preserving string redactor
│
└── extension/                     # Chrome Manifest V3 Side Panel Extension
    ├── manifest.json              # Extension manifest (MV3, SidePanel, Scripting)
    ├── background.js              # Service worker managing side panel trigger
    ├── content.js                 # In-page DOM reader and action executor
    ├── ner.js                     # On-device client Named Entity Recognition engine
    ├── privacy.js                 # Canvas pixel redactor & DOM sanitizer
    ├── popup.html                 # Extension Side Panel user interface
    ├── popup.css                  # UI styling (dark/light themes, Copilot layout)
    ├── popup.js                   # Extension controller and agent client loop
    └── logo.png                   # Extension icon asset
```

---

## 💻 Prerequisites

- **Operating System**: Windows, macOS, or Linux
- **Python**: Version `3.10` or higher
- **Google Chrome**: Version `116` or higher (supports Chrome Side Panel API)
- **Groq API Key**: Free or commercial key from [console.groq.com](https://console.groq.com)
- **Node.js** *(optional)*: For running client-side automated tests

---

## 🚀 Quickstart Guide

### 1. Backend Service Setup

Navigate to the `backend/` directory:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Configure your environment variables in `backend/.env`:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
AGENT_MODEL=groq/compound-mini
```

Start the FastAPI server:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Verify that the backend is active:
- API Status: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- Live Dashboard: [http://127.0.0.1:8000/dashboard](http://127.0.0.1:8000/dashboard)

---

### 2. Chrome Extension Installation

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/` folder from this repository (`privacy-browser-agent/extension`).
5. The **S.H.I.E.L.D** icon will appear in your Chrome toolbar.
6. Click the extension icon. S.H.I.E.L.D will open conveniently in the **Chrome Side Panel**.

---

### 3. Running the Verification Testbed

An interactive test page is included in the root directory: `demo_secure_form.html`.

1. In Chrome, open `demo_secure_form.html`:
   - Press `Ctrl + O` (or `Cmd + O` on Mac) and select `demo_secure_form.html`, or drag and drop it into Chrome.
2. The page simulates a **Citizen Banking & KYC Verification Portal** containing:
   - Full Name, City of Residence
   - Aadhaar Number (`1234 5678 9012`)
   - PAN Card Number (`ABCDE1234F`)
   - Personal Email (`pranesh.kumar@example.com`)
   - Mobile Phone (`+91 9876543210`)
   - Credit Card (`4111 2222 3333 4444`)
   - Security PIN (`9876`)
   - Unstructured text with Person Names, Locations, and Organizations
3. Open the **S.H.I.E.L.D Side Panel**.
4. Enter an instruction in the prompt composer, for example:
   ```text
   Review this KYC form and click the Complete Verification & Submit button.
   ```
5. Click **Send** or press `Enter`.
6. Watch S.H.I.E.L.D:
   - Identify all sensitive inputs and text nodes.
   - Blackout the sensitive areas on the canvas screenshot.
   - Mask sensitive values in the DOM representation.
   - Reason on the sanitized page state using Groq VLM.
   - Execute the target click action accurately.
7. Open [http://127.0.0.1:8000/dashboard](http://127.0.0.1:8000/dashboard) to view the live sanitized screenshot frame and audit logs in real-time.

---

## 📈 Live Telemetry & Compliance Dashboard

The backend includes an integrated real-time auditing suite served at `http://127.0.0.1:8000/dashboard`:

- 🖼️ **VLM Frame Inspector**: Inspect the exact visual screenshot received by the Vision AI, confirming that sensitive fields are completely blacked out with protective labels.
- 📊 **PII Redaction Breakdown**: Live counters and category histograms tracking redactions for Aadhaar, PAN, Card, CVV, Password, PIN, OTP, Phone, Email, API Key, and JWT.
- ⏱️ **Timeline Audit Log**: Step-by-step audit record of user requests, active model, generated actions, and timestamps.
- 🧪 **Interactive PII Sandbox**: Testbed for auditors to input arbitrary text or strings and observe on-the-fly detection and sanitization output.
- 🌓 **Theme Support**: Seamless dark and light themes matching enterprise design standards.

---

## 📡 API Reference

### `GET /`
Returns service status, active model, and dashboard link.

**Response:**
```json
{
  "status": "ok",
  "service": "S.H.I.E.L.D Vision Browser Agent API",
  "privacy_shield": "Client-Side Zero-Leakage Active",
  "model": "openai/gpt-oss-20b",
  "dashboard_url": "http://127.0.0.1:8000/dashboard"
}
```

---

### `POST /agent/next`
Evaluates the current sanitized browser state and determines the next single atomic browser action.

**Request Body:**
```json
{
  "task": "Submit the registration form",
  "page_context": {
    "url": "https://example.com/register",
    "title": "User Registration",
    "text": "Name: John Doe. Email: [REDACTED_EMAIL].",
    "elements": [
      {
        "tag": "button",
        "type": "submit",
        "text": "Register",
        "rect": { "x": 100, "y": 240, "width": 150, "height": 40 }
      }
    ]
  },
  "screenshot": "data:image/jpeg;base64,...",
  "history": [],
  "privacy": {
    "redactedCount": 2,
    "categories": { "PASSWORD": 1, "EMAIL": 1 },
    "status": "CLIENT_PROTECTED"
  },
  "model": "groq/compound-mini"
}
```

**Response:**
```json
{
  "success": true,
  "action": {
    "action": "click",
    "index": 0
  },
  "model_used": "groq/compound-mini",
  "privacy": {
    "redactedCount": 2,
    "categories": { "PASSWORD": 1, "EMAIL": 1 },
    "status": "CLIENT_PROTECTED"
  }
}
```

---

### Supported Action Types

| Action | Format | Description |
| :--- | :--- | :--- |
| `navigate` | `{"action": "navigate", "url": "https://example.com"}` | Navigates the active tab to the specified URL |
| `click` | `{"action": "click", "index": 3}` | Clicks element at specified index from interactive list |
| `type` | `{"action": "type", "index": 1, "text": "value"}` | Focuses element, sets value, and dispatches input events |
| `press` | `{"action": "press", "key": "ENTER"}` | Dispatches keyboard keydown and keyup events |
| `scroll` | `{"action": "scroll", "direction": "down"}` | Scrolls viewport smoothly (`up` or `down`) |
| `done` | `{"action": "done", "result": "Task completed"}` | Concludes task execution and reports final result |

---

### `GET /api/telemetry`
Returns accumulated real-time telemetry, step counts, category histograms, and the latest sanitized frame.

### `POST /api/telemetry/reset`
Resets the in-memory telemetry buffer.

### `POST /api/sandbox/test`
Instant PII detection and redaction sandbox endpoint.
```json
{
  "text": "Contact pranesh@example.com or call +91 9876543210 with PAN ABCDE1234F"
}
```

---

## 🧪 Automated Testing & Quality Assurance

S.H.I.E.L.D includes automated test suites covering both the client-side privacy engine and backend decision pipeline.

### 1. Client-Side Privacy Shield & NER Test (Node.js)
Tests on-device regex masking, token intervals, custom secret matching, and DOM sanitization:

```bash
cd backend
node test_client_privacy.js
```

**Expected Output:**
```
=======================================================
   TESTING CLIENT-SIDE PRIVACY SHIELD & ON-DEVICE NER 
=======================================================
Test [1] Indian Aadhaar Masking: PASSED ✅
Test [2] Indian PAN Card Masking: PASSED ✅
Test [3] Credit Card Masking: PASSED ✅
Test [4] Email and Phone Masking: PASSED ✅
Test [5] API Key and JWT Token Masking: PASSED ✅
Test [6] Bank Account and IFSC Masking: PASSED ✅
Test [7] Unstructured Person Name & Location (On-Device NER): PASSED ✅
Test [8] User-Defined Custom Confidential Words: PASSED ✅
Page Sanitization: PASSED ✅
=======================================================
   TOTAL TESTS: 9 | PASSED: 9
=======================================================
```

### 2. Backend Integration Test (Python)
Validates `/` health check, sanitized payload handling, and model inference:

```bash
cd backend
python test_api_flow.py
```

### 3. Backend Privacy Detection & Policy Tests
Validates server-side regex detection, policy actions, and text redactor:

```bash
cd backend
python test_privacy.py
python test_policy.py
python test_redactor.py
```

---

## ⚖️ License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with 🛡️ by the <strong>S.H.I.E.L.D</strong> Core Team — Delivering Zero-Leakage Privacy for the Autonomous AI Web.
</p>
