import { z } from "zod";

/** Multipart field names for POST /api/verify */
export const VERIFY_FORM_FIELDS = {
  image: "image",
  application: "application",
  forceFallback: "force_fallback",
} as const;

export const FieldIdSchema = z.enum([
  "brandName",
  "classType",
  "alcoholContent",
  "netContents",
  "governmentWarning",
  "nameAddress",
  "countryOfOrigin",
]);

export type FieldId = z.infer<typeof FieldIdSchema>;

export const FieldStatusSchema = z.enum([
  "pass",
  "fail",
  "manual_review",
  "not_applicable",
]);

export type FieldStatus = z.infer<typeof FieldStatusSchema>;

/** Submitted application JSON (comparison targets); optional keys normalized downstream */
export const ApplicationJsonSchema = z
  .object({
    productClass: z.string().optional(),
    isImport: z.boolean().optional(),
    brandName: z.string().optional(),
    classType: z.string().optional(),
    alcoholContent: z.string().optional(),
    netContents: z.string().optional(),
    governmentWarning: z.string().optional(),
    nameAddress: z.string().optional(),
    countryOfOrigin: z.string().optional(),
  })
  .strict();

export type ApplicationJson = z.infer<typeof ApplicationJsonSchema>;

export const ImageQualitySchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional(),
});

export const FieldValidationRowSchema = z.object({
  fieldId: FieldIdSchema,
  status: FieldStatusSchema,
  message: z.string(),
  extractedValue: z.string().nullable(),
  applicationValue: z.string().nullable(),
  evidence: z.string().nullable(),
});

export type FieldValidationRow = z.infer<typeof FieldValidationRowSchema>;

export const VerifySuccessResponseSchema = z.object({
  requestId: z.string().uuid(),
  imageQuality: ImageQualitySchema,
  extraction: z.object({
    provider: z.string(),
    durationMs: z.number().nonnegative(),
    fields: z.record(z.unknown()),
  }),
  validation: z.object({
    fields: z.array(FieldValidationRowSchema),
  }),
});

export type VerifySuccessResponse = z.infer<typeof VerifySuccessResponseSchema>;

export const VerifyErrorResponseSchema = z.object({
  requestId: z.string().uuid(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type VerifyErrorResponse = z.infer<typeof VerifyErrorResponseSchema>;
