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
| **Government warning string used in fixtures/UI defaults** | **`lib/canonical-warning.ts`** | Canonical text for demos and default application JSON; the UI **auto-injects** this into the verify payload when formatted mode hides the field (`lib/application-compliance.ts`). Validator compares extracted text to **application-supplied** warning for that run (see decision table below). |
| **Mandatory application fields (distilled spirits)** | **`lib/application-compliance.ts`** + **`lib/validator.ts`** | Client **Run verification** requires all mandatory values; server validator returns **`fail`** (not `manual_review`) when a required application value is blank before fuzzy comparison. |
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
| Government warning | Same — **exact for auto-pass**; fuzzy triage for non-exact (`GOVERNMENT_WARNING_SIMILARITY_FAIL_BELOW` in `lib/validator.ts`) | P0 / F-8 | PRD asks for strict warning sensitivity **as product behavior**: exact pass, near-match manual review, material mismatch fail. |
| Name & address | Same — fuzzy when both sides present | P1 / F-17 | Explicitly defers strict COLA address rules in messages. |
| Country of origin | Same — `not_applicable` if not import; else fuzzy | P1 / F-18 | Conditional on `isImport` in application JSON. |

### Mandatory application values (distilled spirits prototype)

Before fuzzy or parse comparison, **`validateLabelFields`** returns **`fail`** when a required application value is missing or blank:

| Field | Required when |
|-------|----------------|
| `brandName`, `classType`, `alcoholContent`, `netContents`, `nameAddress`, `governmentWarning` | Always (distilled-spirits slice) |
| `countryOfOrigin` | `isImport === true` |

The formatted editor hides **`governmentWarning`**; **`ensureApplicationComplianceJson`** injects **`CANONICAL_GOVERNMENT_WARNING`** on submit. Other mandatory fields must be entered in formatted mode or JSON.

**Extraction** for each of the above (values read from the image) is assembled in **`lib/verify-pipeline.ts`** calling **`lib/extraction/*`** before `validateLabelFields` runs.

### Government warning decision table

Authoritative logic: `validateLabelFields` in **`lib/validator.ts`**. Threshold: **`GOVERNMENT_WARNING_SIMILARITY_FAIL_BELOW`** (currently `0.55`). Confidence gate: **`CONFIDENCE_MANUAL_REVIEW`** (currently `0.65`).

| Application warning present | Extracted empty | Confidence vs gate | Exact match | Fuzzy similarity vs threshold | Status |
|-----------------------------|-----------------|--------------------|-------------|-------------------------------|--------|
| No (blank/missing) | * | * | * | * | **`fail`** (mandatory application value) |
| Yes | Yes | * | * | * | `manual_review` |
| Yes | No | Low | n/a | &lt; threshold | `fail` |
| Yes | No | Low | n/a | ≥ threshold | `manual_review` |
| Yes | No | High | Yes | * | `pass` |
| Yes | No | High | No | &lt; threshold | `fail` |
| Yes | No | High | No | ≥ threshold | `manual_review` |

**Evaluator takeaway:** Only **exact** text auto-passes. **Near** matches (above threshold but not exact) route to **manual review**, not automatic fail. **Material** mismatches (below threshold) **fail**. Low-confidence warning extractions still use this triage (they do not skip comparison).

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

- [`docs/evals/suite-plan.json`](./evals/suite-plan.json) — tiered eval suite and stakeholder coverage matrix (obvious pass/fail, tricky pass, manual_review, routing)  
- [`docs/evals/README.md`](./evals/README.md) — how to run L0/L1/L2 and interpret correctness evidence  
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — pipeline diagram and module index  
- [`docs/modules/validator.md`](./modules/validator.md) — validator responsibilities  
- [`docs/modules/extraction.md`](./modules/extraction.md) — providers and failover  
- [`README.md`](../README.md) — **Compliance boundaries** (product-level)
