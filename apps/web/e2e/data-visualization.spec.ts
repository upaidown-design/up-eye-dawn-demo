import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loginAsTestAdmin } from "./portal-test-helpers";

const output =
  process.env.E2E_UPDATE_FALLBACKS === "true"
    ? resolve(
        import.meta.dirname,
        "../../../assets/meeting-fallback/new-york-2026/data-visualization",
      )
    : resolve(
        import.meta.dirname,
        "../test-results/audit-artifacts/data-visualization",
      );
const runId = "run_new_york_001";

test("professional data visualization views render without clipping", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await mkdir(output, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await loginAsTestAdmin(page);
  const request = page.request;
  const check = async (path: string, title: string, file: string) => {
    await page.goto(`/demo${path}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({ path: resolve(output, file) });
  };

  await check(
    "/investor-financials",
    "Capital should create defensible assets",
    "01-investor-financial-view.png",
  );
  await expect(page.getByText("€890K", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Decision range, not an approved ask"),
  ).toBeVisible();
  await expect(
    page.getByText("UNDER FINAL REVIEW", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("TARGET_TO_VALIDATE", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".funds-panel")
    .screenshot({ path: resolve(output, "02-use-of-funds.png") });
  await page
    .locator(".wide")
    .screenshot({ path: resolve(output, "03-value-creation-roadmap.png") });

  expect(
    (await request.post(`/api/v1/demo/runs/${runId}/reset`)).ok(),
  ).toBeTruthy();
  await page.goto("/demo/investor-demo");
  await expect(page.locator(".timeline")).toBeVisible();
  await page
    .locator(".timeline")
    .screenshot({ path: resolve(output, "04-mission-timeline.png") });

  await check(
    "/analytics/ndvi/ndvi-001",
    "Vegetation condition, spatially first",
    "05-ndvi-analytics.png",
  );
  await expect(
    page.getByText("SYNTHETIC", { exact: true }).first(),
  ).toBeVisible();
  await check(
    "/anomalies/anomaly-001",
    "Localized vegetation anomaly",
    "06-anomaly.png",
  );
  await check(
    "/fleet",
    "Fixed presence. Aerial context. Ground truth.",
    "07-fleet-system.png",
  );
  await check(
    "/fleet/rover/rover-001",
    "Autonomous mobile field node",
    "08-rover-product.png",
  );
  await expect(page.getByRole("button", { name: "04 PROBE" })).toBeVisible();
  await check(
    "/fleet/sentinel/sentinel-001",
    "Autonomous fixed field node",
    "09-sentinel-product.png",
  );
  await check(
    "/mission/ground-truth",
    "From aerial signal to physical evidence",
    "10-rover-ground-truth.png",
  );
  await check(
    "/data-engine",
    "Hardware captures reality. Data creates memory.",
    "11-data-engine.png",
  );
  await check(
    "/system-health",
    "Runtime status without decorative gauges",
    "12-system-health.png",
  );
  await page.goto("/demo/dev/truth");
  await expect(
    page.getByRole("heading", { name: "New York 2026 truth debugger" }),
  ).toBeVisible();
  await expect(page.locator("header nav").getByText(/truth/i)).toHaveCount(0);
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/demo/investor-financials");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.goto("/demo/analytics/ndvi/ndvi-001");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});
