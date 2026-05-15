# Real-photo curated pack (v1)

Fifteen on-bottle captures under `fixtures/labels/on-bottle/` exercise realistic adversity: angle, glare, blur, low light, partial crop, and dark-label contrast. Expectations live in [`fixture-correctness-expectations-real-photo-pack-v1.json`](./fixture-correctness-expectations-real-photo-pack-v1.json).

## Fixture rationale

| Fixture ID | Adversity | Expected routing emphasis |
|------------|-----------|---------------------------|
| `st_petersburg_whiskey_baseline` | Front-on anchor | Mix of pass and manual_review on fuzzy fields |
| `st_petersburg_whiskey_angle_28` | ~28° perspective | More fail/manual_review on brand/class/ABV |
| `st_petersburg_whiskey_glare_brand` | Glare on brand zone | Brand often manual_review or fail |
| `st_petersburg_whiskey_glare_warning_harsh` | Harsh glare on warning | Warning often manual_review |
| `st_petersburg_whiskey_blur_moderate` | Moderate motion blur | Extraction uncertainty → manual_review |
| `st_petersburg_whiskey_blur_strong` | Strong blur | Same, higher fail risk |
| `st_petersburg_whiskey_low_light_grain` | Low light + noise | manual_review on multiple fields |
| `st_petersburg_whiskey_distance_crop_warning` | Distance + partial warning | Warning manual_review |
| `st_petersburg_whiskey_crop_missing_warning` | Warning off-frame | Warning fail or manual_review |
| `st_petersburg_vodka_baseline` | Frosted-glass vodka anchor | Similar to whiskey baseline |
| `st_petersburg_vodka_angle_45` | 45° vodka perspective | Angle stress on fuzzy fields |
| `st_petersburg_vodka_glare_brand` | Glare on vodka brand | Brand stress |
| `st_petersburg_whiskey_label_dark_baseline` | Dark label contrast | OCR/vision stress |
| `smirnoff_vodka_happy_path` | Retail SKU photo | Closer to pass on several fields |
| `difficult-synthetic-label-photo` | Dense warning + curvature | Warning and net contents stress |

## Run command

```bash
EVAL_FIXTURE_SET=real_photo_curated \
EVAL_EXPECTATIONS=docs/evals/fixture-correctness-expectations-real-photo-pack-v1.json \
OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 \
npm run eval:fixture-verify
```

Production snapshot for this subset: reuse [`fixture-correctness-st-petersburg-production-2026-05-13.json`](./fixture-correctness-st-petersburg-production-2026-05-13.json) (18 St. Petersburg fixtures; overlaps 14/15 curated ids).
