import { NextResponse } from "next/server";
import {
  ApplicationJsonSchema,
  VerifyBatchResponseSchema,
  VERIFY_FORM_FIELDS,
  VerifyExtractOnlyResponseSchema,
} from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";
import { MAX_LABEL_UPLOAD_BYTES } from "@/lib/upload-limits";
import {
  buildVerifySuccessResponse,
  resolveVerifyExtractionMode,
  runExtractionStage,
  runVerifyPipeline,
  VerifyFailedError,
} from "@/lib/verify-pipeline";
import {
  cacheKeyFromImageBytes,
  getCachedExtraction,
  setCachedExtraction,
} from "@/lib/extraction-cache";

function jsonError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body = details !== undefined
    ? { requestId, code, message, details }
    : { requestId, code, message };
  return NextResponse.json(body, { status });
}

export type VerifyHandlerDeps = {
  runVerifyPipeline?: typeof runVerifyPipeline;
  runExtractionStage?: typeof runExtractionStage;
  buildVerifySuccessResponse?: typeof buildVerifySuccessResponse;
};

/** Dev / cost control: set `OPENAI_DISABLED=true` (or `1` / `yes`) to block paid completions while keeping a key in `.env`. */
function isOpenAiDisabledByEnv(): boolean {
  const v = process.env.OPENAI_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Local / CI only: `VERIFY_DEV_STUB=true` returns HTTP 200 with `buildStubVerifyResponse` (no OpenAI, no pipeline).
 * Ignored when `NODE_ENV === "production"` so it cannot be enabled on deployed builds by mistake.
 */
function isVerifyDevStubEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const v = process.env.VERIFY_DEV_STUB?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function resolveBatchConcurrency(): number {
  const raw = Number(process.env.VERIFY_BATCH_CONCURRENCY ?? "2");
  if (!Number.isFinite(raw)) return 2;
  return Math.max(1, Math.min(5, Math.floor(raw)));
}

function resolveBatchMaxImages(): number {
  const raw = Number(process.env.VERIFY_BATCH_MAX_IMAGES ?? "20");
  if (!Number.isFinite(raw)) return 20;
  return Math.max(1, Math.min(50, Math.floor(raw)));
}

function formatUploadLimit(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

function imageTooLargeError(
  requestId: string,
  fieldName: string,
  opts: { multiple?: boolean } = {},
) {
  const message = opts.multiple
    ? `Each file in multipart field "${fieldName}" must be ${formatUploadLimit(MAX_LABEL_UPLOAD_BYTES)} or smaller.`
    : `Multipart part "${fieldName}" must be ${formatUploadLimit(MAX_LABEL_UPLOAD_BYTES)} or smaller.`;
  return jsonError(requestId, 413, "IMAGE_TOO_LARGE", message);
}

export async function handleVerifyPost(
  req: Request,
  deps: VerifyHandlerDeps = {},
): Promise<Response> {
  const resolvedDeps = {
    runVerifyPipeline: deps.runVerifyPipeline ?? runVerifyPipeline,
    runExtractionStage: deps.runExtractionStage ?? runExtractionStage,
    buildVerifySuccessResponse: deps.buildVerifySuccessResponse ?? buildVerifySuccessResponse,
  };
  const requestId = crypto.randomUUID();
  const verifyWallStarted = Date.now();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError(
        requestId,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        'Expected Content-Type multipart/form-data with fields "image" and "application".',
      );
    }

    const formData = await req.formData();
    const image = formData.get(VERIFY_FORM_FIELDS.image);
    const applicationRaw = formData.get(VERIFY_FORM_FIELDS.application);

    if (!(image instanceof Blob)) {
      return jsonError(
        requestId,
        400,
        "MISSING_IMAGE",
        `Multipart part "${VERIFY_FORM_FIELDS.image}" must be a file.`,
      );
    }

    if (image.size === 0) {
      return jsonError(
        requestId,
        400,
        "EMPTY_IMAGE",
        `Multipart part "${VERIFY_FORM_FIELDS.image}" must not be empty.`,
      );
    }
    if (image.size > MAX_LABEL_UPLOAD_BYTES) {
      return imageTooLargeError(requestId, VERIFY_FORM_FIELDS.image);
    }

    if (typeof applicationRaw !== "string") {
      return jsonError(
        requestId,
        400,
        "MISSING_APPLICATION",
        `Multipart part "${VERIFY_FORM_FIELDS.application}" must be a JSON string.`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(applicationRaw);
    } catch {
      return jsonError(
        requestId,
        400,
        "INVALID_APPLICATION_JSON",
        "Application JSON could not be parsed.",
      );
    }

    const appResult = ApplicationJsonSchema.safeParse(parsed);
    if (!appResult.success) {
      return jsonError(
        requestId,
        400,
        "INVALID_APPLICATION_SCHEMA",
        "Application JSON failed validation.",
        appResult.error.flatten(),
      );
    }

    if (isVerifyDevStubEnabled()) {
      const body = buildStubVerifyResponse(requestId, appResult.data);
      console.info("[verify] VERIFY_DEV_STUB: returning typed stub (no OpenAI, no pipeline)", {
        requestId,
        totalMs: Date.now() - verifyWallStarted,
      });
      return NextResponse.json(body);
    }

    const extractionMode = resolveVerifyExtractionMode();
    const requiresApiKey = extractionMode !== "ocr_only";
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
    if (requiresApiKey && !apiKey) {
      console.warn("[verify] OPENAI_API_KEY missing or blank; refusing pipeline", {
        requestId,
        hint: "Set OPENAI_API_KEY for the Next.js server process (e.g. .env / .env.local) and restart dev.",
      });
      return jsonError(
        requestId,
        503,
        "OPENAI_NOT_CONFIGURED",
        "OPENAI_API_KEY environment variable is not set.",
      );
    }

    if (requiresApiKey && isOpenAiDisabledByEnv()) {
      console.warn("[verify] OPENAI_DISABLED set; skipping pipeline to avoid API usage", {
        requestId,
      });
      return jsonError(
        requestId,
        503,
        "OPENAI_DISABLED",
        "OpenAI calls are disabled (OPENAI_DISABLED). Remove or unset to run extraction.",
      );
    }

    const imageBytes = Buffer.from(await image.arrayBuffer());
    const cacheKeyRaw = formData.get(VERIFY_FORM_FIELDS.extractionCacheKey);
    const extractionCacheKey = typeof cacheKeyRaw === "string" && cacheKeyRaw.trim().length > 0
      ? cacheKeyRaw.trim()
      : null;

    try {
      let body;
      if (extractionCacheKey) {
        const hit = getCachedExtraction(extractionCacheKey);
        if (hit) {
          body = resolvedDeps.buildVerifySuccessResponse({
            requestId,
            application: appResult.data,
            extraction: hit,
            imageQuality: { ok: true },
            extractionTimings: {
              imageQualityMs: 0,
              ocrMs: 0,
              llmMs: 0,
              extractionMs: 0,
            },
            cacheHit: true,
            startedAtMs: verifyWallStarted,
          });
          console.info("[verify] extraction cache hit", {
            requestId,
            extractionCacheKey: extractionCacheKey.slice(0, 12),
          });
        }
      }

      if (!body) {
        body = await resolvedDeps.runVerifyPipeline({
          requestId,
          imageBytes,
          application: appResult.data,
          openAiApiKey: apiKey,
        });
      }
      console.info("[verify] request completed", {
        requestId,
        totalMs: Date.now() - verifyWallStarted,
        extractionProvider: body.extraction.provider,
        cacheHit: body.timings.cacheHit,
      });
      return NextResponse.json(body);
    } catch (e) {
      if (e instanceof VerifyFailedError) {
        return jsonError(requestId, e.httpStatus, e.code, e.message);
      }
      console.error(e);
      return jsonError(
        requestId,
        500,
        "INTERNAL_ERROR",
        "Unexpected server error.",
      );
    }
  } catch (err) {
    console.error(err);
    return jsonError(
      requestId,
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
    );
  }
}

export async function handleVerifyExtractOnlyPost(
  req: Request,
  deps: VerifyHandlerDeps = {},
): Promise<Response> {
  const resolvedDeps = {
    runExtractionStage: deps.runExtractionStage ?? runExtractionStage,
  };
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError(
        requestId,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        `Expected Content-Type multipart/form-data with field "${VERIFY_FORM_FIELDS.image}".`,
      );
    }

    const formData = await req.formData();
    const image = formData.get(VERIFY_FORM_FIELDS.image);
    if (!(image instanceof Blob)) {
      return jsonError(
        requestId,
        400,
        "MISSING_IMAGE",
        `Multipart part "${VERIFY_FORM_FIELDS.image}" must be a file.`,
      );
    }
    if (image.size === 0) {
      return jsonError(
        requestId,
        400,
        "EMPTY_IMAGE",
        `Multipart part "${VERIFY_FORM_FIELDS.image}" must not be empty.`,
      );
    }
    if (image.size > MAX_LABEL_UPLOAD_BYTES) {
      return imageTooLargeError(requestId, VERIFY_FORM_FIELDS.image);
    }

    const extractionMode = resolveVerifyExtractionMode();
    const requiresApiKey = extractionMode !== "ocr_only";
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
    if (requiresApiKey && !apiKey) {
      return jsonError(
        requestId,
        503,
        "OPENAI_NOT_CONFIGURED",
        "OPENAI_API_KEY environment variable is not set.",
      );
    }
    if (requiresApiKey && isOpenAiDisabledByEnv()) {
      return jsonError(
        requestId,
        503,
        "OPENAI_DISABLED",
        "OpenAI calls are disabled (OPENAI_DISABLED). Remove or unset to run extraction.",
      );
    }

    const imageBytes = Buffer.from(await image.arrayBuffer());
    const cacheKey = cacheKeyFromImageBytes(imageBytes);
    const cached = getCachedExtraction(cacheKey);
    if (cached) {
      const body = VerifyExtractOnlyResponseSchema.parse({
        requestId,
        cacheKey,
        imageQuality: { ok: true },
        extraction: {
          provider: cached.provider,
          durationMs: 0,
        },
        timings: {
          imageQualityMs: 0,
          ocrMs: 0,
          llmMs: 0,
          extractionMs: 0,
          totalMs: Date.now() - startedAt,
          cacheHit: true,
        },
      });
      return NextResponse.json(body);
    }

    const extractionStage = await resolvedDeps.runExtractionStage({
      requestId,
      imageBytes,
      openAiApiKey: apiKey,
    });
    setCachedExtraction(cacheKey, extractionStage.extraction);

    const body = VerifyExtractOnlyResponseSchema.parse({
      requestId,
      cacheKey,
      imageQuality: extractionStage.imageQuality,
      extraction: {
        provider: extractionStage.extraction.provider,
        durationMs: extractionStage.extraction.durationMs,
      },
      timings: {
        ...extractionStage.timings,
        totalMs: Date.now() - startedAt,
        cacheHit: false,
      },
    });

    console.info("[verify.extract-only] cached extraction", {
      requestId,
      cacheKey: cacheKey.slice(0, 12),
      provider: body.extraction.provider,
      totalMs: body.timings.totalMs,
    });
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof VerifyFailedError) {
      return jsonError(requestId, e.httpStatus, e.code, e.message);
    }
    console.error(e);
    return jsonError(
      requestId,
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
    );
  }
}

