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

  function normalizeTrackingNumber(input) {
    return (input || "")
      .toString()
      .trim()
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
  }

  function detectCarrier(input) {
    const normalized = normalizeTrackingNumber(input);
    if (!normalized) return "Unknown";

    const upsRegexes = [/^1Z[A-Z0-9]{16}$/i, /^\d{9}$/, /^\d{11}$/];
    const fedExRegexes = [/^\d{12}$/, /^\d{15}$/, /^96\d{18,20}$/];
    const uspsRegexes = [/^(92|93|94|95)\d{20}$/, /^[A-Z]{2}\d{9}US$/i];

    if (upsRegexes.some((regex) => regex.test(normalized))) return "UPS";
    if (fedExRegexes.some((regex) => regex.test(normalized))) return "FedEx";
    if (uspsRegexes.some((regex) => regex.test(normalized))) return "USPS";

    return "Unknown";
  }

  function mapCarrierToApiValue(carrier) {
    switch ((carrier || "").toUpperCase()) {
      case "UPS":
        return "ups";
      case "FEDEX":
        return "fedex";
      case "USPS":
        return "usps";
      default:
        return (carrier || "").toLowerCase();
    }
  }

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

    const detected = detectCarrier(rawTrackingNumber);
    if (detected === "Unknown") {
      return { carrier: "", detectedLabel: "Unknown" };
    }

    return { carrier: mapCarrierToApiValue(detected), detectedLabel: detected };
  }

  function updateDetectedHint(hintEl, selectEl, rawTrackingNumber) {
    if (!hintEl) return;
    const selected = (selectEl.value || "").trim().toLowerCase();
    if (selected !== "auto" || !rawTrackingNumber) {
      hintEl.hidden = true;
      hintEl.textContent = "";
      return;
    }

    const detected = detectCarrier(rawTrackingNumber);
    hintEl.hidden = false;
    hintEl.textContent =
      detected === "Unknown"
        ? "Could not auto-detect carrier for this tracking number."
        : "Auto-detected carrier: " + detected;
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
  themeToggle.querySelector(".theme-icon").textContent = theme === "dark" ? "☀︎" : "🌙";
  trackingEl.focus();
  themeToggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.querySelector(".theme-icon").textContent = theme === "dark" ? "☀︎" : "🌙";
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
      meta.className = "shipment-meta";
      const statusSpan = document.createElement("span");
      statusSpan.className = "status-badge " + statusBadgeClass(s.status);
      statusSpan.textContent = (s.status || "UNKNOWN").toUpperCase();
      meta.appendChild(statusSpan);
      if (s.latestLocation) {
        const locSpan = document.createElement("span");
        locSpan.textContent = "Location: " + s.latestLocation;
        meta.appendChild(locSpan);
      }
      if (s.estimatedDelivery) {
        const etaSpan = document.createElement("span");
        etaSpan.textContent = "ETA: " + new Date(s.estimatedDelivery).toLocaleDateString();
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
      const res = await fetch(API_BASE_URL + "/api/manifests");
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      const manifests = data.manifests || [];
      manifestSelect.innerHTML = '<option value="">-- Select a manifest --</option>';
      manifests.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id || m._id;
        opt.textContent = m.name || opt.value;
        manifestSelect.appendChild(opt);
      });
      let targetId = selectId;
      if (targetId && !manifests.some((m) => (m.id || m._id) === targetId)) {
        targetId = null;
      }
      if (!targetId && manifests.length > 0) {
        targetId = manifests[0].id || manifests[0]._id;
      }
      if (targetId) {
        manifestSelect.value = targetId;
        loadManifestDetail(targetId);
      } else {
        manifestSelect.value = "";
        showNoManifestState();
      }
    } catch (err) {
      setManifestStatus("Failed to load manifests.", "error");
    }
  }

  function showNoManifestState() {
    currentManifestId = null;
    manifestDetail.hidden = true;
    if (noManifestMessage) noManifestMessage.hidden = false;
    if (deleteManifestBtn) deleteManifestBtn.hidden = true;
  }

  async function loadManifestDetail(id) {
    if (!id) {
      showNoManifestState();
      return;
    }
    try {
      const res = await fetch(API_BASE_URL + "/api/manifests/" + id);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setManifestStatus("Failed to load manifest.", "error");
        return;
      }
      currentManifestId = id;
      if (noManifestMessage) noManifestMessage.hidden = true;
      if (deleteManifestBtn) deleteManifestBtn.hidden = false;
      manifestDetail.hidden = false;
      manifestDetailTitle.textContent = data.manifest.name || "Manifest";
      renderManifestShipments(data.manifest.shipments || []);
    } catch (err) {
      setManifestStatus("Network error while loading manifest.", "error");
    }
  }

  if (createManifestForm) {
    createManifestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = manifestNameEl.value.trim();
      if (!name) return;
      try {
        const res = await fetch(API_BASE_URL + "/api/manifests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setManifestStatus("Failed to create manifest.", "error");
          return;
        }
        manifestNameEl.value = "";
        setManifestStatus("Manifest created.", "success");
        const newId = data.manifest.id || data.manifest._id;
        await loadManifests(newId);
      } catch (err) {
        setManifestStatus("Network error while creating manifest.", "error");
      }
    });
  }

  if (manifestSelect) {
    manifestSelect.addEventListener("change", () => {
      loadManifestDetail(manifestSelect.value);
    });
  }

  if (refreshManifestsBtn) {
    refreshManifestsBtn.addEventListener("click", () => loadManifests(currentManifestId));
  }

  if (deleteManifestBtn) {
    deleteManifestBtn.addEventListener("click", async () => {
      if (!currentManifestId) return;
      const name = manifestDetailTitle ? manifestDetailTitle.textContent : "this manifest";
      const confirmed = window.confirm(
        'Delete manifest "' + name + '"? This removes all shipments in it.'
      );
      if (!confirmed) return;
      setManifestStatus("Deleting manifest...", "loading");
      try {
        const res = await fetch(API_BASE_URL + "/api/manifests/" + currentManifestId, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setManifestStatus("Failed to delete manifest.", "error");
          return;
        }
        setManifestStatus("Manifest deleted.", "success");
        await loadManifests();
      } catch (err) {
        setManifestStatus("Network error while deleting manifest.", "error");
      }
    });
  }

  // ---- Carrier auto-detect hint wiring for manifest add-shipment form ----
  if (manifestCarrierDetectedHint && manifestCarrierEl && manifestTrackingEl) {
    manifestTrackingEl.addEventListener("input", () => {
      updateDetectedHint(manifestCarrierDetectedHint, manifestCarrierEl, manifestTrackingEl.value.trim());
    });
    manifestCarrierEl.addEventListener("change", () => {
      updateDetectedHint(manifestCarrierDetectedHint, manifestCarrierEl, manifestTrackingEl.value.trim());
    });
  }

  // ---- Add shipment (supports bulk, comma-separated tracking numbers) ----
  if (addShipmentForm) {
    addShipmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentManifestId) {
        setManifestStatus("Select a manifest first.", "error");
        return;
      }
      const rawInput = manifestTrackingEl.value.trim();
      if (!rawInput) {
        setManifestStatus("Enter at least one tracking number.", "error");
        return;
      }

      const trackingNumbers = rawInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (trackingNumbers.length === 0) {
        setManifestStatus("Enter at least one valid tracking number.", "error");
        return;
      }

      setManifestStatus(
        trackingNumbers.length > 1
          ? "Adding " + trackingNumbers.length + " shipments..."
          : "Adding shipment...",
        "loading"
      );

      let successCount = 0;
      let failCount = 0;
      const failedNumbers = [];

      for (const trackingNumber of trackingNumbers) {
        const { carrier, detectedLabel } = resolveCarrier(manifestCarrierEl, trackingNumber);
        if (!carrier) {
          failCount++;
          failedNumbers.push(trackingNumber + " (carrier undetected)");
          continue;
        }
        try {
          const res = await fetch(
            API_BASE_URL + "/api/manifests/" + currentManifestId + "/shipments",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ carrier, trackingNumber }),
            }
          );
          const data = await res.json();
          if (!res.ok || !data.ok) {
            failCount++;
            failedNumbers.push(
              trackingNumber + " (" + ((data && data.error && data.error.message) || "failed") + ")"
            );
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
          failedNumbers.push(trackingNumber + " (network error)");
        }
      }

      manifestTrackingEl.value = "";

      if (successCount > 0 && failCount === 0) {
        setManifestStatus(
          successCount === 1 ? "Shipment added." : successCount + " shipments added.",
          "success"
        );
      } else if (successCount > 0 && failCount > 0) {
        setManifestStatus(
          successCount + " added, " + failCount + " failed: " + failedNumbers.join("; "),
          "error"
        );
      } else {
        setManifestStatus("Failed to add shipment(s): " + failedNumbers.join("; "), "error");
      }

      loadManifestDetail(currentManifestId);
    });
  }

  if (refreshTrackingBtn) {
    refreshTrackingBtn.addEventListener("click", async () => {
      if (!currentManifestId) {
        setManifestStatus("Select a manifest first.", "error");
        return;
      }
      setManifestStatus("Refreshing tracking...", "loading");
      try {
        const res = await fetch(
          API_BASE_URL + "/api/manifests/" + currentManifestId + "/track",
          { method: "POST" }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setManifestStatus("Failed to refresh tracking.", "error");
          return;
        }
        setManifestStatus("Tracking refreshed.", "success");
        loadManifestDetail(currentManifestId);
      } catch (err) {
        setManifestStatus("Network error while refreshing tracking.", "error");
      }
    });
  }

  if (manifestSelect) {
    loadManifests();
  }
})();
