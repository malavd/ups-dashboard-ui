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

  trackingEl.addEventListener("input", () => {
    updateDetectedHint(carrierDetectedHint, carrierEl, trackingEl.value.trim());
  });
  carrierEl.addEventListener("change", () => {
    updateDetectedHint(carrierDetectedHint, carrierEl, trackingEl.value.trim());
  });

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
  const manifestCarrierDetectedHint = document.getElementById(
    "manifest-carrier-detected-hint"
  );
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

  async function removeShipment(shipmentId) {
    if (!currentManifestId) return;
    if (!confirm("Remove this shipment from the manifest?")) return;
    try {
      const res = await fetch(
        API_BASE_URL +
          "/api/manifests/" +
          encodeURIComponent(currentManifestId) +
          "/shipments/" +
          encodeURIComponent(shipmentId),
        { method: "DELETE" }
      );
      if (!res.ok) {
        setManifestStatus("Could not remove shipment.", "error");
        return;
      }
      setManifestStatus("Shipment removed.", "success");
      await (currentManifestId);
    } catch (err) {
      setManifestStatus("Network error while removing shipment.", "error");
    }
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

      const trackingDiv = document.createElement("div");
      trackingDiv.className = "shipment-card-tracking";
      trackingDiv.textContent = s.trackingNumber;

      const carrierDiv = document.createElement("div");
      carrierDiv.className = "shipment-card-carrier";
      carrierDiv.textContent = (s.carrier || "").toUpperCase();

      const etaDiv = document.createElement("div");
      etaDiv.className = "shipment-card-eta";
      etaDiv.textContent = s.estimatedDelivery
        ? "ETA: " + new Date(s.estimatedDelivery).toLocaleDateString()
        : "No ETA";

      const locationDiv = document.createElement("div");
      locationDiv.className = "shipment-card-location";
      locationDiv.textContent = s.latestLocation || "N/A";

      const badge = document.createElement("div");
      badge.className = "status-badge " + statusBadgeClass(s.status);
      badge.textContent = s.status || "PENDING";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => removeShipment(s.id));

      card.appendChild(trackingDiv);
      card.appendChild(carrierDiv);
      card.appendChild(etaDiv);
      card.appendChild(locationDiv);
      card.appendChild(badge);
      card.appendChild(removeBtn);
      manifestShipmentsBody.appendChild(card);
    });
  }

  async function loadManifests() {
    try {
      const res = await fetch(API_BASE_URL + "/api/manifests");
      const data = await res.json();
      const manifests = Array.isArray(data) ? data : data.manifests || [];
      manifestSelect.innerHTML = '<option value="">-- Select a Manifest --</option>';
      manifests.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        manifestSelect.appendChild(opt);
      });
      if (noManifestMessage) {
        noManifestMessage.hidden = manifests.length > 0;
      }
    } catch (err) {
      setManifestStatus("Error loading manifests.", "error");
    }
  }

  async function loadManifestDetail(manifestId) {
    if (!manifestId) {
      manifestDetail.hidden = true;
      return;
    }
    try {
      const res = await fetch(API_BASE_URL + "/api/manifests/" + encodeURIComponent(manifestId));
      const data = await res.json();
      manifestDetail.hidden = false;
            manifestDetailTitle.textContent = (data.manifest && data.manifest.name) || "";
            renderManifestShipments((data.manifest && data.manifest.shipments) || []);
    } catch (err) {
      setManifestStatus("Error loading manifest detail.", "error");
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
        if (res.ok) {
          const created = await res.json();
          manifestNameEl.value = "";
          await loadManifests();
          if (created && created.id) {
            manifestSelect.value = created.id;
            currentManifestId = created.id;
            await loadManifestDetail(created.id);
          }
        } else {
          setManifestStatus("Could not create manifest.", "error");
        }
      } catch (err) {
        setManifestStatus("Network error while creating manifest.", "error");
      }
    });
  }

  if (deleteManifestBtn) {
    deleteManifestBtn.addEventListener("click", async () => {
      if (!currentManifestId) return;
      if (!confirm("Delete this manifest? This cannot be undone.")) return;
      try {
        const res = await fetch(
          API_BASE_URL + "/api/manifests/" + encodeURIComponent(currentManifestId),
          { method: "DELETE" }
        );
        if (!res.ok) {
          setManifestStatus("Could not delete manifest.", "error");
          return;
        }
        currentManifestId = null;
        manifestDetail.hidden = true;
        await loadManifests();
        if (manifestSelect.options.length > 1) {
          manifestSelect.selectedIndex = 1;
          currentManifestId = manifestSelect.value;
          await loadManifestDetail(currentManifestId);
        }
      } catch (err) {
        setManifestStatus("Network error while deleting manifest.", "error");
      }
    });
  }

  if (refreshTrackingBtn) {
    refreshTrackingBtn.addEventListener("click", async () => {
      if (!currentManifestId) return;
      setManifestStatus("Refreshing tracking status...", "loading");
      try {
        await fetch(
          API_BASE_URL + "/api/manifests/" + encodeURIComponent(currentManifestId) + "/refresh",
          { method: "POST" }
        );
        await loadManifestDetail(currentManifestId);
        setManifestStatus("Tracking refreshed.", "success");
      } catch (err) {
        setManifestStatus("Error refreshing tracking.", "error");
      }
    });
  }

  if (refreshManifestsBtn) {
    refreshManifestsBtn.addEventListener("click", loadManifests);
  }

  if (manifestSelect) {
    manifestSelect.addEventListener("change", async (e) => {
      currentManifestId = e.target.value || null;
      await loadManifestDetail(currentManifestId);
    });
  }

  if (addShipmentForm) {
    addShipmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentManifestId) {
        setManifestStatus("Select a manifest first.", "error");
        return;
      }
      const rawInput = manifestTrackingEl.value.trim();
      if (!rawInput) {
        setManifestStatus("Please enter at least one tracking number.", "error");
        return;
      }
      const trackingNumbers = rawInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      setManifestStatus("Adding " + trackingNumbers.length + " shipment(s)...", "loading");

      let successCount = 0;
      let failCount = 0;
      const failedNumbers = [];

      for (const trackingNumber of trackingNumbers) {
        const { carrier, detectedLabel } = resolveCarrier(manifestCarrierEl, trackingNumber);
        if (!carrier) {
          failCount++;
          failedNumbers.push(trackingNumber + " (carrier unresolved)");
          continue;
        }
        try {
          const res = await fetch(
            API_BASE_URL +
              "/api/manifests/" +
              encodeURIComponent(currentManifestId) +
              "/shipments",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ carrier, trackingNumber }),
            }
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.ok === false) {
            failCount++;
            failedNumbers.push(trackingNumber);
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
          failedNumbers.push(trackingNumber);
        }
      }

      const summary =
        successCount + " added" + (failCount ? ", " + failCount + " failed" : "");
      setManifestStatus(summary, failCount ? "error" : "success");
      manifestTrackingEl.value = "";
      updateDetectedHint(manifestCarrierDetectedHint, manifestCarrierEl, "");
      await loadManifestDetail(currentManifestId);
    });

    manifestTrackingEl.addEventListener("input", () => {
      const firstNumber = manifestTrackingEl.value.split(",")[0].trim();
      updateDetectedHint(manifestCarrierDetectedHint, manifestCarrierEl, firstNumber);
    });

    manifestCarrierEl.addEventListener("change", () => {
      const firstNumber = manifestTrackingEl.value.split(",")[0].trim();
      updateDetectedHint(manifestCarrierDetectedHint, manifestCarrierEl, firstNumber);
    });
  }

  loadManifests();
})();
