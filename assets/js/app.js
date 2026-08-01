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
  const manifestDetail = document.getElementById("manifest-detail");
  const manifestDetailTitle = document.getElementById("manifest-detail-title");
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

  async function loadManifests(selectId) {
    try {
      const res = await fetch(API_BASE_URL + "/api/manifests");
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      manifestSelect.innerHTML = '<option value="">-- Select a manifest --</option>';
      (data.manifests || []).forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id || m._id;
        opt.textContent = m.name || opt.value;
        manifestSelect.appendChild(opt);
      });
      if (selectId) {
        manifestSelect.value = selectId;
        loadManifestDetail(selectId);
      }
    } catch (err) {
      setManifestStatus("Failed to load manifests.", "error");
    }
  }

  function renderManifestShipments(shipments) {
    manifestShipmentsBody.innerHTML = "";
    if (!Array.isArray(shipments) || shipments.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "No shipments yet.";
      tr.appendChild(td);
      manifestShipmentsBody.appendChild(tr);
      return;
    }
    shipments.forEach((s) => {
      const tr = document.createElement("tr");
      const eta = s.estimatedDelivery
        ? new Date(s.estimatedDelivery).toLocaleDateString()
        : "";
      tr.innerHTML =
        "<td>" + (s.carrier || "").toUpperCase() + "</td>" +
        "<td>" + (s.trackingNumber || "") + "</td>" +
        "<td>" + (s.status || "UNKNOWN") + "</td>" +
        "<td>" + (s.latestLocation || "") + "</td>" +
        "<td>" + eta + "</td>";
      manifestShipmentsBody.appendChild(tr);
    });
  }

  async function loadManifestDetail(id) {
    if (!id) {
      manifestDetail.hidden = true;
      currentManifestId = null;
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
    refreshManifestsBtn.addEventListener("click", () => loadManifests());
  }

  if (addShipmentForm) {
    addShipmentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentManifestId) {
        setManifestStatus("Select a manifest first.", "error");
        return;
      }
      const carrier = manifestCarrierEl.value.trim();
      const trackingNumber = manifestTrackingEl.value.trim();
      if (!carrier || !trackingNumber) {
        setManifestStatus("Enter a carrier and tracking number.", "error");
        return;
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
          setManifestStatus(
            (data && data.error && data.error.message) || "Failed to add shipment.",
            "error"
          );
          return;
        }
        manifestTrackingEl.value = "";
        setManifestStatus("Shipment added.", "success");
        loadManifestDetail(currentManifestId);
      } catch (err) {
        setManifestStatus("Network error while adding shipment.", "error");
      }
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
