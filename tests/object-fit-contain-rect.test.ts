import { describe, expect, it } from "vitest";
import { objectFitContainRect } from "@/lib/object-fit-contain-rect";

describe("objectFitContainRect", () => {
  it("centers a wide image in a tall container", () => {
    const r = objectFitContainRect(100, 200, 400, 100);
    expect(r.width).toBe(100);
    expect(r.height).toBe(25);
    expect(r.left).toBe(0);
    expect(r.top).toBeCloseTo(87.5);
  });

  it("centers a tall image in a wide container", () => {
    const r = objectFitContainRect(200, 100, 100, 400);
    expect(r.width).toBe(25);
    expect(r.height).toBe(100);
    expect(r.left).toBeCloseTo(87.5);
    expect(r.top).toBe(0);
  });

  it("returns zeros for invalid dimensions", () => {
    expect(objectFitContainRect(0, 100, 50, 50)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    expect(objectFitContainRect(100, 100, 0, 50)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});
