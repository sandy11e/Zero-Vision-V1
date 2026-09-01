/**
 * Background Service Worker - Chrome Side Panel Controller
 * Automatically opens and pins the extension as a permanent Side Panel on clicking the action icon.
 */

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Side panel configuration error:", error));
