import { NextResponse } from "next/server";
import {
  ApplicationJsonSchema,
  VERIFY_FORM_FIELDS,
  VerifyExtractOnlyResponseSchema,
} from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";
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
