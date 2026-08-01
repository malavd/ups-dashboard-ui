/* ============================================================
   UPS Tracking Dashboard — app.js
   Vanilla JS, no dependencies, no localStorage
   ============================================================ */

// Replace this with your deployed backend URL before going live.
const API_BASE_URL = "https://YOUR-BACKEND-URL";

// ---------------------------------------------------------------------------
// Mock / Demo payload
// Used when the user clicks "Load Demo Data" — no network call required.
// ---------------------------------------------------------------------------
const DEMO_PAYLOAD = {
  trackingNumber: "1Z999AA10123456784",
  status: "In Transit",
  estimatedDelivery: "2026-08-03T19:00:00Z",
  latestLocation: "Detroit, MI, US",
  events: [
    {
      timestamp: "2026-08-01T08:10:00Z",
      location: "Detroit, MI, US",
      description: "Arrival Scan"
    },
    {
      timestamp: "2026-07-31T23:45:00Z",
      location: "Chicago, IL, US",
      description: "Departure Scan"
    },
    {
      timestamp: "2026-07-31T18:20:00Z",
      location: "Chicago, IL, US",
      description: "Arrival Scan"
    },
    {
      timestamp: "2026-07-31T09:05:00Z",
      location: "Kansas City, MO, US",
      description: "Departure Scan"
    },
    {
      timestamp: "2026-07-30T22:30:00Z",
      location: "Kansas City, MO, US",
      description: "Origin Scan"
    },
    {
      timestamp: "2026-07-30T14:15:00Z",
      location: "Kansas City, MO, US",
      description: "Pickup Scan"
    }
  ],
  raw: {
    trackingNumber: "1Z999AA10123456784",
    status: "In Transit",
    estimatedDelivery: "2026-08-03T19:00:00Z",
    latestLocation: "Detroit, MI, US",
    source: "demo"
  }
};

// ---------------------------------------------------------------------------
// DOM element references (resolved once at startup)
// ---------------------------------------------------------------------------
const elHtml        = document.documentElement;
const elThemeToggle = document.getElementById("theme-toggle");
const elForm        = document.getElementById("track-form");
const elInput       = document.getElementById("tracking-input");
const elInputError  = document.getElementById("input-error");
const elTrackBtn    = document.getElementById("track-btn");
const elDemoBtn     = document.getElementById("demo-btn");
const elResultsArea = document.getElementById("results-area");

// Status panels
const elStatusIdle    = document.getElementById("status-idle");
const elStatusLoading = document.getElementById("status-loading");
const elStatusError   = document.getElementById("status-error");
const elStatusErrorTxt = document.getElementById("status-error-text");

// Summary card values
const elCardTracking  = document.getElementById("card-tracking-value");
const elCardStatus    = document.getElementById("card-status-value");
const elStatusBadge   = document.getElementById("status-badge");
const elCardLocation  = document.getElementById("card-location-value");
const elCardDelivery  = document.getElementById("card-delivery-value");

// Timeline
const elEventsList  = document.getElementById("events-list");
const elEventsEmpty = document.getElementById("events-empty");

// Raw JSON
const elRawDetails  = document.getElementById("raw-details");
const elRawCode     = document.querySelector("#raw-json code");
const elCopyRawBtn  = document.getElementById("copy-raw-btn");

// ---------------------------------------------------------------------------
// Theme toggle
// Cycles: auto (system) → light → dark → auto
// No localStorage — state resets on page reload (intentional per spec).
// ---------------------------------------------------------------------------
(function initTheme() {
  // Determine the visible icon based on current effective theme.
  function refreshThemeIcon() {
    const theme = elHtml.getAttribute("data-theme");
    const isDark =
      theme === "dark" ||
      (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    elHtml.classList.toggle("theme-dark", isDark);
  }

  refreshThemeIcon();

  // Listen for system preference changes while on "auto".
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refreshThemeIcon);

  elThemeToggle.addEventListener("click", function () {
    const current = elHtml.getAttribute("data-theme");
    // Cycle: auto → light → dark → auto
    const next = current === "auto" ? "light"
               : current === "light" ? "dark"
               : "auto";
    elHtml.setAttribute("data-theme", next);
    refreshThemeIcon();
  });
}());

