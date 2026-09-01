/**
 * Unit Test for Client-Side Privacy Shield
 */
const fs = require("fs");
const path = require("path");

// Load privacy.js into Node VM
const privacyJsCode = fs.readFileSync(path.join(__dirname, "../extension/privacy.js"), "utf8");
eval(privacyJsCode);

console.log("\n=======================================================");
console.log("   TESTING CLIENT-SIDE PRIVACY SHIELD (In-Browser)   ");
console.log("=======================================================\n");

const testCases = [
    {
        name: "Indian Aadhaar Masking",
        input: "My Aadhaar number is 1234 5678 9012 for verification.",
        expectedType: "AADHAAR"
    },
    {
        name: "Indian PAN Card Masking",
        input: "Tax ID / PAN: ABCDE1234F submitted.",
        expectedType: "PAN"
    },
    {
        name: "Credit Card Masking",
        input: "Payment card: 4111 2222 3333 4444 with expiry 12/28",
        expectedType: "CARD"
    },
    {
        name: "Email and Phone Masking",
        input: "Contact me at alice.smith@example.com or +91 9876543210 immediately.",
        expectedType: ["EMAIL", "PHONE"]
    },
    {
        name: "API Key and JWT Token Masking",
        input: "Secret key is sk-live_abcdef1234567890abcdef and JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abc123456789",
        expectedType: ["API_KEY", "JWT"]
    },
    {
        name: "Bank Account and IFSC Masking",
        input: "Bank A/C: 123456789012 IFSC: HDFC0001234",
        expectedType: ["BANK_ACCOUNT", "IFSC"]
    }
];

let passed = 0;
testCases.forEach((tc, idx) => {
    const res = sanitizeString(tc.input);
    console.log(`Test [${idx + 1}] ${tc.name}:`);
    console.log(`  Raw Text:       "${tc.input}"`);
    console.log(`  Sanitized Text: "${res.text}"`);
    console.log(`  Redactions:     ${JSON.stringify(res.redactions.map(r => r.type))}`);

    const expectedTypes = Array.isArray(tc.expectedType) ? tc.expectedType : [tc.expectedType];
    const detectedTypes = res.redactions.map(r => r.type);
    const allFound = expectedTypes.every(t => detectedTypes.includes(t));

    if (allFound) {
        console.log("  Result:         PASSED ✅\n");
        passed++;
    } else {
        console.log("  Result:         FAILED ❌\n");
    }
});

// Test DOM Sanitization
console.log("Testing Page Context Sanitizer:");
const rawPageContext = {
    url: "https://secure-bank.example.com/login",
    title: "Secure Login",
    text: "Welcome user. Your PAN is ABCDE1234F and phone is +91 9876543210.",
    elements: [
        { tag: "input", type: "password", placeholder: "Enter password", name: "user_password", text: "" },
        { tag: "input", type: "text", placeholder: "Enter email", name: "email_address", text: "john@example.com" },
        { tag: "input", type: "text", placeholder: "CVV code", name: "card_cvv", text: "" },
        { tag: "button", type: "submit", text: "Submit Login" }
    ]
};

const sanitizedResult = sanitizePageContext(rawPageContext, [
    { category: "PASSWORD", rect: { x: 10, y: 10, width: 200, height: 30 } }
]);

console.log("Sanitized Elements:");
sanitizedResult.sanitizedContext.elements.forEach((el, i) => {
    console.log(`  [${i}] <${el.tag}> type='${el.type}' placeholder='${el.placeholder}' text='${el.text}'`);
});
console.log("\nPrivacy Summary Stats:", sanitizedResult.privacySummary);

if (sanitizedResult.privacySummary.redactedCount >= 4) {
    console.log("\nPage Sanitization: PASSED ✅\n");
    passed++;
} else {
    console.log("\nPage Sanitization: FAILED ❌\n");
}

console.log(`=======================================================`);
console.log(`   TOTAL TESTS: ${testCases.length + 1} | PASSED: ${passed}`);
console.log(`=======================================================\n`);
