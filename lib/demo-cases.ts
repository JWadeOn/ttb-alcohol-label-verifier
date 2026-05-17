export type DemoCaseId =
  | "on-bottle-happy-path-pass"
  | "happy-path-perfect-pass"
  | "difficult-impressive-pass"
  | "obvious-failure-mode"
  | "synthetic-whiskey-cream-baseline-pass"
  | "synthetic-whiskey-cream-fail-brand"
  | "on-bottle-vodka-glare-aligned"
  | "on-bottle-vodka-glare-whiskey-mismatch";

export type DemoCase = {
  id: DemoCaseId;
  title: string;
  subtitle: string;
  fixtureId: string;
  imageRelativePath: string;
  applicationRelativePath: string;
  outcomeSummary: string;
  outcomeTone: "pass" | "fail";
};

export const DEMO_CASES: DemoCase[] = [
  {
    id: "on-bottle-happy-path-pass",
    title: "On-bottle happy path",
    subtitle: "Classic synthetic bottle label with clean readability for a quick pass check.",
    fixtureId: "happy-path-synthetic-label",
    imageRelativePath: "labels/curated/on-bottle/liquor_label_happy_path.png",
    applicationRelativePath: "applications/on_bottle_happy_path_prime_distillery.json",
    outcomeSummary: "Happy-path fixture: expected to pass all applicable checks.",
    outcomeTone: "pass",
  },
  {
    id: "happy-path-perfect-pass",
    title: "Full pass",
    subtitle: "Best clean all-pass synthetic eval case for a fast confidence check.",
    fixtureId: "synthetic_eval_spiced_rum_glare_brand",
    imageRelativePath: "labels/synthetic_eval_spiced_rum_glare_brand.jpg",
    applicationRelativePath: "applications/synthetic_eval_spiced_rum.json",
    outcomeSummary: "Eval suite: 6 pass, 0 fail, 0 manual review, 1 not applicable.",
    outcomeTone: "pass",
  },
  {
    id: "difficult-impressive-pass",
    title: "Full pass under angle stress",
    subtitle: "Harder 30-degree synthetic angle case that still clears every applicable check.",
    fixtureId: "synthetic_eval_spiced_rum_angle_30",
    imageRelativePath: "labels/synthetic_eval_spiced_rum_angle_30.jpg",
    applicationRelativePath: "applications/synthetic_eval_spiced_rum.json",
    outcomeSummary: "Eval suite: 6 pass, 0 fail, 0 manual review, 1 not applicable.",
    outcomeTone: "pass",
  },
  {
    id: "synthetic-whiskey-cream-baseline-pass",
    title: "Clean bourbon baseline",
    subtitle:
      "Front-on cream-label bourbon with a matching application; government warning and core fields align.",
    fixtureId: "synthetic_eval_whiskey_cream_baseline_front",
    imageRelativePath: "labels/synthetic_eval_whiskey_cream_baseline_front.jpg",
    applicationRelativePath: "applications/synthetic_eval_whiskey_cream.json",
    outcomeSummary: "Expected to pass all applicable checks (country of origin not applicable).",
    outcomeTone: "pass",
  },
  {
    id: "synthetic-whiskey-cream-fail-brand",
    title: "Subtle failure (wrong brand)",
    subtitle:
      "Same clean bourbon baseline label, but the application lists Stone's Throw instead of Cinder Ridge on the label.",
    fixtureId: "synthetic_eval_whiskey_cream_obvious_fail_brand",
    imageRelativePath: "labels/synthetic_eval_whiskey_cream_baseline_front.jpg",
    applicationRelativePath: "applications/synthetic_eval_whiskey_cream_obvious_fail_brand.json",
    outcomeSummary: "Application data mismatch: brand name should fail; other fields still pass.",
    outcomeTone: "fail",
  },
  {
    id: "obvious-failure-mode",
    title: "Clear failure",
    subtitle: "Imported vodka with a cropped lower label, producing visibly failed checks.",
    fixtureId: "synthetic_eval_vodka_import_crop_warning_partial",
    imageRelativePath: "labels/synthetic_eval_vodka_import_crop_warning_partial.jpg",
    applicationRelativePath: "applications/synthetic_eval_vodka_import.json",
    outcomeSummary: "Eval suite: 5 pass, 2 fail, 0 manual review, 0 not applicable.",
    outcomeTone: "fail",
  },
  {
    id: "on-bottle-vodka-glare-aligned",
    title: "On-bottle vodka glare (aligned app)",
    subtitle: "Strong glare + perspective noise with matching vodka application values.",
    fixtureId: "name_address_candidate_st_petersburg_vodka_glare_brand",
    imageRelativePath: "labels/curated/on-bottle/st_petersburg_vodka_glare_brand.png",
    applicationRelativePath: "applications/synthetic_eval_vodka_import.json",
    outcomeSummary: "On-bottle stress case with matching spirit class: expect mixed pass/manual-review outcomes.",
    outcomeTone: "fail",
  },
  {
    id: "on-bottle-vodka-glare-whiskey-mismatch",
    title: "On-bottle vodka glare (whiskey app mismatch)",
    subtitle: "Same vodka glare image paired with whiskey-dark application to demonstrate clear mismatches.",
    fixtureId: "name_address_candidate_st_petersburg_vodka_glare_brand_whiskey_app_mismatch",
    imageRelativePath: "labels/curated/on-bottle/st_petersburg_vodka_glare_brand.png",
    applicationRelativePath: "applications/synthetic_eval_whiskey_dark.json",
    outcomeSummary: "Crossed-image/application case: expected to produce multiple fail/manual-review fields.",
    outcomeTone: "fail",
  },
];

