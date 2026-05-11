import { describe, expect, it } from "vitest";
import { VERIFY_FORM_FIELDS } from "@/lib/schemas";
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

  it("returns stub success for valid multipart payload", async () => {
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
    const res = await handleVerifyPost(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      extraction?: { provider?: string };
      validation?: { fields?: unknown[] };
    };

    expect(json.extraction?.provider).toBe("stub");
    expect(json.validation?.fields).toHaveLength(7);
  });
});
