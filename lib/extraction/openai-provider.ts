import OpenAI from "openai";
import { z } from "zod";
import type { ExtractionProvider } from "@/lib/extraction/provider";
import {
  emptyExtractedField,
  type ExtractionResult,
  type ExtractedField,
} from "@/lib/extraction/types";
import type { FieldId } from "@/lib/schemas";

/** Primary vision extraction — defines *what is read from the image*, not TTB legal rules. See `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`. */

const FieldSchema = z
  .object({
    value: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1).optional(),
    reason: z.string().nullable().optional(),
  })
  .transform(
    (o): ExtractedField => ({
      value: o.value ?? null,
      confidence: o.confidence ?? 0,
      reason: o.reason ?? undefined,
    }),
  );

const LlmExtractionSchema = z
  .object({
    brandName: FieldSchema.optional(),
    classType: FieldSchema.optional(),
    alcoholContent: FieldSchema.optional(),
    netContents: FieldSchema.optional(),
    governmentWarning: FieldSchema.optional(),
    nameAddress: FieldSchema.optional(),
    countryOfOrigin: FieldSchema.optional(),
  })
  .passthrough();

const FIELD_IDS: FieldId[] = [
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "governmentWarning",
  "nameAddress",
  "countryOfOrigin",
];

function normalizeLlmFields(parsed: z.infer<typeof LlmExtractionSchema>): Record<
  FieldId,
  ExtractedField
> {
  const base = emptyExtractedField();
  const out = {} as Record<FieldId, ExtractedField>;
  for (const id of FIELD_IDS) {
    out[id] = parsed[id] ?? { ...base };
  }
  return out;
}

const SYSTEM_PROMPT = `You extract printed text from US alcohol beverage labels for TTB-style compliance checks.
Return ONLY valid JSON matching the requested shape. Use null for a field value when the text is not visible or unreadable.
For each field include confidence between 0 and 1 (honest: foil, glare, curves, script fonts → lower confidence).
Never invent brand names or government warning wording; transcribe what you see.
Fields: brandName, classType, alcoholContent, netContents, governmentWarning, nameAddress, countryOfOrigin.`;

const USER_PROMPT = `Read this label image and extract these JSON fields with { "value": string|null, "confidence": number, "reason"?: string } each:
brandName, classType, alcoholContent, netContents, governmentWarning, nameAddress, countryOfOrigin.
Use null value when absent or illegible.
Include "reason" only when value is null (omit "reason" when value is present).
governmentWarning must be the full warning paragraph as printed (including the GOVERNMENT WARNING heading line if present).`;

type VisionDetail = "low" | "high" | "auto";
const DEFAULT_VISION_DETAIL: VisionDetail = "low";
const DEFAULT_MAX_OUTPUT_TOKENS = 500;

function resolveVisionDetail(): VisionDetail {
  const raw = process.env.OPENAI_VISION_DETAIL?.trim().toLowerCase();
  if (raw === "low" || raw === "high" || raw === "auto") {
    return raw;
  }
  return DEFAULT_VISION_DETAIL;
}

function resolveMaxOutputTokens(): number {
  const raw = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
  if (Number.isInteger(raw) && raw >= 200 && raw <= 4096) {
    return raw;
  }
  return DEFAULT_MAX_OUTPUT_TOKENS;
}

export function createOpenAIProvider(apiKey: string): ExtractionProvider {
  const client = new OpenAI({ apiKey });
  const visionDetail = resolveVisionDetail();
  const maxOutputTokens = resolveMaxOutputTokens();

  return {
    async extract(imageBytes: Buffer, signal?: AbortSignal): Promise<ExtractionResult> {
      const started = Date.now();
      const b64 = imageBytes.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${b64}`;

      const completion = await client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          max_tokens: maxOutputTokens,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: USER_PROMPT },
                {
                  type: "image_url",
                  image_url: { url: dataUrl, detail: visionDetail },
                },
              ],
            },
          ],
        },
        { signal },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty content");
      }

      let rawJson: unknown;
      try {
        rawJson = JSON.parse(content);
      } catch {
        throw new Error("OpenAI returned non-JSON content");
      }

      const parsed = LlmExtractionSchema.safeParse(rawJson);
      if (!parsed.success) {
        throw new Error(`OpenAI JSON failed validation: ${parsed.error.message}`);
      }

      return {
        provider: "openai",
        durationMs: Date.now() - started,
        fields: normalizeLlmFields(parsed.data),
      };
    },
  };
}
