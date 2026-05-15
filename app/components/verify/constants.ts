import type { FieldId } from "@/lib/schemas";
import { MAX_LABEL_UPLOAD_BYTES } from "@/lib/upload-limits";

export const DEFAULT_APPLICATION = JSON.stringify(
  {
    productClass: "",
    isImport: false,
    brandName: "",
    classType: "",
    alcoholContent: "",
    netContents: "",
    governmentWarning: "",
    nameAddress: "",
    countryOfOrigin: "",
  },
  null,
  2,
);

export const FIELD_LABELS: Record<FieldId, string> = {
  brandName: "Brand name",
  classType: "Class / type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
  governmentWarning: "Government warning",
  nameAddress: "Name & address",
  countryOfOrigin: "Country of origin",
};

/** UI-only blurbs — must stay aligned with `lib/validator.ts`. */
export const FIELD_REQUIREMENTS: Record<FieldId, string> = {
  brandName:
    "Fuzzy match: normalized label text vs application brand, above a minimum similarity score.",
  classType:
    "Fuzzy match: normalized label text vs application class/type line.",
  alcoholContent:
    "Parsed strength (percent ABV or proof) must agree within a small tolerance.",
  netContents:
    "Parsed volume (mL, L, fl oz, etc.) must agree within tolerance after unit conversion.",
  governmentWarning:
    "Auto-pass only on exact, case-sensitive equality. Non-exact text is triaged by similarity: close → manual review; materially different → fail.",
  nameAddress:
    "Compared when application includes text; if application omits it, the row is manual review even when the label is blank.",
  countryOfOrigin:
    "Not applicable when import is unchecked. For imports, fuzzy match when both sides include text.",
};

export const CLIENT_UPLOAD_MAX_DIMENSION = 1800;
export const CLIENT_UPLOAD_MIN_BYTES = 1_000_000;
export const CLIENT_UPLOAD_JPEG_QUALITY = 0.82;
export const CLIENT_UPLOAD_MAX_BYTES = MAX_LABEL_UPLOAD_BYTES;
export const CLIENT_BATCH_MAX_IMAGES = 20;
