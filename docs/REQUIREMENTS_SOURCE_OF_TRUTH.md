# Requirements source of truth (evaluator guide)

**Purpose:** Answer, in one place, whether this prototype uses **real TTB / 27 CFR label requirements** as the source of truth, **where** checks run, and **what** to read to audit alignment.

**Short answer:** **No.** The **authoritative** behavior for this build is **product + engineering documents and code**, not the Code of Federal Regulations or COLA. The PRD names TTB-style *goals* (for example exact government warning matching); the **executable** rules live in **`lib/validator.ts`** (and the vision prompt in **`lib/extraction/openai-provider.ts`** for *reading* the label). Treat regulatory text as **background motivation**, not as mechanically enforced law in this repo.

---

## 1. What counts as “source of truth” here (in order)

| Layer | Location | Role |
|--------|----------|------|
| **Product scope & intent** | [`README.md`](../README.md), [`docs/CORE_REQUIREMENTS_SCORECARD.md`](./CORE_REQUIREMENTS_SCORECARD.md) | What the take-home is supposed to demonstrate; P0 vs P1 fields; non-goals (no full 27 CFR, no COLA). |
| **Per-field pass/fail / manual_review / not_applicable** | **`lib/validator.ts`** (`validateLabelFields`) | **Single implementation source** for deterministic comparison after extraction. Exported numeric thresholds (`CONFIDENCE_MANUAL_REVIEW`, `BRAND_SIMILARITY`, etc.) match this file. |
| **What appears on the label (primary path)** | **`lib/extraction/openai-provider.ts`** (system + user prompts, Zod shape) | Model instructions and structured fields — not the same as “legal requirements,” but they define what gets extracted for comparison. |
| **Government warning string used in fixtures/UI defaults** | **`lib/canonical-warning.ts`** | Canonical text for demos and default application JSON; validator compares **exact** (case-sensitive) to **application-supplied** warning text for that run. |
| **Human-readable rule blurbs in the UI** | **`app/page.tsx`** (`FIELD_REQUIREMENTS`) | **Explanatory copy only** — should describe the same logic as `validator.ts`; if they diverge, **trust the code** and fix the copy. |

There is **no** separate “regulations database” or TTB API in this repository.

---

## 2. Traceability: field → code → PRD (not CFR)

Use this when mapping “what the UI shows” to “what actually runs.”

| Field (UI / schema) | Where the **comparison** is implemented | PRD touchpoint (intent, not law) | Notes on “real requirements” |
|---------------------|------------------------------------------|----------------------------------|--------------------------------|
| Brand name | `lib/validator.ts` — fuzzy ratio vs threshold | P0 / F-6, F-7 | Inspired by agent need for punctuation/case tolerance; **not** a COLA field-validity rule. |
| Class / type | Same | P0 / F-6 | Same as above. |
| Alcohol content | Same — parsed ABV, tolerance | P0 / F-6 | Numeric tolerance is **coded**, not copied from a specific CFR table row. |
| Net contents | Same — parsed ml, tolerance | P0 / F-6 | Same. |
| Government warning | Same — **exact** string compare to application JSON | P0 / F-8 | PRD asks for strict warning matching **as a product behavior**; production would still use a versioned regulatory store (see PRD). |
| Name & address | Same — fuzzy when both sides present | P1 / F-17 | Explicitly defers strict COLA address rules in messages. |
| Country of origin | Same — `not_applicable` if not import; else fuzzy | P1 / F-18 | Conditional on `isImport` in application JSON. |

**Extraction** for each of the above (values read from the image) is assembled in **`lib/verify-pipeline.ts`** calling **`lib/extraction/*`** before `validateLabelFields` runs.

---

## 3. How an evaluator can verify “does this match what you claim?”

1. **Read** [`README.md`](../README.md) and [`docs/CORE_REQUIREMENTS_SCORECARD.md`](./CORE_REQUIREMENTS_SCORECARD.md) — confirm the prototype does not claim full regulatory coverage.
2. **Open** **`lib/validator.ts`** — this is the only place deterministic **match decisions** are made for the shipped vertical slice.
3. **Compare** exported constants (same names in **Results → “Coded match thresholds”** on the home page) to the branches in `validateLabelFields`.
4. **Skim** **`lib/extraction/openai-provider.ts`** — confirm extraction scope matches the fields the validator expects.
5. **Optional:** **`tests/validator.test.ts`** — examples of pass/fail/manual_review at the boundaries.

If **`FIELD_REQUIREMENTS`** in **`app/page.tsx`** disagrees with **`validator.ts`**, treat that as **documentation drift** until fixed.

---

## 4. Explicit non-sources (do not expect them in-repo)

- **27 CFR** full text or automated rule engine  
- **COLA** or TTB internal APIs  
- **Per-commodity** (wine/beer) rule matrices beyond PRD’s staged plan  
- **Legal sign-off** or “compliant / non-compliant” as a regulatory determination  
- **Persistence of human Approve / Reject** — the Results footer disposition is **browser-only** UI state for the prototype (`app/page.tsx`); it is **not** written to disk or any API.

---

## 5. Maintenance

When comparison behavior changes:

1. Update **`lib/validator.ts`** (and tests).  
2. Update exported constants if thresholds move (UI imports them).  
3. Update **`FIELD_REQUIREMENTS`** in **`app/page.tsx`** if the English description should follow.  
4. Touch **`docs/modules/validator.md`** and this file if the **evaluator story** changes.

---

## See also

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — pipeline diagram and module index  
- [`docs/modules/validator.md`](./modules/validator.md) — validator responsibilities  
- [`docs/modules/extraction.md`](./modules/extraction.md) — providers and failover  
- [`README.md`](../README.md) — **Compliance boundaries** (product-level)
