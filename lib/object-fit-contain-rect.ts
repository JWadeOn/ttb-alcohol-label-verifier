/** Pixel box relative to a container’s top-left (e.g. content box of an `<img>`). */
export type FitRect = { left: number; top: number; width: number; height: number };

/**
 * Where `object-fit: contain` draws an image inside a fixed container.
 * All values are in CSS pixels.
 */
export function objectFitContainRect(
  containerWidth: number,
  containerHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number,
): FitRect {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    intrinsicWidth <= 0 ||
    intrinsicHeight <= 0
  ) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const scale = Math.min(containerWidth / intrinsicWidth, containerHeight / intrinsicHeight);
  const width = intrinsicWidth * scale;
  const height = intrinsicHeight * scale;
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}
