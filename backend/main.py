import json
import os
import re
import time
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import groq

from privacy.detector import detect_page, detect_text
from privacy.policy import evaluate_detections, Action
from privacy.redactor import redact_text
from dashboard import DASHBOARD_HTML

load_dotenv()

app = FastAPI(
    title="Privacy Vision Browser Agent API",
    version="1.0.0"
)

# =========================================================
# CORS MIDDLEWARE
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# LIVE TELEMETRY STORE (FOR JUDGE & DASHBOARD MONITORING)
# =========================================================

TELEMETRY_STATE = {
    "latest_screenshot": None,
    "latest_timestamp": None,
    "total_steps": 0,
    "total_redactions": 0,
    "category_counts": {
        "AADHAAR": 0,
        "PAN": 0,
        "CARD": 0,
        "CVV": 0,
        "PASSWORD": 0,
        "PIN": 0,
        "OTP": 0,
        "PHONE": 0,
        "EMAIL": 0,
        "API_KEY": 0,
        "JWT": 0,
        "AWS_ACCESS_KEY": 0
    },
    "history": []
}

# =========================================================
# MODELS
# =========================================================

class ElementRect(BaseModel):
    x: int | float | None = 0
    y: int | float | None = 0
    width: int | float | None = 0
    height: int | float | None = 0


class PageElement(BaseModel):
    tag: str | None = None
    text: str | None = None
    type: str | None = None
    placeholder: str | None = None
    ariaLabel: str | None = None
    name: str | None = None
    id: str | None = None
    role: str | None = None
    href: str | None = None
    rect: ElementRect | None = None


class PageContext(BaseModel):
    url: str
    title: str
    text: str
    elements: list[PageElement] = []


class HistoryItem(BaseModel):
    step: int
    action: dict | None = None
    result: dict | None = None


class NextActionRequest(BaseModel):
    task: str
    page_context: PageContext
    screenshot: str | None = None  # Base64 sanitized screenshot
    history: list[HistoryItem] = []
    privacy: dict | None = None
    model: str | None = None


class SandboxRequest(BaseModel):
    text: str


# =========================================================
# GROQ CLIENT SETUP
# =========================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = groq.AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
DEFAULT_MODEL = os.getenv("AGENT_MODEL", "openai/gpt-oss-20b")

# =========================================================
# SYSTEM PROMPT
# =========================================================

SYSTEM_PROMPT = """You are the decision engine for a Privacy-Preserving Browser Vision Agent.
You control a real Chrome browser through an extension.

Your goal is to inspect the user's task and CURRENT browser state (visual layout & interactive DOM elements) and choose exactly ONE next action.

AVAILABLE ACTIONS:
1. navigate:
   {"action": "navigate", "url": "https://example.com"}

2. click:
   {"action": "click", "index": 3}

3. type:
   {"action": "type", "index": 2, "text": "sample text"}

4. press:
   {"action": "press", "key": "ENTER"}

5. scroll:
   {"action": "scroll", "direction": "down"}

6. done:
   {"action": "done", "result": "The final answer or summary of completed task..."}

RULES:
- Return ONLY a valid JSON object matching one of the action formats above.
- Return exactly ONE action per step.
- Never wrap with conversational filler outside the JSON object.
- Element indices refer directly to the INTERACTIVE ELEMENTS list ([0], [1], [2], ...).
- If the requested task is already fulfilled or the requested information is clearly visible on the page, return "done" with the result immediately.
- For search tasks, prefer direct navigation (e.g. https://www.google.com/search?q=...) when practical.
- Do not repeat an action that has already failed in the history.

PRIVACY & REDACTION AWARENESS:
- The screen and DOM have been sanitized by an in-browser Privacy Shield.
- Placeholders such as [REDACTED_PASSWORD], [REDACTED_CARD], [REDACTED_AADHAAR], [REDACTED_PAN], [REDACTED_EMAIL], [REDACTED_PHONE] indicate protected private fields.
- On the visual screenshot, redacted areas appear as dark labeled blackout boxes.
- Never attempt to reconstruct or request the user's private credentials.
- Fill non-sensitive workflow fields normally while respecting privacy boundaries.
"""

# =========================================================
# JSON PARSING HELPER
# =========================================================

def normalize_action_dict(data: dict) -> dict:
    if "element_index" in data and "index" not in data:
        data["index"] = data["element_index"]
    if "target" in data and isinstance(data["target"], dict) and "index" in data["target"] and "index" not in data:
        data["index"] = data["target"]["index"]
    return data


