import { test, expect } from "@playwright/test";
import { adToBs, bsToAd, fiscalYearLabel } from "../lib/nepali-date";

test("BS fiscal boundaries, leap dates, timezone rollover, and invalid dates", () => {
  expect(bsToAd("2083-04-01")).toBe("2026-07-17");
  expect(adToBs("2026-07-16")).toBe("2083-03-32");
  expect(adToBs("2026-07-17")).toBe("2083-04-01");
  expect(adToBs("2026-07-16T18:15:00Z")).toBe("2083-04-01");
  expect(adToBs("2026-07-16T18:14:59Z")).toBe("2083-03-32");
  expect(bsToAd(adToBs("2024-02-29"))).toBe("2024-02-29");
  expect(() => bsToAd("2083-04-33")).toThrow();
  expect(() => bsToAd("2083-13-01")).toThrow();
  expect(() => bsToAd("2083-04-00")).toThrow();
  expect(() => bsToAd("2083-4-1")).toThrow();
  expect(fiscalYearLabel({ startDate: "2026-07-17" })).toBe("FY 2083/84");
});
