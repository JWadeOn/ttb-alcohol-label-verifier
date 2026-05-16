export type DemoCaseId =
  | "on-bottle-happy-path-pass"
  | "happy-path-perfect-pass"
  | "difficult-impressive-pass"
  | "obvious-failure-mode"
  | "tricky-failure-mode"
  | "on-bottle-edge-glare"
  | "on-bottle-whiskey-glare";

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
    applicationRelativePath: "default-application.json",
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
    id: "tricky-failure-mode",
    title: "Subtle failure",
    subtitle: "Looks mostly correct at a glance, but one rule still fails in the eval suite.",
    fixtureId: "synthetic_eval_whiskey_cream_baseline_front",
    imageRelativePath: "labels/synthetic_eval_whiskey_cream_baseline_front.jpg",
    applicationRelativePath: "applications/synthetic_eval_whiskey_cream.json",
    outcomeSummary: "Eval suite: 5 pass, 1 fail, 0 manual review, 1 not applicable.",
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
    id: "on-bottle-edge-glare",
    title: "On-bottle glare stress",
    subtitle: "Strong glare + perspective noise; useful for a manual-review stress run.",
    fixtureId: "name_address_candidate_st_petersburg_vodka_glare_brand",
    imageRelativePath: "labels/curated/on-bottle/st_petersburg_vodka_glare_brand.png",
    applicationRelativePath: "applications/synthetic_eval_spiced_rum.json",
    outcomeSummary: "On-bottle stress case: expect one or more fail/manual-review outcomes.",
    outcomeTone: "fail",
  },
  {
    id: "on-bottle-whiskey-glare",
    title: "On-bottle vodka glare",
    subtitle: "Vodka label with glare over text to test extraction resilience.",
    fixtureId: "name_address_candidate_st_petersburg_vodka_glare_brand",
    imageRelativePath: "labels/curated/on-bottle/st_petersburg_vodka_glare_brand.png",
    applicationRelativePath: "applications/synthetic_eval_whiskey_dark.json",
    outcomeSummary: "On-bottle stress case: typically includes fail/manual-review fields.",
    outcomeTone: "fail",
  },
];

export const DEMO_CASES_BY_ID = Object.fromEntries(
  DEMO_CASES.map((demoCase) => [demoCase.id, demoCase]),
) as Record<DemoCaseId, DemoCase>;

export function isDemoCaseId(value: string): value is DemoCaseId {
  return value in DEMO_CASES_BY_ID;
}
