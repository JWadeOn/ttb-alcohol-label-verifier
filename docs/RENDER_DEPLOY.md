# Render deployment (Docker)

**Goal:** a stable **HTTPS** URL for the Next.js app and **`POST /api/verify`**, with **`OPENAI_API_KEY`** stored as a Render **secret** (never committed).

**Prerequisite:** local image build — `npm run docker:build` ([`docs/modules/dockerfile.md`](./modules/dockerfile.md)).

---

## 1. Create the web service

1. [Render](https://render.com) → **New +** → **Web Service**.
2. Connect this **Git repository** (or deploy a pre-built image if you use **Existing Image**).
3. **Environment:** **Docker**; Dockerfile path: **`Dockerfile`** at repo root.
4. Pick an instance tier that tolerates **cold starts** and multi-second **vision** calls.

---

## 2. Required environment

| Variable | Type | Notes |
|----------|------|------|
| `OPENAI_API_KEY` | **Secret** | Without it, verify returns **503** / `OPENAI_NOT_CONFIGURED`. |

**Optional**

| Variable | Notes |
|----------|------|
| `OPENAI_DISABLED` | `true` / `1` / `yes` — blocks OpenAI (503 `OPENAI_DISABLED`); use only for cost-safe staging. |
| `VERIFY_DEV_STUB` | No effect on Render — **`NODE_ENV=production`** disables the dev stub path in code. |
| `VERIFY_EXTRACT_SOFT_TIMEOUT_MS`, `VERIFY_EXTRACT_HARD_TIMEOUT_MS` | Production budgets; see [`README.md`](../README.md). |

Redeploy or restart after changing env.

---

## 3. Networking and health

- **Port:** **3000** (set in the Dockerfile / `PORT`).
- **Health check:** **GET /** should return **200** when the server is ready.

---

## 4. Smoke test (after first deploy)

1. Open the public site **`/`**.
2. Run one **verify** from the UI (small PNG + valid application JSON) **or** `curl` a multipart `POST /api/verify`.
3. Expect **200** and `extraction.provider` **`openai`** when the key is set and timeouts are adequate.

If you see **`unavailable`** or **`Request was aborted`**, increase extract timeouts or instance resources; check service **Logs** for `[extractWithFailover]` / `[verify-pipeline]`.

---

## 5. Record the URL in-repo

After smoke passes:

1. Add the **public base URL** (HTTPS, no trailing slash) to **`README.md`** under **Deployment** (replace the placeholder).
2. Note the URL and smoke outcome in **`docs/PROGRESS.md`** (**Done recently** + shorten **Next**).

---

## See also

- [`README.md`](../README.md)
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`docs/PROGRESS.md`](./PROGRESS.md)
