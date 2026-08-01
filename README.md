# ups-dashboard-ui

Frontend dashboard for the package tracking app. Uses Shippo via a serverless backend.

## Deployment

This site is deployed via GitHub Pages.

1. Enable GitHub Pages in Settings → Pages.
2. Choose branch `main` and folder `/root`.

## Configuration

In `assets/js/app.js`, replace:

```js
const API_BASE_URL = "https://YOUR_VERCEL_PROJECT_URL";
```

with your Vercel backend URL.

## Features

- Multi-carrier tracking (UPS, USPS, FedEx, Shippo test)
- Light/dark mode
- Responsive design
- Raw JSON inspector for debugging

## Shippo

Docs: https://docs.goshippo.com/tracking/tracking