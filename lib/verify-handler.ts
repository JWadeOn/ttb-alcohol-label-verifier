import { NextResponse } from "next/server";
import {
  ApplicationJsonSchema,
  VERIFY_FORM_FIELDS,
} from "@/lib/schemas";
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

export async function handleVerifyPost(
  req: Request,
  deps: VerifyHandlerDeps = { runVerifyPipeline },
): Promise<Response> {
  const requestId = crypto.randomUUID();

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

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return jsonError(
        requestId,
        503,
        "OPENAI_NOT_CONFIGURED",
        "OPENAI_API_KEY environment variable is not set.",
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
