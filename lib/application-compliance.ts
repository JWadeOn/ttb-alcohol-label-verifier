import { CANONICAL_GOVERNMENT_WARNING } from "@/lib/canonical-warning";
import {
  ApplicationJsonSchema,
  type ApplicationJson,
  type FieldId,
} from "@/lib/schemas";

/** Always required on distilled-spirits application payloads for verification. */
export const REQUIRED_APPLICATION_FIELDS = [
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "nameAddress",
  "governmentWarning",
] as const;

export const CONDITIONAL_REQUIRED_WHEN_IMPORT = ["countryOfOrigin"] as const;

const FIELD_LABELS: Record<(typeof REQUIRED_APPLICATION_FIELDS)[number] | "countryOfOrigin", string> = {
  brandName: "Brand name",
  classType: "Class / type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
  nameAddress: "Name & address",
  governmentWarning: "Government warning",
  countryOfOrigin: "Country of origin",
};

function isBlank(value: string | undefined | null): boolean {
  return value == null || String(value).trim() === "";
}

export function parseApplicationJson(raw: string): ApplicationJson | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const checked = ApplicationJsonSchema.safeParse(parsed);
  return checked.success ? checked.data : null;
}

/** Inject canonical government warning when absent (UI hide or API omit). */
export function ensureApplicationCompliance(app: ApplicationJson): ApplicationJson {
  const next: ApplicationJson = { ...app };
  if (isBlank(next.governmentWarning)) {
    next.governmentWarning = CANONICAL_GOVERNMENT_WARNING;
  }
  return next;
}

/** Inject canonical government warning when hidden from formatted UI. */
export function ensureApplicationComplianceJson(raw: string): string {
  const app = parseApplicationJson(raw);
  if (!app) return raw;
  return JSON.stringify(ensureApplicationCompliance(app), null, 2);
}

export type ResolveApplicationForVerifyResult =
  | { ok: true; application: ApplicationJson }
  | {
      ok: false;
      code: "MISSING_REQUIRED_APPLICATION_FIELDS";
      message: string;
      missingFields: string[];
    };

/** Normalize warning text and enforce mandatory distilled-spirits application fields. */
export function resolveApplicationForVerify(
  app: ApplicationJson,
): ResolveApplicationForVerifyResult {
  const application = ensureApplicationCompliance(app);
  const missingFields = listMissingRequiredFields(application);
  if (missingFields.length > 0) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_APPLICATION_FIELDS",
      message: `Required application field(s) missing: ${missingFields.join(", ")}.`,
      missingFields,
    };
  }
  return { ok: true, application };
}

export function isRequiredApplicationFieldMissing(
  app: ApplicationJson,
  fieldId: FieldId,
): boolean {
  if (fieldId === "countryOfOrigin") {
    return app.isImport === true && isBlank(app.countryOfOrigin);
  }
  if ((REQUIRED_APPLICATION_FIELDS as readonly string[]).includes(fieldId)) {
    return isBlank(app[fieldId as keyof ApplicationJson] as string | undefined);
  }
  return false;
}

export function missingRequiredApplicationFieldMessage(fieldId: FieldId): string {
  const label =
    FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId;
  return `Required application value missing for ${label}; verification cannot proceed automatically.`;
}

export function listMissingRequiredFields(app: ApplicationJson): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_APPLICATION_FIELDS) {
    if (isBlank(app[field])) {
      missing.push(FIELD_LABELS[field]);
    }
  }
  if (app.isImport === true) {
    for (const field of CONDITIONAL_REQUIRED_WHEN_IMPORT) {
      if (isBlank(app[field])) {
        missing.push(FIELD_LABELS[field]);
      }
    }
  }
  return missing;
}

export function checkApplicationReadyForVerify(
  raw: string,
): { ok: true } | { ok: false; reason: string } {
  const app = parseApplicationJson(raw);
  if (!app) {
    return { ok: false, reason: "Application JSON is invalid. Switch to JSON view to fix it." };
  }

  const resolved = resolveApplicationForVerify(app);
  if (!resolved.ok) {
    return { ok: false, reason: resolved.message };
  }

  return { ok: true };
}
