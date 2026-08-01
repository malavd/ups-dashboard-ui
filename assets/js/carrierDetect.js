/**
 * carrierDetect.js
 * ---------------------------------------------------------------------------
 * Reliable tracking-number carrier detection for UPS, FedEx, and USPS.
 *
 * Usage:
 *   const { detectCarrier } = require('./carrierDetect'); // Node/CommonJS
 *   // or, in the browser, this file exposes `window.CarrierDetect`
 *
 *   detectCarrier("1Z999AA10123456784");
 *   // => { carrier: "UPS", format: "primary", sanitized: "1Z999AA10123456784" }
 *
 * All matching is performed against a SANITIZED copy of the input (spaces,
 * dashes, and other non-alphanumeric characters stripped) so that user-typed
 * values like "1Z 999A A1012-3456784" are still recognized correctly.
 * ---------------------------------------------------------------------------
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    // CommonJS / Node (also used by the Jest test suite below)
    module.exports = factory();
  } else {
    // Browser global
    root.CarrierDetect = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Strips whitespace, dashes, dots, and any other non-alphanumeric
   * characters from a tracking number so format checks are reliable
   * regardless of how the user pastes/types the value.
   * @param {string} input
   * @returns {string} sanitized, uppercased tracking number
   */
  function sanitize(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }

  // ---------------------------------------------------------------------
  // Individual carrier matchers. Each returns a format label (string) if
  // the sanitized tracking number matches that carrier's rules, or null.
  // ---------------------------------------------------------------------

  // UPS: 1Z + 16 alphanumeric (18 total), OR legacy 9-digit / 11-digit
  // all-numeric domestic formats.
  const UPS_PRIMARY_RE = /^1Z[A-Z0-9]{16}$/;
  const UPS_LEGACY_RE = /^(\d{9}|\d{11})$/;

  function matchUPS(sanitized) {
    if (UPS_PRIMARY_RE.test(sanitized)) return "primary";
    if (UPS_LEGACY_RE.test(sanitized)) return "legacy";
    return null;
  }

  // FedEx: 12-digit (Express/Ground), 15-digit (Ground alternate), or
  // 20/22-digit SmartPost/Home Delivery (commonly, but not strictly,
  // prefixed with "96").
  const FEDEX_12_RE = /^\d{12}$/;
  const FEDEX_15_RE = /^\d{15}$/;
  const FEDEX_SMARTPOST_RE = /^96\d{18}$|^96\d{20}$/; // 20 or 22 digits starting 96
  const FEDEX_20_22_GENERIC_RE = /^\d{20}$|^\d{22}$/; // fallback if not "96"-prefixed

  function matchFedEx(sanitized) {
    if (FEDEX_SMARTPOST_RE.test(sanitized)) return "smartpost";
    if (FEDEX_12_RE.test(sanitized)) return "express-ground";
    if (FEDEX_15_RE.test(sanitized)) return "ground-alt";
    // Generic 20/22-digit numeric that isn't a USPS 22-digit (checked after
    // USPS in detectCarrier's ordering) can still be FedEx SmartPost.
    if (FEDEX_20_22_GENERIC_RE.test(sanitized)) return "smartpost";
    return null;
  }

  // USPS: 22-digit domestic starting with 92/93/94/95, OR 13-character
  // international format: 2 letters + 9 digits + "US".
  const USPS_DOMESTIC_RE = /^(92|93|94|95)\d{20}$/;
  const USPS_INTL_RE = /^[A-Z]{2}\d{9}US$/;

  function matchUSPS(sanitized) {
    if (USPS_DOMESTIC_RE.test(sanitized)) return "domestic";
    if (USPS_INTL_RE.test(sanitized)) return "international";
    return null;
  }

  /**
   * Detects the carrier for a given tracking number string.
   *
   * Detection order: UPS -> USPS -> FedEx. USPS is checked before the
   * generic FedEx 20/22-digit fallback so that legitimate 22-digit USPS
   * numbers (92/93/94/95-prefixed) are never misclassified as FedEx.
   *
   * @param {string} rawInput - Raw, possibly unsanitized tracking number.
   * @returns {{carrier: ('UPS'|'FedEx'|'USPS'|'Unknown'), format: (string|null), sanitized: string}}
   */
  function detectCarrier(rawInput) {
    const sanitized = sanitize(rawInput);

    if (!sanitized) {
      return { carrier: "Unknown", format: null, sanitized: "" };
    }

    const upsFormat = matchUPS(sanitized);
    if (upsFormat) {
      return { carrier: "UPS", format: upsFormat, sanitized: sanitized };
    }

    const uspsFormat = matchUSPS(sanitized);
    if (uspsFormat) {
      return { carrier: "USPS", format: uspsFormat, sanitized: sanitized };
    }

    const fedexFormat = matchFedEx(sanitized);
    if (fedexFormat) {
      return { carrier: "FedEx", format: fedexFormat, sanitized: sanitized };
    }

    return { carrier: "Unknown", format: null, sanitized: sanitized };
  }

  return { detectCarrier: detectCarrier, sanitize: sanitize };
});
