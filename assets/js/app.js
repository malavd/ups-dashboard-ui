(function () {
  "use strict";

  const API_BASE_URL = "https://ups-dashboard-api.vercel.app";

  const form = document.getElementById("track-form");
  const carrierEl = document.getElementById("carrier");
  const trackingEl = document.getElementById("trackingNumber");
  const statusArea = document.getElementById("status-area");
  const resultArea = document.getElementById("result-area");
  const demoBtn = document.getElementById("demo-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const carrierDetectedHint = document.getElementById("carrier-detected-hint");

  const summaryTracking = document.getElementById("summary-tracking");
  const summaryCarrier = document.getElementById("summary-carrier");
  const summaryStatus = document.getElementById("summary-status");
  const summaryLocation = document.getElementById("summary-location");
  const summaryEta = document.getElementById("summary-eta");
  const timeline = document.getElementById("timeline");
  const rawJson = document.getElementById("raw-json");

  const detectCarrier =
    (window.CarrierDetect && window.CarrierDetect.detectCarrier) ||
    function (input) {
      return { carrier: "Unknown", format: null, sanitized: (input || "").toString() };
    };

  function setStatus(text, tone) {
    statusArea.innerHTML = "";
    if (!text) {
      statusArea.textContent = "";
      return;
    }
    const span = document.createElement("span");
    span.className = "status status--" + (tone || "default");
    span.textContent = text;
    statusArea.appendChild(span);
  }

  function renderResult(data) {
    resultArea.hidden = false;
    summaryTracking.textContent = data.trackingNumber || "";
    summaryCarrier.textContent = (data.carrier || "").toUpperCase();
    summaryStatus.textContent = data.status || "";
    summaryLocation.textContent = data.latestLocation || "";
    summaryEta.textContent = data.estimatedDelivery
      ? new Date(data.estimatedDelivery).toLocaleString()
      : "";
    timeline.innerHTML = "";
    if (!Array.isArray(data.events) || data.events.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No tracking events available.";
      timeline.appendChild(li);
    } else {
      data.events.forEach((evt) => {
        const li = document.createElement("li");
        const timePart = evt.timestamp
          ? new Date(evt.timestamp).toLocaleString() + " - "
          : "";
        li.textContent =
          timePart + (evt.location ? evt.location + ": " : "") + (evt.description || "");
        timeline.appendChild(li);
      });
    }
    rawJson.textContent = JSON.stringify(data.raw, null, 2);
  }

  function resetResult() {
    resultArea.hidden = true;
    setStatus("", "");
  }

  async function trackPackage(carrier, trackingNumber) {
    resetResult();
    setStatus("Loading tracking data...", "loading");
    const url =
      API_BASE_URL +
      "/api/track?carrier=" +
      encodeURIComponent(carrier) +
      "&trackingNumber=" +
      encodeURIComponent(trackingNumber);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(
          (data && data.error && data.error.message) || "Could not retrieve tracking data.",
          "error"
        );
        return;
      }
      setStatus("Tracking data loaded.", "success");
      renderResult(data);
    } catch (err) {
      setStatus("Network error while fetching tracking.", "error");
    }
  }

  function resolveCarrier(selectEl, rawTrackingNumber) {
    const selected = (selectEl.value || "").trim().toLowerCase();
    if (selected !== "auto") {
      return { carrier: selected, detectedLabel: "" };
    }
    const result = detectCarrier(rawTrackingNumber);
    if (result.carrier === "Unknown") {
      return { carrier: "", detectedLabel: "Unknown" };
    }
    return { carrier: result.carrier.toLowerCase(), detectedLabel: result.carrier };
  }

  function updateDetectedHint(hintEl, selectEl, rawTrackingNumber) {
    if (!hintEl) return;
    const selected = (selectEl.value || "").trim().toLowerCase();
    if (selected !== "auto" || !rawTrackingNumber) {
      hintEl.hidden = true;
      hintEl.textContent = "";
      return;
    }
    const result = detectCarrier(rawTrackingNumber);
    hintEl.hidden = false;
    hintEl.textContent =
      result.carrier === "Unknown"
        ? "Could not auto-detect carrier for this tracking number."
        : "Detected carrier: " + result.carrier;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const trackingNumber = trackingEl.value.trim();
    if (!trackingNumber) {
      setStatus("Please enter a tracking number.", "error");
      return;
    }
    const { carrier, detectedLabel } = resolveCarrier(carrierEl, trackingNumber);
    if (!carrier) {
      setStatus(
        detectedLabel === "Unknown"
          ? "Could not auto-detect carrier. Please select one manually."
          : "Please enter a carrier and tracking number.",
        "error"
      );
      return;
    }
    trackPackage(carrier, trackingNumber);
  });

  if (carrierDetectedHint) {
    trackingEl.addEventListener("input", () => {
      updateDetectedHint(carrierDetectedHint, carrierEl, trackingEl.value.trim());
    });
    carrierEl.addEventListener("change", () => {
      updateDetectedHint(carrierDetectedHint, carrierEl, trackingEl.value.trim());
    });
  }

  demoBtn.addEventListener("click", () => {
    carrierEl.value = "shippo";
    trackingEl.value = "SHIPPO_TRANSIT";
    trackPackage("shippo", "SHIPPO_TRANSIT");
  });

  let theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.querySelector(".theme-icon").textContent = theme === "dark" ? "DARK" : "LIGHT";
  });

  // ---- Manifest feature ----
  const createManifestForm = document.getElementById("create-manifest-form");
  const manifestNameEl = document.getElementById("manifest-name");
  const manifestSelect = document.getElementById("manifest-select");
  const refreshManifestsBtn = document.getElementById("refresh-manifests-btn");
  const deleteManifestBtn = document.getElementById("delete-manifest-btn");
  const noManifestMessage = document.getElementById("no-manifest-message");
  const manifestDetail = document.getElementById("manifest-detail");
  const manifestDetailTitle = document.getElementById("manifest-detail-title");
  const manifestSummaryChips = document.getElementById("manifest-summary-chips");
  const addShipmentForm = document.getElementById("add-shipment-form");
  const manifestCarrierEl = document.getElementById("manifest-carrier");
  const manifestTrackingEl = document.getElementById("manifest-tracking-number");
  const manifestCarrierDetectedHint = document.getElementById("manifest-carrier-detected-hint");
  const refreshTrackingBtn = document.getElementById("refresh-tracking-btn");
  const manifestStatusArea = document.getElementById("manifest-status-area");
  const manifestShipmentsBody = document.getElementById("manifest-shipments-body");

  let currentManifestId = null;

  function setManifestStatus(text, tone) {
    if (!manifestStatusArea) return;
    manifestStatusArea.innerHTML = "";
    if (!text) return;
    const span = document.createElement("span");
    span.className = "status status--" + (tone || "default");
    span.textContent = text;
    manifestStatusArea.appendChild(span);
  }

  function statusBadgeClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("deliver")) return "status-badge--delivered";
    if (s.includes("transit") || s.includes("progress")) return "status-badge--transit";
    if (s.includes("fail")) return "status-badge--failure";
    if (s.includes("exception") || s.includes("error")) return "status-badge--exception";
    if (s.includes("pending") || !s) return "status-badge--pending";
    return "status-badge--unknown";
  }

  function renderManifestSummaryChips(shipments) {
    if (!manifestSummaryChips) return;
    manifestSummaryChips.innerHTML = "";
    const total = shipments.length;
    const counts = {};
    shipments.forEach((s) => {
      const key = (s.status || "UNKNOWN").toUpperCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    const totalChip = document.createElement("span");
    totalChip.className = "chip";
    totalChip.textContent = total + (total === 1 ? " shipment" : " shipments");
    manifestSummaryChips.appendChild(totalChip);
    Object.keys(counts).forEach((key) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = key + ": " + counts[key];
      manifestSummaryChips.appendChild(chip);
    });
  }

  function renderManifestShipments(shipments) {
    manifestShipmentsBody.innerHTML = "";
    if (!Array.isArray(shipments) || shipments.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No shipments yet. Add one above to get started.";
      manifestShipmentsBody.appendChild(empty);
      renderManifestSummaryChips([]);
      return;
    }
    renderManifestSummaryChips(shipments);
    shipments.forEach((s) => {
      const card = document.createElement("div");
      card.className = "shipment-card";

      const badge = document.createElement("div");
      badge.className = "shipment-carrier-badge";
      badge.textContent = (s.carrier || "").toUpperCase().slice(0, 4);
      card.appendChild(badge);

      const main = document.createElement("div");
      main.className = "shipment-main";

      const tracking = document.createElement("div");
      tracking.className = "shipment-tracking";
      tracking.textContent = s.trackingNumber || "";
      main.appendChild(tracking);

      const meta = document.createElement("div");
      meta.className