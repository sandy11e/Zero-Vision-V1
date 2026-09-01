"""
Integration Test for Privacy Browser Agent Backend API
"""
import sys
from fastapi.testclient import TestClient
from main import app

# Set utf-8 encoding for stdout if available
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

client = TestClient(app)

print("\n=======================================================")
print("   TESTING BACKEND API & DECISION ENGINE")
print("=======================================================\n")

# 1. Health check
print("[1] Testing GET / health check...")
response = client.get("/")
print("Status Code:", response.status_code)
print("Response:", response.json())
assert response.status_code == 200
assert response.json()["status"] == "ok"
print("Result: PASSED [OK]\n")

# 2. Test POST /agent/next with sanitized context
print("[2] Testing POST /agent/next with sanitized form context...")
payload = {
    "task": "Submit the registration form",
    "page_context": {
        "url": "https://example.com/register",
        "title": "User Registration",
        "text": "Please register your account. Name: John. Email: [REDACTED_EMAIL]. Password: [REDACTED_PASSWORD].",
        "elements": [
            {
                "tag": "input",
                "type": "text",
                "name": "full_name",
                "placeholder": "Enter name",
                "text": "John Doe",
                "rect": {"x": 100, "y": 120, "width": 250, "height": 35}
            },
            {
                "tag": "input",
                "type": "password",
                "name": "user_pass",
                "placeholder": "[REDACTED]",
                "text": "[REDACTED_PASSWORD]",
                "rect": {"x": 100, "y": 180, "width": 250, "height": 35}
            },
            {
                "tag": "button",
                "type": "submit",
                "text": "Register Account",
                "rect": {"x": 100, "y": 240, "width": 150, "height": 40}
            }
        ]
    },
    "screenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
    "history": [],
    "privacy": {
        "redactedCount": 2,
        "categories": {"PASSWORD": 1, "EMAIL": 1},
        "status": "CLIENT_PROTECTED"
    }
}

response = client.post("/agent/next", json=payload)
print("Status Code:", response.status_code)
data = response.json()
print("Response Data:", data)
assert response.status_code == 200
assert data["success"] is True
assert "action" in data
print("Agent Action Generated:", data["action"])
print("Result: PASSED [OK]\n")

print("=======================================================")
print("   ALL INTEGRATION TESTS PASSED [OK]")
print("=======================================================\n")
