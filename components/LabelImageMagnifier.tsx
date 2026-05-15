"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { objectFitContainRect, type FitRect } from "@/lib/object-fit-contain-rect";

/** Diameter of the magnifier lens (popover). Larger = easier to read fine print. */
const LENS_PX = 220;
const ZOOM_MIN = 2;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

function readImageContentBox(el: HTMLImageElement): {
  innerLeft: number;
  innerTop: number;
  innerWidth: number;
  innerHeight: number;
} {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const bl = parseFloat(cs.borderLeftWidth) || 0;
  const bt = parseFloat(cs.borderTopWidth) || 0;
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pt = parseFloat(cs.paddingTop) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  return {
    innerLeft: rect.left + bl + pl,
    innerTop: rect.top + bt + pt,
    innerWidth: el.clientWidth - pl - pr,
    innerHeight: el.clientHeight - pt - pb,
  };
}

type Props = {
  src: string;
  alt: string;
  /** Classes on the `<img>` (layout, object-fit, max height, etc.). */
  imgClassName?: string;
  /** Wrapper around the image (border, background, overflow). */
  frameClassName?: string;
};

export function LabelImageMagnifier({ src, alt, imgClassName, frameClassName }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(2.5);
  const [magOn, setMagOn] = useState(true);
  const [fit, setFit] = useState<FitRect | null>(null);
  const [showLens, setShowLens] = useState(false);
  const [lensStyle, setLensStyle] = useState<CSSProperties>({});
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const recomputeFit = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      setFit(null);
      return;
    }
    const { innerWidth, innerHeight } = readImageContentBox(img);
    setFit(objectFitContainRect(innerWidth, innerHeight, img.naturalWidth, img.naturalHeight));
  }, []);

  useEffect(() => {
    recomputeFit();
    const ro = new ResizeObserver(() => recomputeFit());
    const el = frameRef.current;
    if (el) ro.observe(el);
    const img = imgRef.current;
    if (img) ro.observe(img);
    return () => ro.disconnect();
  }, [recomputeFit, src]);

  const updatePointer = useCallback(
    (clientX: number, clientY: number) => {
      const img = imgRef.current;
      if (!img || !magOn || !fit || fit.width <= 0 || fit.height <= 0) {
        setShowLens(false);
        return;
      }
      const { innerLeft, innerTop } = readImageContentBox(img);
      const rx = clientX - innerLeft;
      const ry = clientY - innerTop;
      if (rx < fit.left || rx > fit.left + fit.width || ry < fit.top || ry > fit.top + fit.height) {
        setShowLens(false);
        return;
      }
      const ux = rx - fit.left;
      const uy = ry - fit.top;
      setShowLens(true);
      setImgPos({ x: ux, y: uy });

      const pad = 12;
      let left = clientX + pad;
      let top = clientY + pad;
      const maxL = window.innerWidth - LENS_PX - 8;
      const maxT = window.innerHeight - LENS_PX - 8;
      if (left > maxL) left = clientX - LENS_PX - pad;
      if (top > maxT) top = clientY - LENS_PX - pad;
      left = Math.max(8, Math.min(left, maxL));
      top = Math.max(8, Math.min(top, maxT));

      setLensStyle({
        position: "fixed",
        left,
        top,
        width: LENS_PX,
        height: LENS_PX,
        zIndex: 80,
        pointerEvents: "none",
        borderRadius: "50%",
        border: "2px solid rgb(41 37 36 / 0.35)",
        boxShadow: "0 12px 28px rgb(0 0 0 / 0.18)",
        overflow: "hidden",
        backgroundColor: "rgb(250 250 249)",
      });
    },
    [fit, magOn],
  );

  const hideLens = useCallback(() => setShowLens(false), []);

  useEffect(() => {
    if (!magOn) return;
    const onMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [magOn, updatePointer]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-stone-300 text-ttb-700 focus:ring-ttb-600"
            checked={magOn}
            onChange={(e) => {
              setMagOn(e.target.checked);
              setShowLens(false);
            }}
          />
          <span className="font-medium text-stone-800">Magnifier</span>
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-stone-500">Zoom</span>
          <button
            type="button"
            className="rounded border border-stone-200 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-40"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
            aria-label="Decrease magnifier zoom"
          >
            −
          </button>
          <span className="min-w-[2.75rem] text-center font-mono text-xs text-stone-800">{zoom.toFixed(1)}×</span>
          <button
            type="button"
            className="rounded border border-stone-200 bg-white px-2 py-0.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-40"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
            aria-label="Increase magnifier zoom"
          >
            +
          </button>
        </div>
      </div>
      {magOn ? (
        <p className="text-[11px] leading-relaxed text-stone-500">
          Move the pointer over the label to inspect detail. The circle follows beside the cursor.
        </p>
      ) : null}

      <div ref={frameRef} className={frameClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={imgClassName}
          onLoad={recomputeFit}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) updatePointer(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) updatePointer(t.clientX, t.clientY);
          }}
          onTouchEnd={hideLens}
        />
      </div>

      {showLens && magOn && fit && fit.width > 0 ? (
        <div style={lensStyle} role="img" aria-label="Magnified label detail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute max-w-none select-none"
            draggable={false}
            style={{
              width: fit.width * zoom,
              height: fit.height * zoom,
              left: -imgPos.x * zoom + LENS_PX / 2,
              top: -imgPos.y * zoom + LENS_PX / 2,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
