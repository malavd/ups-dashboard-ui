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
        API_BASE_URL + "/api/manifests/" + encodeURIComponent(currentManifestId) + "/shipments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carrier, trackingNumber }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
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
