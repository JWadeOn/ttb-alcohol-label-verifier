# Architecture Diagram (Evaluator View)

This page provides an in-depth system diagram intended for evaluators. It complements the narrative in `docs/ARCHITECTURE.md`.

## End-to-end architecture

```mermaid
flowchart TD
  %% =========================
  %% 1) Evaluator and Client
  %% =========================
  subgraph U["Evaluator + Browser Client"]
    U1["Evaluator uploads<br/>label image(s) + application JSON"]
    U2["UI (`app/page.tsx`)<br/>single verify and batch verify forms"]
    U3["Results UI<br/>field status + confidence + spot-check context"]
    U1 --> U2
  end

  %% =========================
  %% 2) API boundary
  %% =========================
  subgraph A["Next.js API Layer"]
    A1["`POST /api/verify`<br/>single-label route"]
    A2["`POST /api/verify/batch`<br/>batch route"]
    A3["`lib/verify-handler.ts`<br/>request parsing + schema validation + orchestration"]
    A4["Environment guard<br/>requires `OPENAI_API_KEY` for extraction path"]
    A1 --> A3
    A2 --> A3
    A3 --> A4
  end

  %% =========================
  %% 3) Core verification
  %% =========================
  subgraph C["Core Verification (`lib/`)"]
    C0["`lib/verify-pipeline.ts`<br/>compose deterministic verification flow"]

    subgraph C1["Image quality stage (`lib/image-quality.ts`)"]
      C1a["Normalize/prepare image buffer"]
      C1b["Quality signals<br/>orientation, blur, glare/readability risk"]
      C1a --> C1b
    end

    subgraph C2["Extraction stage (`lib/extraction/*`)"]
      C2a["Primary OCR extraction<br/>(Tesseract-first)"]
      C2b{"OCR quality/confidence<br/>sufficient?"}
      C2c["LLM-assisted fallback extraction<br/>for low-confidence or hard labels"]
      C2d["Structured extracted fields + confidence metadata"]
      C2a --> C2b
      C2b -- "Yes" --> C2d
      C2b -- "No" --> C2c
      C2c --> C2d
    end

    subgraph C3["Validation stage (`lib/validator.ts`)"]
      C3a["Deterministic field checks<br/>against distilled-spirits-oriented rules"]
      C3b["Requirement-level outcomes per field"]
      C3c{"Confidence/evidence<br/>meets decision threshold?"}
      C3d["Mark as `pass` or `fail` where deterministic evidence is strong"]
      C3e["Mark as `manual_review` when evidence is weak/ambiguous"]
      C3a --> C3b --> C3c
      C3c -- "Strong" --> C3d
      C3c -- "Weak/ambiguous" --> C3e
    end

    C0 --> C1
    C1 --> C2
    C2 --> C3
  end

  %% =========================
  %% 4) Outputs and evidence
  %% =========================
  subgraph O["Output Contract + Evaluator Evidence"]
    O1["API response payload<br/>per-field status: `pass` / `fail` / `manual_review`"]
    O2["Explanatory context<br/>field-level reasoning + confidence signals"]
    O3["Evaluator artifacts<br/>scorecard + eval JSON outputs in `docs/evals/`"]
    O1 --> O2 --> O3
  end

  %% Main flow edges
  U2 -->|"single request payload"| A1
  U2 -->|"batch request payload"| A2
  A3 --> C0
  C3 --> O1
  O1 --> U3
```

## Reading guide

- Primary evaluator path: `UI -> API routes -> verify handler -> pipeline -> field-level outcomes`.
- Conservative behavior is intentional: low-confidence conditions should surface as `manual_review`, not guessed passes.
- Distilled spirits are prioritized in this prototype; wine/beer checks are intentionally deferred.