export async function handleVerifyBatchPost(
  req: Request,
  deps: VerifyHandlerDeps = {},
): Promise<Response> {
  const resolvedDeps = {
    runVerifyPipeline: deps.runVerifyPipeline ?? runVerifyPipeline,
  };
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError(
        requestId,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        `Expected Content-Type multipart/form-data with fields "${VERIFY_FORM_FIELDS.images}" and "${VERIFY_FORM_FIELDS.application}".`,
      );
    }

    const formData = await req.formData();
    const imageParts = formData.getAll(VERIFY_FORM_FIELDS.images);
    const images = imageParts.filter((part): part is File => part instanceof File);
    if (images.length === 0) {
      return jsonError(
        requestId,
        400,
        "MISSING_IMAGES",
        `Multipart field "${VERIFY_FORM_FIELDS.images}" must include at least one file.`,
      );
    }
    if (images.some((img) => img.size === 0)) {
      return jsonError(
        requestId,
        400,
        "EMPTY_IMAGE",
        `Multipart field "${VERIFY_FORM_FIELDS.images}" must not include empty files.`,
      );
    }
    if (images.some((img) => img.size > MAX_LABEL_UPLOAD_BYTES)) {
      return imageTooLargeError(requestId, VERIFY_FORM_FIELDS.images, { multiple: true });
    }
    const batchMaxImages = resolveBatchMaxImages();
    if (images.length > batchMaxImages) {
      return jsonError(
        requestId,
        400,
        "BATCH_TOO_LARGE",
        `Batch size exceeds maximum of ${batchMaxImages} images.`,
      );
    }

    const applicationRaw = formData.get(VERIFY_FORM_FIELDS.application);
    if (typeof applicationRaw !== "string") {
      return jsonError(
        requestId,
        400,
        "MISSING_APPLICATION",
        `Multipart part "${VERIFY_FORM_FIELDS.application}" must be a JSON string.`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(applicationRaw);
    } catch {
      return jsonError(
        requestId,
        400,
        "INVALID_APPLICATION_JSON",
        "Application JSON could not be parsed.",
      );
    }

    const appResult = ApplicationJsonSchema.safeParse(parsed);
    if (!appResult.success) {
      return jsonError(
        requestId,
        400,
        "INVALID_APPLICATION_SCHEMA",
        "Application JSON failed validation.",
        appResult.error.flatten(),
      );
    }

    const extractionMode = resolveVerifyExtractionMode();
    const requiresApiKey = extractionMode !== "ocr_only";
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";

    if (requiresApiKey && !apiKey) {
      return jsonError(
        requestId,
        503,
        "OPENAI_NOT_CONFIGURED",
        "OPENAI_API_KEY environment variable is not set.",
      );
    }
    if (requiresApiKey && isOpenAiDisabledByEnv()) {
      return jsonError(
        requestId,
        503,
        "OPENAI_DISABLED",
        "OpenAI calls are disabled (OPENAI_DISABLED). Remove or unset to run extraction.",
      );
    }

    const concurrency = resolveBatchConcurrency();
    type BatchItemDraft = {
      index: number;
      fileName: string;
      ok: boolean;
      status: number;
      durationMs: number;
      result?: unknown;
      error?: { code: string; message: string };
    };
    const items: Array<BatchItemDraft | undefined> = new Array(images.length);

    let cursor = 0;
    const runOne = async () => {
      while (true) {
        const index = cursor++;
        if (index >= images.length) return;
        const image = images[index]!;
        const fileName = image instanceof File && image.name ? image.name : `image-${index + 1}`;
        const itemRequestId = crypto.randomUUID();
        const itemStartedAt = Date.now();

        if (isVerifyDevStubEnabled()) {
          const stub = buildStubVerifyResponse(itemRequestId, appResult.data);
          items[index] = {
            index,
            fileName,
            ok: true,
            status: 200,
            durationMs: Date.now() - itemStartedAt,
            result: stub,
          };
          continue;
        }

        try {
          const imageBytes = Buffer.from(await image.arrayBuffer());
          const result = await resolvedDeps.runVerifyPipeline({
            requestId: itemRequestId,
            imageBytes,
            application: appResult.data,
            openAiApiKey: apiKey,
          });
          items[index] = {
            index,
            fileName,
            ok: true,
            status: 200,
            durationMs: Date.now() - itemStartedAt,
            result,
          };
        } catch (e) {
          if (e instanceof VerifyFailedError) {
            items[index] = {
              index,
              fileName,
              ok: false,
              status: e.httpStatus,
              durationMs: Date.now() - itemStartedAt,
              error: {
                code: e.code,
                message: e.message,
              },
            };
            continue;
          }
          console.error(e);
          items[index] = {
            index,
            fileName,
            ok: false,
            status: 500,
            durationMs: Date.now() - itemStartedAt,
            error: {
              code: "INTERNAL_ERROR",
              message: "Unexpected server error.",
            },
          };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, images.length) }, () => runOne()),
    );

    const success = items.filter((item) => item?.ok).length;
    const error = items.length - success;
    const pass = items.reduce((count, item) => {
      if (!item?.ok || !item.result || typeof item.result !== "object") return count;
      const result = item.result as { validation?: { fields?: Array<{ status?: string }> } };
      const fields = result.validation?.fields ?? [];
      const hasFail = fields.some((field) => field.status === "fail");
      const hasManualReview = fields.some((field) => field.status === "manual_review");
      if (!hasFail && !hasManualReview) return count + 1;
      return count;
    }, 0);
    const fail = items.reduce((count, item) => {
      if (!item?.ok || !item.result || typeof item.result !== "object") return count;
      const result = item.result as { validation?: { fields?: Array<{ status?: string }> } };
      const fields = result.validation?.fields ?? [];
      return fields.some((field) => field.status === "fail") ? count + 1 : count;
    }, 0);
    const manualReview = items.reduce((count, item) => {
      if (!item?.ok || !item.result || typeof item.result !== "object") return count;
      const result = item.result as { validation?: { fields?: Array<{ status?: string }> } };
      const fields = result.validation?.fields ?? [];
      const hasFail = fields.some((field) => field.status === "fail");
      if (hasFail) return count;
      return fields.some((field) => field.status === "manual_review") ? count + 1 : count;
    }, 0);

    const body = VerifyBatchResponseSchema.parse({
      requestId,
      summary: {
        total: items.length,
        success,
        error,
        pass,
        fail,
        manualReview,
        totalMs: Date.now() - startedAt,
      },
      items,
    });

    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return jsonError(
      requestId,
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
    );
  }
}
