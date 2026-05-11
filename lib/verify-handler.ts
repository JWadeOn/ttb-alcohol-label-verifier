import { NextResponse } from "next/server";
import {
  ApplicationJsonSchema,
  VERIFY_FORM_FIELDS,
  VerifySuccessResponseSchema,
} from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";

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

export async function handleVerifyPost(req: Request): Promise<Response> {
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

    const body = buildStubVerifyResponse(requestId, appResult.data);
    const checked = VerifySuccessResponseSchema.safeParse(body);
    if (!checked.success) {
      console.error("Stub response failed schema self-check", checked.error);
      return jsonError(
        requestId,
        500,
        "INTERNAL_ERROR",
        "Response validation failed.",
      );
    }

    return NextResponse.json(checked.data);
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
