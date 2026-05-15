import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApplicationJson,
  VerifyBatchResponseSchema,
  VERIFY_FORM_FIELDS,
  VerifyExtractOnlyResponseSchema,
  VerifySuccessResponseSchema,
} from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";
import {
  handleVerifyBatchPost,
  handleVerifyExtractOnlyPost,
  handleVerifyPost,
} from "@/lib/verify-handler";
import type { ExtractionResult } from "@/lib/extraction/types";
import { MAX_LABEL_UPLOAD_BYTES } from "@/lib/upload-limits";

function multipartRequest(image: Blob, applicationJson: string): Request {
  const fd = new FormData();
  fd.append(VERIFY_FORM_FIELDS.image, image, "fixture.png");
  fd.append(VERIFY_FORM_FIELDS.application, applicationJson);
  return new Request("http://test.local/api/verify", {
    method: "POST",
    body: fd,
  });
}

function multipartExtractOnlyRequest(image: Blob): Request {
  const fd = new FormData();
  fd.append(VERIFY_FORM_FIELDS.image, image, "fixture.png");
  return new Request("http://test.local/api/verify/extract-only", {
    method: "POST",
    body: fd,
  });
}

function multipartBatchRequest(images: Blob[], applicationJson: string): Request {
  const fd = new FormData();
  for (const image of images) {
    fd.append(VERIFY_FORM_FIELDS.images, image, "fixture.png");
  }
  fd.append(VERIFY_FORM_FIELDS.application, applicationJson);
  return new Request("http://test.local/api/verify/batch", {
    method: "POST",
    body: fd,
  });
}

function oversizedPngBlob(): Blob {
  return new Blob([new Uint8Array(MAX_LABEL_UPLOAD_BYTES + 1)], { type: "image/png" });
}

