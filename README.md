# ups-dashboard-ui

Static frontend for the package tracking dashboard.

This repo contains the browser-based UI for tracking shipments from supported carriers. It is designed to be hosted as a static site and call the backend API deployed separately in the `ups-dashboard-api` repo.

## What this project does

The dashboard lets you:

- Track a shipment manually by entering a carrier and tracking number
- Use a demo/test flow for supported test carriers
- Organize shipments into manifests (for example: `August 2026`)
- Add more tracking IDs to an existing manifest
- Refresh tracking results from the backend API
- View normalized shipment status in a simple dashboard layout

## Project structure

Typical structure:

```text
.
├── index.html
├── README.md
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

## How it works

This frontend does **not** call carrier APIs directly.

Instead, it sends requests to the backend API project:

- UI repo: `ups-dashboard-ui`
- API repo: `ups-dashboard-api`

The frontend calls the deployed API endpoint and renders the returned tracking data in the page.

## API connection

The UI should point to the deployed backend base URL, for example:

```js
https://ups-dashboard-api.vercel.app
```

If the dashboard is unable to fetch tracking data, first verify:

- the API project is deployed
- the API URL in the frontend is correct
- the backend environment variables are configured
- the selected carrier/test mode matches the backend configuration

## Manifest feature

The manifest feature is intended for tracking multiple shipments without entering them one by one every time.

Example manifests:

- `August 2026`
- `Customer Returns`
- `Office Orders`
- `Personal Packages`

Suggested workflow:

1. Create a manifest
2. Select that manifest
3. Add one or more shipments with carrier + tracking number
4. Refresh tracking results when needed

### Recommended naming

Use month + year for recurring lists, for example:

- `August 2026`
- `September 2026`

This avoids confusion when the same month appears in a future year.

## Current limitations

Depending on the current code state, the following may still be incomplete or planned:

- deleting a manifest
- removing a single shipment from a manifest
- renaming a manifest
- persistent multi-user storage
- automatic background refresh

Right now this project is best treated as a lightweight personal dashboard.

## Local development

Because this is a static frontend, you can test it locally with any simple static server.

Examples:

### Python

```bash
python3 -m http.server 5500
```

### Node

```bash
npx serve .
```

Then open the local URL in your browser.

## Deployment

This project can be deployed as a static site using either:

- GitHub Pages
- Vercel

If deploying with GitHub Pages, make sure all asset paths are correct and the frontend is configured to call the live API deployment.

## Related repo

Backend API repo:

- `ups-dashboard-api`

That repo handles carrier API communication and keeps secrets out of the frontend.

## Notes

- Do not store API secrets in this repo
- Keep this repo frontend-only
- Use the backend repo for API tokens, carrier auth, and response transformation

## Future improvements

Suggested next improvements:

- Delete manifest
- Remove shipment from manifest
- Rename manifest
- Save manifests more reliably
- Better error messages for failed tracking lookups
- Separate views for UPS, USPS, and test/demo flows

## Shippo

Docs: https://docs.goshippo.com/tracking/tracking
