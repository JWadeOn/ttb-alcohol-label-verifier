import { describe, expect, it } from "vitest";
import {
  extractFromOcrText,
  shouldUseLeftPanelClassificationText,
} from "@/lib/extraction/tesseract-provider";

describe("extractFromOcrText brand detection", () => {
  it("prefers plausible brand text over punctuation noise", () => {
    const text = `
      ] \\
      Harbor Ember
      Spiced Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.brandName.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("ignores warning-body text when selecting brand", () => {
    const text = `
      Consumption of alcoholic beverages
      Harbor Ember
      Spiced Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.brandName.reason).toContain("Brand candidate selected");
  });

  it("ignores misspelled warning-body text and anchors brand above class line", () => {
    const text = `
      Consumption of alcolic beverages
      Harbor Ember
      Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.classType.value?.toLowerCase()).toBe("rum");
  });

  it("does not use address fragment as brand", () => {
    const text = `
      Bottled by Harbor Ember
      Spirits, San Juan, PR
      Harbor Ember
      Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.brandName.value).not.toContain("San Juan");
  });

  it("falls back to bottler line when headline OCR is noisy", () => {
    const text = `
      J EF \\J
      Spiced Rum
      35% ALC/VOL
      750 mL
      Bottled by Harbor Ember Spirits, San Juan, PR
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.brandName.reason).toContain("inferred from bottler");
    expect(fields.brandName.confidence).toBeLessThan(0.65);
  });

  it("trims brand spillover after separators and stop-hints", () => {
    const text = `
      Harbor Ember || | __ Country-of-origin
      Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.brandName.value).not.toContain("Country");
    expect(fields.brandName.value).not.toContain("|");
  });

  it("uses left panel text for brand/class extraction when provided", () => {
    const fullText = `
      Bottled by Harbor Ember Spirits, San Juan, PR
      Harbor Ember
      Spiced Rum
      35% ALC/VOL
      750 mL
      GOVERNMENT WARNING: (1) According to the Surgeon General...
    `;
    const leftPanelText = `
      Harbor Ember
      Spiced Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(fullText, { leftPanelText });

    expect(fields.brandName.value).toBe("Harbor Ember");
    expect(fields.classType.value?.toLowerCase()).toBe("spiced rum");
    expect(fields.alcoholContent.value).toContain("35%");
  });

  it("extracts modifier + base class type when available", () => {
    const text = `
      Harbor Ember
      Spiced Rum
      35% ALC/VOL
      750 mL
    `;
    const fields = extractFromOcrText(text);
    expect(fields.classType.value?.toLowerCase()).toBe("spiced rum");
  });

  it("normalizes class/type display casing from OCR text", () => {
    const text = `
      Harbor Ember
      spiced Rum
      35% ALC/VOL
      750 mL
    `;
    const fields = extractFromOcrText(text);
    expect(fields.classType.value).toBe("Spiced Rum");
  });

  it("drops ultra-noisy brand candidate instead of surfacing junk text", () => {
    const text = `
      we a 7
      Rum
      35% ALC/VOL
      750 mL
    `;

    const fields = extractFromOcrText(text);

    expect(fields.brandName.value).toBeNull();
    expect(fields.brandName.confidence).toBeLessThan(0.65);
    expect(fields.brandName.reason).toContain("No high-quality brand candidate");
  });
});

describe("extractFromOcrText government warning confidence", () => {
  it("keeps confidence above manual-review threshold for complete warning text", () => {
    const text = `
      Harbor Ember
      Spiced Rum
      GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages
      during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs
      your ability to drive a car or operate machinery, and may cause health problems.
    `;

    const fields = extractFromOcrText(text);

    expect(fields.governmentWarning.value).toContain("GOVERNMENT WARNING");
    expect(fields.governmentWarning.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it("drops confidence below threshold for fragmented warning text", () => {
    const text = `
      Harbor Ember
      GOVERNMENT WARNING: (1) According to the Surgeon Gene
      women should not drink alcoholic beverages
    `;

    const fields = extractFromOcrText(text);

    expect(fields.governmentWarning.value).toContain("GOVERNMENT WARNING");
    expect(fields.governmentWarning.confidence).toBeLessThan(0.65);
    expect(fields.governmentWarning.reason).toContain("quality score");
  });
});

describe("shouldUseLeftPanelClassificationText", () => {
  it("returns true for classic split-column label layouts", () => {
    expect(
      shouldUseLeftPanelClassificationText({
        leftText: `
          Harbor Ember
          Spiced Rum
          35% ALC/VOL
          750 mL
        `,
        rightText: `
          Bottled by Harbor Ember Spirits, San Juan, PR
          GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages
          during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs
          your ability to drive a car or operate machinery, and may cause health problems.
        `,
      }),
    ).toBe(true);
  });

  it("returns false when warning text appears on both halves (vertical layout)", () => {
    expect(
      shouldUseLeftPanelClassificationText({
        leftText: `
          Harbor
          Spiced
          35% ALC/VOL
          GOVERNMENT WARNING: (1) According to the Surgeon General
          women should not drink alcoholic beverages during pregnancy
        `,
        rightText: `
          Ember
          Rum
          750 mL
          GOVERNMENT WARNING: (2) Consumption of alcoholic beverages impairs
          your ability to drive a car or operate machinery, and may cause health problems.
        `,
      }),
    ).toBe(false);
  });
});
