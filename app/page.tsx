"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApplicationEditor } from "@/components/ApplicationEditor";
import { LabelImageMagnifier } from "@/components/LabelImageMagnifier";
import {
  ApplicationJsonSchema,
  VERIFY_FORM_FIELDS,
  type FieldId,
  type FieldStatus,
  type VerifyBatchResponse,
  VerifyBatchResponseSchema,
  type VerifyErrorResponse,
  VerifyExtractOnlyResponseSchema,
  type VerifySuccessResponse,
  VerifyErrorResponseSchema,
  VerifySuccessResponseSchema,
} from "@/lib/schemas";
import { VerifyRunStepsPanel } from "@/components/VerifyRunStepsPanel";
import { WorkflowProcessTabs, type WorkflowPhase } from "@/components/WorkflowProcessTabs";
import { buildVerifyUiStepsFromResponse, buildVerifyUiStepsLoading, verifyResponseIndicatesPipelineFailure } from "@/lib/verify-ui-steps";
import { MAX_LABEL_UPLOAD_BYTES } from "@/lib/upload-limits";
import { DEMO_CASES, type DemoCaseId } from "@/lib/demo-cases";
import {
  ABV_TOLERANCE,
  BRAND_SIMILARITY,
  CLASS_SIMILARITY,
  CONFIDENCE_MANUAL_REVIEW,
  NAME_SIMILARITY,
  ORIGIN_SIMILARITY,
  VOLUME_TOLERANCE_ML,
  VOLUME_TOLERANCE_RATIO,
} from "@/lib/validator";
import { verifyErrorUserHeadline } from "@/lib/verify-error-messages";

const DEFAULT_APPLICATION = JSON.stringify(
  {
    productClass: "",
    isImport: false,
    brandName: "",
    classType: "",
    alcoholContent: "",
    netContents: "",
    governmentWarning: "",
    nameAddress: "",
    countryOfOrigin: "",
  },
  null,
  2,
);

const FIELD_LABELS: Record<FieldId, string> = {
  brandName: "Brand name",
  classType: "Class / type",
  alcoholContent: "Alcohol content",
  netContents: "Net contents",
  governmentWarning: "Government warning",
  nameAddress: "Name & address",
  countryOfOrigin: "Country of origin",
};

/**
 * UI-only blurbs for “How this field is checked” — must stay aligned with `lib/validator.ts`.
 * Authoritative logic: validator; evaluator map: `docs/REQUIREMENTS_SOURCE_OF_TRUTH.md`.
 */
const FIELD_REQUIREMENTS: Record<FieldId, string> = {
  brandName:
    "Fuzzy match: normalized label text vs application brand, above a minimum similarity score.",
  classType:
    "Fuzzy match: normalized label text vs application class/type line.",
  alcoholContent:
    "Parsed strength (percent ABV or proof) must agree within a small tolerance.",
  netContents:
    "Parsed volume (mL, L, fl oz, etc.) must agree within tolerance after unit conversion.",
  governmentWarning:
    "Exact match: label warning text must equal the application string (case-sensitive).",
  nameAddress:
    "Compared when application includes text; if application omits it, the row is manual review even when the label is blank.",
  countryOfOrigin:
    "Not applicable when import is unchecked. For imports, fuzzy match when both sides include text.",
};

const CLIENT_UPLOAD_MAX_DIMENSION = 1800;
const CLIENT_UPLOAD_MIN_BYTES = 1_000_000;
const CLIENT_UPLOAD_JPEG_QUALITY = 0.82;
const CLIENT_UPLOAD_MAX_BYTES = MAX_LABEL_UPLOAD_BYTES;
const CLIENT_BATCH_MAX_IMAGES = 20;

type PreparedUpload = {
  file: File;
  originalName: string;
  originalBytes: number;
  uploadBytes: number;
  compressed: boolean;
};

function getApplicationInputState(raw: string): { ok: true } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Application JSON is invalid. Switch to JSON view to fix it." };
  }

  const checked = ApplicationJsonSchema.safeParse(parsed);
  if (!checked.success) {
    return {
      ok: false,
      reason: "Application data does not match the expected fields yet. Fix it before verifying.",
    };
  }

  return { ok: true };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}

function replaceFileExtension(fileName: string, nextExt: string): string {
  const i = fileName.lastIndexOf(".");
  const base = i > 0 ? fileName.slice(0, i) : fileName;
  return `${base}${nextExt}`;
}

async function prepareImageUpload(input: File): Promise<PreparedUpload> {
  if (!input.type.startsWith("image/")) {
    return {
      file: input,
      originalName: input.name,
      originalBytes: input.size,
      uploadBytes: input.size,
      compressed: false,
    };
  }

  const bitmap = await createImageBitmap(input);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const shouldResize = longest > CLIENT_UPLOAD_MAX_DIMENSION;
    const shouldCompress = shouldResize || input.size > CLIENT_UPLOAD_MIN_BYTES || input.type !== "image/jpeg";

    if (!shouldCompress) {
      return {
        file: input,
        originalName: input.name,
        originalBytes: input.size,
        uploadBytes: input.size,
        compressed: false,
      };
    }

    const scale = shouldResize ? CLIENT_UPLOAD_MAX_DIMENSION / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image canvas.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CLIENT_UPLOAD_JPEG_QUALITY),
    );

    if (!blob || blob.size >= input.size) {
      return {
        file: input,
        originalName: input.name,
        originalBytes: input.size,
        uploadBytes: input.size,
        compressed: false,
      };
    }

    return {
      file: new File([blob], replaceFileExtension(input.name, ".jpg"), { type: "image/jpeg" }),
      originalName: input.name,
      originalBytes: input.size,
      uploadBytes: blob.size,
      compressed: true,
    };
  } finally {
    bitmap.close();
  }
}

function parseExtractionField(raw: unknown): {
  value: string | null;
  confidence: number;
  reason: string | null;
} {
  if (!raw || typeof raw !== "object") {
    return { value: null, confidence: 0, reason: null };
  }
  const o = raw as Record<string, unknown>;
  const value =
    typeof o.value === "string"
      ? o.value
      : o.value === null || o.value === undefined
        ? null
        : null;
  const confidence = typeof o.confidence === "number" ? o.confidence : 0;
  const reason =
    typeof o.reason === "string"
      ? o.reason
      : o.reason === null
        ? null
        : null;
  return { value, confidence, reason };
}

function statusBadgeClasses(status: FieldStatus): string {
  switch (status) {
    case "pass":
      return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600/20";
    case "fail":
      return "bg-red-100 text-red-900 ring-1 ring-red-600/20";
    case "manual_review":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-600/25";
    case "not_applicable":
      return "bg-stone-200 text-stone-700 ring-1 ring-stone-400/30";
    default:
      return "bg-stone-100 text-stone-800";
  }
}

function formatStatusLabel(status: FieldStatus): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "manual_review":
      return "Manual review";
    case "not_applicable":
      return "Not applicable";
    default:
      return status;
  }
}

