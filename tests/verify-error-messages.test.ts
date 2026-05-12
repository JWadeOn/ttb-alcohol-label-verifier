import { describe, expect, it } from "vitest";
import { verifyErrorUserHeadline } from "@/lib/verify-error-messages";

describe("verifyErrorUserHeadline", () => {
  it("maps IMAGE_QUALITY_REJECTED to clarity guidance", () => {
    const h = verifyErrorUserHeadline(
      422,
      {
        requestId: "00000000-0000-4000-8000-000000000001",
        code: "IMAGE_QUALITY_REJECTED",
        message: "Image appears too blurry…",
      },
      "HTTP 422",
    );
    expect(h).toContain("clarity");
  });

  it("falls back to HTTP label when unknown code", () => {
    expect(
      verifyErrorUserHeadline(418, { requestId: "00000000-0000-4000-8000-000000000002", code: "TEAPOT", message: "no" }, "HTTP 418"),
    ).toBe("HTTP 418");
  });
});
