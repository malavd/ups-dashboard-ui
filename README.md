# UPS Tracking Dashboard UI

A responsive, production-ready static dashboard for tracking UPS shipments. Deployed on GitHub Pages, this frontend fetches live data from a separate, secure backend API — no UPS credentials are ever stored or transmitted from the browser.

---

## Project Purpose

This repository contains the **frontend only** for a UPS package tracking tool. It provides:

- A clean, accessible search interface for entering UPS tracking numbers.
- Summary cards showing status, location, and estimated delivery.
- A chronological timeline of all package scan events.
- A raw JSON inspector for debugging backend responses.
- Light/dark theme toggle (follows system preference, no persistence required).

The dashboard is designed to feel like a practical internal operations tool — fast, readable, and immediately useful.

---

## Architecture Overview

```
Browser (this repo)
    │
    │  GET /api/track?trackingNumber=...
    ▼
Backend API (deployed on Vercel or similar)
    │
    │  Secure server-to-server call with UPS OAuth credentials
    ▼
UPS Tracking API
```

**Why are the frontend and backend separated?**

The UPS API requires OAuth 2.0 credentials (client ID and client secret). These secrets **must never be exposed in browser code** — they would be trivially extracted from any static file. The backend acts as a secure proxy: it holds the credentials in server-side environment variables, authenticates with UPS, and returns a sanitised JSON response to this frontend.

This repository is a static site suitable for GitHub Pages. It contains zero credentials and zero server-side logic.

---

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. Go to **Settings → Pages** in your repository.
3. Set the source to the branch and root directory containing these files (`index.html`, `style.css`, `app.js`).
4. GitHub Pages will serve the site at `https://<your-username>.github.io/<repo-name>/`.

No build step is required — the files are plain HTML, CSS, and JavaScript.

---

## Expected Backend Endpoint Contract

The frontend calls:

```
GET {API_BASE_URL}/api/track?trackingNumber={trackingNumber}
```

**Successful response** (HTTP 200):

```json
{
  "trackingNumber": "1Z999AA10123456784",
  "status": "In Transit",
  "estimatedDelivery": "2026-08-03T19:00:00Z",
  "latestLocation": "Detroit, MI, US",
  "events": [
    {
      "timestamp": "2026-08-01T08:10:00Z",
      "location": "Detroit, MI, US",
      "description": "Arrival Scan"
    }
  ],
  "raw": { }
}
```

**Error response** (any non-200 status):

```json
{
  "error": "Tracking number not found."
}
```

All fields are optional — the frontend normalises missing values gracefully. The `raw` field is used by the JSON inspector section for debugging.

---

## Local Development

No build tools are required. You can run the dashboard locally with any static file server:

**Using Python:**

```bash
# Python 3
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

**Using Node.js (`npx`):**

```bash
npx serve .
```

**Using VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension and click **Go Live**.

> **Note:** Opening `index.html` directly as a `file://` URL works for the demo button but will fail for live tracking calls due to CORS restrictions. Always use a local server for development.

---

## Configuring the Backend URL

In `app.js`, find the constant at the top of the file:

```js
const API_BASE_URL = "https://YOUR-BACKEND-URL";
```

Replace `https://YOUR-BACKEND-URL` with the base URL of your deployed backend, for example:

```js
const API_BASE_URL = "https://ups-backend.vercel.app";
```

The frontend will then call `https://ups-backend.vercel.app/api/track?trackingNumber=...`.

---

## Security Note

**UPS API credentials must never be stored in this repository.**

This includes:
- UPS OAuth client IDs and client secrets
- Access tokens or refresh tokens
- Any other API keys or secrets

This repository is public and statically served. Any credential committed here would be immediately exposed to the internet. All credential handling belongs exclusively in the backend API, stored as server-side environment variables (e.g., Vercel environment variables), never in client-side code or version control.

If you ever accidentally commit a secret, treat it as compromised immediately: revoke it in the UPS developer portal and generate a new one.

---

## File Structure

```
ups-dashboard-ui/
├── index.html   — Dashboard markup and layout
├── style.css    — Styles, design tokens, light/dark theme
├── app.js       — Frontend behaviour and API integration
└── README.md    — This file
```
