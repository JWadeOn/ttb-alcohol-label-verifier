# Fixtures

- **`manifest.json`** — list of label images and flags (e.g. which entries default into `npm run eval:primary-latency`).
- **`default-application.json`** — application JSON string body used by the eval script (matches the UI default shape; strict schema).
- **`labels/`** — PNGs. `liquor_label_happy_path.png` is the synthetic reference label. `seed-texture-*.png` files are **deterministic noise** from `npm run fixtures:generate` (pipeline / image-gate smoke, not OCR-quality text).

Regenerate noise fixtures after changing the generator:

```bash
npm run fixtures:generate
```