// ---------------------------------------------------------------------------
// Utility: format an ISO timestamp to a readable local string.
// Returns a human-readable date/time or a fallback string.
// ---------------------------------------------------------------------------
function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString; // return as-is if unparseable
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

// ---------------------------------------------------------------------------
// Utility: derive a CSS tone identifier from a status string.
// Used to apply the correct badge colour class.
// ---------------------------------------------------------------------------
function getStatusTone(status) {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s.includes("delivered")) return "delivered";
  if (s.includes("out for delivery")) return "out-for-delivery";
  if (s.includes("in transit") || s.includes("on the way")) return "in-transit";
  if (s.includes("exception") || s.includes("delay") || s.includes("held")) return "exception";
  return "unknown";
}

// ---------------------------------------------------------------------------
// setStatus — controls which status panel is visible.
// state: "idle" | "loading" | "error"
// ---------------------------------------------------------------------------
function setStatus(state, errorMessage) {
  elStatusIdle.hidden    = state !== "idle";
  elStatusLoading.hidden = state !== "loading";
  elStatusError.hidden   = state !== "error";

  if (state === "error" && errorMessage) {
    elStatusErrorTxt.textContent = errorMessage;
  }

  // Disable/re-enable controls while loading
  const isLoading = state === "loading";
  elTrackBtn.disabled = isLoading;
  elDemoBtn.disabled  = isLoading;
  elInput.disabled    = isLoading;
}

// ---------------------------------------------------------------------------
// renderSummary — populates the four summary cards with tracking data.
// ---------------------------------------------------------------------------
function renderSummary(data) {
  elCardTracking.textContent = data.trackingNumber || "—";

  const statusText = data.status || "Unknown";
  elStatusBadge.textContent = statusText;
  elStatusBadge.dataset.tone = getStatusTone(statusText);

  elCardLocation.textContent = data.latestLocation || "—";
  elCardDelivery.textContent = data.estimatedDelivery
    ? formatDateTime(data.estimatedDelivery)
    : "—";
}

// ---------------------------------------------------------------------------
// renderEvents — builds the timeline list from the events array.
// ---------------------------------------------------------------------------
function renderEvents(events) {
  elEventsList.innerHTML = "";

  const list = Array.isArray(events) ? events : [];

  if (list.length === 0) {
    elEventsEmpty.hidden = false;
    elEventsList.hidden  = true;
    return;
  }

  elEventsEmpty.hidden = true;
  elEventsList.hidden  = false;

  list.forEach(function (evt) {
    const li = document.createElement("li");
    li.className = "timeline-event";

    const description = evt.description || "Scan";
    const timeText     = evt.timestamp ? formatDateTime(evt.timestamp) : "";
    const locationText = evt.location || "";

    li.innerHTML =
      '<p class="timeline-event-description">' + escapeHtml(description) + "</p>" +
      '<div class="timeline-event-meta">' +
        (timeText
          ? '<span class="timeline-event-time">' +
              '<span aria-hidden="true">🕐</span>' +
              escapeHtml(timeText) +
            "</span>"
          : "") +
        (locationText
          ? '<span class="timeline-event-location">' +
              '<span aria-hidden="true">📍</span>' +
              escapeHtml(locationText) +
            "</span>"
          : "") +
      "</div>";

    elEventsList.appendChild(li);
  });
}

// ---------------------------------------------------------------------------
// renderRawJson — pretty-prints the raw API payload in the debug section.
// ---------------------------------------------------------------------------
function renderRawJson(data) {
  const raw = (data && data.raw !== undefined) ? data.raw : data;
  elRawCode.textContent = JSON.stringify(raw, null, 2);
}

// ---------------------------------------------------------------------------
// showResults — reveals the results panel and populates all sub-sections.
// ---------------------------------------------------------------------------
function showResults(data) {
  renderSummary(data);
  renderEvents(data.events);
  renderRawJson(data);
  elResultsArea.hidden = false;
  // Close the raw JSON details by default so it doesn't distract.
  elRawDetails.open = false;
}

// ---------------------------------------------------------------------------
// hideResults — hides the results panel and clears stale content.
// ---------------------------------------------------------------------------
function hideResults() {
  elResultsArea.hidden = true;
  elEventsList.innerHTML = "";
  elEventsEmpty.hidden = true;
  elRawCode.textContent = "";
}

