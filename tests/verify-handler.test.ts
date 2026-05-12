import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApplicationJson,
  VERIFY_FORM_FIELDS,
  VerifySuccessResponseSchema,
} from "@/lib/schemas";
import { buildStubVerifyResponse } from "@/lib/stub-response";
import { handleVerifyPost } from "@/lib/verify-handler";

function multipartRequest(image: Blob, applicationJson: string): Request {
  const fd = new FormData();
  fd.append(VERIFY_FORM_FIELDS.image, image, "fixture.png");
  fd.append(VERIFY_FORM_FIELDS.application, applicationJson);
  return new Request("http://test.local/api/verify", {
    method: "POST",
    body: fd,
  });
}

describe("handleVerifyPost", () => {
  beforeEach(() => {
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

  it("returns 503 when OPENAI_API_KEY is missing", async () => {
    vi.unstubAllEnvs();

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
});
