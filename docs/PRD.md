# PRD: AI-Powered Alcohol Label Verification Prototype

**Project:** TTB Alcohol Label Verification Take-Home
**Author:** [Candidate]
**Status:** Draft
**Last updated:** May 10, 2026

> **Design note.** §8 documents why the prototype uses OpenAI’s **public API** while the stack targets **`gpt-4o-mini`** for migration to **Azure OpenAI Service**, consistent with **Marcus Williams’s** Azure posture, **FedRAMP** boundaries, and **firewall / egress** constraints from **§2** and the prior vendor pilot.

---

## 1. Summary

A web-based prototype that lets a TTB compliance agent upload an alcohol label image alongside the application data submitted for that label, and receive a structured pass/fail comparison in under five seconds. The tool replaces the rote "does the number on the form match the number on the label" portion of label review with automated extraction and comparison, while leaving judgment calls to the agent.

This is an evaluation prototype, not a production system. It is intentionally scoped to demonstrate engineering judgment, appropriate technical choices, and stakeholder awareness — not to be deployed inside Treasury.

---

## 2. Background and problem

The Alcohol and Tobacco Tax and Trade Bureau reviews approximately 150,000 label applications per year with 47 compliance agents. The current process is manual: an agent opens the application, opens the label artwork, and visually compares fields one at a time. Sarah Chen (Deputy Director, Label Compliance) estimates that roughly half of agent time is spent on what is essentially data-entry verification — confirming that text on the label matches text in the application.

A prior vendor pilot for label scanning failed for two reasons: latency (30–40 seconds per label) and incompatibility with TTB's network egress restrictions. Any successful tool needs to clear both bars: fast enough to beat the human, and architecturally compatible with Treasury infrastructure even if this prototype itself is hosted publicly.

---

## 3. Goals and non-goals

### Goals