// ---------------------------------------------------------------------------
// trackPackage — fetches tracking data from the backend API.
// ---------------------------------------------------------------------------
async function trackPackage(trackingNumber) {
  hideResults();
  setStatus("loading");

  let data;
  try {
    const url = API_BASE_URL + "/api/track?trackingNumber=" + encodeURIComponent(trackingNumber);
    const response = await fetch(url);

    if (!response.ok) {
      // Try to extract a message from the error body, otherwise use HTTP status.
      let errorMsg = "Server responded with status " + response.status + ".";
      try {
        const errBody = await response.json();
        if (errBody && errBody.error) errorMsg = errBody.error;
        else if (errBody && errBody.message) errorMsg = errBody.message;
      } catch (_) {
        // JSON parse failed — keep the HTTP status message.
      }
      throw new Error(errorMsg);
    }

    data = await response.json();
  } catch (err) {
    // Network failure or the error thrown above
    const message = err.message && err.message !== "Failed to fetch"
      ? err.message
      : "Unable to reach the tracking API. Check your connection and try again.";
    setStatus("error", message);
    return;
  }

  // Defensively normalise the response before rendering.
  const normalised = normalisePayload(data, trackingNumber);
  setStatus("idle"); // hide the status panel — results take over
  showResults(normalised);
}

// ---------------------------------------------------------------------------
// normalisePayload — ensures the shape is consistent regardless of backend
// variations so rendering functions can safely rely on field names.
// ---------------------------------------------------------------------------
function normalisePayload(raw, fallbackTrackingNumber) {
  const r = raw || {};
  return {
    trackingNumber: r.trackingNumber || r.tracking_number || fallbackTrackingNumber || "—",
    status:         r.status || r.shipmentStatus || r.state || "Unknown",
    estimatedDelivery: r.estimatedDelivery || r.estimated_delivery || r.deliveryDate || null,
    latestLocation: r.latestLocation || r.latest_location || r.location || "—",
    events:         Array.isArray(r.events) ? r.events : [],
    raw:            raw
  };
}

// ---------------------------------------------------------------------------
// Input validation — basic format check for UPS tracking numbers.
// Returns an error string if invalid, or null if OK.
// ---------------------------------------------------------------------------
function validateInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter a tracking number.";
  if (trimmed.length < 8) return "Tracking number seems too short. Please check and try again.";
  return null;
}

// ---------------------------------------------------------------------------
// Copy raw JSON to clipboard
// ---------------------------------------------------------------------------
elCopyRawBtn.addEventListener("click", async function () {
  const text = elRawCode.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const original = elCopyRawBtn.textContent;
    elCopyRawBtn.textContent = "Copied!";
    elCopyRawBtn.disabled = true;
    setTimeout(function () {
      elCopyRawBtn.textContent = original;
      elCopyRawBtn.disabled = false;
    }, 1800);
  } catch (_) {
    elCopyRawBtn.textContent = "Copy failed";
    setTimeout(function () {
      elCopyRawBtn.textContent = "Copy JSON";
    }, 1800);
  }
});

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------
elForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const value = elInput.value.trim();
  const error = validateInput(value);

  if (error) {
    elInputError.textContent = error;
    elInputError.hidden = false;
    elInput.classList.add("is-invalid");
    elInput.focus();
    return;
  }

  elInputError.hidden = true;
  elInput.classList.remove("is-invalid");

  trackPackage(value);
});

// Clear inline validation on input
elInput.addEventListener("input", function () {
  if (!elInput.classList.contains("is-invalid")) return;
  elInput.classList.remove("is-invalid");
  elInputError.hidden = true;
});

// ---------------------------------------------------------------------------
// Demo button — load mock data without network call
// ---------------------------------------------------------------------------
elDemoBtn.addEventListener("click", function () {
  elInput.value = DEMO_PAYLOAD.trackingNumber;
  elInputError.hidden = true;
  elInput.classList.remove("is-invalid");

  hideResults();
  setStatus("idle");

  // Small timeout so the UI has a chance to reset visually before rendering.
  setTimeout(function () {
    showResults(DEMO_PAYLOAD);
  }, 80);
});

// ---------------------------------------------------------------------------
// Utility: basic HTML escaping to prevent XSS when inserting dynamic content.
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
