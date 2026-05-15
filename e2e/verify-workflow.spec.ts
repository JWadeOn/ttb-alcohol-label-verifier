import { expect, test, type Route } from "@playwright/test";
import {
  mockManualReviewVerifyResponse,
  mockVerifySuccessResponse,
  tinyPngBuffer,
} from "./helpers";

function isVerifyPost(route: Route): boolean {
  const url = new URL(route.request().url());
  return url.pathname === "/api/verify" && route.request().method() === "POST";
}

function isExtractOnlyPost(route: Route): boolean {
  const url = new URL(route.request().url());
  return url.pathname === "/api/verify/extract-only" && route.request().method() === "POST";
}

test.describe("label verification workbench", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/verify/extract-only", async (route) => {
      if (!isExtractOnlyPost(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          requestId: "00000000-0000-4000-8000-000000000099",
          cacheKey: "e2e-prefetch-cache",
          imageQuality: { ok: true },
          extraction: { provider: "e2e-mock", durationMs: 1 },
          timings: {
            imageQualityMs: 1,
            ocrMs: 0,
            llmMs: 0,
            extractionMs: 1,
            totalMs: 2,
            cacheHit: false,
          },
        }),
      });
    });
  });

  test("happy path shows per-field pass outcomes", async ({ page }) => {
    await page.route("**/api/verify", async (route) => {
      if (!isVerifyPost(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockVerifySuccessResponse()),
      });
    });

    await page.goto("/");
    await page.getByLabel("Choose label image file").setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: tinyPngBuffer(),
    });
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(page.getByText("All checks passed")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("cell", { name: "Brand name" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Pass", exact: true }).first()).toBeVisible();
  });

  test("low-confidence extraction surfaces manual review", async ({ page }) => {
    await page.route("**/api/verify", async (route) => {
      if (!isVerifyPost(route)) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockManualReviewVerifyResponse()),
      });
    });

    await page.goto("/");
    await page.getByLabel("Choose label image file").setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: tinyPngBuffer(),
    });
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(page.getByText("Human review required")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Manual review", { exact: true }).first()).toBeVisible();
  });

  test("oversized upload shows actionable client error", async ({ page }) => {
    await page.goto("/");
    const oversized = Buffer.alloc(1_600_000, 0);
    await page.getByLabel("Choose label image file").setInputFiles({
      name: "too-large.png",
      mimeType: "image/png",
      buffer: oversized,
    });
    await expect(page.getByText(/Maximum upload size is/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeDisabled();
  });

  test("batch path returns per-item results table", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Batch", exact: true }).click();
    await page.getByLabel("Choose batch label image files").setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: tinyPngBuffer() },
      { name: "b.png", mimeType: "image/png", buffer: tinyPngBuffer() },
    ]);
    await expect(page.getByRole("button", { name: "Run batch verification", exact: true })).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Run batch verification", exact: true }).click();
    await expect(page.getByText(/total 2/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("cell", { name: "a.png" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "b.png" })).toBeVisible();
  });

  test("missing API key surfaces expected failure headline", async ({ page }) => {
    await page.route("**/api/verify", async (route) => {
      if (!isVerifyPost(route)) return route.continue();
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          requestId: "00000000-0000-4000-8000-000000000002",
          code: "OPENAI_NOT_CONFIGURED",
          message: "OPENAI_API_KEY environment variable is not set.",
        }),
      });
    });

    await page.goto("/");
    await page.getByLabel("Choose label image file").setInputFiles({
      name: "fixture.png",
      mimeType: "image/png",
      buffer: tinyPngBuffer(),
    });
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(
      page.getByText(/OPENAI_API_KEY environment variable is not set/i),
    ).toBeVisible({ timeout: 15_000 });
  });
});
