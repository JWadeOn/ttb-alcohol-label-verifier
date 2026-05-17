import { NextResponse } from "next/server";
import { BATCH_DEMO_SUITES } from "@/lib/demo-cases";

/** Lists available batch demo suite ids (client loads assets via /api/demo-cases/batch/[suiteId]). */
export async function GET() {
  return NextResponse.json({
    suites: BATCH_DEMO_SUITES.map((suite) => ({
      id: suite.id,
      title: suite.title,
      subtitle: suite.subtitle,
      caseCount: suite.caseIds.length,
    })),
  });
}
