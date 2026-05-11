import type { FieldId } from "@/lib/schemas";

export type ExtractedField = {
  value: string | null;
  confidence: number;
  reason?: string;
};

export type ExtractionResult = {
  provider: string;
  durationMs: number;
  fields: Record<FieldId, ExtractedField>;
};

export function emptyExtractedField(reason?: string): ExtractedField {
  return { value: null, confidence: 0, reason };
}

export function emptyExtractionFields(reason?: string): Record<FieldId, ExtractedField> {
  const ids: FieldId[] = [
    "brandName",
    "classType",
    "alcoholContent",
    "netContents",
    "governmentWarning",
    "nameAddress",
    "countryOfOrigin",
  ];
  return Object.fromEntries(ids.map((id) => [id, emptyExtractedField(reason)])) as Record<
    FieldId,
    ExtractedField
  >;
}
