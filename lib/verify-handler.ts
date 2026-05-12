import { NextResponse } from "next/server";
import {
  ApplicationJsonSchema,
  VERIFY_FORM_FIELDS,
} from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";
import {
  runVerifyPipeline,
  VerifyFailedError,
} from "@/lib/verify-pipeline";

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
  runVerifyPipeline: typeof runVerifyPipeline;
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
  deps: VerifyHandlerDeps = { runVerifyPipeline },
): Promise<Response> {
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

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
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

    if (isOpenAiDisabledByEnv()) {
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

    try {
      const body = await deps.runVerifyPipeline({
        requestId,
        imageBytes,
        application: appResult.data,
        openAiApiKey: apiKey,
      });
      console.info("[verify] request completed", {
        requestId,
        totalMs: Date.now() - verifyWallStarted,
        extractionProvider: body.extraction.provider,
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