- Demonstrate end-to-end automated comparison of label artwork against submitted application data.
- Prioritize common cross-beverage label requirements first (brand, class/type, alcohol content, net contents, warning), then stage vertical expansion in this order: distilled spirits first, wine second, beer third.
- Hit a sub-five-second round-trip for a single label, including under failover conditions.
- Use a multimodal vision LLM as the primary extraction path, exploiting its strength at combined extraction-plus-field-identification.
- Maintain a working local-OCR fallback that demonstrates the architecture survives Treasury's network egress restrictions and provides demo-day resilience against API outages.
- Handle the two known matching edge cases identified in stakeholder interviews: case/punctuation variation in brand names (Dave's "STONE'S THROW" example) and exact-match enforcement of the government warning statement (Jenny's example).
- Support batch processing for the importer-dump scenario Sarah and Janet flagged.
- Use deterministic standard algorithms (regex, normalized fuzzy matching) for the field-comparison logic where they solve the problem; reach for AI only where it earns its place.
- Produce a clean, simple UI suitable for an agent population whose tech comfort varies widely.
- Document, in the README, what would need to change for production deployment at TTB.

### Non-goals

- Integration with COLA, Treasury SSO, or any internal Treasury system.
- Persistent storage, user accounts, audit logs, or admin functionality.
- FedRAMP-compliant deployment, PII handling, or document retention.
- Custom model training or fine-tuning.
- LLM in the field-comparison logic — comparison is deterministic. The LLM's job is extraction, not judgment.
- **Spatial heuristics for field identification in the fallback path.** TTB labels have no standardized layout; spatial heuristics are brittle and consume disproportionate build time. The fallback uses regex on concatenated OCR text for structured fields and routes unstructured fields to manual review.
- Replacing agent judgment on ambiguous cases — the tool surfaces information; the agent decides.
- Handling non-label compliance work (formula approval, advertising review, etc.).

---

## 4. Users

| Persona | Role | Source | What they need |
|---|---|---|---|
| Compliance Agent (experienced) | Primary user | Dave Morrison interview | A tool that speeds up the queue without adding clicks or breaking on edge cases that a human would resolve trivially. |
| Compliance Agent (junior) | Primary user | Jenny Park interview | A tool that catches the things humans miss (warning statement variations) and handles imperfect images gracefully. |
| Compliance Leadership | Sponsor | Sarah Chen interview | A tool the team will actually adopt — fast, simple, and capable of batch operation during peak periods. |
| IT Systems | Gatekeeper | Marcus Williams interview | A design that could plausibly be adapted for a Treasury-hosted production deployment without architectural rework. |

---

## 5. User stories

**US-1.** As a compliance agent, I upload a label image and the application data for that label, and I receive a per-field pass/fail comparison in under five seconds — even when the cloud AI provider is slow or unreachable — so I can clear my queue faster.

**US-2.** As a compliance agent, when the brand on the label differs from the application only in capitalization or punctuation, the tool flags it as a likely match with the difference shown, so I can confirm with one click rather than rejecting reflexively.

**US-3.** As a compliance agent, when the government warning statement on the label deviates in any way — wording, casing, missing bold, abbreviation — the tool flags it as a fail, so I never miss a violation.

**US-4.** As a compliance agent processing an importer's bulk submission, I upload many labels with their applications at once and receive a batch report, so I'm not processing 200 labels one at a time.

**US-5.** As a compliance agent, when a label image is photographed at a poor angle, has glare, or has stylized fonts, the primary path extracts fields reliably anyway. When even that isn't enough, the tool tells me clearly rather than producing wrong results.

---

## 6. Functional requirements

### P0 — Must have

| ID | Requirement |
|---|---|
| F-1 | Upload one label image (JPEG, PNG) plus application data (JSON) via web UI. |
| F-2 | Extract these core fields from the label: brand name, class/type, alcohol content (ABV/proof), net contents, government warning text. |
| F-3 | Primary extraction path uses OpenAI `gpt-4o-mini` with a structured-output prompt that returns the fields as JSON. The model is instructed to flag low confidence rather than guess on stylized or low-quality images. |
| F-4 | Fallback extraction path uses **local OCR in Node** (default: **Tesseract.js**) to produce a concatenated text block. Regex extracts ABV, net contents, and government warning from the block. Brand name and class/type are reported as "unavailable on fallback path — manual review" rather than guessed via spatial heuristics. This is a **Tesseract-first** default with an evidence-based pivot to a stronger OCR path if POC-1 thresholds are missed. |
| F-5 | Failover from primary to fallback respects the latency budget: soft timeout at 3.0 seconds (start fallback in parallel), hard timeout at 3.5 seconds (cancel primary, use fallback result). See §7 for the full latency budget. |
| F-6 | Compare each extracted field against the corresponding field in the submitted application data. |
| F-7 | Brand name comparison uses normalized fuzzy matching — case folding, punctuation removal, whitespace collapse, Levenshtein similarity above a threshold — and reports the raw difference when normalization succeeds. |
| F-8 | Government warning comparison is exact, case-sensitive, regex-based against the canonical TTB warning text. Any deviation is a fail. |
| F-9 | Display results as a per-field table with three states (pass, fail, manual review), the specific text that drove each verdict, and which extraction provider produced the result. |
| F-10 | P95 end-to-end latency under five seconds for a single label of typical size, on the primary path AND under failover conditions. |
| F-11 | Image-quality pre-check: detect labels too blurry, dark, or skewed for either provider to reliably extract, return a clear "image quality insufficient, please resubmit" message. |
| F-12 | Deployed at a publicly accessible HTTPS URL. |
| F-13 | Source code in a public GitHub repository with a README covering setup, run, design decisions, and trade-offs. |

### P1 — High value if time permits

| ID | Requirement |
|---|---|
| F-14 | Batch upload: agent submits multiple labels with a manifest, receives a results table they can scan top-to-bottom. |
| F-15 | Per-field confidence indicators surfaced in the UI when the extraction provider reports low confidence. |
| F-16 | UI toggle (in addition to the env var) to manually force the fallback provider, so evaluators can demonstrate firewall resilience without simulating an outage. |
| F-17 | Extract and compare name/address of bottler/producer against submitted application data; when extraction confidence is low, route to manual review with evidence text shown. |
| F-18 | Extract and compare country of origin for imported products; for non-import products, mark this field not-applicable rather than fail. |

### P2 — Explicitly out of scope

User authentication, session management, persistent storage of submitted labels, history/audit views, admin dashboards, multi-user collaboration, COLA integration, compliance reporting, custom-trained vision models, spatial heuristics for fallback field identification, and full commodity-specific legal rule coverage beyond the common field set (for example age statements, state-of-distillation, additive disclosures).

---

## 7. Non-functional requirements

### Latency budget (the constraint that drives the most architecture)

The 5-second P95 budget breaks down across stages, both in the happy path and in the failover path. Naive auto-failover would breach the budget; the explicit timeouts in F-5 enforce it.

**Happy path (primary, OpenAI returns successfully):**

| Stage | Budget |
|---|---|
| Image quality pre-check (decode via `sharp`, Laplacian variance in TS) | 0.2s |
| OpenAI vision call (P95) | 3.0s |
| Comparison logic (Levenshtein + regex, e.g. `fast-levenshtein` / `fuzzball`) | 0.1s |
| UI render (Next.js SSR + hydration) | 0.2s |
| **Total budget consumed** | **~3.5s** |
| **Headroom** | **~1.5s** |

**Failover path (OpenAI hangs, fallback engages):**

| Stage | Budget |
|---|---|
| Image quality pre-check | 0.2s |
| OpenAI call hangs to hard timeout | 3.5s |
| Local OCR / Tesseract (started in parallel at 3.0s soft timeout) overlaps with the last 0.5s of the OpenAI wait | — |
| Local OCR remaining time after hard timeout | 0.7s |
| Comparison logic | 0.1s |
| UI render | 0.2s |
| **Total budget consumed** | **~4.7s** |
| **Headroom** | **~0.3s — tight, but inside budget** |

The parallel-start at the soft timeout is what makes the failover budget work. Waiting until the hard timeout before starting the local OCR worker would add roughly one second to the failover path and breach the budget; the README documents the timeout pattern explicitly.

### Other non-functional requirements

- **Reliability.** Bad input (corrupt images, malformed JSON, oversized files) produces clear error messages, never crashes. Primary-path failures fall through to the fallback automatically per the timeout pattern above.
- **Usability.** Single-page interface, drag-and-drop upload, results visible without scrolling on a 1280×800 display. No hidden menus, no multi-step wizards. Target user is the agent Sarah described whose mother just learned video calls — interface must be obvious.
- **Accessibility.** Keyboard-navigable, semantic HTML, sufficient color contrast. The README acknowledges that full Section 508 conformance is a production concern, not claimed for the prototype.
- **Browser support.** Current versions of Chrome, Firefox, Safari, Edge.
- **Code quality.** **TypeScript strict mode**, ESLint + Prettier, tests (e.g. **Vitest**) for the comparison and warning-validation logic, tests for the extraction-provider interface contract, tests for the timeout behavior. README explains the structure.

---

## 8. Technical architecture

### Stack

- **Language:** TypeScript (strict) on **Node.js** (current LTS).
- **UI and API:** **Next.js** (App Router). React for the agent UI; **Route Handlers** (or server actions) implement `POST /api/verify`-style endpoints that accept multipart image upload + application JSON. One codebase, shared Zod schemas for request/response validation at the HTTP boundary.
- **Primary extraction:** OpenAI `gpt-4o-mini` via the **official OpenAI TypeScript SDK** and the Chat Completions API with vision input. Structured JSON via `response_format` (JSON schema) and **Zod** parsing on receipt. System prompt explicitly instructs low-confidence flagging on stylized or low-quality images. Timeouts enforced with `AbortSignal` / client timeouts (3.0s soft orchestration start for fallback, 3.5s hard cancel primary).
- **Fallback extraction:** **Tesseract.js** (default) — local, no cloud egress, runs in the Node process or worker thread; produces one concatenated text block; regex extraction for structured fields; unstructured fields `unavailable`. Activated by `USE_LOCAL_OCR=1`, UI toggle (F-16), or automatic timeout failover. **Tesseract-first policy:** keep as default only if POC-1 meets defined latency and structured-field coverage thresholds; otherwise pivot to a stronger OCR fallback behind the same provider interface.
- **Field comparison:** Levenshtein-based similarity (`fast-levenshtein`, `fuzzball`, or equivalent) plus JavaScript `RegExp` for the strict government-warning match.
- **Image quality pre-check:** **`sharp`** for decode and resize; Laplacian variance (or equivalent blur metric) and basic skew heuristics in TypeScript. Runs before either extraction provider.
- **Containerization:** Docker, multi-stage build, non-root user, **Node** slim base image; image includes **Tesseract** native binaries where required by `tesseract.js`. OpenAI API key via environment variable.
- **Deployment:** Default story is **Docker on Render** for the prototype, with **Fly.io** and **Hugging Face Spaces (Docker SDK mode)** as fallback options if platform limits block shipping. **Vercel** can host the Next.js app but serverless timeouts and missing system OCR binaries often force **Docker** or a **long-lived Node** target for the full prototype; README states the chosen path.

### File organization

```
ttb-alcohol-label-verifier/
├── app/                         # Next.js App Router — UI + API routes
│   ├── api/verify/route.ts      # POST: multipart image + application JSON
│   └── ...
├── lib/
│   ├── extraction/
│   │   ├── provider.ts          # extractWithFailover + provider types
│   │   ├── openai-provider.ts   # Primary: gpt-4o-mini vision
│   │   └── tesseract-provider.ts # Fallback: Tesseract.js + regex extraction
│   ├── validator.ts             # Field comparison (fuzzy + strict); pure functions
│   ├── image-quality.ts         # sharp + Laplacian / skew pre-check
│   └── schemas.ts               # Zod models shared by API + providers
├── tests/
│   ├── validator.test.ts
│   ├── provider-contract.test.ts
│   ├── timeout-behavior.test.ts
│   └── fixtures/                # Sample labels and application JSON
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

The split is intentional. `validator.ts` is the unit Dave's and Jenny's edge cases get tested against, and it has zero dependency on extraction, UI, or I/O. `extractWithFailover` in `provider.ts` is the only place timeout orchestration lives; both providers implement the same interface so the dual-path story stays testable and time-bounded.

### Why these choices (and what they signal)

- **Multimodal LLM as the primary path.** Modern vision LLMs handle skewed angles, glare, foil text, and stylized fonts reasonably well, and they collapse "extract text" plus "identify which text is which field" into one model call. The trade-off — `gpt-4o-mini` has documented weaknesses on heavily stylized imagery — is mitigated by prompting the model to flag low confidence, by the image-quality pre-check, and by the deterministic regex extraction in the fallback for the high-stakes structured fields.
- **OpenAI / `gpt-4o-mini`.** Treasury and OPM publicly moved away from Anthropic's Claude in their approved AI use cases in early 2026. OpenAI remains on OPM's current approved list and is available through Azure OpenAI Service (FedRAMP High) for Treasury production deployment. The subsection below states how the public API supports the evaluation build and how production maps to Azure without changing core application logic.
- **Tesseract.js as the default local fallback.** A Python runtime could host PaddleOCR PP-OCRv5 for higher open-source OCR accuracy; this stack keeps Node end-to-end, so local OCR defaults to **Tesseract.js** (system `tesseract` with WASM or CLI bindings) to preserve the no-cloud-egress fallback story. Tesseract underperforms Paddle on difficult layouts; POC-1 validates §7 latency and regex extraction quality, and the README documents escalation paths (for example ONNX Runtime Node or worker-thread OCR) when measurements miss targets.
- **Regex on concatenated text, not spatial heuristics.** TTB labels have no standardized layout. Spatial heuristics (largest text = brand, bottom text = net contents) would be brittle and would consume the build window. Regex on the concatenated text block extracts the structured fields reliably; unstructured fields are reported for manual review on the fallback path rather than inferred. That boundary keeps behavior auditable: resilience without silent misclassification.
- **Explicit soft/hard timeouts.** Naive auto-failover (wait for the primary to error, then start the fallback) would breach the latency budget under any meaningful API hang. The soft-timeout-at-3.0s pattern starts the fallback in parallel before the primary has given up, keeping the total round-trip inside budget even when failover engages.
- **Deterministic comparison logic.** The LLM (or OCR) extracts; deterministic algorithms judge. This keeps the unit-tested judgment surface separate from the AI surface.
- **Next.js full-stack TypeScript.** The HTTP boundary, extraction orchestration, validation, and tests share one language and Zod-backed schemas. The agent UI is implemented in React. Deployment assumes Docker-backed long-lived Node where bundled OCR requires system binaries; the README states the selected host and trade-offs relative to serverless-only platforms.

### Design note: Public OpenAI API and Azure OpenAI in production

The prototype calls OpenAI’s standard public HTTP API for the primary extraction path so development and evaluation require minimal setup: a single API key and outbound HTTPS to OpenAI’s public endpoints.

The implementation targets **`gpt-4o-mini` by design**, not as a placeholder: **Azure OpenAI Service** offers the same model family to enterprise and government tenants on Microsoft-managed infrastructure, which supports a production migration that changes endpoints and credentials—not extraction or comparison algorithms.

**Marcus Williams** (IT Systems; **§4**) described TTB’s investment in **Azure**. In production, the same application would call an **internal Azure OpenAI endpoint** over private networking inside Treasury’s **FedRAMP-authorized** Azure boundary. That deployment keeps **PII and sensitive label imagery** off the public internet path and satisfies **outbound firewall and egress** constraints—the same constraint class summarized in **§2** as contributing to the prior vendor pilot’s failure—while limiting changes to configuration and network routing.

---

## 9. Success criteria

The prototype is considered complete when all of the following are demonstrably true:

1. An evaluator can visit the deployed URL, upload a label image and JSON application data, and receive results in under five seconds on the primary path.
2. Toggling the fallback (UI control or `USE_LOCAL_OCR=1`) routes extraction through **local Tesseract (or documented substitute)**; structured fields (ABV, net contents, government warning) are extracted via regex; unstructured fields (brand, class/type) are reported as "unavailable on fallback — manual review." Results still return inside the 5-second budget.
3. Simulating a primary-path hang (e.g., invalid API key, blocked network) demonstrates automatic failover within 3.5 seconds and total round-trip inside the budget.
4. The "STONE'S THROW vs Stone's Throw" case is correctly identified as a likely match with the difference surfaced (primary path).
5. The "Government Warning" (title case) vs "GOVERNMENT WARNING" (all caps) case is correctly identified as a fail (both paths).
6. A bad image (heavy glare, severe skew) is either extracted successfully by the primary path or produces a clear "image quality insufficient" message.
7. Batch upload of at least 10 labels produces results within the per-label latency budget.
8. The README explains the architecture, the latency budget and timeout pattern, the fallback's narrowed scope, the deployment escalation path, the production considerations, and the trade-offs. Readable in under ten minutes.

---

## 10. Constraints and assumptions

- **No PII.** Sample labels are either generated or use fictional brands. No real applicant data passes through the system.
- **No persistence.** Uploaded files are processed in memory and discarded after response.
- **API key handling.** OpenAI API key is passed via environment variable, never committed, configured in Hugging Face Spaces / Render secrets. README documents this.
- **Application data format (assumption).** Application data is supplied as JSON alongside the image — the most flexible format for a prototype and the most natural input for a future COLA integration. In production, this would come from COLA via a service integration.
- **Third-party AI API for the prototype (assumption).** The primary extraction path uses OpenAI’s public API for fast evaluation setup; the relationship to **Azure OpenAI Service** in production is documented in **§8 (Design note)**. That arrangement fits a publicly hosted evaluation prototype using synthetic data. A Treasury production deployment would move to **Azure OpenAI Service on a FedRAMP High-authorized private endpoint**, retaining traffic inside Treasury’s Azure tenancy and addressing Marcus Williams’s egress constraint without dropping the AI primary path. The **local OCR** fallback remains for resilience.
- **Canonical warning text.** The tool ships with the current TTB government health warning hardcoded. Production would source this from a versioned regulatory store.
- **Regulatory scope boundary.** The prototype focuses on common cross-beverage label requirements first. Commodity-specific and conditional requirements are documented but deferred unless explicitly implemented and tested, with planned vertical rollout of distilled spirits first, wine second (higher expected volume), and beer third.

---

## 11. Production considerations (deferred from scope)

The following are deliberately not built in the prototype but are the gaps a TTB program manager would need to close before deployment. Their inclusion in the README is itself a deliverable.

- **Cloud AI inside the network boundary.** The primary extraction path would migrate from the public OpenAI API to **Azure OpenAI Service over a FedRAMP-High authorized private endpoint**, keeping all data within Treasury's Azure tenancy and satisfying Marcus's network egress constraint without sacrificing the AI capability. **Local OCR** remains as a resilience fallback.
- **Improved fallback field identification.** The prototype fallback does not infer brand or class/type from concatenated OCR text alone. A production version could add a small fine-tuned classifier trained on a corpus of historical COLA submissions to identify these fields spatially with high reliability — a project of weeks, not days.
- PII handling and document retention policies aligned with Treasury records schedules.
- Identity integration with Treasury SSO; role-based access for agents vs. supervisors.
- Audit logging of every verification decision for downstream compliance review, including which extraction provider was used.
- Section 508 conformance review and remediation.
- Batch processing queue with backpressure for the 200–300 label peak importer scenario; prototype batch handling in the Next.js app is synchronous end-to-end.
- Versioned regulatory rules store for warning statement text and field requirements that change over time.
- Integration path with COLA: read application data, write verification outcomes back as agent decision support (not auto-approval).
- Cost monitoring and rate-limit handling on the cloud AI provider; fallback policy when budget caps approach.

### Deployment escalation path (active during build)

Full-stack TypeScript defaults to a **Dockerfile** that installs Node, production dependencies, and **Tesseract** OS packages for `tesseract.js`. Free-tier limits (build memory/time, runtime RAM) still apply. The build process is therefore:

1. **Attempt 1: Single-stage or multi-stage Docker** with official Node image + `apt-get install tesseract-ocr` (or Alpine equivalent). Deploy to **Render** as the default host.
2. **Attempt 2: Slim OCR path.** If image size or cold start is the bottleneck, document a smaller base image, OCR language packs only as needed, or a worker-thread pool for Tesseract.
3. **Attempt 3: Platform fallback.** If Render blocks the target, move to **Fly.io** or **HF Spaces Docker mode**.
4. **Attempt 4: Prebuilt image.** Build locally, push to **GHCR**, configure the chosen platform to pull the prebuilt image.

Whichever path lands a public HTTPS URL is documented in the README. **POC-1** validates container size, Tesseract init/inference time against §7, and regex quality on sample labels.

---

## 12. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Naive auto-failover breaches the 5-second latency budget. | Was high before mitigation; now low. | High | Soft/hard timeout pattern in F-5 starts the fallback at 3.0s rather than waiting for a primary error. Latency budget in §7 is explicit and stage-by-stage. Test in `timeout-behavior.test.ts`. |
| `gpt-4o-mini` produces low-quality extractions on heavily stylized labels (foil, curved bottles, decorative fonts). | Medium | Medium | System prompt instructs the model to flag low confidence rather than guess. Image-quality pre-check rejects the worst cases. Structured fields (ABV, warning) are also extractable by the regex fallback. README documents this limitation. |
| Docker image (Node + Tesseract) exceeds host free-tier build or runtime limits. | Medium | Medium | Three-step escalation path in §11. POC-1 validates before Phase 5. |
| OpenAI API outage during evaluation. | Low | Medium | Automatic failover to local OCR. UI toggle (F-16) allows manual fallback when demonstrating resilience. |
| Tesseract.js fallback is weaker than cloud vision or Python-hosted PaddleOCR on difficult labels. | Medium | Medium | Fallback scope stays narrow: structured fields via regex; unstructured fields require manual review. Document trade-offs in README; optional ONNX path if POC fails. |
| Scope creep — adding spatial heuristics, auth, persistence, dashboards. | Medium | High | Section 3 lists non-goals explicitly; spatial heuristics stay out of scope throughout the build. |
| Prompt injection via label text. | Low | Low | Structured-output prompt with explicit instructions to extract only specific fields; **Zod** validation rejects malformed responses; comparison logic operates on extracted strings, not on free-form LLM output. README notes this is a real production concern at scale. |
| API key leak. | Low | High | Env var only; never committed; deployment platform secrets; pre-commit secret scanning; documented in README. |

---

## 13. Milestones

| Phase | Exit criteria |
|---|---|
| Phase 1: Provider abstraction + OpenAI path + POCs | `ExtractionProvider` + `extractWithFailover` defined; `gpt-4o-mini` provider working end-to-end; Zod schemas; basic Next.js UI + verify route; manual test on a few labels passes; under five seconds on primary path. POC-1 (Docker + Tesseract latency/size) and POC-2 (gpt-4o-mini accuracy on stylized labels) both run, with a go/no-go fallback decision recorded from POC-1 results. |
| Phase 2: Tesseract fallback + timeout-driven failover | Tesseract provider implementing the same interface; regex extraction for structured fields; unstructured fields returning "unavailable"; soft/hard timeout pattern working; failover demonstrably inside budget. |
| Phase 3: Comparison logic + image quality | `validator.ts` complete with normalized fuzzy + strict regex; `image-quality.ts` rejecting bad images; Dave's and Jenny's cases passing in tests. |
| Phase 4: Batch + UI polish + provider toggle | F-14 (batch) working; UI cleaned up; result table clear; provider name and confidence shown in UI for transparency; F-16 toggle working. Vertical sequencing is documented and implemented with distilled spirits as baseline. |
| Phase 5: Tests + deployment + README | Vitest (or equivalent) covering validator, provider contract, and timeout behavior; deployed URL working with secrets configured; deployment path documented per the actual escalation step required; README complete with design decisions, dual-path explanation, latency-budget breakdown, trade-offs (including Tesseract vs Python OCR), production considerations, and vertical expansion plan (wine next, then beer). |

---

*End of PRD.*
