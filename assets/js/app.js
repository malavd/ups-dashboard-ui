(function () {
  "use strict";

  // Replace this with your Vercel backend URL after deployment.
  const API_BASE_URL = "https://ups-dashboard-api.vercel.app";

  const form = document.getElementById("track-form");
  const carrierEl = document.getElementById("carrier");
  const trackingEl = document.getElementById("trackingNumber");
  const statusArea = document.getElementById("status-area");
  const resultArea = document.getElementById("result-area");
  const demoBtn = document.getElementById("demo-btn");
  const themeToggle = document.getElementById("theme-toggle");

  const summaryTracking = document.getElementById("summary-tracking");
  const summaryCarrier = document.getElementById("summary-carrier");
  const summaryStatus = document.getElementById("summary-status");
  const summaryLocation = document.getElementById("summary-location");
  const summaryEta = document.getElementById("summary-eta");
  const timeline = document.getElementById("timeline");
  const rawJson = document.getElementById("raw-json");

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
    summaryEta.textContent =
      data.estimatedDelivery
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
          ? new Date(evt.timestamp).toLocaleString() + " — "
          : "";
        li.textContent =
          timePart +
          (evt.location ? evt.location + ": " : "") +
          (evt.description || "");
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
          data?.error?.message || "Could not retrieve tracking data.",
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const carrier = carrierEl.value.trim();
    const trackingNumber = trackingEl.value.trim();
    if (!carrier || !trackingNumber) {
      setStatus("Please enter a carrier and tracking number.", "error");
      return;
    }
    trackPackage(carrier, trackingNumber);
  });

  demoBtn.addEventListener("click", () => {
    carrierEl.value = "shippo";
    trackingEl.value = "SHIPPO_TRANSIT";
    trackPackage("shippo", "SHIPPO_TRANSIT");
  });

  // Theme toggle
  let theme = matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.querySelector(".theme-icon").textContent =
      theme === "dark" ? "🌙" : "☀️";
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
      meta.className = "shipment-meta";

      const statusSpan = document.createElement("span");
      statusSpan.className = "status-badge " + statusBadgeClass(s.status);
      statusSpan.textContent = s.status || "UNKNOWN";
      meta.appendChild(statusSpan);

      if (s.latestLocation) {
        const locSpan = document.createElement("span");
        locSpan.innerHTML = "<strong>Location:</strong> " + s.latestLocation;
        meta.appendChild(locSpan);
      }

      if (s.estimatedDelivery) {
        const etaSpan = document.createElement("span");
        etaSpan.innerHTML =
          "<strong>ETA:</strong> " +
          new Date(s.estimatedDelivery).toLocaleDateString();
        meta.appendChild(etaSpan);
      }

      main.appendChild(meta);
      card.appendChild(main);

      const actions = document.createElement("div");
      actions.className = "shipment-actions";
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-icon";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => removeShipment(s.id || s._id));
      actions.appendChild(removeBtn);
      card.appendChild(actions);

      manifestShipmentsBody.appendChild(card);
    });
  }

  async function removeShipment(shipmentId) {
    if (!currentManifestId || !shipmentId) return;
    const confirmed = window.confirm("Remove this shipment from the manifest?");
    if (!confirmed) return;
    setManifestStatus("Removing shipment...", "loading");
    try {
      const res = await fetch(
        API_BASE_URL +
          "/api/manifests/" +
          currentManifestId +
          "/shipments?shipmentId=" +
          encodeURIComponent(shipmentId),
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setManifestStatus("Failed to remove shipment.", "error");
        return;
      }
      setManifestStatus("Shipment removed.", "success");
      loadManifestDetail(currentManifestId);
    } catch (err) {
      setManifestStatus("Network error while removing shipment.", "error");
    }
  }

  async function loadManifests(selectId) {
    try {
      const res
