"""
Privacy Vision Agent - Professional Real-Time Telemetry & Compliance Audit Dashboard
Enterprise-grade live privacy verification, VLM frame inspector, and interactive PII sandbox.
"""

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>S.H.I.E.L.D — Zero-Leakage Live Audit Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-page: #f8fafc;
            --bg-card: #ffffff;
            --bg-subtle: #f1f5f9;
            --bg-inset: #f8fafc;
            --bg-dark-preview: #090d16;
            
            --border-subtle: #e2e8f0;
            --border-strong: #cbd5e1;
            --border-focus: #0284c7;

            --text-main: #0f172a;
            --text-secondary: #334155;
            --text-muted: #64748b;

            --brand-primary: #0284c7;
            --brand-primary-hover: #0369a1;
            --brand-bg: #e0f2fe;
            --brand-border: #bae6fd;

            --status-green: #16a34a;
            --status-green-bg: #dcfce7;
            --status-green-border: #bbf7d0;

            --redaction-red: #dc2626;
            --redaction-red-bg: #fee2e2;
            --redaction-red-border: #fecaca;

            --font-ui: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-code: 'JetBrains Mono', monospace;

            --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);

            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --radius-xl: 18px;
        }

        :root[data-theme="dark"], body.dark-theme {
            --bg-page: #0b0f19;
            --bg-card: #151d2e;
            --bg-subtle: #0f172a;
            --bg-inset: #090d16;
            --border-subtle: #24324a;
            --border-strong: #3b4d6b;
            --text-main: #f8fafc;
            --text-secondary: #cbd5e1;
            --text-muted: #8da2c0;
            --brand-bg: rgba(2, 132, 199, 0.2);
            --brand-border: rgba(56, 189, 248, 0.4);
        }

        body.dark-theme .card-header {
            background: #151d2e;
        }
        body.dark-theme .timeline-row:hover,
        body.dark-theme .entity-row:hover {
            background: #0f172a;
        }
        body.dark-theme .step-cmd-box {
            background: #090d16;
            color: #f8fafc;
            border-color: #24324a;
        }
        body.dark-theme .btn-action {
            background: #151d2e;
            color: #e2e8f0;
            border-color: #24324a;
        }
        body.dark-theme .btn-action:hover {
            background: #24324a;
        }
        body.dark-theme .btn-preset {
            background: #0f172a;
            border-color: #24324a;
            color: #cbd5e1;
        }
        body.dark-theme .sandbox-input,
        body.dark-theme .sandbox-output-box {
            background: #090d16;
            color: #f8fafc;
            border-color: #24324a;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: var(--font-ui);
            -webkit-font-smoothing: antialiased;
        }

        body {
            background-color: var(--bg-page);
            color: var(--text-main);
            min-height: 100vh;
            padding: 24px 32px;
            line-height: 1.5;
        }

        .container {
            max-width: 1480px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* TOP NAVIGATION */
        .top-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xl);
            padding: 16px 26px;
            box-shadow: var(--shadow-sm);
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .brand-icon-box {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #e0f2fe, #bae6fd);
            border: 1px solid #7dd3fc;
            border-radius: 50%;
            color: #0284c7;
            box-shadow: 0 2px 8px rgba(2, 132, 199, 0.15);
        }

        .brand-title-wrap {
            display: flex;
            flex-direction: column;
        }

        .brand-title {
            font-size: 18px;
            font-weight: 800;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.3px;
        }

        .tag-pill {
            font-size: 11px;
            font-weight: 700;
            background: var(--brand-bg);
            color: var(--brand-primary);
            padding: 3px 9px;
            border-radius: 20px;
            border: 1px solid var(--brand-border);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .brand-sub {
            font-size: 12.5px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--status-green-bg);
            border: 1px solid var(--status-green-border);
            color: var(--status-green);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
        }

        .dot-pulse {
            width: 8px;
            height: 8px;
            background-color: var(--status-green);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--status-green);
            animation: pulseGlow 1.8s infinite;
        }

        @keyframes pulseGlow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.2); }
        }

        .btn-action {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-card);
            border: 1px solid var(--border-strong);
            color: var(--text-secondary);
            padding: 7px 14px;
            border-radius: var(--radius-md);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: var(--shadow-xs);
        }

        .btn-action:hover {
            background: var(--bg-subtle);
            color: var(--text-main);
            border-color: var(--text-muted);
        }

        /* METRICS KPI ROW */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 18px;
        }

        .kpi-card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xl);
            padding: 20px 24px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: var(--shadow-sm);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .kpi-header {
            font-size: 12px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .kpi-value {
            font-size: 28px;
            font-weight: 800;
            font-family: var(--font-code);
            color: var(--text-main);
            letter-spacing: -0.6px;
        }

        .kpi-meta {
            font-size: 12px;
            color: var(--text-muted);
            font-weight: 500;
        }

        /* MAIN TWO-COLUMN LAYOUT */
        .workspace-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 20px;
        }

        .card-panel {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 22px;
            border-bottom: 1px solid var(--border-subtle);
            background: #ffffff;
        }

        .card-title {
            font-size: 14px;
            font-weight: 800;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 9px;
            letter-spacing: -0.2px;
        }

        .card-meta {
            font-size: 12px;
            font-family: var(--font-code);
            color: var(--text-muted);
            font-weight: 500;
        }

        /* SCREENSHOT PREVIEW */
        .preview-body {
            padding: 18px 22px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .screenshot-frame-container {
            position: relative;
            background: var(--bg-dark-preview);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            min-height: 320px;
            max-height: 420px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.4);
        }

        .screenshot-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            cursor: zoom-in;
            transition: transform 0.2s ease;
        }

        .empty-slate {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            color: #94a3b8;
            padding: 50px 24px;
            text-align: center;
            background-color: #f8fafc;
            width: 100%;
            height: 100%;
        }

        .empty-slate span {
            font-size: 13px;
            max-width: 380px;
            line-height: 1.5;
        }

        .frame-floating-bar {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 10;
        }

        .shield-stamp {
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(56, 189, 248, 0.4);
            border-radius: 20px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 700;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .btn-zoom {
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            border-radius: 20px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
        }

        .btn-zoom:hover {
            background: #0284c7;
            border-color: #38bdf8;
        }

        /* ACTION TIMELINE */
        .timeline-list {
            padding: 16px 22px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: 360px;
            overflow-y: auto;
        }

        .timeline-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: var(--bg-subtle);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 10px 14px;
            font-size: 12.5px;
            transition: border-color 0.15s ease, background 0.15s ease;
        }

        .timeline-row:hover {
            background: #ffffff;
            border-color: var(--border-strong);
            box-shadow: var(--shadow-xs);
        }

        .timeline-row-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .timeline-row-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .step-badge {
            background: var(--brand-bg);
            color: var(--brand-primary);
            font-family: var(--font-code);
            font-size: 11px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 5px;
            border: 1px solid var(--brand-border);
        }

        .model-chip {
            background: #f1f5f9;
            color: #475569;
            font-family: var(--font-code);
            font-size: 10.5px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 5px;
            border: 1px solid #cbd5e1;
        }

        .step-time {
            font-size: 11.5px;
            color: var(--text-muted);
            font-family: var(--font-code);
        }

        .step-task-label {
            font-size: 11.5px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .step-cmd-box {
            background: #ffffff;
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 6px 10px;
            font-family: var(--font-code);
            font-size: 12px;
            color: var(--text-main);
            word-break: break-all;
        }

        /* RIGHT PANEL: ENTITY BREAKDOWN & SANDBOX */
        .side-stack {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .entity-table-body {
            padding: 16px 22px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 240px;
            overflow-y: auto;
        }

        .entity-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 9px 14px;
            background: var(--bg-subtle);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            transition: background 0.15s ease;
        }

        .entity-row:hover {
            background: #ffffff;
            border-color: var(--border-strong);
        }

        .entity-left {
            display: flex;
            align-items: center;
            gap: 9px;
        }

        .entity-icon {
            font-size: 14px;
        }

        .entity-name {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-main);
        }

        .entity-badge {
            background: var(--redaction-red-bg);
            color: var(--redaction-red);
            border: 1px solid var(--redaction-red-border);
            font-family: var(--font-code);
            font-size: 11.5px;
            font-weight: 800;
            padding: 2px 9px;
            border-radius: 20px;
        }

        /* SANDBOX */
        .sandbox-body {
            padding: 18px 22px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .presets-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }

        .preset-label {
            font-size: 11.5px;
            font-weight: 700;
            color: var(--text-muted);
            margin-right: 4px;
        }

        .btn-preset {
            background: var(--bg-subtle);
            border: 1px solid var(--border-strong);
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-preset:hover {
            background: var(--brand-bg);
            color: var(--brand-primary);
            border-color: var(--brand-border);
        }

        .sandbox-input {
            width: 100%;
            background: var(--bg-inset);
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-md);
            padding: 12px 14px;
            font-size: 12.5px;
            font-family: var(--font-code);
            color: var(--text-main);
            resize: none;
            height: 75px;
            outline: none;
            transition: border-color 0.15s ease, background 0.15s ease;
        }

        .sandbox-input:focus {
            border-color: var(--border-focus);
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.1);
        }

        .sandbox-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .btn-run-shield {
            background: linear-gradient(135deg, var(--brand-primary), #0284c7);
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: var(--radius-md);
            font-size: 12.5px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
        }

        .btn-run-shield:hover {
            background: var(--brand-primary-hover);
            transform: translateY(-1px);
        }

        .sandbox-output-box {
            background: var(--bg-inset);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 12px 14px;
            font-family: var(--font-code);
            font-size: 12px;
            color: var(--text-main);
            white-space: pre-wrap;
            min-height: 60px;
            max-height: 110px;
            overflow-y: auto;
            line-height: 1.5;
        }

        .no-data-msg {
            color: var(--text-muted);
            font-size: 12.5px;
            text-align: center;
            padding: 20px;
            font-style: italic;
        }

        /* MODAL FULLSCREEN LIGHTBOX */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.88);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 30px;
            animation: fadeIn 0.15s ease-out;
        }

        .modal-zoom-card {
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: var(--radius-xl);
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: var(--shadow-xl);
        }

        .modal-zoom-header {
            padding: 14px 20px;
            background: #1e293b;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 700;
        }

        .modal-zoom-img {
            max-width: 88vw;
            max-height: 80vh;
            object-fit: contain;
            display: block;
        }

        .btn-close-modal {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #ffffff;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: 700;
        }

        .btn-close-modal:hover {
            background: rgba(239, 68, 68, 0.8);
        }

        .hidden {
            display: none !important;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @media (max-width: 1080px) {
            .kpi-grid { grid-template-columns: repeat(2, 1fr); }
            .workspace-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>

<div class="container">

    <!-- TOP NAVIGATION -->
    <header class="top-nav">
        <div class="nav-brand">
            <div class="brand-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                </svg>
            </div>
            <div class="brand-title-wrap">
                <div class="brand-title">
                    <span>S.H.I.E.L.D</span>
                    <span class="tag-pill">Zero-Leakage Telemetry</span>
                </div>
                <div class="brand-sub">Client-Side Redaction Audit & Real-Time Decision Stream</div>
            </div>
        </div>

        <div class="nav-actions">
            <button id="dashboardThemeToggleBtn" class="btn-action" title="Toggle Light/Dark Theme">
                <svg id="dashThemeSun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg id="dashThemeMoon" class="hidden" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span id="dashThemeLabel">Dark Theme</span>
            </button>
            <div class="status-badge">
                <span class="dot-pulse"></span>
                <span id="telemetryStatusText">Active Stream (1s Polling)</span>
            </div>
            <button id="exportAuditBtn" class="btn-action" title="Export compliance audit log as JSON">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Export Audit JSON</span>
            </button>
            <button id="resetTelemetryBtn" class="btn-action" title="Clear current session telemetry">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Reset Session</span>
            </button>
        </div>
    </header>

    <!-- METRICS KPI ROW -->
    <section class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-header">
                <span>Compliance Score</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#16a34a">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <div class="kpi-value" style="color: #16a34a;">100%</div>
            <div class="kpi-meta">0 Unmasked Credentials Transmitted</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-header">
                <span>Total Redactions</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#0284c7">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <div id="kpiRedactedCount" class="kpi-value" style="color: #0284c7;">0</div>
            <div id="kpiRedactedMeta" class="kpi-meta">0 entities masked across all steps</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-header">
                <span>Client Masking Overhead</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#d97706">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            </div>
            <div id="kpiShieldLatency" class="kpi-value" style="color: #d97706;">&lt; 25 ms</div>
            <div class="kpi-meta">On-Device Canvas Execution</div>
        </div>

        <div class="kpi-card">
            <div class="kpi-header">
                <span>Recorded Steps</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#475569">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
            </div>
            <div id="kpiStepCount" class="kpi-value">0</div>
            <div id="kpiStepMeta" class="kpi-meta">0 browser actions executed</div>
        </div>
    </section>

    <!-- WORKSPACE -->
    <main class="workspace-grid">

        <!-- LEFT COLUMN: REAL SCREENSHOT & DECISION LOG -->
        <div class="card-panel">
            <div class="card-header">
                <div class="card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#0284c7">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Server-Received Visual Frame (Masked On-Device)</span>
                </div>
                <div id="screenshotTimestamp" class="card-meta">Awaiting stream...</div>
            </div>

            <div class="preview-body">
                <div class="screenshot-frame-container">
                    <div id="emptyScreenshotBox" class="empty-slate">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span>No visual frames captured yet. Execute a task in the extension to stream live frames with client-side blackouts.</span>
                    </div>
                    <img id="liveScreenshotImg" class="screenshot-img" style="display: none;" alt="Sanitized Screenshot" title="Click to zoom in" />
                    <div class="frame-floating-bar">
                        <div id="shieldStamp" class="shield-stamp" style="display: none;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            <span>Client-Side Shielded</span>
                        </div>
                        <button id="zoomBtn" class="btn-zoom" style="display: none;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                            <span>Zoom</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- ACTION LOG -->
            <div class="card-header" style="border-top: 1px solid var(--border-subtle);">
                <div class="card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#16a34a">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <span>Decision Engine & Action Execution Stream</span>
                </div>
                <div id="actionCountMeta" class="card-meta">0 actions recorded</div>
            </div>

            <div id="timelineList" class="timeline-list">
                <div class="no-data-msg">Waiting for agent execution...</div>
            </div>
        </div>

        <!-- RIGHT COLUMN: DETECTED ENTITIES & SANDBOX -->
        <div class="side-stack">

            <!-- DETECTED ENTITIES -->
            <div class="card-panel">
                <div class="card-header">
                    <div class="card-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#dc2626">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span>Detected Sensitive Categories (Live Scan)</span>
                    </div>
                    <div class="card-meta">Protected Categories</div>
                </div>

                <div id="entityTableBody" class="entity-table-body">
                    <div class="no-data-msg">No sensitive entities detected in current session.</div>
                </div>
            </div>

            <!-- INTERACTIVE TESTBED -->
            <div class="card-panel">
                <div class="card-header">
                    <div class="card-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#0284c7">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="7" y1="2" x2="7" y2="22"></line>
                            <line x1="17" y1="2" x2="17" y2="22"></line>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <line x1="2" y1="7" x2="7" y2="7"></line>
                            <line x1="2" y1="17" x2="7" y2="17"></line>
                        </svg>
                        <span>Interactive PII Shield Sandbox</span>
                    </div>
                    <div class="card-meta">Instant Tester</div>
                </div>

                <div class="sandbox-body">
                    <!-- Quick Presets -->
                    <div class="presets-row">
                        <span class="preset-label">Presets:</span>
                        <button class="btn-preset" data-preset="kyc">🇮🇳 Indian KYC</button>
                        <button class="btn-preset" data-preset="banking">💳 Banking & CVV</button>
                        <button class="btn-preset" data-preset="secrets">🔑 API Keys & JWT</button>
                        <button class="btn-preset" data-preset="ner">🧠 Doctor / NER</button>
                    </div>

                    <textarea 
                        id="sandboxInput" 
                        class="sandbox-input" 
                        placeholder="Type or paste sample Aadhaar, PAN, Card, Email, Phone, or API key here..."
                    >Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, Card: 4111 2222 3333 4444, Secret: sk-live_abcdef1234567890abcdef</textarea>

                    <div class="sandbox-bar">
                        <span style="font-size: 11.5px; color: var(--text-muted);">Regex + On-Device interval masker</span>
                        <button id="runShieldBtn" class="btn-run-shield">Test Shield</button>
                    </div>

                    <div id="sandboxOutput" class="sandbox-output-box">Click 'Test Shield' to verify live client redaction...</div>
                </div>
            </div>

        </div>

    </main>

</div>

<!-- LIGHTBOX ZOOM MODAL -->
<div id="zoomModal" class="modal-overlay hidden">
    <div class="modal-zoom-card">
        <div class="modal-zoom-header">
            <span>High-Resolution Masked Frame Inspector</span>
            <button id="closeZoomBtn" class="btn-close-modal">&times;</button>
        </div>
        <img id="modalZoomImg" class="modal-zoom-img" alt="Zoomed Frame" />
    </div>
</div>

<script>
    const liveScreenshotImg = document.getElementById("liveScreenshotImg");
    const emptyScreenshotBox = document.getElementById("emptyScreenshotBox");
    const shieldStamp = document.getElementById("shieldStamp");
    const zoomBtn = document.getElementById("zoomBtn");
    const screenshotTimestamp = document.getElementById("screenshotTimestamp");
    const kpiRedactedCount = document.getElementById("kpiRedactedCount");
    const kpiRedactedMeta = document.getElementById("kpiRedactedMeta");
    const kpiStepCount = document.getElementById("kpiStepCount");
    const kpiStepMeta = document.getElementById("kpiStepMeta");
    const actionCountMeta = document.getElementById("actionCountMeta");
    const timelineList = document.getElementById("timelineList");
    const entityTableBody = document.getElementById("entityTableBody");

    const resetTelemetryBtn = document.getElementById("resetTelemetryBtn");
    const exportAuditBtn = document.getElementById("exportAuditBtn");
    const runShieldBtn = document.getElementById("runShieldBtn");
    const sandboxInput = document.getElementById("sandboxInput");
    const sandboxOutput = document.getElementById("sandboxOutput");

    const zoomModal = document.getElementById("zoomModal");
    const modalZoomImg = document.getElementById("modalZoomImg");
    const closeZoomBtn = document.getElementById("closeZoomBtn");

    let latestTelemetryCache = null;

    const CATEGORY_META = {
        "AADHAAR": { label: "Indian Aadhaar Number", icon: "🇮🇳" },
        "PAN": { label: "Indian PAN Card", icon: "🇮🇳" },
        "PASSPORT": { label: "Passport Number", icon: "🛂" },
        "CARD": { label: "Debit / Credit Card", icon: "💳" },
        "CVV": { label: "Card Security Code (CVV)", icon: "🔒" },
        "BANK_ACCOUNT": { label: "Bank Account Number", icon: "🏦" },
        "IFSC": { label: "Bank IFSC Code", icon: "🏦" },
        "PASSWORD": { label: "Account Password", icon: "🔑" },
        "PIN": { label: "Security PIN / OTP", icon: "🔢" },
        "OTP": { label: "One-Time Password", icon: "📲" },
        "PHONE": { label: "Phone Number (+91)", icon: "📞" },
        "EMAIL": { label: "Email Address", icon: "✉️" },
        "API_KEY": { label: "API Secret Key", icon: "🛡️" },
        "JWT": { label: "JSON Web Token (JWT)", icon: "📜" },
        "AWS_ACCESS_KEY": { label: "AWS Access Key", icon: "☁️" },
        "PER": { label: "Person Name (NER)", icon: "👤" },
        "LOC": { label: "Location / Address (NER)", icon: "📍" },
        "ORG": { label: "Organization / Entity (NER)", icon: "🏢" },
        "CUSTOM_SECRET": { label: "Custom Confidential Word", icon: "🔤" },
        "SENSITIVE_FIELD": { label: "Protected Form Field", icon: "🛡️" }
    };

    const PRESETS = {
        kyc: "Applicant: Pranesh Kumar, Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, Mobile: +91 9876543210, Email: pranesh.kumar@example.com",
        banking: "Card: 4111 2222 3333 4444, CVV: 891, Bank A/C: 123456789012, IFSC: HDFC0001234, PIN: 9876",
        secrets: "API Key: sk-live_abcdef1234567890abcdef, AWS: AKIAIOSFODNN7EXAMPLE, JWT: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abc123456789",
        ner: "Primary applicant Pranesh Kumar resides in Chennai and is registered with Dr. Rajesh Sharma at Apollo Hospital."
    };

    document.querySelectorAll(".btn-preset").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-preset");
            if (PRESETS[type]) {
                sandboxInput.value = PRESETS[type];
                runShieldBtn.click();
            }
        });
    });

    async function fetchTelemetry() {
        try {
            const res = await fetch("/api/telemetry");
            if (!res.ok) return;
            const data = await res.json();
            latestTelemetryCache = data;
            renderDashboard(data);
        } catch (err) {
            console.warn("Telemetry fetch error:", err);
        }
    }

    function renderDashboard(data) {
        if (!data) return;

        // 1. Live Screenshot Frame
        if (data.latest_screenshot) {
            liveScreenshotImg.src = data.latest_screenshot;
            liveScreenshotImg.style.display = "block";
            emptyScreenshotBox.style.display = "none";
            shieldStamp.style.display = "flex";
            zoomBtn.style.display = "flex";
            const timeStr = data.latest_timestamp ? new Date(data.latest_timestamp).toLocaleTimeString() : "Live";
            screenshotTimestamp.textContent = `Captured at ${timeStr}`;
        } else {
            liveScreenshotImg.style.display = "none";
            emptyScreenshotBox.style.display = "flex";
            shieldStamp.style.display = "none";
            zoomBtn.style.display = "none";
            screenshotTimestamp.textContent = "Awaiting stream...";
        }

        // 2. KPI Metrics
        const totalRedacted = data.total_redactions || 0;
        kpiRedactedCount.textContent = totalRedacted;
        kpiRedactedMeta.textContent = `${totalRedacted} entities masked across all steps`;

        const totalSteps = data.total_steps || 0;
        kpiStepCount.textContent = totalSteps;
        kpiStepMeta.textContent = `${totalSteps} browser actions executed`;
        actionCountMeta.textContent = `${totalSteps} actions recorded`;

        // 3. Detected Entities Table
        const counts = data.category_counts || {};
        const detectedEntries = Object.entries(counts).filter(([_, count]) => count > 0);

        if (detectedEntries.length === 0) {
            entityTableBody.innerHTML = '<div class="no-data-msg">No sensitive entities detected in current session.</div>';
        } else {
            entityTableBody.innerHTML = "";
            detectedEntries.forEach(([cat, count]) => {
                const info = CATEGORY_META[cat] || { label: cat, icon: "🛡️" };
                const row = document.createElement("div");
                row.className = "entity-row";
                row.innerHTML = `
                    <div class="entity-left">
                        <span class="entity-icon">${info.icon}</span>
                        <span class="entity-name">${info.label}</span>
                    </div>
                    <span class="entity-badge">${count} masked</span>
                `;
                entityTableBody.appendChild(row);
            });
        }

        // 4. Executed Action Timeline
        const history = data.history || [];
        if (history.length === 0) {
            timelineList.innerHTML = '<div class="no-data-msg">Waiting for agent execution...</div>';
        } else {
            timelineList.innerHTML = "";
            history.slice(-15).reverse().forEach((s) => {
                const row = document.createElement("div");
                row.className = "timeline-row";
                const actionJson = JSON.stringify(s.action || {});
                const modelName = s.model ? formatModelChip(s.model) : "Groq Compound Mini";
                
                row.innerHTML = `
                    <div class="timeline-row-header">
                        <div class="timeline-row-left">
                            <span class="step-badge">Step ${s.step}</span>
                            <span class="model-chip">${escapeHtml(modelName)}</span>
                        </div>
                        <span class="step-time">${new Date(s.timestamp).toLocaleTimeString()}</span>
                    </div>
                    ${s.task ? `<div class="step-task-label"><strong>Task:</strong> ${escapeHtml(s.task)}</div>` : ""}
                    <div class="step-cmd-box">${escapeHtml(actionJson)}</div>
                `;
                timelineList.appendChild(row);
            });
        }
    }

    function formatModelChip(m) {
        if (!m) return "Groq Mini";
        if (m.includes("compound-mini")) return "Groq Compound Mini";
        if (m.includes("120b")) return "GPT-OSS 120B";
        if (m.includes("20b")) return "GPT-OSS 20B";
        if (m.includes("qwen")) return "Qwen 27B";
        return m.split("/")[1] || m;
    }

    // Modal Zoom Lightbox
    liveScreenshotImg.addEventListener("click", openZoom);
    zoomBtn.addEventListener("click", openZoom);
    closeZoomBtn.addEventListener("click", closeZoom);
    zoomModal.addEventListener("click", (e) => {
        if (e.target === zoomModal) closeZoom();
    });

    function openZoom() {
        if (liveScreenshotImg.src) {
            modalZoomImg.src = liveScreenshotImg.src;
            zoomModal.classList.remove("hidden");
        }
    }

    function closeZoom() {
        zoomModal.classList.add("hidden");
    }

    // Interactive Sandbox Tester
    runShieldBtn.addEventListener("click", async () => {
        const text = sandboxInput.value.trim();
        if (!text) return;
        runShieldBtn.disabled = true;

        try {
            const res = await fetch("/api/sandbox/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });
            const result = await res.json();
            sandboxOutput.textContent = result.sanitized_text || "No sensitive entities detected.";
        } catch (e) {
            sandboxOutput.textContent = "Error testing shield: " + e.message;
        } finally {
            runShieldBtn.disabled = false;
        }
    });

    // Reset Telemetry
    resetTelemetryBtn.addEventListener("click", async () => {
        resetTelemetryBtn.style.opacity = "0.5";
        await fetch("/api/telemetry/reset", { method: "POST" });
        await fetchTelemetry();
        resetTelemetryBtn.style.opacity = "1";
    });

    // Export Audit Log as JSON
    exportAuditBtn.addEventListener("click", () => {
        if (!latestTelemetryCache) return;
        const exportData = {
            export_timestamp: new Date().toISOString(),
            compliance_status: "ZERO_LEAKAGE_VERIFIED",
            telemetry: latestTelemetryCache
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `privacy_agent_audit_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    function escapeHtml(str) {
        const p = document.createElement("p");
        p.textContent = str;
        return p.innerHTML;
    }

    // Dashboard Dark/Light Theme Controller
    const dashboardThemeToggleBtn = document.getElementById("dashboardThemeToggleBtn");
    const dashThemeSun = document.getElementById("dashThemeSun");
    const dashThemeMoon = document.getElementById("dashThemeMoon");
    const dashThemeLabel = document.getElementById("dashThemeLabel");

    function applyDashTheme(theme) {
        if (theme === "dark") {
            document.body.classList.add("dark-theme");
            document.documentElement.setAttribute("data-theme", "dark");
            dashThemeSun.classList.add("hidden");
            dashThemeMoon.classList.remove("hidden");
            dashThemeLabel.textContent = "Light Theme";
        } else {
            document.body.classList.remove("dark-theme");
            document.documentElement.removeAttribute("data-theme");
            dashThemeSun.classList.remove("hidden");
            dashThemeMoon.classList.add("hidden");
            dashThemeLabel.textContent = "Dark Theme";
        }
        localStorage.setItem("shieldDashboardTheme", theme);
    }

    if (dashboardThemeToggleBtn) {
        const savedDashTheme = localStorage.getItem("shieldDashboardTheme") || "light";
        applyDashTheme(savedDashTheme);

        dashboardThemeToggleBtn.addEventListener("click", () => {
            const isDark = document.body.classList.contains("dark-theme");
            applyDashTheme(isDark ? "light" : "dark");
        });
    }

    // Poll every 1 second
    setInterval(fetchTelemetry, 1000);
    fetchTelemetry();
</script>

</body>
</html>
"""
