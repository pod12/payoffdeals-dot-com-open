# Traffic Controller

A dynamic, real-time Chrome Extension for auditing and controlling third-party network traffic.

## Features
- **Live Trace:** Real-time stream of all sub-resource requests.
- **Gatekeeper:** Decision-making UI to permanently Allow or Reject cross-domain requests.
- **Visual Analytics:** Conic-gradient visualization of internal vs. external traffic ratios.
- **Dynamic Firewall:** Manage custom `declarativeNetRequest` rules without hardcoded JSON lists.

## Tech Stack
- **Manifest V3**
- **declarativeNetRequest API** for high-performance blocking.
- **Chrome Side Panel API** for a persistent, non-intrusive dashboard.
- **Vanilla JS** (No framework overhead).

## Installation (Developer Mode)
1. Clone this repository (or download folder).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** (top right).
4. Click **"Load unpacked"** and select the extension folder.
5. Open the Side Panel to start controlling your traffic.

## How it Works
The extension monitors `webRequest` events in a background service worker and evaluates them against a user-defined set of dynamic rules. It uses a prioritized rule system ($Priority 2$ for user decisions, $Priority 1$ for the global toggle) to ensure user choices always take precedence.