export const DEMO_CASES_BY_ID = Object.fromEntries(
  DEMO_CASES.map((demoCase) => [demoCase.id, demoCase]),
) as Record<DemoCaseId, DemoCase>;

export function isDemoCaseId(value: string): value is DemoCaseId {
  return value in DEMO_CASES_BY_ID;
}

/** Curated batch demo presets (paired uploads, unique stems per case). */
export type BatchDemoSuiteId = "batch-clean-pass" | "batch-one-fail" | "batch-mixed-half";

export type BatchDemoSuite = {
  id: BatchDemoSuiteId;
  title: string;
  subtitle: string;
  caseIds: DemoCaseId[];
};

const DEMO_PASS_CASE_IDS = DEMO_CASES.filter((c) => c.outcomeTone === "pass").map((c) => c.id);
const DEMO_FAIL_CASE_IDS = DEMO_CASES.filter((c) => c.outcomeTone === "fail").map((c) => c.id);

export const BATCH_DEMO_SUITES: BatchDemoSuite[] = [
  {
    id: "batch-clean-pass",
    title: "Clean pass batch",
    subtitle: "Four aligned label/application pairs — all applications should pass verification.",
    caseIds: DEMO_PASS_CASE_IDS,
  },
  {
    id: "batch-one-fail",
    title: "One failure batch",
    subtitle:
      "Three pass cases plus one intentional brand mismatch (whiskey cream) — only that application should fail.",
    caseIds: [
      "on-bottle-happy-path-pass",
      "happy-path-perfect-pass",
      "synthetic-whiskey-cream-baseline-pass",
      "synthetic-whiskey-cream-fail-brand",
    ],
  },
  {
    id: "batch-mixed-half",
    title: "Half pass / half fail batch",
    subtitle:
      "Four pass and four stress cases — expect a mixed batch outcome after verify (filters and per-row badges).",
    caseIds: [...DEMO_PASS_CASE_IDS, ...DEMO_FAIL_CASE_IDS],
  },
];

export const BATCH_DEMO_SUITES_BY_ID = Object.fromEntries(
  BATCH_DEMO_SUITES.map((suite) => [suite.id, suite]),
) as Record<BatchDemoSuiteId, BatchDemoSuite>;

/** @deprecated Use BATCH_DEMO_SUITES / batch-mixed-half */
export const BATCH_DEMO_SUITE = BATCH_DEMO_SUITES_BY_ID["batch-mixed-half"];

export type BatchDemoSuiteOutcomes = {
  passCases: DemoCase[];
  failCases: DemoCase[];
  passCount: number;
  failCount: number;
};

/** Expected verification tone for cases in a batch suite. */
export function getBatchDemoSuiteOutcomes(suite: BatchDemoSuite): BatchDemoSuiteOutcomes {
  const cases = suite.caseIds.map((id) => DEMO_CASES_BY_ID[id]);
  const passCases = cases.filter((demoCase) => demoCase.outcomeTone === "pass");
  const failCases = cases.filter((demoCase) => demoCase.outcomeTone === "fail");
  return {
    passCases,
    failCases,
    passCount: passCases.length,
    failCount: failCases.length,
  };
}

export function isBatchDemoSuiteId(value: string): value is BatchDemoSuiteId {
  return value in BATCH_DEMO_SUITES_BY_ID;
}

export function getBatchDemoSuite(suiteId: BatchDemoSuiteId): BatchDemoSuite {
  return BATCH_DEMO_SUITES_BY_ID[suiteId];
}

/** Coordinated upload names so batch pairing matches by filename stem. */
export function demoBatchImageFileName(caseId: DemoCaseId, originalFileName: string): string {
  const dot = originalFileName.lastIndexOf(".");
  const ext = dot > 0 ? originalFileName.slice(dot) : ".png";
  return `${caseId}${ext}`;
}

export function demoBatchApplicationFileName(caseId: DemoCaseId): string {
  return `${caseId}.json`;
}
