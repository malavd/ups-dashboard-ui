/**
 * carrierDetect.test.js
 * Unit tests for carrierDetect.js using Jest (`npm test` with jest configured).
 */
const { detectCarrier } = require("./carrierDetect");

describe("detectCarrier - UPS", () => {
  test("detects primary 1Z format (18 chars)", () => {
    expect(detectCarrier("1Z999AA10123456784").carrier).toBe("UPS");
  });

  test("detects primary 1Z format case-insensitively", () => {
    expect(detectCarrier("1z999aa10123456784").carrier).toBe("UPS");
  });

  test("detects 1Z format with spaces/dashes stripped", () => {
    expect(detectCarrier("1Z 999-AA1 0123-456784").carrier).toBe("UPS");
  });

  test("detects legacy 9-digit UPS format", () => {
    expect(detectCarrier("123456789").carrier).toBe("UPS");
  });

  test("detects legacy 11-digit UPS format", () => {
    expect(detectCarrier("12345678901").carrier).toBe("UPS");
  });
});

describe("detectCarrier - FedEx", () => {
  test("detects 12-digit Express/Ground format", () => {
    expect(detectCarrier("123456789012").carrier).toBe("FedEx");
  });

  test("detects 15-digit Ground alternate format", () => {
    expect(detectCarrier("123456789012345").carrier).toBe("FedEx");
  });

  test("detects 20-digit SmartPost format starting with 96", () => {
    expect(detectCarrier("96123456789012345678".slice(0, 20)).carrier).toBe(
      "FedEx"
    );
  });

  test("detects 22-digit SmartPost format starting with 96", () => {
    const trackingNumber = "96" + "1".repeat(20); // 22 digits total
    expect(detectCarrier(trackingNumber).carrier).toBe("FedEx");
  });
});

describe("detectCarrier - USPS", () => {
  test("detects 22-digit domestic format starting with 92", () => {
    const trackingNumber = "92" + "1".repeat(20); // 22 digits total
    expect(detectCarrier(trackingNumber).carrier).toBe("USPS");
  });

  test("detects 22-digit domestic format starting with 93", () => {
    const trackingNumber = "93" + "2".repeat(20);
    expect(detectCarrier(trackingNumber).carrier).toBe("USPS");
  });

  test("detects 22-digit domestic format starting with 94", () => {
    const trackingNumber = "94" + "3".repeat(20);
    expect(detectCarrier(trackingNumber).carrier).toBe("USPS");
  });

  test("detects 22-digit domestic format starting with 95", () => {
    const trackingNumber = "95" + "4".repeat(20);
    expect(detectCarrier(trackingNumber).carrier).toBe("USPS");
  });

  test("detects 13-character international format (e.g. EA123456789US)", () => {
    expect(detectCarrier("EA123456789US").carrier).toBe("USPS");
  });

  test("detects international format case-insensitively", () => {
    expect(detectCarrier("ea123456789us").carrier).toBe("USPS");
  });

  test("detects international format with different letter prefix (CP)", () => {
    expect(detectCarrier("CP987654321US").carrier).toBe("USPS");
  });
});

describe("detectCarrier - sanitization", () => {
  test("strips spaces before matching", () => {
    expect(detectCarrier("1 Z 9 9 9 A A 1 0 1 2 3 4 5 6 7 8 4").carrier).toBe(
      "UPS"
    );
  });

  test("strips dashes before matching", () => {
    expect(detectCarrier("1Z-999A-A101-2345-6784").carrier).toBe("UPS");
  });

  test("strips mixed special characters before matching", () => {
    expect(detectCarrier("EA.123-456 789US").carrier).toBe("USPS");
  });
});

describe("detectCarrier - unknown / edge cases", () => {
  test("returns Unknown for empty string", () => {
    expect(detectCarrier("").carrier).toBe("Unknown");
  });

  test("returns Unknown for null input without throwing", () => {
    expect(() => detectCarrier(null)).not.toThrow();
    expect(detectCarrier(null).carrier).toBe("Unknown");
  });

  test("returns Unknown for undefined input without throwing", () => {
    expect(() => detectCarrier(undefined)).not.toThrow();
    expect(detectCarrier(undefined).carrier).toBe("Unknown");
  });

  test("returns Unknown for a random short string", () => {
    expect(detectCarrier("ABC123").carrier).toBe("Unknown");
  });

  test("returns Unknown for a too-long numeric string (not 9/11/12/15/20/22)", () => {
    expect(detectCarrier("1234567890123456").carrier).toBe("Unknown");
  });

  test("never throws on non-string input (number)", () => {
    expect(() => detectCarrier(123456789)).not.toThrow();
  });

  test("result always includes sanitized field", () => {
    const result = detectCarrier("1z999aa10123456784");
    expect(result.sanitized).toBe("1Z999AA10123456784");
  });
});
