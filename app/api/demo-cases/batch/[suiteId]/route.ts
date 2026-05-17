import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  DEMO_CASES_BY_ID,
  demoBatchApplicationFileName,
  demoBatchImageFileName,
  getBatchDemoSuite,
  isBatchDemoSuiteId,
} from "@/lib/demo-cases";

function imageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

type RouteContext = { params: Promise<{ suiteId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { suiteId } = await context.params;
  if (!isBatchDemoSuiteId(suiteId)) {
    return NextResponse.json(
      { code: "DEMO_BATCH_SUITE_UNKNOWN", message: `Unknown batch demo suite: ${suiteId}` },
      { status: 404 },
    );
  }

  const suite = getBatchDemoSuite(suiteId);

  try {
    const items = await Promise.all(
      suite.caseIds.map(async (caseId) => {
        const demoCase = DEMO_CASES_BY_ID[caseId];
        const imagePath = path.join(process.cwd(), "fixtures", demoCase.imageRelativePath);
        const applicationPath = path.join(process.cwd(), "fixtures", demoCase.applicationRelativePath);
        const [imageBytes, applicationJson] = await Promise.all([
          fs.readFile(imagePath),
          fs.readFile(applicationPath, "utf8"),
        ]);
        const originalFileName = path.basename(imagePath);
        return {
          caseId,
          title: demoCase.title,
          outcomeTone: demoCase.outcomeTone,
          applicationJson,
          image: {
            fileName: demoBatchImageFileName(caseId, originalFileName),
            mimeType: imageMimeType(imagePath),
            base64: imageBytes.toString("base64"),
          },
          applicationFileName: demoBatchApplicationFileName(caseId),
        };
      }),
    );

    return NextResponse.json({
      id: suite.id,
      title: suite.title,
      subtitle: suite.subtitle,
      items,
    });
  } catch (error) {
    console.error("[demo-cases/batch] failed to load batch demo suite", { suiteId, error });
    return NextResponse.json(
      { code: "DEMO_BATCH_LOAD_FAILED", message: "Could not load batch demo fixture assets." },
      { status: 500 },
    );
  }
}