function FieldComparisonPanel({
  role,
  title,
  titleShort,
  children,
  footerNote,
}: {
  role: "extracted" | "application" | "requirement";
  title: string;
  /** Shorter label for tight mobile layout */
  titleShort: string;
  children: ReactNode;
  /** Optional one-line hint under the title (e.g. explain the third column). */
  footerNote?: string;
}) {
  const shell =
    role === "extracted"
      ? "border-sky-200/90 bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-500/10 border-l-sky-500"
      : role === "application"
        ? "border-violet-200/90 bg-gradient-to-b from-violet-50 to-white ring-1 ring-violet-500/10 border-l-violet-600"
        : "border-ttb-200/90 bg-gradient-to-b from-ttb-50 to-white ring-1 ring-ttb-600/10 border-l-ttb-700";

  return (
    <div
      className={`flex min-h-0 flex-col gap-2 rounded-lg border border-stone-200/80 pl-3 shadow-sm ${shell} border-l-4`}
    >
      <div className="pr-2 pt-2">
        <span className="hidden text-[11px] font-bold uppercase tracking-wide text-stone-600 sm:inline">
          {title}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-stone-600 sm:hidden">
          {titleShort}
        </span>
        {footerNote ? (
          <span className="mt-1.5 block text-[10px] font-normal normal-case leading-snug text-stone-500 sm:text-[11px]">
            {footerNote}
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2">{children}</div>
    </div>
  );
}

function MonospaceValueBox({
  text,
  sub,
}: {
  text: string | null;
  sub?: string | null;
}) {
  const display = text !== null && text.trim() !== "" ? text : "—";
  const isLong = display.length > 200;

  return (
    <>
      <div
        className={`rounded-md border border-stone-200/90 bg-white/90 px-3 py-2 font-mono text-xs leading-relaxed text-stone-900 break-words whitespace-pre-wrap shadow-sm ${
          isLong ? "max-h-40 overflow-y-auto" : ""
        }`}
      >
        {display}
      </div>
      {sub ? <span className="mt-1 block text-[11px] text-stone-500">{sub}</span> : null}
    </>
  );
}

type ResultsDigest = {
  counts: Record<FieldStatus, number>;
  uniqueMessage: string | null;
  overall: "pass" | "fail" | "manual_review" | "mixed";
  fieldCount: number;
  /** Long text for native tooltip on the Not applicable chip; null when count is 0. */
  notApplicableTooltip: string | null;
  blankExtractedCount: number;
  blankManualReviewCount: number;
};

function hasFieldValue(value: string | null): boolean {
  return value != null && String(value).trim() !== "";
}

function buildNotApplicableTooltip(
  count: number,
  labels: string[],
  ids: FieldId[],
): string {
  const list =
    labels.length === 1
      ? labels[0]!
      : labels.length === 0
        ? `${count} field${count === 1 ? "" : "s"}`
        : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

  const suffix =
    ids.length > 0 && ids.every((id) => id === "countryOfOrigin")
      ? "Country of origin is only compared when the application marks the product as import (Import checked)."
      : "The validator skipped these checks because they do not apply to your application as submitted.";

  return `Not applicable (${count}): skipped — no pass/fail for ${list}. ${suffix}`;
}

function buildResultsDigest(payload: VerifySuccessResponse): ResultsDigest {
  const fields = payload.validation.fields;
  const counts: Record<FieldStatus, number> = {
    pass: 0,
    fail: 0,
    manual_review: 0,
    not_applicable: 0,
  };
  for (const f of fields) counts[f.status]++;

  const notApplicableRows = fields.filter((f) => f.status === "not_applicable");
  const notApplicableFieldIds = notApplicableRows.map((f) => f.fieldId);
  const notApplicableFieldLabels = notApplicableRows.map((f) => FIELD_LABELS[f.fieldId]);

  const notApplicableTooltip =
    counts.not_applicable > 0
      ? buildNotApplicableTooltip(
          counts.not_applicable,
          notApplicableFieldLabels,
          notApplicableFieldIds,
        )
      : null;

  const messages = new Set(fields.map((f) => f.message));
  const uniqueMessage = messages.size === 1 ? [...messages][0]! : null;
  const blankExtractedCount = fields.filter((f) => !hasFieldValue(f.extractedValue)).length;
  const blankManualReviewCount = fields.filter(
    (f) => f.status === "manual_review" && !hasFieldValue(f.extractedValue),
  ).length;

  let overall: ResultsDigest["overall"];
  if (counts.fail > 0) overall = "fail";
  else if (counts.manual_review > 0) overall = "manual_review";
  else if (counts.pass + counts.not_applicable === fields.length) overall = "pass";
  else overall = "mixed";

  return {
    counts,
    uniqueMessage,
    overall,
    fieldCount: fields.length,
    notApplicableTooltip,
    blankExtractedCount,
    blankManualReviewCount,
  };
}

function overallResultsHeadline(d: ResultsDigest): string {
  switch (d.overall) {
    case "pass":
      return "All checks passed";
    case "fail":
      return "One or more fields failed";
    case "manual_review":
      return "Human review required";
    default:
      return "Mixed outcomes — review the table";
  }
}

function joinWorkloadSegments(segments: string[]): string {
  if (segments.length === 1) return segments[0]!;
  if (segments.length === 2) return `${segments[0]} and ${segments[1]}`;
  return `${segments.slice(0, -1).join(", ")}, and ${segments.at(-1)}`;
}

/**
 * One line: how many rows fall into each outcome bucket (the only reason to show counts here).
 * The table below repeats per field; this is the roll-up.
 */
function outcomeWorkloadSummaryLine(d: ResultsDigest): string {
  const { counts, fieldCount } = d;
  const segments: string[] = [];
  if (counts.fail > 0) segments.push(`${counts.fail} failed`);
  if (counts.manual_review > 0) segments.push(`${counts.manual_review} need human review`);
  if (counts.pass > 0) segments.push(`${counts.pass} passed automatically`);
  if (counts.not_applicable > 0) segments.push(`${counts.not_applicable} skipped as not applicable`);
  if (segments.length === 0) {
    return `This verification includes ${fieldCount} field row${fieldCount === 1 ? "" : "s"}.`;
  }
  return `Across ${fieldCount} field${fieldCount === 1 ? "" : "s"}: ${joinWorkloadSegments(segments)}.`;
}

/** Plain-language purpose: what this run means for the reader in one breath. */
function outcomeCardLeadLine(d: ResultsDigest): string {
  switch (d.overall) {
    case "pass": {
      return `Within this prototype’s rules, every comparison that ran passed. Expand sections below only if you want to audit a specific value.`;
    }
    case "fail":
      return `Automated comparison reported at least one mismatch between label and application. Treat failures as blockers until you change the data or follow your own override process.`;
    case "manual_review":
      return `Automation could not confidently pass or fail every compared row. Use this screen to compare the submitted application with the label image before deciding what to do next.`;
    default:
      return "Different fields landed in different states. Use the Field outcomes table for a row-by-row picture, then open Full comparison by field only where you need rules or per-field messages.";
  }
}

function outcomeCardNextStepLine(d: ResultsDigest): string {
  switch (d.overall) {
    case "pass":
      return "You can stop here for a quick green check, or scan the table to spot-check values.";
    case "fail":
      return "Next: start with the failed rows in the table below. If the image or submitted data needs correction, use Edit inputs, then Verify again.";
    case "manual_review":
      return "Next: check the label image against the table below. If the photo or submitted data needs correction, use Edit inputs, then Verify again.";
    default:
      return "Next: use the Field outcomes table first; expand Full comparison by field when messages differ row to row.";
  }
}

function outcomePrimaryReasonLine(d: ResultsDigest): string | null {
  if (d.overall === "manual_review") {
    if (d.blankManualReviewCount >= Math.max(2, d.counts.manual_review)) {
      return "Most review rows do not have confident extracted label text yet, so the verifier is intentionally deferring to a human reviewer.";
    }
    return d.uniqueMessage ?? "The verifier could not confidently automate every comparison for this run.";
  }
  if (d.overall === "fail") {
    return d.uniqueMessage ?? "At least one automated comparison found a mismatch between the label and the submitted application.";
  }
  return null;
}

function ResultsSummaryMoreInfo({ d }: { d: ResultsDigest }) {
  const showInlineGuidance = d.overall === "manual_review" || d.overall === "fail";
  const primaryReason = outcomePrimaryReasonLine(d);
  return (
    <div className="mt-3 text-left">
      <details
        className="rounded-lg border border-stone-300/60 bg-white/60 shadow-sm open:border-stone-400/70 open:bg-white/90 [&>summary::-webkit-details-marker]:hidden [&[open]>summary_svg]:rotate-90"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-stone-800 outline-none transition-colors hover:bg-stone-100/90 focus-visible:ring-2 focus-visible:ring-ttb-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-stone-100 select-none">
          <svg
            className="h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 ease-out"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>{showInlineGuidance ? "More context" : "Expand for more information"}</span>
        </summary>
        <div
          className="space-y-2 border-t border-stone-200/70 px-2 pb-2 pt-2 text-xs leading-relaxed text-stone-700"
          role="region"
          aria-label="Additional outcome guidance"
        >
          {showInlineGuidance ? (
            <>
              {primaryReason ? (
                <p className="text-sm leading-relaxed text-stone-800">
                  <span className="font-semibold text-stone-900">Why this happened: </span>
                  {primaryReason}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-stone-800">{outcomeCardNextStepLine(d)}</p>
              <p>{outcomeCardLeadLine(d)}</p>
            </>
          ) : (
            <>
              <p>{outcomeCardLeadLine(d)}</p>
              <p>{outcomeCardNextStepLine(d)}</p>
            </>
          )}
          {d.notApplicableTooltip ? <p>{d.notApplicableTooltip}</p> : null}
          {d.uniqueMessage && d.uniqueMessage !== primaryReason ? (
            <p>
              <span className="font-medium text-stone-800">Same note on every row: </span>
              {d.uniqueMessage}
            </p>
          ) : (
            <p>
              Validator messages differ by field or need more room — expand{" "}
              <strong className="font-medium text-stone-800">Full comparison by field</strong> below for each row’s
              explanation and extraction confidence.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

function truncateFieldCell(value: string | null, maxLen: number): string {
  if (value == null) return "—";
  const t = String(value).trim();
  if (t === "") return "—";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(1, maxLen - 1))}…`;
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const fileSelectionTokenRef = useRef(0);
  const demoMenuRef = useRef<HTMLDetailsElement>(null);
  const [applicationJson, setApplicationJson] = useState(DEFAULT_APPLICATION);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const [uploadPreparation, setUploadPreparation] = useState<PreparedUpload | null>(null);
  const [uploadGuardrailErrorText, setUploadGuardrailErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [successPayload, setSuccessPayload] = useState<VerifySuccessResponse | null>(
    null,
  );
  const [errorPayload, setErrorPayload] = useState<VerifyErrorResponse | null>(null);
  const [rawResponseJson, setRawResponseJson] = useState<string | null>(null);
  const [applicationFieldPage, setApplicationFieldPage] = useState(0);
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>("edit");
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");
  const [runGeneration, setRunGeneration] = useState(0);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [extractionCacheKey, setExtractionCacheKey] = useState<string | null>(null);
  const [prefetchState, setPrefetchState] = useState<"idle" | "prefetching" | "ready" | "error">("idle");
  /** Human approve/reject for the current successful run — client only, not sent to the server. */
  const [reviewDisposition, setReviewDisposition] = useState<"approved" | "rejected" | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchErrorText, setBatchErrorText] = useState<string | null>(null);
  const [batchResponse, setBatchResponse] = useState<VerifyBatchResponse | null>(null);
  const [demoLoadingCaseId, setDemoLoadingCaseId] = useState<DemoCaseId | null>(null);
  const [demoLoadErrorText, setDemoLoadErrorText] = useState<string | null>(null);

  const hasCompletedRun = runGeneration > 0;
  const applicationInputState = useMemo(() => getApplicationInputState(applicationJson), [applicationJson]);
  const canEnterVerify = useMemo(
    () => uploadMode === "single" && !!file && applicationInputState.ok && !preparingFile,
    [uploadMode, file, applicationInputState, preparingFile],
  );
  const canSubmit = useMemo(() => canEnterVerify && !loading, [canEnterVerify, loading]);
  const canRunBatch = useMemo(
    () => uploadMode === "batch" && batchFiles.length > 0 && applicationInputState.ok && !batchLoading,
    [uploadMode, batchFiles.length, applicationInputState, batchLoading],
  );
  const primaryActionDisabledReason = useMemo(() => {
    if (preparingFile) return "Please wait for image preparation to finish.";
    if (!file) return "Choose a label image to enable verification.";
    if (!applicationInputState.ok) return applicationInputState.reason;
    if (loading) return "Verification is already running.";
    return null;
  }, [preparingFile, file, applicationInputState, loading]);
  const batchActionDisabledReason = useMemo(() => {
    if (!applicationInputState.ok) return applicationInputState.reason;
    if (batchLoading) return "Batch verification is already running.";
    if (batchFiles.length === 0) return "Choose one or more label images to enable batch verification.";
    return null;
  }, [applicationInputState, batchLoading, batchFiles.length]);
  const verifyBlockedReason = useMemo(
    () =>
      uploadMode === "batch"
        ? "Switch back to Single label to use Verify and Results."
        : "Add a label image and valid application data to continue to Verify.",
    [uploadMode],
  );
  const workflowStatusText = useMemo(() => {
    if (uploadMode === "batch" && workflowPhase === "edit") {
      return batchLoading
        ? "Batch mode: running verification across the selected image set."
        : "Batch mode: choose multiple images and run batch verification from Edit.";
    }
    if (loading) return "Step 2 of 3: Running verification checks.";
    if (workflowPhase === "edit") {
      return canEnterVerify
        ? "Step 1 of 3: Inputs ready. Run verification, then review outcomes in Results."
        : "Step 1 of 3: Add a label image and valid application data.";
    }
    if (workflowPhase === "verify") {
      return hasCompletedRun
        ? "Step 2 of 3: Verification finished. Open Results to review outcomes."
        : "Step 2 of 3: Verification opens once inputs are ready.";
    }
    return "Step 3 of 3: Review field outcomes and supporting evidence.";
  }, [loading, batchLoading, workflowPhase, uploadMode, canEnterVerify, hasCompletedRun]);

  useEffect(() => {
    if (!loading) {
      setLoadingStepIndex(0);
      return;
    }
    setLoadingStepIndex(0);
    const id = window.setInterval(() => {
      setLoadingStepIndex((i) => (i >= 3 ? 3 : i + 1));
    }, 880);
    return () => window.clearInterval(id);
  }, [loading]);

  const outcomeHasPipelineFailure = useMemo(
    () => verifyResponseIndicatesPipelineFailure({ successPayload, errorPayload, errorText }),
    [successPayload, errorPayload, errorText],
  );

  const verifySteps = useMemo(
    () =>
      loading
        ? buildVerifyUiStepsLoading(loadingStepIndex)
        : buildVerifyUiStepsFromResponse({
            httpStatus,
            successPayload,
            errorPayload,
            errorText,
          }),
    [loading, loadingStepIndex, httpStatus, successPayload, errorPayload, errorText],
  );

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file || preparingFile) {
      if (!file) {
        setExtractionCacheKey(null);
        setPrefetchState("idle");
      }
      return;
    }
    const abort = new AbortController();
    setExtractionCacheKey(null);
    setPrefetchState("prefetching");
    void (async () => {
      try {
        const fd = new FormData();
        fd.append(VERIFY_FORM_FIELDS.image, file);
        const res = await fetch("/api/verify/extract-only", {
          method: "POST",
          body: fd,
          signal: abort.signal,
        });
        if (!res.ok) {
          setPrefetchState("error");
          return;
        }
        const raw: unknown = await res.json();
        const parsed = VerifyExtractOnlyResponseSchema.safeParse(raw);
        if (!parsed.success) {
          setPrefetchState("error");
          return;
        }
        setExtractionCacheKey(parsed.data.cacheKey);
        setPrefetchState("ready");
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setPrefetchState("error");
      }
    })();
    return () => abort.abort();
  }, [file, preparingFile]);

  async function loadSelectedFile(nextFile: File | null) {
    const token = ++fileSelectionTokenRef.current;
    if (!nextFile) {
      setFile(null);
      setSelectedFileName(null);
      setUploadPreparation(null);
      setUploadGuardrailErrorText(null);
      setPreparingFile(false);
      return;
    }
    if (nextFile.size > CLIENT_UPLOAD_MAX_BYTES) {
      setFile(null);
      setSelectedFileName(null);
      setUploadPreparation(null);
      setPreparingFile(false);
      setUploadGuardrailErrorText(
        `Image is ${formatBytes(nextFile.size)}. Maximum upload size is ${formatBytes(CLIENT_UPLOAD_MAX_BYTES)}.`,
      );
      return;
    }

    setUploadGuardrailErrorText(null);
    setSelectedFileName(nextFile.name);
    setFile(nextFile);
    setUploadPreparation({
      file: nextFile,
      originalName: nextFile.name,
      originalBytes: nextFile.size,
      uploadBytes: nextFile.size,
      compressed: false,
    });
    setPreparingFile(true);

    try {
      const prepared = await prepareImageUpload(nextFile);
      if (fileSelectionTokenRef.current !== token) return;
      setFile(prepared.file);
      setUploadPreparation(prepared);
    } catch (err) {
      console.warn("[app/page] client upload compression skipped; using original file", err);
      if (fileSelectionTokenRef.current !== token) return;
      setFile(nextFile);
      setUploadPreparation({
        file: nextFile,
        originalName: nextFile.name,
        originalBytes: nextFile.size,
        uploadBytes: nextFile.size,
        compressed: false,
      });
    } finally {
      if (fileSelectionTokenRef.current === token) {
        setPreparingFile(false);
      }
    }
  }

  async function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = ev.target.files?.[0] ?? null;
    ev.target.value = "";
    await loadSelectedFile(nextFile);
  }

  function resetLoadedRunState() {
    setUploadMode("single");
    setWorkflowPhase("edit");
    setLoading(false);
    setErrorText(null);
    setSuccessPayload(null);
    setErrorPayload(null);
    setRawResponseJson(null);
    setHttpStatus(null);
    setRunGeneration(0);
    setReviewDisposition(null);
    setBatchFiles([]);
    setBatchErrorText(null);
    setBatchResponse(null);
  }

  async function onSelectDemoCase(caseId: DemoCaseId) {
    setDemoLoadingCaseId(caseId);
    setDemoLoadErrorText(null);
    try {
      const res = await fetch(`/api/demo-cases/${caseId}`);
      const raw: unknown = await res.json();
      if (!res.ok || !raw || typeof raw !== "object") {
        throw new Error("Could not load demo fixture.");
      }
      const payload = raw as {
        applicationJson?: unknown;
        image?: { fileName?: unknown; mimeType?: unknown; base64?: unknown };
      };
      if (
        typeof payload.applicationJson !== "string" ||
        typeof payload.image?.fileName !== "string" ||
        typeof payload.image?.mimeType !== "string" ||
        typeof payload.image?.base64 !== "string"
      ) {
        throw new Error("Demo fixture response was incomplete.");
      }

      resetLoadedRunState();
      setApplicationJson(payload.applicationJson);
      setApplicationFieldPage(0);
      demoMenuRef.current?.removeAttribute("open");
      await loadSelectedFile(
        base64ToFile(payload.image.base64, payload.image.fileName, payload.image.mimeType),
      );
    } catch (err) {
      setDemoLoadErrorText(err instanceof Error ? err.message : "Could not load demo fixture.");
    } finally {
      setDemoLoadingCaseId(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploadMode === "batch") {
      await onBatchSubmit();
      return;
    }
    if (!file) return;
    if (!applicationInputState.ok) return;
    if (file.size > CLIENT_UPLOAD_MAX_BYTES) {
      setUploadGuardrailErrorText(
        `Image is ${formatBytes(file.size)}. Maximum upload size is ${formatBytes(CLIENT_UPLOAD_MAX_BYTES)}.`,
      );
      return;
    }

    let outcomeSuccess: VerifySuccessResponse | null = null;
    let outcomeError: VerifyErrorResponse | null = null;
    let outcomeErrorText: string | null = null;

    setWorkflowPhase("verify");
    setLoading(true);
    setErrorText(null);
    setSuccessPayload(null);
    setErrorPayload(null);
    setRawResponseJson(null);
    setHttpStatus(null);
    setReviewDisposition(null);

    try {
      const formData = new FormData();
      formData.append(VERIFY_FORM_FIELDS.image, file);
      formData.append(VERIFY_FORM_FIELDS.application, applicationJson);
      if (extractionCacheKey) {
        formData.append(VERIFY_FORM_FIELDS.extractionCacheKey, extractionCacheKey);
      }

      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        const msg = `Non-JSON response (${res.status}): ${text.slice(0, 500)}`;
        outcomeErrorText = msg;
        setErrorText(
          res.status >= 200 && res.status < 300
            ? msg
            : "The server returned an unexpected response (not JSON). Check that you are on the app URL and try again.",
        );
        setHttpStatus(res.status);
        return;
      }

      setHttpStatus(res.status);
      setRawResponseJson(JSON.stringify(parsed, null, 2));

      if (res.ok) {
        const checked = VerifySuccessResponseSchema.safeParse(parsed);
        if (checked.success) {
          outcomeSuccess = checked.data;
          setSuccessPayload(checked.data);
        } else {
          const msg = "Response JSON did not match the expected success schema.";
          outcomeErrorText = msg;
          setErrorText(
            "The server response could not be shown in the comparison UI. Use Raw API JSON below if you need details.",
          );
        }
      } else {
        const errParsed = VerifyErrorResponseSchema.safeParse(parsed);
        if (errParsed.success) {
          outcomeError = errParsed.data;
          setErrorPayload(errParsed.data);
        }
        const msg = `HTTP ${res.status}`;
        outcomeErrorText = msg;
        setErrorText(
          verifyErrorUserHeadline(res.status, errParsed.success ? errParsed.data : null, msg),
        );
      }
    } catch (err) {
      outcomeErrorText = err instanceof Error ? err.message : String(err);
      setErrorText(
        err instanceof TypeError && err.message.includes("fetch")
          ? "Could not reach the server. Check your network and that the app is running."
          : outcomeErrorText,
      );
    } finally {
      setLoading(false);
      setRunGeneration((n) => n + 1);
      const failed = verifyResponseIndicatesPipelineFailure({
        successPayload: outcomeSuccess,
        errorPayload: outcomeError,
        errorText: outcomeErrorText,
      });
      setWorkflowPhase(failed ? "verify" : "results");
    }
  }

  async function onBatchSubmit() {
    if (batchFiles.length === 0) return;
    if (!applicationInputState.ok) {
      setBatchErrorText(applicationInputState.reason);
      return;
    }
    if (batchFiles.length > CLIENT_BATCH_MAX_IMAGES) {
      setBatchErrorText(`Batch size exceeds maximum of ${CLIENT_BATCH_MAX_IMAGES} images.`);
      return;
    }
    if (batchFiles.some((f) => f.size > CLIENT_UPLOAD_MAX_BYTES)) {
      setBatchErrorText(
        `Each batch image must be ${formatBytes(CLIENT_UPLOAD_MAX_BYTES)} or smaller.`,
      );
      return;
    }
    setBatchLoading(true);
    setBatchErrorText(null);
    setBatchResponse(null);
    try {
      const formData = new FormData();
      for (const batchFile of batchFiles) {
        formData.append(VERIFY_FORM_FIELDS.images, batchFile);
      }
      formData.append(VERIFY_FORM_FIELDS.application, applicationJson);
      const res = await fetch("/api/verify/batch", {
        method: "POST",
        body: formData,
      });
      const raw: unknown = await res.json();
      const parsed = VerifyBatchResponseSchema.safeParse(raw);
      if (!res.ok) {
        setBatchErrorText(`Batch request failed (HTTP ${res.status}).`);
        return;
      }
      if (!parsed.success) {
        setBatchErrorText("Batch response schema mismatch.");
        return;
      }
      setBatchResponse(parsed.data);
    } catch (err) {
      setBatchErrorText(err instanceof Error ? err.message : String(err));
    } finally {
      setBatchLoading(false);
    }
  }

  const showResultsBody = hasCompletedRun;

  const resultsDigest = useMemo(
    () => (successPayload?.validation?.fields?.length ? buildResultsDigest(successPayload) : null),
    [successPayload],
  );

  function onBatchFilesChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(ev.target.files ?? []);
    ev.target.value = "";
    if (selected.length === 0) {
      setBatchFiles([]);
      setBatchErrorText(null);
      return;
    }
    if (selected.length > CLIENT_BATCH_MAX_IMAGES) {
      setBatchFiles([]);
      setBatchResponse(null);
      setBatchErrorText(
        `Batch size exceeds maximum of ${CLIENT_BATCH_MAX_IMAGES} images.`,
      );
      return;
    }
    const oversized = selected.filter((f) => f.size > CLIENT_UPLOAD_MAX_BYTES);
    if (oversized.length > 0) {
      const sample = oversized
        .slice(0, 2)
        .map((f) => `"${f.name}" (${formatBytes(f.size)})`)
        .join(", ");
      setBatchFiles([]);
      setBatchResponse(null);
      setBatchErrorText(
        `Each batch image must be ${formatBytes(CLIENT_UPLOAD_MAX_BYTES)} or smaller. Oversized: ${sample}${oversized.length > 2 ? `, +${oversized.length - 2} more` : ""}.`,
      );
      return;
    }
    setBatchErrorText(null);
    setBatchFiles(selected);
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-2 pb-5 sm:gap-3 sm:px-6 sm:pt-3 sm:pb-6">
      <header className="pointer-events-none relative z-20 grid grid-cols-1 gap-x-3 gap-y-2 border-b border-stone-200 py-1 pb-2 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] sm:items-center sm:gap-y-0">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 justify-self-start">
          <span className="inline-flex shrink-0 items-center rounded-md border border-ttb-200 bg-ttb-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-ttb-800">
            Phase 1
          </span>
          <h1 className="min-w-0 truncate text-base font-semibold leading-tight tracking-tight text-stone-900 sm:text-lg">
            Label verification
          </h1>
        </div>
        <div className="pointer-events-auto flex w-full min-w-0 flex-col items-center justify-center gap-1 justify-self-stretch sm:px-0">
          <WorkflowProcessTabs
            phase={workflowPhase}
            onSelect={setWorkflowPhase}
            hasCompletedRun={hasCompletedRun}
            canEnterVerify={canEnterVerify}
            verifyBlockedReason={verifyBlockedReason}
          />
          <p className="text-center text-[11px] font-medium text-stone-500">{workflowStatusText}</p>
        </div>
        <div className="pointer-events-auto flex w-full min-w-0 flex-wrap justify-self-stretch gap-2 sm:w-auto sm:justify-self-end">
          <details
            ref={demoMenuRef}
            className="relative w-full min-w-0 sm:w-auto sm:max-w-[30rem]"
          >
            <summary className="flex h-7 cursor-pointer list-none items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold leading-none text-stone-800 shadow-sm outline-none ring-stone-400/20 transition hover:bg-stone-50 hover:ring-2 focus-visible:ring-2 [&::-webkit-details-marker]:hidden open:bg-stone-50 open:ring-2 sm:inline-flex sm:w-max sm:justify-center">
              Demo runs
            </summary>
            <div
              className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),32rem)] rounded-xl border border-stone-200 bg-white p-3 text-stone-700 shadow-xl sm:left-auto sm:right-0 sm:p-4"
              role="region"
              aria-label="Demo runs"
            >
              <p className="text-sm font-semibold text-stone-900">Load an existing eval fixture</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                Presets include synthetic eval fixtures and on-bottle photos, each paired with committed application
                JSON.
              </p>
              <div className="mt-3 max-h-[min(58vh,34rem)] space-y-2 overflow-y-auto pr-1">
                {DEMO_CASES.map((demoCase) => {
                  const loadingThisCase = demoLoadingCaseId === demoCase.id;
                  return (
                    <button
                      key={demoCase.id}
                      type="button"
                      onClick={() => void onSelectDemoCase(demoCase.id)}
                      disabled={demoLoadingCaseId !== null}
                      className="flex w-full cursor-pointer gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-left transition hover:border-ttb-300 hover:bg-ttb-50/60 disabled:cursor-wait disabled:opacity-70"
                    >
                      <img
                        src={`/api/demo-cases/${demoCase.id}/image`}
                        alt={`${demoCase.title} thumbnail`}
                        className="h-16 w-24 shrink-0 rounded-md border border-stone-200 bg-white object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-stone-900">{demoCase.title}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              demoCase.outcomeTone === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {demoCase.outcomeTone === "pass" ? "Pass case" : "Stress case"}
                          </span>
                        </div>
                        <span className="mt-1 block text-xs leading-relaxed text-stone-600">
                          {demoCase.subtitle}
                        </span>
                        <span className="mt-2 block text-[11px] font-medium text-stone-500">
                          {loadingThisCase ? "Loading fixture..." : demoCase.outcomeSummary}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {demoLoadErrorText ? (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-900">
                  {demoLoadErrorText}
                </p>
              ) : null}
            </div>
          </details>
          <details className="relative w-full min-w-0 sm:w-auto sm:max-w-[30rem]">
            <summary className="flex h-7 cursor-pointer list-none items-center justify-center rounded-lg border-2 border-ttb-600 bg-ttb-50 px-3 text-xs font-semibold leading-none text-ttb-900 shadow-sm outline-none ring-ttb-600/25 transition hover:bg-ttb-100 hover:ring-2 focus-visible:ring-2 [&::-webkit-details-marker]:hidden open:bg-ttb-100 open:ring-2 sm:inline-flex sm:w-max sm:justify-center">
              How this works
            </summary>
            <div
              className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),30rem)] max-h-[min(70vh,36rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white p-4 text-stone-700 shadow-xl sm:left-auto sm:right-0 sm:p-5"
              role="region"
              aria-label="How this works"
            >
              <ol className="list-decimal space-y-3 pl-5 text-base leading-relaxed marker:font-semibold marker:text-ttb-800 sm:space-y-4 sm:pl-6 sm:text-lg sm:leading-relaxed">
                <li>
                  Choose a label in <strong className="font-semibold text-stone-900">Label preview</strong>. Use the{" "}
                  <strong className="font-semibold text-stone-900">Edit</strong> tab to adjust application fields as
                  needed, or open <strong className="font-semibold text-stone-900">Demo runs</strong> to preload a
                  committed eval fixture.
                </li>
                <li>
                  For a single label, use{" "}
                  <strong className="font-semibold text-stone-900">Run verification</strong> at the bottom of the
                  workbench. For a small batch, switch the upload panel from{" "}
                  <strong className="font-semibold text-stone-900">Single label</strong> to{" "}
                  <strong className="font-semibold text-stone-900">Batch</strong> (up to {` ${CLIENT_BATCH_MAX_IMAGES} `}
                  images) with the same application JSON applied to each file.
                </li>
                <li>
                  The <strong className="font-semibold text-stone-900">Verify</strong> tab shows advancing pipeline
                  status. If a step fails, you stay on <strong className="font-semibold text-stone-900">Verify</strong>{" "}
                  with the checklist.
                </li>
                <li>
                  On success, open <strong className="font-semibold text-stone-900">Results</strong> for the
                  field-by-field table. <strong className="font-semibold text-stone-900">Approve</strong> /{" "}
                  <strong className="font-semibold text-stone-900">Reject</strong> below the table is optional UI state
                  only (not saved). Use <strong className="font-semibold text-stone-900">Edit inputs</strong> in the
                  results header to change inputs and run again.
                </li>
                <li>
                  Extraction runs in hybrid mode by default (OCR first, then OpenAI vision fallback when needed), then
                  deterministic validation assigns <strong className="font-semibold text-stone-900">pass</strong>,{" "}
                  <strong className="font-semibold text-stone-900">fail</strong>, or{" "}
                  <strong className="font-semibold text-stone-900">manual_review</strong> by field.
                </li>
              </ol>
            </div>
          </details>
        </div>
      </header>

      <form onSubmit={onSubmit} className="relative z-10 flex flex-col gap-2">
        <div
          className={`grid min-h-0 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm ${
            workflowPhase === "edit"
              ? "h-[min(88svh,680px)] grid-rows-[minmax(0,1fr)_auto] sm:h-[min(90svh,720px)]"
              : workflowPhase === "results"
                ? successPayload
                  ? "max-h-[min(92svh,900px)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-h-[min(92svh,880px)]"
                  : "max-h-[min(92svh,900px)] grid-rows-[auto_minmax(0,1fr)] sm:max-h-[min(92svh,880px)]"
                : "h-[min(88svh,680px)] grid-rows-[auto_minmax(0,1fr)_auto] sm:h-[min(90svh,720px)]"
          }`}
        >
          {workflowPhase === "verify" ? (
            <div className="shrink-0 border-b border-stone-100 bg-ttb-50/40 px-4 py-2.5">
              <p className="text-xs font-medium text-stone-800">
                {loading
                  ? "Running the verification pipeline on the server — vision extraction often takes 15–30 seconds."
                  : outcomeHasPipelineFailure
                    ? "A pipeline step did not complete successfully — review the checklist below. Use Edit to adjust inputs, then run verify again."
                    : "That run finished successfully. Open the Results tab for the field-by-field comparison, or go back to Edit to change inputs."}
              </p>
            </div>
          ) : workflowPhase === "results" ? (
            <div className="flex shrink-0 flex-col gap-2 border-b border-stone-100 bg-stone-50/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-stone-900">Outcome &amp; field review</span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex flex-wrap items-stretch gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setWorkflowPhase("edit")}
                    className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 sm:px-4 sm:text-sm"
                  >
                    Edit inputs
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="cursor-pointer rounded-lg border-2 border-ttb-600 bg-white px-3 py-2 text-center text-xs font-semibold text-ttb-800 shadow-sm transition hover:bg-ttb-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-100 disabled:text-stone-500 disabled:shadow-none sm:px-4 sm:text-sm"
                    title={!canSubmit ? primaryActionDisabledReason ?? "Complete required inputs to run again." : undefined}
                  >
                    Verify again
                  </button>
                </div>
                {!canSubmit && primaryActionDisabledReason ? (
                  <p className="max-w-[20rem] text-right text-[11px] text-stone-500">
                    {primaryActionDisabledReason}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 overflow-y-auto px-2.5 pb-2 pt-0 lg:px-3">
            {workflowPhase === "edit" ? (
          <>
          <div className="flex min-h-0 flex-col gap-2 lg:flex-row lg:gap-3">
            <section
              aria-labelledby="workbench-label-heading"
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-sm lg:basis-0"
            >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              aria-label="Choose label image file"
              onChange={onFileChange}
            />
            <input
              ref={batchFileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="sr-only"
              aria-label="Choose batch label image files"
              onChange={onBatchFilesChange}
            />
            <div className="shrink-0 border-b border-stone-100 pb-1.5">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <h2
                  id="workbench-label-heading"
                  className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-xs font-semibold text-stone-900 sm:text-sm"
                >
                  <span className="shrink-0">{uploadMode === "single" ? "Label preview" : "Label upload"}</span>
                  {uploadMode === "single" && file ? (
                    <>
                      <span className="shrink-0 font-normal text-stone-500">for</span>
                      <span
                        className="min-w-0 max-w-full truncate font-mono text-[11px] font-normal text-stone-600 sm:text-xs"
                        title={selectedFileName ?? file.name}
                      >
                        &apos;{selectedFileName ?? file.name}&apos;
                      </span>
                    </>
                  ) : uploadMode === "batch" && batchFiles.length > 0 ? (
                    <span className="font-normal text-stone-500">
                      {batchFiles.length} file{batchFiles.length === 1 ? "" : "s"} selected
                    </span>
                  ) : null}
                </h2>
                {uploadMode === "single" && file ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer shrink-0 rounded-lg border border-ttb-300 bg-ttb-50 px-2.5 py-1 text-xs font-semibold text-ttb-900 shadow-sm transition hover:bg-ttb-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttb-600/30"
                  >
                    Change image
                  </button>
                ) : uploadMode === "batch" && batchFiles.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => batchFileInputRef.current?.click()}
                    className="cursor-pointer shrink-0 rounded-lg border border-ttb-300 bg-ttb-50 px-2.5 py-1 text-xs font-semibold text-ttb-900 shadow-sm transition hover:bg-ttb-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ttb-600/30"
                  >
                    Change files
                  </button>
                ) : null}
              </div>
              <div className="mt-1.5 inline-flex rounded-xl border border-stone-200 bg-stone-100/90 p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setUploadMode("single")}
                  aria-pressed={uploadMode === "single"}
                  className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    uploadMode === "single"
                      ? "bg-ttb-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Single label
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("batch")}
                  aria-pressed={uploadMode === "batch"}
                  className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    uploadMode === "batch"
                      ? "bg-ttb-600 text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  Batch
                </button>
              </div>
            </div>

            {uploadMode === "single" ? (
              <>
                {!file ? (
                  <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
                    Single-label verify starts here: choose one image, then run verification before reviewing results.
                  </p>
                ) : preparingFile ? (
                  <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
                    Preparing an optimized upload for faster verification…
                  </p>
                ) : uploadPreparation?.compressed ? (
                  <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
                    Upload optimized before submit: {formatBytes(uploadPreparation.originalBytes)} to{" "}
                    {formatBytes(uploadPreparation.uploadBytes)}.
                  </p>
                ) : null}
                {file && !preparingFile ? (
                  <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
                    {prefetchState === "prefetching"
                      ? "Prefetching extraction in the background…"
                      : prefetchState === "ready"
                        ? "Extraction prefetched. Verify can reuse cached results."
                        : prefetchState === "error"
                          ? "Background prefetch unavailable; verify will run full extraction."
                          : null}
                  </p>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col">
                  {previewUrl ? (
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                      <div className="absolute inset-0 flex items-start justify-center p-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt={file?.name ? `Label preview: ${file.name}` : "Label preview"}
                          className="max-h-full max-w-full object-contain object-top"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ttb-200 bg-gradient-to-b from-ttb-50/80 to-white px-3 py-4 text-center">
                      <p className="text-xs font-semibold text-stone-800">1. Choose a label image</p>
                      <p className="max-w-[18rem] text-[11px] leading-relaxed text-stone-500">
                        2. Run verification, then review field outcomes in Results.
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer rounded-lg border-2 border-ttb-600 bg-ttb-50 px-3 py-2 text-xs font-semibold text-ttb-900 transition hover:bg-ttb-100 sm:text-sm"
                      >
                        Choose label image
                      </button>
                      <p className="text-[10px] text-stone-500">JPEG or PNG · single-label path</p>
                    </div>
                  )}
                </div>
                {uploadGuardrailErrorText ? (
                  <p className="mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900">
                    {uploadGuardrailErrorText}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-[10px] leading-snug text-stone-500 sm:text-[11px]">
                  Batch mode reuses the same application JSON across up to {CLIENT_BATCH_MAX_IMAGES} images.
                </p>
                <div className="flex min-h-0 flex-1 flex-col">
                  {batchFiles.length > 0 || batchResponse ? (
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/70 p-3">
                      <div className="space-y-3">
                        <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                          <p className="text-xs font-semibold text-stone-900">
                            Selected files ({batchFiles.length})
                          </p>
                          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
                            {batchFiles.length > 0 ? (
                              batchFiles.map((batchFile) => (
                                <div
                                  key={`${batchFile.name}-${batchFile.size}`}
                                  className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-700"
                                >
                                  <span className="min-w-0 truncate font-mono">{batchFile.name}</span>
                                  <span className="shrink-0 text-stone-500">{formatBytes(batchFile.size)}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[11px] text-stone-500">No files selected yet.</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => batchFileInputRef.current?.click()}
                            className="mt-2 cursor-pointer rounded-lg border border-ttb-300 bg-ttb-50 px-2.5 py-1 text-xs font-semibold text-ttb-900 transition hover:bg-ttb-100"
                          >
                            {batchFiles.length > 0 ? "Choose different images" : "Choose batch images"}
                          </button>
                        </div>
                        {batchResponse ? (
                          <div className="space-y-2">
                            <div className="rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700">
                              total {batchResponse.summary.total} · success {batchResponse.summary.success} · error{" "}
                              {batchResponse.summary.error} · pass {batchResponse.summary.pass} · fail{" "}
                              {batchResponse.summary.fail} · manual review {batchResponse.summary.manualReview} ·{" "}
                              {batchResponse.summary.totalMs} ms
                            </div>
                            <div className="max-h-48 overflow-y-auto rounded-md border border-stone-200 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-stone-50 text-stone-600">
                                  <tr>
                                    <th className="px-2 py-1">File</th>
                                    <th className="px-2 py-1">Status</th>
                                    <th className="px-2 py-1">Result</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {batchResponse.items.map((item) => (
                                    <tr key={`${item.index}-${item.fileName}`} className="border-t border-stone-100">
                                      <td className="px-2 py-1 font-mono text-[11px] text-stone-800">{item.fileName}</td>
                                      <td className="px-2 py-1 text-stone-700">{item.status}</td>
                                      <td className="px-2 py-1 text-stone-700">
                                        {item.ok
                                          ? item.result?.validation?.fields?.some((f) => f.status === "fail")
                                            ? "fail"
                                            : item.result?.validation?.fields?.some((f) => f.status === "manual_review")
                                              ? "manual_review"
                                              : "pass"
                                          : item.error?.code ?? "error"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ttb-200 bg-gradient-to-b from-ttb-50/80 to-white px-3 py-4 text-center">
                      <p className="text-xs font-semibold text-stone-800">1. Choose batch images</p>
                      <p className="max-w-[18rem] text-[11px] leading-relaxed text-stone-500">
                        2. Run batch verification with the current application data applied to every image.
                      </p>
                      <button
                        type="button"
                        onClick={() => batchFileInputRef.current?.click()}
                        className="cursor-pointer rounded-lg border-2 border-ttb-600 bg-ttb-50 px-3 py-2 text-xs font-semibold text-ttb-900 transition hover:bg-ttb-100 sm:text-sm"
                      >
                        Choose batch images
                      </button>
                      <p className="text-[10px] text-stone-500">
                        JPEG or PNG · up to {CLIENT_BATCH_MAX_IMAGES} files
                      </p>
                    </div>
                  )}
                </div>
                {batchErrorText ? (
                  <p className="mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900">
                    {batchErrorText}
                  </p>
                ) : null}
              </>
            )}
          </section>

            <section
              aria-labelledby="workbench-json-heading"
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-sm lg:basis-0"
            >
            <header className="shrink-0 border-b border-stone-100 pb-1.5">
              <h2 id="workbench-json-heading" className="text-xs font-semibold text-stone-900 sm:text-sm">
                Application data
              </h2>
            </header>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <ApplicationEditor
                value={applicationJson}
                onChange={setApplicationJson}
                density="compact"
                formattedPageIndex={applicationFieldPage}
                onFormattedPageChange={setApplicationFieldPage}
              />
            </div>
          </section>
          </div>
          </>
            ) : workflowPhase === "verify" ? (
              <div className="mx-auto w-full max-w-4xl px-2 py-4 sm:py-6">
                {!hasCompletedRun && !loading ? (
                  <p className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-base text-stone-700">
                    Choose <strong className="font-medium text-stone-900">Edit</strong>, add a label image, then{" "}
                    <strong className="font-medium text-stone-900">Run verification</strong>. This tab shows live
                    pipeline status while the request runs.
                  </p>
                ) : null}
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
                  <VerifyRunStepsPanel
                    steps={verifySteps}
                    compact={false}
                    heading="Verification pipeline"
                    subheading="One server request — status updates when the response returns."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {errorText ? (
                  <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <p className="font-medium">{errorText}</p>
                    {httpStatus !== null ? (
                      <p className="mt-1 text-xs text-red-800/85">HTTP {httpStatus}</p>
                    ) : null}
                    {errorPayload ? (
                      <dl className="mt-2 grid gap-1 text-xs">
                        <div>
                          <dt className="inline font-semibold text-red-950">Code: </dt>
                          <dd className="inline font-mono">{errorPayload.code}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold text-red-950">Message: </dt>
                          <dd className="inline">{errorPayload.message}</dd>
                        </div>
                      </dl>
                    ) : null}
                  </section>
                ) : null}

                {showResultsBody ? (
                  <section className="mx-auto w-full max-w-none space-y-4">
                    {successPayload && resultsDigest ? (
                      <>
                        {(() => {
                          const showReviewImage =
                            (resultsDigest.overall === "manual_review" || resultsDigest.overall === "fail") &&
                            !!previewUrl;

                          return (
                            <div
                              className={
                                showReviewImage
                                  ? "grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.82fr)] lg:items-start"
                                  : "space-y-4"
                              }
                            >
                              <div className="min-w-0 space-y-4">
                                <div
                                  className={`rounded-xl border px-3 py-3 shadow-sm sm:px-4 ${
                                    resultsDigest.overall === "fail"
                                      ? "border-red-200 bg-red-50/90"
                                      : resultsDigest.overall === "manual_review"
                                        ? "border-amber-200 bg-amber-50/80"
                                        : resultsDigest.overall === "pass"
                                          ? "border-emerald-200 bg-emerald-50/70"
                                          : "border-stone-200 bg-white"
                                  }`}
                                >
                                  <h3 className="text-base font-semibold leading-snug tracking-tight text-stone-900 sm:text-lg">
                                    {overallResultsHeadline(resultsDigest)}
                                  </h3>
                                  <p className="mt-2 text-sm font-semibold leading-snug text-stone-900">
                                    {outcomeWorkloadSummaryLine(resultsDigest)}
                                  </p>
                                  <ResultsSummaryMoreInfo d={resultsDigest} />
                                </div>

                                <div>
                                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                                    Field outcomes
                                  </h3>
                                  <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                                    <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                                      <thead>
                                        <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                                          <th className="px-3 py-2">Field</th>
                                          <th className="whitespace-nowrap px-3 py-2">Status</th>
                                          <th className="px-3 py-2">From label</th>
                                          <th className="px-3 py-2">From application</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {successPayload.validation.fields.map((row) => {
                                          const extractedDisplay =
                                            row.status === "manual_review" && !hasFieldValue(row.extractedValue)
                                              ? "No confident label text"
                                              : truncateFieldCell(row.extractedValue, 56);
                                          const applicationDisplay = truncateFieldCell(row.applicationValue, 56);
                                          const extractedTrimmed = row.extractedValue?.trim() ?? "";
                                          const applicationTrimmed = row.applicationValue?.trim() ?? "";
                                          const extractedExpandable =
                                            extractedDisplay !== "No confident label text" && extractedTrimmed.length > 56;
                                          const applicationExpandable = applicationTrimmed.length > 56;
                                          return (
                                            <tr key={row.fieldId} className="border-b border-stone-100 last:border-0">
                                              <td className="max-w-[10rem] px-3 py-2 font-medium text-stone-900">
                                                {FIELD_LABELS[row.fieldId]}
                                              </td>
                                              <td className="max-w-[9.5rem] px-3 py-2 align-top">
                                                <span
                                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold leading-snug ${statusBadgeClasses(row.status)}`}
                                                >
                                                  {formatStatusLabel(row.status)}
                                                </span>
                                              </td>
                                              <td
                                                className="max-w-[14rem] px-3 py-2 font-mono text-xs text-stone-800"
                                                title={row.extractedValue ?? undefined}
                                              >
                                                {extractedExpandable ? (
                                                  <details
                                                    className="group max-w-full"
                                                    {...(row.fieldId === "governmentWarning"
                                                      ? { open: true }
                                                      : {})}
                                                  >
                                                    <summary className="cursor-pointer list-none truncate text-xs leading-relaxed text-stone-800 [&::-webkit-details-marker]:hidden">
                                                      {extractedDisplay}
                                                      <span className="ml-1 text-[10px] font-medium text-ttb-700 underline underline-offset-2">
                                                        View full
                                                      </span>
                                                    </summary>
                                                    <p className="mt-1.5 rounded border border-stone-200 bg-white px-2 py-1.5 font-mono text-[11px] leading-relaxed text-stone-800 break-words whitespace-pre-wrap">
                                                      {row.extractedValue}
                                                    </p>
                                                  </details>
                                                ) : (
                                                  extractedDisplay
                                                )}
                                              </td>
                                              <td
                                                className="max-w-[14rem] px-3 py-2 font-mono text-xs text-stone-800"
                                                title={row.applicationValue ?? undefined}
                                              >
                                                {applicationExpandable ? (
                                                  <details
                                                    className="group max-w-full"
                                                    {...(row.fieldId === "governmentWarning"
                                                      ? { open: true }
                                                      : {})}
                                                  >
                                                    <summary className="cursor-pointer list-none truncate text-xs leading-relaxed text-stone-800 [&::-webkit-details-marker]:hidden">
                                                      {applicationDisplay}
                                                      <span className="ml-1 text-[10px] font-medium text-ttb-700 underline underline-offset-2">
                                                        View full
                                                      </span>
                                                    </summary>
                                                    <p className="mt-1.5 rounded border border-stone-200 bg-white px-2 py-1.5 font-mono text-[11px] leading-relaxed text-stone-800 break-words whitespace-pre-wrap">
                                                      {row.applicationValue}
                                                    </p>
                                                  </details>
                                                ) : (
                                                  applicationDisplay
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                                    Full values, coded rules, and validator notes appear in{" "}
                                    <span className="font-medium text-stone-700">Full comparison by field</span> below.
                                  </p>
                                </div>
                              </div>

                              {showReviewImage ? (
                                <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm lg:sticky lg:top-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-stone-900">Label image used for this run</h3>
                                    <span className="text-[11px] font-medium text-stone-500">Review context</span>
                                  </div>
                                  <LabelImageMagnifier
                                    src={previewUrl}
                                    alt="Label used for this verification"
                                    frameClassName="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                                    imgClassName="max-h-80 w-full object-contain bg-stone-50 p-2"
                                  />
                                  <p className="mt-2 text-xs leading-relaxed text-stone-600">
                                    Keep this image in view while checking the table below. Open{" "}
                                    <span className="font-semibold text-stone-800">Full comparison by field</span> if you
                                    need row-by-row validator notes.
                                  </p>
                                </section>
                              ) : null}
                            </div>
                          );
                        })()}

                        <div className="space-y-2">
                          <details className="rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm sm:px-4">
                            <summary className="cursor-pointer text-sm font-medium text-stone-900">
                              Prototype scope (not a TTB checklist)
                            </summary>
                            <div className="mt-3 space-y-3 text-xs leading-relaxed text-stone-700">
                              <p>
                                This app always runs <strong className="text-stone-900">seven comparisons</strong>{" "}
                                (one row per field in the <strong className="text-stone-900">Field outcomes</strong>{" "}
                                table above). It does <strong className="text-stone-900">not</strong> read COLA, parse
                                TTB regulations, or tell you what must appear on a real label — it only compares{" "}
                                <strong className="text-stone-900">extracted label text</strong> to{" "}
                                <strong className="text-stone-900">what you put in the application JSON</strong> using
                                the coded rules in{" "}
                                <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px]">
                                  lib/validator.ts
                                </code>
                                . For the full evaluator trace (PRD vs code vs “real” law), see the repo doc{" "}
                                <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px]">
                                  docs/REQUIREMENTS_SOURCE_OF_TRUTH.md
                                </code>
                                .
                              </p>
                              <div>
                                <p className="font-semibold text-stone-900">PRD P0 — core lines in this build</p>
                                <ul className="mt-1 list-inside list-disc text-stone-700">
                                  <li>Brand name, class / type, alcohol content, net contents, government warning</li>
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-stone-900">PRD P1 — also compared here</p>
                                <ul className="mt-1 list-inside list-disc text-stone-700">
                                  <li>Name & address (strict COLA-style address rules are still deferred in code)</li>
                                  <li>
                                    Country of origin when <strong className="text-stone-900">Import</strong> is
                                    checked; otherwise that row is{" "}
                                    <strong className="text-stone-900">not applicable</strong> (skipped check)
                                  </li>
                                </ul>
                              </div>
                              <p className="text-stone-600">
                                Application JSON keys are optional in the schema — missing or empty values can yield{" "}
                                <strong className="text-stone-800">manual review</strong> or{" "}
                                <strong className="text-stone-800">not applicable</strong> per field logic, not a
                                generic “required if present” rule.
                              </p>
                            </div>
                          </details>

                          <details className="rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm sm:px-4">
                            <summary className="cursor-pointer text-sm font-medium text-stone-900">
                              Coded match thresholds (<code className="font-mono text-xs">lib/validator.ts</code>)
                            </summary>
                            <div className="mt-3">
                              <p className="text-xs leading-relaxed text-stone-600">
                                Numbers below are the <strong className="text-stone-800">current constants</strong> in
                                the validator. Tuning them changes pass/fail boundaries; keep tests green when you
                                edit.
                              </p>
                              <dl className="mt-3 space-y-2.5 text-xs text-stone-800">
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Extraction confidence gate</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    If the model reports confidence below{" "}
                                    <strong className="font-mono text-stone-900">{CONFIDENCE_MANUAL_REVIEW}</strong>{" "}
                                    (0–1 scale), the row is <strong className="text-stone-800">manual review</strong> —
                                    no automatic pass or fail.
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Government warning</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    <strong className="text-stone-800">Exact</strong>, case-sensitive string equality
                                    between extracted label text and the warning string in your application JSON (see
                                    canonical text in <code className="font-mono text-[10px]">lib/canonical-warning.ts</code>).
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Brand (fuzzy)</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    Normalized similarity (alphanumeric collapse + Levenshtein) must be ≥{" "}
                                    <strong className="font-mono text-stone-900">{BRAND_SIMILARITY}</strong> for pass.
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Class / type (fuzzy)</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    Same style of ratio; pass if ≥{" "}
                                    <strong className="font-mono text-stone-900">{CLASS_SIMILARITY}</strong>.
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Name & address (fuzzy)</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    Pass if similarity ≥{" "}
                                    <strong className="font-mono text-stone-900">{NAME_SIMILARITY}</strong> (when both
                                    sides have text and confidence is above the gate).
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Country of origin (imports, fuzzy)</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    When import is checked, pass if similarity ≥{" "}
                                    <strong className="font-mono text-stone-900">{ORIGIN_SIMILARITY}</strong>.
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Alcohol content (parsed ABV)</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    Parsed values must agree within{" "}
                                    <strong className="font-mono text-stone-900">±{ABV_TOLERANCE}</strong> percentage
                                    points ABV (after proof/% normalization in code).
                                  </dd>
                                </div>
                                <div className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2">
                                  <dt className="font-semibold text-stone-900">Net contents (parsed volume)</dt>
                                  <dd className="mt-0.5 text-stone-700">
                                    Pass if parsed ml differs by at most max of{" "}
                                    <strong className="font-mono text-stone-900">{VOLUME_TOLERANCE_ML}</strong> ml and{" "}
                                    <strong className="font-mono text-stone-900">
                                      {(VOLUME_TOLERANCE_RATIO * 100).toFixed(0)}%
                                    </strong>{" "}
                                    of the larger parsed volume.
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </details>
                        </div>

                        <details className="rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-2 sm:px-4">
                          <summary className="cursor-pointer text-sm font-medium text-stone-800">
                            Full label image
                            {file ? (
                              <span className="ml-1 font-normal text-stone-500">({file.name})</span>
                            ) : null}
                          </summary>
                          <div className="mt-3">
                            {previewUrl ? (
                              <LabelImageMagnifier
                                src={previewUrl}
                                alt="Label used for this verification"
                                frameClassName="flex max-h-[min(55vh,420px)] justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                                imgClassName="max-h-[min(55vh,420px)] w-auto max-w-full object-contain p-2"
                              />
                            ) : (
                              <p className="text-sm text-stone-500">
                                No image preview (select a file and run verify again).
                              </p>
                            )}
                          </div>
                        </details>

                        <details className="rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-2 sm:px-4">
                          <summary className="cursor-pointer text-sm font-medium text-stone-800">
                            Full comparison by field
                          </summary>
                          <div className="mt-4 space-y-5">
                            <p className="text-xs leading-relaxed text-stone-700">
                              Each block is <strong className="font-semibold text-stone-900">one field</strong>{" "}
                              (name at the top). Three columns: values read from the label, values from your
                              application JSON, and{" "}
                              <strong className="font-semibold text-stone-900">
                                the automated check this prototype runs
                              </strong>{" "}
                              for that field — plain-language description of the code in{" "}
                              <code className="rounded bg-stone-200/80 px-1 py-0.5 font-mono text-[10px] text-stone-800">
                                lib/validator.ts
                              </code>
                              , not official TTB policy.
                            </p>
                            <div
                              className="flex flex-wrap gap-x-3 gap-y-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[11px] text-stone-700"
                              aria-label="Column legend"
                            >
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-sky-500" aria-hidden />
                                From label (extracted)
                              </span>
                              <span className="text-stone-300" aria-hidden>
                                |
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-violet-600" aria-hidden />
                                From application (submitted)
                              </span>
                              <span className="text-stone-300" aria-hidden>
                                |
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-ttb-600" aria-hidden />
                                How we check (in code)
                              </span>
                            </div>
                            <ul className="space-y-8">
                              {successPayload.validation.fields.map((row) => {
                                const rawEx = successPayload.extraction.fields[row.fieldId];
                                const ex = parseExtractionField(rawEx);
                                const confPct = Math.round(ex.confidence * 100);
                                const confLabel =
                                  ex.confidence > 0 ? `Model confidence ${confPct}%` : null;

                                return (
                                  <li
                                    key={row.fieldId}
                                    className="rounded-xl border border-stone-300 bg-white p-4 shadow-md ring-1 ring-stone-900/5 sm:p-5"
                                  >
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                                      <span className="text-base font-bold tracking-tight text-stone-900">
                                        {FIELD_LABELS[row.fieldId]}
                                      </span>
                                      <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses(row.status)}`}
                                      >
                                        {formatStatusLabel(row.status)}
                                      </span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                                      <FieldComparisonPanel
                                        role="extracted"
                                        title="From label (extracted)"
                                        titleShort="Label"
                                      >
                                        <MonospaceValueBox
                                          text={row.extractedValue}
                                          sub={
                                            confLabel
                                              ? `${confLabel}${ex.reason ? ` · ${ex.reason}` : ""}`
                                              : ex.reason ?? undefined
                                          }
                                        />
                                      </FieldComparisonPanel>
                                      <FieldComparisonPanel
                                        role="application"
                                        title="From application (submitted)"
                                        titleShort="Application"
                                      >
                                        <MonospaceValueBox text={row.applicationValue} />
                                      </FieldComparisonPanel>
                                      <FieldComparisonPanel
                                        role="requirement"
                                        title="How this field is checked"
                                        titleShort="Check rule"
                                        footerNote="Coded rule for this demo build."
                                      >
                                        <p className="rounded-md border border-ttb-200/80 bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-stone-800 sm:px-3">
                                          {FIELD_REQUIREMENTS[row.fieldId]}
                                        </p>
                                      </FieldComparisonPanel>
                                    </div>
                                    {!resultsDigest.uniqueMessage ? (
                                      <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-relaxed text-stone-800">
                                        <span className="font-medium text-stone-500">Outcome for this field: </span>
                                        {row.message}
                                      </p>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </details>

                        <details className="rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-2 sm:px-4">
                          <summary className="cursor-pointer text-sm font-medium text-stone-800">
                            Run metadata
                          </summary>
                          <dl className="mt-3 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                Request ID
                              </dt>
                              <dd className="font-mono text-xs text-stone-800 break-all">
                                {successPayload.requestId}
                              </dd>
                            </div>
                            {httpStatus !== null ? (
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                  HTTP status
                                </dt>
                                <dd className="font-mono text-xs text-stone-800">HTTP {httpStatus}</dd>
                              </div>
                            ) : null}
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                Extraction
                              </dt>
                              <dd className="text-stone-800">
                                <span className="font-mono text-xs">
                                  {successPayload.extraction.provider}
                                </span>
                                <span className="text-stone-500">
                                  {" "}
                                  · {successPayload.extraction.durationMs} ms
                                </span>
                                {successPayload.extraction.provider === "unavailable" ? (
                                  <span className="mt-1 block text-xs leading-snug text-stone-600">
                                    Primary vision did not return usable results in time. Extracted values are
                                    placeholders—treat every field as needing human review.
                                  </span>
                                ) : successPayload.extraction.provider === "openai" ? (
                                  <span className="mt-1 block text-xs leading-snug text-stone-600">
                                    Vision model completed for this run.
                                  </span>
                                ) : null}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                Pipeline timing
                              </dt>
                              <dd className="text-stone-800">
                                <span className="font-mono text-xs">
                                  total {successPayload.timings.totalMs} ms
                                </span>
                                <span className="mt-1 block text-xs leading-snug text-stone-600">
                                  image gate {successPayload.timings.imageQualityMs} ms · OCR{" "}
                                  {successPayload.timings.ocrMs} ms · LLM {successPayload.timings.llmMs} ms · validation{" "}
                                  {successPayload.timings.validationMs} ms
                                </span>
                                <span className="mt-1 block text-xs leading-snug text-stone-600">
                                  extraction cache {successPayload.timings.cacheHit ? "hit" : "miss"}
                                </span>
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                                Image quality
                              </dt>
                              <dd className="text-stone-800">
                                {successPayload.imageQuality.ok ? (
                                  <>
                                    <span className="text-emerald-800">Passed</span>
                                    <span className="mt-1 block text-xs leading-snug text-stone-600">
                                      Image is clear enough for the reader to run. If results look wrong, try a
                                      straighter photo with less glare.
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-red-800">
                                      {successPayload.imageQuality.reason ?? "Not ok"}
                                    </span>
                                    <span className="mt-1 block text-xs leading-snug text-stone-600">
                                      Upload a new photo: brighter light, hold steady, fill the frame with the label,
                                      and avoid heavy blur or tiny text.
                                    </span>
                                  </>
                                )}
                              </dd>
                            </div>
                          </dl>
                        </details>
                      </>
                    ) : (
                      <div className="rounded-xl border border-ttb-200 bg-ttb-50 px-4 py-3 text-sm text-ttb-950">
                        Success response could not be parsed for the comparison table. Use raw JSON below if
                        needed.
                      </div>
                    )}

                    <details className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-stone-800">
                        Raw API JSON
                      </summary>
                      <pre className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-stone-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-stone-800">
                        {rawResponseJson ?? "—"}
                      </pre>
                    </details>
                  </section>
                ) : null}
              </div>
            )}
          </div>

          {workflowPhase !== "results" || successPayload ? (
            <div
              className={`shrink-0 border-t border-stone-200 bg-stone-50 px-3 sm:px-4 ${
                workflowPhase === "results" ? "py-2" : "py-3"
              }`}
            >
              <div
                className={`mx-auto w-full ${
                  workflowPhase === "results"
                    ? "flex flex-col"
                    : "flex max-w-lg flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3"
                }`}
              >
                {workflowPhase === "edit" ? (
                  <>
                    <button
                      type="submit"
                      disabled={uploadMode === "batch" ? !canRunBatch : !canSubmit}
                      title={
                        uploadMode === "batch"
                          ? !canRunBatch
                            ? batchActionDisabledReason ?? "Complete required inputs to continue."
                            : undefined
                          : !canSubmit
                            ? primaryActionDisabledReason ?? "Complete required inputs to continue."
                            : undefined
                      }
                      className="w-full cursor-pointer rounded-lg bg-ttb-600 px-8 py-2.5 text-base font-semibold text-white shadow-md transition hover:bg-ttb-700 disabled:cursor-not-allowed disabled:bg-ttb-300 disabled:text-white disabled:shadow-none disabled:hover:bg-ttb-300 sm:max-w-md"
                    >
                      {uploadMode === "batch"
                        ? batchLoading
                          ? "Running batch..."
                          : "Run batch verification"
                        : preparingFile
                          ? "Preparing image…"
                          : loading
                            ? "Verifying…"
                            : "Run verification"}
                    </button>
                    {(uploadMode === "batch"
                      ? !canRunBatch && batchActionDisabledReason
                      : !canSubmit && primaryActionDisabledReason) ? (
                      <p className="text-center text-[11px] text-stone-500 sm:max-w-md">
                        {uploadMode === "batch" ? batchActionDisabledReason : primaryActionDisabledReason}
                      </p>
                    ) : null}
                  </>
                ) : workflowPhase === "verify" && !loading ? (
                  hasCompletedRun ? (
                    <button
                      type="button"
                      onClick={() => setWorkflowPhase("results")}
                      className="w-full cursor-pointer rounded-lg bg-ttb-600 px-8 py-2.5 text-base font-semibold text-white shadow-md transition hover:bg-ttb-700 sm:max-w-md"
                    >
                      View results
                    </button>
                  ) : (
                    <p className="w-full py-2 text-center text-sm text-stone-600 sm:max-w-md">
                      Use <strong className="text-stone-800">Edit</strong> to run a verification first.
                    </p>
                  )
                ) : workflowPhase === "verify" && loading ? (
                  <p className="w-full py-2 text-center text-sm font-medium text-stone-600 sm:max-w-md">
                    Verification in progress…
                  </p>
                ) : successPayload ? (
                  <div
                    className="flex w-full flex-col items-center justify-center gap-2"
                    role="group"
                    aria-label="Review disposition"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewDisposition("approved")}
                        aria-pressed={reviewDisposition === "approved"}
                        className={`min-w-[5.5rem] cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                          reviewDisposition === "approved"
                            ? "bg-emerald-600 text-white ring-1 ring-emerald-700 hover:bg-emerald-700"
                            : "border border-emerald-600 bg-white text-emerald-900 hover:bg-emerald-50"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewDisposition("rejected")}
                        aria-pressed={reviewDisposition === "rejected"}
                        className={`min-w-[5.5rem] cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                          reviewDisposition === "rejected"
                            ? "bg-red-600 text-white ring-1 ring-red-800 hover:bg-red-700"
                            : "border border-red-600 bg-white text-red-900 hover:bg-red-50"
                        }`}
                      >
                        Reject
                      </button>
                      {reviewDisposition ? (
                        <button
                          type="button"
                          onClick={() => setReviewDisposition(null)}
                          className="cursor-pointer text-xs font-medium text-stone-600 underline decoration-stone-400 underline-offset-2 hover:text-stone-900"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    {reviewDisposition ? (
                      <p
                        className="text-center text-[11px] text-stone-500"
                        role="status"
                        aria-live="polite"
                      >
                        {reviewDisposition === "approved" ? "Approved" : "Rejected"} — not saved.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </form>

    </main>
  );
}