describe("handleVerifyPost", () => {
  beforeEach(() => {
    // Host `.env` may set VERIFY_DEV_STUB / OPENAI_DISABLED; stub so branches stay deterministic.
    vi.stubEnv("VERIFY_DEV_STUB", "");
    vi.stubEnv("OPENAI_DISABLED", "");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-stub");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-multipart requests", async () => {
    const req = new Request("http://test.local/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const res = await handleVerifyPost(req);
    expect(res.status).toBe(415);
  });

  it("returns 400 when application JSON is invalid", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const req = multipartRequest(new Blob([png], { type: "image/png" }), "{");
    const res = await handleVerifyPost(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("INVALID_APPLICATION_JSON");
  });

  it("returns 413 when image exceeds upload limit", async () => {
    const req = multipartRequest(oversizedPngBlob(), JSON.stringify({ brandName: "Example Distillery" }));
    const res = await handleVerifyPost(req);
    expect(res.status).toBe(413);
    const json = (await res.json()) as { code?: string; message?: string };
    expect(json.code).toBe("IMAGE_TOO_LARGE");
    expect(json.message).toContain("1.5 MB");
  });

  it("returns 503 when OPENAI_API_KEY is missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERIFY_DEV_STUB", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const application = JSON.stringify({
      brandName: "Example Distillery",
    });

    const req = multipartRequest(new Blob([png], { type: "image/png" }), application);
    const res = await handleVerifyPost(req);
    expect(res.status).toBe(503);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("OPENAI_NOT_CONFIGURED");
  });

  it("allows ocr_only mode without OPENAI_API_KEY", async () => {
    vi.stubEnv("VERIFY_EXTRACTION_MODE", "ocr_only");
    vi.stubEnv("OPENAI_API_KEY", "");
    const mockPipeline = vi.fn(
      async (params: {
        requestId: string;
        application: ApplicationJson;
      }) => VerifySuccessResponseSchema.parse(buildStubVerifyResponse(params.requestId, params.application)),
    );

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const application = JSON.stringify({ brandName: "Example Distillery" });

    const req = multipartRequest(new Blob([png], { type: "image/png" }), application);
    const res = await handleVerifyPost(req, { runVerifyPipeline: mockPipeline });
    expect(res.status).toBe(200);
    expect(mockPipeline).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when OPENAI_DISABLED without calling pipeline", async () => {
    vi.stubEnv("OPENAI_DISABLED", "true");
    const mockPipeline = vi.fn();

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const application = JSON.stringify({
      brandName: "Example Distillery",
    });

    const req = multipartRequest(new Blob([png], { type: "image/png" }), application);
    const res = await handleVerifyPost(req, { runVerifyPipeline: mockPipeline });
    expect(mockPipeline).not.toHaveBeenCalled();
    expect(res.status).toBe(503);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("OPENAI_DISABLED");
  });

  it("returns 200 stub when VERIFY_DEV_STUB without OpenAI and without calling pipeline", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERIFY_DEV_STUB", "true");
    const mockPipeline = vi.fn();

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const application = JSON.stringify({
      isImport: false,
      brandName: "Example Distillery",
      classType: "Straight Bourbon Whiskey",
    });

    const req = multipartRequest(new Blob([png], { type: "image/png" }), application);
    const res = await handleVerifyPost(req, { runVerifyPipeline: mockPipeline });

    expect(mockPipeline).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      extraction?: { provider?: string };
      validation?: { fields?: { fieldId: string }[] };
    };
    expect(json.extraction?.provider).toBe("stub");
    expect(json.validation?.fields?.some((f) => f.fieldId === "brandName")).toBe(true);
  });

  it("delegates to verify pipeline and returns typed success", async () => {
    const mockPipeline = vi.fn(
      async (params: {
        requestId: string;
        imageBytes: Buffer;
        application: ApplicationJson;
        openAiApiKey: string;
      }) =>
        VerifySuccessResponseSchema.parse(
          buildStubVerifyResponse(params.requestId, params.application),
        ),
    );

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const application = JSON.stringify({
      productClass: "distilled_spirits",
      isImport: false,
      brandName: "Example Distillery",
      classType: "Straight Bourbon Whiskey",
      alcoholContent: "45% ALC/VOL",
      netContents: "750 mL",
      governmentWarning: "(government warning text from application)",
      nameAddress: "",
      countryOfOrigin: "",
    });

    const req = multipartRequest(new Blob([png], { type: "image/png" }), application);
    const res = await handleVerifyPost(req, {
      runVerifyPipeline: mockPipeline,
    });

    expect(mockPipeline).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      extraction?: { provider?: string };
      validation?: { fields?: unknown[] };
    };

    expect(json.extraction?.provider).toBe("stub");
    expect(json.validation?.fields).toHaveLength(7);
  });

  it("handles extract-only prefetch and returns cache key", async () => {
    const mockExtraction = vi.fn(
      async (): Promise<{
        imageQuality: { ok: true };
        extraction: ExtractionResult;
        timings: { imageQualityMs: number; ocrMs: number; llmMs: number; extractionMs: number };
      }> => ({
        imageQuality: { ok: true },
        extraction: {
          provider: "openai",
          durationMs: 10,
          fields: {
            brandName: { value: null, confidence: 0, reason: undefined },
            classType: { value: null, confidence: 0, reason: undefined },
            alcoholContent: { value: null, confidence: 0, reason: undefined },
            netContents: { value: null, confidence: 0, reason: undefined },
            governmentWarning: { value: null, confidence: 0, reason: undefined },
            nameAddress: { value: null, confidence: 0, reason: undefined },
            countryOfOrigin: { value: null, confidence: 0, reason: undefined },
          },
        },
        timings: {
          imageQualityMs: 1,
          ocrMs: 0,
          llmMs: 10,
          extractionMs: 10,
        },
      }),
    );
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const req = multipartExtractOnlyRequest(new Blob([png], { type: "image/png" }));
    const res = await handleVerifyExtractOnlyPost(req, {
      runExtractionStage: mockExtraction,
    });
    expect(mockExtraction).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = VerifyExtractOnlyResponseSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cacheKey.length).toBeGreaterThan(8);
    }
  });

  it("rejects extract-only uploads above the limit", async () => {
    const res = await handleVerifyExtractOnlyPost(multipartExtractOnlyRequest(oversizedPngBlob()));
    expect(res.status).toBe(413);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("IMAGE_TOO_LARGE");
  });

  it("runs batch verify and returns per-item outcomes", async () => {
    const mockPipeline = vi.fn(
      async (params: { requestId: string; application: ApplicationJson }) =>
        VerifySuccessResponseSchema.parse(buildStubVerifyResponse(params.requestId, params.application)),
    );
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const application = JSON.stringify({ brandName: "Example Distillery" });
    const req = multipartBatchRequest(
      [new Blob([png], { type: "image/png" }), new Blob([png], { type: "image/png" })],
      application,
    );
    const res = await handleVerifyBatchPost(req, {
      runVerifyPipeline: mockPipeline,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = VerifyBatchResponseSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.summary.total).toBe(2);
      expect(parsed.data.summary.success).toBe(2);
      expect(parsed.data.items).toHaveLength(2);
      for (const item of parsed.data.items) {
        expect(item.durationMs).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("rejects batches larger than default max images", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const images = Array.from({ length: 21 }, () => new Blob([png], { type: "image/png" }));
    const req = multipartBatchRequest(images, JSON.stringify({ brandName: "Example Distillery" }));
    const res = await handleVerifyBatchPost(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("BATCH_TOO_LARGE");
  });

  it("rejects batch uploads with oversized images", async () => {
    const req = multipartBatchRequest(
      [oversizedPngBlob()],
      JSON.stringify({ brandName: "Example Distillery" }),
    );
    const res = await handleVerifyBatchPost(req);
    expect(res.status).toBe(413);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("IMAGE_TOO_LARGE");
  });

  it("respects VERIFY_BATCH_MAX_IMAGES override", async () => {
    vi.stubEnv("VERIFY_BATCH_MAX_IMAGES", "3");
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const images = Array.from({ length: 4 }, () => new Blob([png], { type: "image/png" }));
    const req = multipartBatchRequest(images, JSON.stringify({ brandName: "Example Distillery" }));
    const res = await handleVerifyBatchPost(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code?: string; message?: string };
    expect(json.code).toBe("BATCH_TOO_LARGE");
    expect(json.message).toContain("3");
  });
});
