# Module: `lib/image-quality.ts`

## Responsibility

Pre-flight **image quality gate** on uploaded bytes before extraction:

- Decode / normalize with **sharp** (rotate EXIF, greyscale pipeline for metrics).
- Enforce **minimum and maximum** dimensions (`MIN_DIMENSION`, `MAX_DIMENSION` in source; currently max side **1600 px**).
- Estimate blur / lack of texture via **Laplacian variance** on a downscaled greyscale image (`BLUR_VARIANCE_THRESHOLD` in source); below threshold ⇒ reject.
- On success, return **`processedBuffer`** for downstream extraction (single normalized image path).

## Decisions

- Implemented in-process with `sharp` (same dependency as test PNG generation) for predictable server behavior.
- Rejection reasons are human-readable strings for API clients and logs.
- Successful images are normalized to JPEG before extraction (currently quality **84**) to reduce payload and tail latency.

## Dependencies

- `sharp` (also listed in `next.config.ts` as `serverExternalPackages`).

## Related tests

- `tests/image-quality.test.ts`
- `tests/helpers/test-image.ts` (`createTestLabelPng`)

## Maintenance

When thresholds change, update this doc and note any eval impact (false reject vs false accept).
