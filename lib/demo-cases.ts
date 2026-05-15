export type DemoCaseId =
  | "happy-path-perfect-pass"
  | "difficult-impressive-pass"
  | "obvious-failure-mode"
  | "tricky-failure-mode"
  | "on-bottle-smirnoff-pass"
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
    id: "on-bottle-smirnoff-pass",
    title: "On-bottle vodka pass",
    subtitle: "Real bottle photo aligned with its paired Smirnoff application fixture.",
    fixtureId: "smirnoff_vodka_happy_path",
    imageRelativePath: "labels/on-bottle/smirnoff_vodka_happy_path.png",
    applicationRelativePath: "applications/smirnoff_vodka_happy_path.json",
    outcomeSummary: "On-bottle fixture: expected to pass across applicable checks.",
    outcomeTone: "pass",
  },
  {
    id: "on-bottle-edge-glare",
    title: "On-bottle glare stress",
    subtitle: "Strong glare + perspective noise; useful for a manual-review stress run.",
    fixtureId: "edge-synthetic-glare",
    imageRelativePath: "labels/on-bottle/edge-synthetic-glare.png",
    applicationRelativePath: "applications/synthetic_eval_spiced_rum.json",
    outcomeSummary: "On-bottle stress case: expect one or more fail/manual-review outcomes.",
    outcomeTone: "fail",
  },
  {
    id: "on-bottle-whiskey-glare",
    title: "On-bottle whiskey glare",
    subtitle: "Whiskey label with glare over text to test extraction resilience.",
    fixtureId: "st_petersburg_whiskey_glare_warning_harsh",
    imageRelativePath: "labels/on-bottle/st_petersburg_whiskey_glare_warning_harsh.png",
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