def extract_json(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Model returned an empty response.")

    text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return normalize_action_dict(data)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        data = json.loads(match.group(1))
        if isinstance(data, dict):
            return normalize_action_dict(data)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        data = json.loads(text[start : end + 1])
        if isinstance(data, dict):
            return normalize_action_dict(data)

    raise ValueError(f"Model did not return a valid JSON action: {text}")

# =========================================================
# PROMPT BUILDERS
# =========================================================

def build_page_context_text(page: PageContext) -> str:
    elements_text = []
    for i, el in enumerate(page.elements):
        coords = f" (pos: x={el.rect.x}, y={el.rect.y}, w={el.rect.width}, h={el.rect.height})" if el.rect else ""
        elements_text.append(
            f"[{i}] <{el.tag or 'element'}> text='{el.text or ''}' type='{el.type or ''}' placeholder='{el.placeholder or ''}' aria='{el.ariaLabel or ''}' name='{el.name or ''}'{coords}"
        )

    return f"""CURRENT BROWSER STATE:
URL: {page.url}
TITLE: {page.title}

VISIBLE TEXT:
{page.text[:4000]}

INTERACTIVE ELEMENTS (Choose by index):
{chr(10).join(elements_text[:120])}
"""


def build_history_text(history: list[HistoryItem]) -> str:
    if not history:
        return "No previous steps (this is step 1)."
    lines = []
    for item in history[-8:]:
        if item.action:
            lines.append(f"Step {item.step} ACTION: {json.dumps(item.action)}")
        if item.result:
            lines.append(f"Step {item.step} RESULT: {json.dumps(item.result)}")
    return "\n".join(lines)


# =========================================================
# DEFENSE-IN-DEPTH PRIVACY LAYER (SERVER-SIDE BACKSTOP)
# =========================================================

def server_privacy_check(page_context: PageContext):
    original = page_context.model_dump()
    detections = detect_page(original)
    decisions = evaluate_detections(detections)

    blocked = [d for d in decisions if d.action == Action.BLOCK]
    if blocked:
        return {
            "status": "BLOCKED",
            "reason": "Unmasked critical credentials detected in page context."
        }

    return {
        "status": "PROTECTED",
        "context": page_context
    }

# =========================================================
# ACTION VALIDATION
# =========================================================

def validate_action(action: dict, page_context: PageContext):
    allowed = {"navigate", "click", "type", "press", "scroll", "done"}
    action_type = action.get("action")

    if action_type not in allowed:
        raise ValueError(f"Unsupported action type: {action_type}")

    if action_type == "navigate":
        if not action.get("url"):
            raise ValueError("navigate action requires a target 'url'")

    elif action_type in {"click", "type"}:
        index = action.get("index")
        if not isinstance(index, int):
            raise ValueError(f"{action_type} action requires an integer 'index'")
        if index < 0 or index >= len(page_context.elements):
            raise ValueError(f"Element index {index} is out of bounds (0-{len(page_context.elements)-1})")

    if action_type == "type":
        if "text" not in action:
            raise ValueError("type action requires 'text' field")

    elif action_type == "press":
        if not action.get("key"):
            raise ValueError("press action requires 'key' field (e.g. 'ENTER')")

    elif action_type == "scroll":
        if action.get("direction") not in {"up", "down"}:
            raise ValueError("scroll direction must be 'up' or 'down'")

    elif action_type == "done":
        if "result" not in action:
            action["result"] = "Task completed."

# =========================================================
# AGENT DECISION ENGINE
# =========================================================

async def decide_action(
    task: str,
    page_context: PageContext,
    screenshot: str | None,
    history: list[HistoryItem],
    preferred_model: str | None = None
) -> dict:
    if not groq_client:
        raise ValueError("GROQ_API_KEY environment variable is not configured.")

    # 1. Multi-Layer Server Privacy Backstop
    privacy_check = server_privacy_check(page_context)
    if privacy_check["status"] == "BLOCKED":
        return {
            "action": "done",
            "result": "Execution stopped: Critical credential detected without local redaction."
        }

    safe_context = privacy_check.get("context", page_context)

    # 2. Build Multi-Modal Prompt
    user_prompt_text = f"""USER GOAL / TASK:
{task}

{build_page_context_text(safe_context)}

PREVIOUS STEPS:
{build_history_text(history)}

Choose the single best next action. Return valid JSON only with keys "action", "index" (if click/type), "text" (if type), or "result" (if done)."""

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt_text}
    ]

    # 3. Call Groq Model with automatic resilient fallback
    CANDIDATE_MODELS = []
    if preferred_model:
        CANDIDATE_MODELS.append(preferred_model)
    default_m = os.getenv("AGENT_MODEL", "openai/gpt-oss-20b")
    if default_m not in CANDIDATE_MODELS:
        CANDIDATE_MODELS.append(default_m)
    for fallback_m in ["groq/compound-mini", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"]:
        if fallback_m not in CANDIDATE_MODELS:
            CANDIDATE_MODELS.append(fallback_m)

    response = None
    last_error = None
    used_model = None
    for model_name in CANDIDATE_MODELS:
        try:
            print(f"🤖 [AI Engine] Requesting inference from: {model_name}...")
            response = await groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.0,
                max_tokens=800,
                response_format={"type": "json_object"}
            )
            if response and response.choices:
                used_model = model_name
                print(f"✅ [AI Engine] Successfully responded using model: {model_name}")
                break
        except Exception as err:
            last_error = err
            print(f"⚠️ Model {model_name} failed ({err}), failing over to next candidate...")

    if not response:
        raise last_error or ValueError("All Groq decision models failed.")

    msg = response.choices[0].message
    raw_output = msg.content or getattr(msg, "reasoning", "") or ""

    if not raw_output and hasattr(msg, "reasoning") and msg.reasoning:
        raw_output = msg.reasoning

    print("GROQ RAW RESPONSE:", repr(raw_output))
    action = extract_json(raw_output)

    # 4. Validate Action Bounds
    validate_action(action, safe_context)
    return action, used_model or preferred_model or default_m

