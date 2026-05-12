import type { VerifyErrorResponse } from "@/lib/schemas";

/**
 * Short headline for the workbench when `/api/verify` returns an error JSON body.
 * Server `message` stays authoritative in the details list.
 */
export function verifyErrorUserHeadline(
  httpStatus: number,
  payload: VerifyErrorResponse | null,
  fallbackLabel: string,
): string {
  const code = payload?.code;
  switch (code) {
    case "IMAGE_QUALITY_REJECTED":
      return "This image did not pass the clarity check. Try a sharper, well-lit photo with the full label in frame.";
    case "EXTRACTION_FAILED":
      return "Label reading did not finish. You can retry; if it keeps failing, check server logs, API key, and network.";
    case "OPENAI_NOT_CONFIGURED":
      return "This server is not set up to read labels (OpenAI API key missing).";
    case "OPENAI_DISABLED":
      return "OpenAI extraction is turned off on this server (OPENAI_DISABLED).";
    case "INVALID_APPLICATION_JSON":
      return "Application JSON could not be parsed. Fix JSON syntax and try again.";
    case "INVALID_APPLICATION_SCHEMA":
      return "Application JSON does not match the expected shape. See the server message below.";
    case "MISSING_IMAGE":
    case "EMPTY_IMAGE":
      return "Add a non-empty label image, then run verification again.";
    case "MISSING_APPLICATION":
      return "Application data is missing from the request.";
    case "UNSUPPORTED_MEDIA_TYPE":
      return "Wrong request format. Use Run verification from this page (multipart upload).";
    case "INTERNAL_ERROR":
      return "Something went wrong on the server. Try again or contact the operator.";
    default:
      break;
  }

  if (httpStatus === 415) return "Wrong request format. Use Run verification from this page.";
  if (httpStatus === 400) return "The request could not be processed. See details below.";
  if (httpStatus === 422) return "The label could not be processed as submitted.";
  if (httpStatus === 502) return "The service could not complete label reading.";
  if (httpStatus === 503) return "Verification is temporarily unavailable.";
  return fallbackLabel;
}
