import { promises as fs } from "fs";
import path from "path";
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
    return new Response("Unknown demo case.", { status: 404 });
  }

  const demoCase = DEMO_CASES_BY_ID[id];
  const imagePath = path.join(process.cwd(), "fixtures", demoCase.imageRelativePath);

  try {
    const imageBytes = await fs.readFile(imagePath);
    return new Response(imageBytes, {
      status: 200,
      headers: {
        "content-type": imageMimeType(imagePath),
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("[demo-cases] failed to load demo case image", {
      id,
      imagePath,
      error,
    });
    return new Response("Could not load demo image.", { status: 500 });
  }
}
