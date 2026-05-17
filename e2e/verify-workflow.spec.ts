import { expect, test, type Route } from "@playwright/test";
import {
  fillValidApplication,
  mockBatchVerifyResponse,
  mockManualReviewVerifyResponse,
  mockVerifySuccessResponse,
  VALID_APPLICATION_JSON,
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
    await fillValidApplication(page);
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Passed" })).toBeVisible({ timeout: 15_000 });
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
    await fillValidApplication(page);
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Needs Review" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Needs review", { exact: true }).first()).toBeVisible();
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

  test("batch path navigates to results with applications table and field detail", async ({ page }) => {
    await page.route("**/api/verify/batch", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockBatchVerifyResponse(["a.png", "b.png"])),
      });
    });

    await page.goto("/");
    await page.getByRole("tab", { name: "Batch", exact: true }).click();
    await page.getByLabel("Upload batch label images").setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: tinyPngBuffer() },
      { name: "b.png", mimeType: "image/png", buffer: tinyPngBuffer() },
    ]);
    await page.getByLabel("Upload batch application JSON files").setInputFiles([
      {
        name: "a.json",
        mimeType: "application/json",
        buffer: Buffer.from(VALID_APPLICATION_JSON, "utf8"),
      },
      {
        name: "b.json",
        mimeType: "application/json",
        buffer: Buffer.from(VALID_APPLICATION_JSON, "utf8"),
      },
    ]);
    await expect(page.getByRole("button", { name: "Run batch verification", exact: true })).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Run batch verification", exact: true }).click();
    await expect(page.getByText("Batch outcome & review")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/2 labels verified/i)).toBeVisible();
    await expect(page.getByRole("cell", { name: "a.png" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "b.png" })).toBeVisible();
    await page.getByRole("cell", { name: "a.png" }).click();
    const firstAppDetails = page.locator("#batch-app-details-0");
    await expect(firstAppDetails).toBeVisible();
    await expect(firstAppDetails.getByRole("heading", { name: "Field outcomes" })).toBeVisible();
    await expect(firstAppDetails.getByRole("cell", { name: "Brand name" })).toBeVisible();
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
    await fillValidApplication(page);
    await expect(page.getByRole("button", { name: "Run verification", exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Run verification", exact: true }).click();
    await expect(
      page.getByText(/OPENAI_API_KEY environment variable is not set/i),
    ).toBeVisible({ timeout: 15_000 });
  });
});
