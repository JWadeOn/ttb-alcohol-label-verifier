import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { DEMO_CASES_BY_ID, isDemoCaseId } from "@/lib/demo-cases";

function imageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isDemoCaseId(id)) {
    return NextResponse.json({ code: "DEMO_CASE_NOT_FOUND", message: "Unknown demo case." }, { status: 404 });
  }

  const demoCase = DEMO_CASES_BY_ID[id];
  const imagePath = path.join(process.cwd(), "fixtures", demoCase.imageRelativePath);
  const applicationPath = path.join(process.cwd(), "fixtures", demoCase.applicationRelativePath);

  try {
    const [imageBytes, applicationJson] = await Promise.all([
      fs.readFile(imagePath),
      fs.readFile(applicationPath, "utf8"),
    ]);

    return NextResponse.json({
      id: demoCase.id,
      title: demoCase.title,
      subtitle: demoCase.subtitle,
      fixtureId: demoCase.fixtureId,
      outcomeSummary: demoCase.outcomeSummary,
      applicationJson,
      image: {
        fileName: path.basename(imagePath),
        mimeType: imageMimeType(imagePath),
        base64: imageBytes.toString("base64"),
      },
    });
  } catch (error) {
    console.error("[demo-cases] failed to load demo fixture", {
      id,
      imagePath,
      applicationPath,
      error,
    });
    return NextResponse.json(
      { code: "DEMO_CASE_LOAD_FAILED", message: "Could not load demo fixture assets." },
      { status: 500 },
    );
  }
}
