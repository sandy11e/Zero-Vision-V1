/**
 * Content Script - In-Page Context Reader & Action Executor
 */

function getPageContext() {
    const elements = [];

    const interactive = document.querySelectorAll(
        [
            "button",
            "input",
            "textarea",
            "select",
            "a",
            "[role='button']",
            "[role='link']",
            "[role='textbox']",
            "[role='combobox']",
            "[contenteditable='true']"
        ].join(",")
    );

    interactive.forEach((element) => {
        const rect = element.getBoundingClientRect();

        if (
            rect.width === 0 ||
            rect.height === 0 ||
            rect.bottom < 0 ||
            rect.top > window.innerHeight
        ) {
            return;
        }

        elements.push({
            tag: element.tagName.toLowerCase(),
            text: (
                element.innerText ||
                element.textContent ||
                element.value ||
                ""
            )
                .trim()
                .replace(/\s+/g, " ")
                .slice(0, 200),
            type: element.getAttribute("type"),
            placeholder: element.getAttribute("placeholder"),
            ariaLabel: element.getAttribute("aria-label"),
            name: element.getAttribute("name"),
            id: element.id || null,
            role: element.getAttribute("role"),
            href: element.tagName.toLowerCase() === "a" ? element.href : null,
            rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            }
        });
    });

    return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText.slice(0, 12000),
        elements
    };
}

async function executeAction(action) {
    if (action.action === "click") {
        const elements = getInteractiveElements();
        const element = elements[action.index];

        if (!element) {
            throw new Error(`Element ${action.index} not found`);
        }

        element.scrollIntoView({ behavior: "instant", block: "center" });
        element.click();

        return {
            success: true,
            message: `Clicked element ${action.index}`
        };
    }

    if (action.action === "type") {
        const elements = getInteractiveElements();
        const element = elements[action.index];

        if (!element) {
            throw new Error(`Element ${action.index} not found`);
        }

        element.focus();

        // Support React/Framework controlled inputs
        const prototype = Object.getPrototypeOf(element);
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

        if (valueSetter) {
            valueSetter.call(element, action.text);
        } else {
            element.value = action.text;
        }

        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));

        return {
            success: true,
            message: `Typed into element ${action.index}`
        };
    }

    if (action.action === "press") {
        const target = document.activeElement || document.body;
        target.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: action.key,
                code: action.key,
                bubbles: true,
                cancelable: true
            })
        );
        target.dispatchEvent(
            new KeyboardEvent("keyup", {
                key: action.key,
                code: action.key,
                bubbles: true,
                cancelable: true
            })
        );

        return {
            success: true,
            message: `Pressed ${action.key}`
        };
    }

    if (action.action === "scroll") {
        window.scrollBy({
            top: action.direction === "down" ? 600 : -600,
            behavior: "smooth"
        });

        return {
            success: true,
            message: `Scrolled ${action.direction}`
        };
    }

    throw new Error(`Unsupported action: ${action.action}`);
}

function getInteractiveElements() {
    const elements = [];
    const interactive = document.querySelectorAll(
        'button, input, textarea, select, a, [role="button"], [role="link"], [role="textbox"], [role="combobox"]'
    );

    interactive.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (
            rect.width === 0 ||
            rect.height === 0 ||
            rect.bottom < 0 ||
            rect.top > window.innerHeight
        ) {
            return;
        }
        elements.push(element);
    });

    return elements;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_PAGE_CONTEXT") {
        sendResponse(getPageContext());
        return true;
    }

    if (message.type === "SCAN_SENSITIVE") {
        if (window.PrivacyShield) {
            sendResponse(window.PrivacyShield.scanPageSensitiveCoordinates());
        } else {
            sendResponse({ sensitiveRegions: [] });
        }
        return true;
    }

    if (message.type === "EXECUTE_ACTION") {
        executeAction(message.action)
            .then(sendResponse)
            .catch((error) => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        return true;
    }
});