# =========================================================
# API ROUTES
# =========================================================

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "Privacy Vision Browser Agent API",
        "privacy_shield": "Client-Side Zero-Leakage Active",
        "model": DEFAULT_MODEL,
        "dashboard_url": "http://127.0.0.1:8000/dashboard"
    }


@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    """Serves the live telemetry and demonstration dashboard for judges."""
    return HTMLResponse(content=DASHBOARD_HTML)


@app.get("/api/telemetry")
async def get_telemetry():
    """Returns current live telemetry and execution metrics."""
    return TELEMETRY_STATE


@app.post("/api/telemetry/reset")
async def reset_telemetry():
    """Resets the in-memory telemetry buffer."""
    TELEMETRY_STATE["latest_screenshot"] = None
    TELEMETRY_STATE["latest_timestamp"] = None
    TELEMETRY_STATE["total_steps"] = 0
    TELEMETRY_STATE["total_redactions"] = 0
    for k in TELEMETRY_STATE["category_counts"]:
        TELEMETRY_STATE["category_counts"][k] = 0
    TELEMETRY_STATE["history"] = []
    return {"status": "ok", "message": "Telemetry store reset successfully."}


@app.post("/api/sandbox/test")
async def sandbox_test(req: SandboxRequest):
    """Instant testing endpoint for judges to test PII detection and redaction."""
    detections = detect_text(req.text)
    sanitized = redact_text(req.text, detections)
    return {
        "original_text": req.text,
        "detections_count": len(detections),
        "detections": [d.__dict__ for d in detections],
        "sanitized_text": sanitized
    }


@app.post("/agent/next")
async def next_action(request: NextActionRequest):
    try:
        action, active_model = await decide_action(
            request.task,
            request.page_context,
            request.screenshot,
            request.history,
            preferred_model=request.model
        )

        # Log step to telemetry store for live dashboard monitoring
        step_index = len(request.history) + 1
        TELEMETRY_STATE["total_steps"] += 1
        TELEMETRY_STATE["latest_timestamp"] = int(time.time() * 1000)

        if request.screenshot:
            TELEMETRY_STATE["latest_screenshot"] = request.screenshot

        if request.privacy:
            redacted_count = request.privacy.get("redactedCount", 0)
            TELEMETRY_STATE["total_redactions"] += redacted_count
            cats = request.privacy.get("categories", {})
            for k, count in cats.items():
                if k in TELEMETRY_STATE["category_counts"]:
                    TELEMETRY_STATE["category_counts"][k] += count
                else:
                    TELEMETRY_STATE["category_counts"][k] = count

        TELEMETRY_STATE["history"].append({
            "step": step_index,
            "task": request.task,
            "action": action,
            "model": active_model,
            "timestamp": TELEMETRY_STATE["latest_timestamp"]
        })

        return {
            "success": True,
            "action": action,
            "model_used": active_model,
            "privacy": request.privacy or {"status": "CLIENT_PROTECTED"}
        }
    except Exception as e:
        print("AGENT ERROR:", repr(e))
        return {
            "success": False,
            "error": str(e)
        }