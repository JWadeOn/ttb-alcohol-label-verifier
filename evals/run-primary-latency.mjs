/**
 * Primary-path latency scaffold: POST /api/verify for each manifest fixture
 * with includeInPrimaryLatencyEval === true (default: two seed textures).
 *
 * Requires a running server (npm run dev or npm start) and OPENAI_API_KEY.
 * Without OPENAI_API_KEY: prints skip and exits 0 (CI-friendly scaffold).
 * If the server has OPENAI_DISABLED=true, responses will be 503 / OPENAI_DISABLED (no model spend).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... BASE_URL=http://127.0.0.1:3000 node evals/run-primary-latency.mjs
 *
 * Output: JSON lines to stdout (fixture id, httpStatus, durationMs, code?, extractionProvider?).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function main() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.log(
      JSON.stringify({
        skipped: true,
        reason: "OPENAI_API_KEY not set; no requests sent (eval scaffold).",
      }),
    );
    process.exit(0);
  }

  const base = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const manifest = JSON.parse(
    await readFile(path.join(root, "fixtures", "manifest.json"), "utf8"),
  );
  const application = await readFile(
    path.join(root, "fixtures", "default-application.json"),
    "utf8",
  );

  const targets = manifest.fixtures.filter((f) => f.includeInPrimaryLatencyEval === true);
  if (targets.length === 0) {
    console.log(JSON.stringify({ error: "No fixtures flagged includeInPrimaryLatencyEval in manifest." }));
    process.exit(1);
  }

  const results = [];
  for (const f of targets) {
    const imagePath = path.join(root, "fixtures", f.relativePath);
    const bytes = await readFile(imagePath);
    const fileName = path.basename(f.relativePath);
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/png" }), fileName);
    form.append("application", application);

    const t0 = Date.now();
    let res;
    try {
      res = await fetch(`${base}/api/verify`, { method: "POST", body: form });
    } catch (e) {
      results.push({
        id: f.id,
        ok: false,
        durationMs: Date.now() - t0,
        error: e instanceof Error ? e.message : String(e),
        hint: "Is the app running on BASE_URL?",
      });
      continue;
    }
    const durationMs = Date.now() - t0;
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 200) };
    }
    results.push({
      id: f.id,
      httpStatus: res.status,
      durationMs,
      extractionProvider: body?.extraction?.provider ?? null,
      code: body?.code ?? null,
    });
  }

  console.log(JSON.stringify({ base, results }, null, 2));
  const failed = results.some(
    (r) => r.ok === false || (typeof r.httpStatus === "number" && r.httpStatus >= 400),
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
