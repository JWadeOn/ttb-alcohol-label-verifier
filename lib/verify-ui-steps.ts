import type { VerifyErrorResponse, VerifySuccessResponse } from "@/lib/schemas";

/**
 * - `pending` — not reached yet (while request is in flight).
 * - `upstream` — earlier stage; work is still on the server as part of the same request (sequential UX only).
 * - `running` — highlighted as the “current” stage while waiting for the response.
 * - `complete` / `failed` / `skipped` — terminal, from the real HTTP response.
 */
export type VerifyUiStepState =
  | "pending"
  | "upstream"
  | "running"
  | "complete"
  | "failed"
  | "skipped";

export type VerifyUiStepId = "inputs" | "image_gate" | "extraction" | "comparison";

export type VerifyUiStep = {
  id: VerifyUiStepId;
  title: string;
  detail: string;
  state: VerifyUiStepState;
  footnote?: string;
};

const STEP_ORDER: VerifyUiStepId[] = ["inputs", "image_gate", "extraction", "comparison"];

const STEPS: Record<VerifyUiStepId, Omit<VerifyUiStep, "state" | "footnote">> = {
  inputs: {
    id: "inputs",
    title: "Request & application JSON",
    detail: "Multipart upload, file checks, and application schema validation on the server.",
  },
  image_gate: {
    id: "image_gate",
    title: "Image quality gate",
    detail: "Resolution, contrast, and sharpness checks before vision extraction.",
  },
  extraction: {
    id: "extraction",
    title: "Label text extraction",
    detail: "Vision model reads required lines from the label image.",
  },
  comparison: {
    id: "comparison",
    title: "Field comparison",
    detail: "Deterministic validation against the application JSON you submitted.",
  },
};

function stepRow(
  id: VerifyUiStepId,
  state: VerifyUiStepState,
  footnote?: string,
): VerifyUiStep {
  const base = STEPS[id];
  return { ...base, state, footnote };
}

function withStates(
  states: Record<VerifyUiStepId, VerifyUiStepState>,
  footnotes?: Partial<Record<VerifyUiStepId, string | undefined>>,
): VerifyUiStep[] {
  return STEP_ORDER.map((id) => stepRow(id, states[id], footnotes?.[id]));
}

const UPSTREAM_NOTE =
  "Included in the current server request — final status arrives when the response returns.";

/**
 * While the POST is in flight, advance `activeIndex` (0…3) on a timer in the UI so only one row
 * is highlighted as “running”; earlier rows show as `upstream` (not green “complete”).
 */
export function buildVerifyUiStepsLoading(activeIndex: number): VerifyUiStep[] {
  const clamped = Math.max(0, Math.min(3, Math.floor(activeIndex)));
  return STEP_ORDER.map((id, i) => {
    let state: VerifyUiStepState;
    let footnote: string | undefined;
    if (i < clamped) {
      state = "upstream";
      footnote = UPSTREAM_NOTE;
    } else if (i === clamped) {
      state = "running";
    } else {
      state = "pending";
    }
    return stepRow(id, state, footnote);
  });
}

/**
 * Terminal pipeline steps from the HTTP response (no `loading` flag — call only after fetch settles).
 */
export function buildVerifyUiStepsFromResponse(input: {
  httpStatus: number | null;
  successPayload: VerifySuccessResponse | null;
  errorPayload: VerifyErrorResponse | null;
  errorText: string | null;
}): VerifyUiStep[] {
  const { httpStatus, successPayload, errorPayload, errorText } = input;

  if (successPayload) {
    const warnEx =
      successPayload.extraction.provider === "unavailable"
        ? "Primary vision was unavailable; placeholder extraction was used. See server logs."
        : undefined;
    return withStates(
      {
        inputs: "complete",
        image_gate: "complete",
        extraction: "complete",
        comparison: "complete",
      },
      { extraction: warnEx },
    );
  }

  const code = errorPayload?.code;
  const msg = errorPayload?.message ?? errorText ?? "Request failed.";

  if (errorPayload) {
    switch (code) {
      case "MISSING_IMAGE":
      case "EMPTY_IMAGE":
      case "MISSING_APPLICATION":
      case "INVALID_APPLICATION_JSON":
      case "INVALID_APPLICATION_SCHEMA":
      case "UNSUPPORTED_MEDIA_TYPE":
        return withStates(
          {
            inputs: "failed",
            image_gate: "skipped",
            extraction: "skipped",
            comparison: "skipped",
          },
          { inputs: msg },
        );

      case "OPENAI_NOT_CONFIGURED":
      case "OPENAI_DISABLED":
        return withStates(
          {
            inputs: "complete",
            image_gate: "skipped",
            extraction: "failed",
            comparison: "skipped",
          },
          {
            image_gate: "Pipeline did not start — OpenAI was not invoked.",
            extraction: msg,
          },
        );

      case "IMAGE_QUALITY_REJECTED":
        return withStates(
          {
            inputs: "complete",
            image_gate: "failed",
            extraction: "skipped",
            comparison: "skipped",
          },
          { image_gate: msg },
        );

      case "EXTRACTION_FAILED":
        return withStates(
          {
            inputs: "complete",
            image_gate: "complete",
            extraction: "failed",
            comparison: "skipped",
          },
          { extraction: msg },
        );

      case "INTERNAL_ERROR":
        if (msg.includes("Response validation failed")) {
          return withStates(
            {
              inputs: "complete",
              image_gate: "complete",
              extraction: "complete",
              comparison: "failed",
            },
            { comparison: msg },
          );
        }
        return withStates(
          {
            inputs: "complete",
            image_gate: "complete",
            extraction: "failed",
            comparison: "skipped",
          },
          { extraction: msg },
        );

      default:
        return withStates(
          {
            inputs: "complete",
            image_gate: "complete",
            extraction: "failed",
            comparison: "skipped",
          },
          { extraction: `${code}: ${msg}` },
        );
    }
  }

  if (errorText) {
    return withStates(
      {
        inputs: "failed",
        image_gate: "skipped",
        extraction: "skipped",
        comparison: "skipped",
      },
      { inputs: errorText },
    );
  }

  if (httpStatus === 200 && !successPayload) {
    return withStates(
      {
        inputs: "complete",
        image_gate: "complete",
        extraction: "complete",
        comparison: "failed",
      },
      { comparison: "Success response did not match the expected schema." },
    );
  }

  return withStates({
    inputs: "pending",
    image_gate: "pending",
    extraction: "pending",
    comparison: "pending",
  });
}

/** True if the user should land on the Verify tab to read pipeline failure details. */
export function verifyResponseIndicatesPipelineFailure(input: {
  successPayload: VerifySuccessResponse | null;
  errorPayload: VerifyErrorResponse | null;
  errorText: string | null;
}): boolean {
  if (input.successPayload) return false;
  if (input.errorPayload || input.errorText) return true;
  return false;
}
