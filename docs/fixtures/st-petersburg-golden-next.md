# St. Petersburg golden set — next captures

Use this list when adding **real-photo** fixtures under `fixtures/labels/`. **Track A** extends the existing cream/light-label matrix (camera and lighting stress). **Track B** is a separate golden line for **alternate label stock colors** (contrast and segmentation)—see [Golden track B](#golden-track-b-alternate-label-stock-contrast). After each capture, copy the PNG to the suggested filename, add the row in `fixtures/manifest.json`, mirror `docs/evals/fixture-correctness-expectations.json`, and run `npm test`.

## Image-quality gate (blur)

`lib/image-quality.ts` rejects inputs when Laplacian variance is **below ~12** (heavy blur / flat signal). For any **blur** shot, keep enough edge energy that the label is still plausibly readable; if a stress frame must be darker or softer, we can set `requireImageQualityOk: false` for that fixture id only after you confirm the pipeline accepts it.

## Current inventory (reference)

| Stress mode | Manifest id | File |
|-------------|-------------|------|
| Whiskey anchor | `st_petersburg_whiskey_baseline` | `st_petersburg_whiskey_baseline.png` |
| Whiskey clean variants | `…_baseline_02` … `_05` | `st_petersburg_whiskey_baseline_0*.png` |
| Whiskey glare (brand) | `st_petersburg_whiskey_glare_brand` | `…_glare_brand.png` |
| Whiskey glare (warning, milder) | `st_petersburg_whiskey_glare_warning_02` | `…_glare_warning_02.png` |
| Whiskey glare (warning, harsh) | `st_petersburg_whiskey_glare_warning_harsh` | `…_glare_warning_harsh.png` |
| Whiskey angle (~28° yaw) | `st_petersburg_whiskey_angle_28` | `st_petersburg_whiskey_angle_28.png` |
| Vodka baseline (front-on) | `st_petersburg_vodka_baseline` | `st_petersburg_vodka_baseline.png` |
| Vodka angle | `st_petersburg_vodka_angle_45` | `st_petersburg_vodka_angle_45.png` |
| Whiskey blur | `st_petersburg_whiskey_blur_moderate` | `…_blur_moderate.png` |
| Whiskey distance / small type | `st_petersburg_whiskey_distance_crop_warning` | `…_distance_crop_warning.png` |
| Whiskey crop (warning off-frame) | `st_petersburg_whiskey_crop_missing_warning` | `st_petersburg_whiskey_crop_missing_warning.png` |

*Track B (alternate label stock) ids are defined in [Golden track B](#golden-track-b-alternate-label-stock-contrast); they are **not** in the manifest until each PNG exists.*

---

## Golden track B: alternate label stock (contrast)

**Goal:** Same fictional **St. Petersburg Spirits** hierarchy (brand, class, ABV, net contents, government warning), but **different label substrate and ink** than the cream/light primary line. This isolates **contrast, glare on dark stock, and segmentation** from the Track A camera matrix.

**Rules**

- Treat each stock color as a **deliberate SKU variant**, not a random swap on existing cream-label shots.
- Use ids that include **`label_<stock>`** so manifests and eval logs stay self-explanatory (`label_dark`, `label_kraft`, etc.).
- Expectations stay **tolerant** until you add application JSON (or overrides) that matches each variant’s extracted strings.
- Wire each PNG when the file exists (empty manifest slots break `tests/fixtures-manifest.test.ts`).

### B1 — Dark / charcoal label (whiskey), front-on

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_label_dark_baseline` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_label_dark_baseline.png` |
| **Intent** | Baseline for Track B: **matte black or charcoal** label face, **light** (white or warm silver) typography; full bottle, sharp focus, standard TTB-style warning block readable. |

**Prompt:** Professional product photo, straight-on: St. Petersburg Spirits **bourbon whiskey**, 750 mL, 43% alc./vol. (86 proof). **Label face is dark charcoal or matte black** with **high-contrast light type** (no illegible microtype). Same information architecture as the cream-label bottles: brand arched at top, class line, ABV and net contents, dense government warning at bottom. Cork or wood stopper; neutral or library bar background; **no** heavy label glare for this baseline frame.

### B2 — Dark label + controlled glare

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_label_dark_glare` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_label_dark_glare.png` |
| **Intent** | Specular streak or hotspot on **dark stock** (often harder than cream): brand or mid-label wash, warning may partially bloom. |

**Prompt:** Same **dark-label** St. Petersburg bourbon bottle and layout as B1. Add a **single strong specular highlight** across part of the label (glass curvature OK). Government warning may be partially washed but still partly visible. Avoid changing label color between B1 and B2—only lighting.

### B3 — Kraft / warm paper (whiskey), front-on

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_label_kraft_baseline` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_label_kraft_baseline.png` |
| **Intent** | **Warm brown kraft-style** stock with dark brown or black ink; stresses uneven fiber, lower effective contrast than bright white-on-black. |

**Prompt:** Straight-on hero: same St. Petersburg bourbon whiskey facts and layout, **uncoated kraft- or parchment-brown label** (visible paper texture), **dark ink** for all text. Sharp focus; soft background; government warning fully in frame and readable at capture resolution.

### B4 — Vodka on dark stock (optional)

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_vodka_label_dark_baseline` |
| **Suggested file** | `fixtures/labels/st_petersburg_vodka_label_dark_baseline.png` |
| **Intent** | Track B for **vodka** SKU: same idea as B1 but vodka class line and vodka-appropriate net contents/proof if you use them on the art. |

**Prompt:** Front-on St. Petersburg Spirits **vodka**, 750 mL; **dark label** with light type; legible government warning; matches brand lockup style of other St. Petersburg bottles but clearly **vodka** product copy.

### Eval bundle suggestion

After wiring, run `eval:fixture-verify` with `EVAL_FIXTURE_IDS` listing all Track B ids together to produce a small contrast-matrix artifact under `docs/evals/`.

---

## Golden track A: primary line (cream / light label)

The following priorities extend the **existing** cream/light St. Petersburg bottles with new camera and lighting stresses only (same label stock as current shipped PNGs).

---

### 1. Vodka baseline (front-on)

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_vodka_baseline` |
| **Suggested file** | `fixtures/labels/st_petersburg_vodka_baseline.png` |
| **Intent** | Pair with `st_petersburg_vodka_angle_45`: same bottle/line, **straight-on**, sharp label, no skew. |

**Prompt (photo / gen):** Professional product photo, straight-on eye level: St. Petersburg Spirits **vodka** bottle (750 mL line), same label family as the existing 45° vodka asset. Cream or white label, sharp typography, standard government warning legible. Soft blurred background; **no** strong perspective; **no** heavy glare. Centered, full bottle in frame.

**Status:** Shipped in repo (`fixtures/manifest.json`, `docs/evals/fixture-correctness-expectations.json`).

---

### 2. Whiskey moderate angle (~28° yaw)

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_angle_28` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_angle_28.png` |
| **Intent** | Fill the gap between **front-on baselines** and **vodka 45°** skew; stress planar perspective without unreadable distortion. |

**Prompt:** Same St. Petersburg **bourbon whiskey** label as baselines; bottle rotated **~28°** from camera (yaw), still one continuous label plane in view. Library or neutral bar background; **all** lines of the government warning still in frame and mostly readable. Avoid extreme foreshortening.

**Status:** Shipped in repo (`fixtures/manifest.json`, `docs/evals/fixture-correctness-expectations.json`).

---

### 3. Partial crop / missing lower label

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_crop_missing_warning` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_crop_missing_warning.png` |
| **Intent** | Forces **missing-field** behavior: brand + class + ABV may be present; **warning block cropped out** or only 1–2 lines visible. |

**Prompt:** Tighter crop on the same whiskey bottle: frame from **mid-label up** so **government warning is absent or clipped** at the bottom edge. Brand and “bourbon whiskey” and 43% / 750 mL still clearly in frame. Intentional composition, not accidental thumb cover.

**Status:** Shipped in repo (`fixtures/manifest.json`, `docs/evals/fixture-correctness-expectations.json`).

---

## Priority 2 — strong but optional

### 4. Whiskey heavier blur (still gate-safe)

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_blur_strong` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_blur_strong.png` |
| **Intent** | Step harder than `_blur_moderate`; verify Laplacian still passes or adjust expectations / `requireImageQualityOk`. |

**Prompt:** Same scene and bottle as moderate blur, but **one more stop** of defocus or motion blur on the **label plane only** if possible—bottle silhouette still recognizable. If preview fails the in-app “image too soft” path, back off until it passes.

---

### 5. Low / mixed exposure (readable noise)

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_whiskey_low_light_grain` |
| **Suggested file** | `fixtures/labels/st_petersburg_whiskey_low_light_grain.png` |
| **Intent** | Underexposed bar look + visible noise; label still decipherable with effort. |

**Prompt:** Same whiskey product; **1–2 EV under** normal exposure OR single practical lamp; visible **sensor/film grain** on label. No motion smear. Government warning still in frame; text not blown out.

---

### 6. Vodka glare on brand

| Field | Value |
|--------|--------|
| **Suggested id** | `st_petersburg_vodka_glare_brand` |
| **Suggested file** | `fixtures/labels/st_petersburg_vodka_glare_brand.png` |
| **Intent** | Mirror whiskey `glare_brand` on the **vodka** SKU for cross-product glare behavior. |

**Prompt:** Front-on or slight angle vodka bottle; **bright specular** on upper label washing **brand line** while mid-label and warning remain **more** legible than brand (inverse emphasis vs harsh warning shots).

---

## Wiring checklist (per new PNG)

1. Save as `fixtures/labels/<filename>.png`.
2. Append fixture object to `fixtures/manifest.json`.
3. Add matching block under `fixtures` in `docs/evals/fixture-correctness-expectations.json` (reuse tolerances from the closest existing St. Petersburg row; tighten later when a St Petersburg-shaped application JSON exists).
4. One-line mention in `fixtures/README.md` if the file is part of the default story.
5. `npm test` and `npm run lint`.

---

## Naming convention

- **Track A (primary cream/light line):** `st_petersburg_<product>_<stress>[_variant].png` where `product` is `whiskey` or `vodka`, and `stress` is short (`baseline`, `glare_brand`, `angle_28`, `blur_strong`, etc.).
- **Track B (alternate label stock):** `st_petersburg_<product>_label_<stock>_<stress>.png`, e.g. `st_petersburg_whiskey_label_dark_baseline.png`, `st_petersburg_whiskey_label_kraft_baseline.png`.
