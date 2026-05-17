import { checkApplicationReadyForVerify } from "@/lib/application-compliance";
import { type ApplicationJson, ApplicationJsonSchema } from "@/lib/schemas";
import { pairBatchFiles } from "@/lib/batch-pairing";
export type BatchApplicationListItem = {
  fileName: string;
  pairedImageName: string | null;
  brandName: string | null;
  parseError: string | null;
  applicationJson: string;
};

export async function readApplicationJsonFile(file: File): Promise<
  | { ok: true; application: ApplicationJson; raw: string }
  | { ok: false; message: string }
> {
  let raw: string;
  try {
    raw = await file.text();
  } catch {
    return { ok: false, message: `Could not read "${file.name}".` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: `"${file.name}" is not valid JSON.` };
  }

  const schemaResult = ApplicationJsonSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return {
      ok: false,
      message: `"${file.name}" failed application validation.`,
    };
  }

  const ready = checkApplicationReadyForVerify(JSON.stringify(schemaResult.data));
  if (!ready.ok) {
    return { ok: false, message: `"${file.name}": ${ready.reason}` };
  }

  return { ok: true, application: schemaResult.data, raw };
}

/**
 * Pair images with application files, then read and validate JSON in image order.
 */
export async function buildBatchApplicationListItems(
  files: File[],
  pairingRows: Array<{ imageName: string; applicationName: string }> | null,
): Promise<BatchApplicationListItem[]> {
  return Promise.all(
    files.map(async (file, index) => {
      let applicationJson = "";
      let brandName: string | null = null;
      let parseError: string | null = null;
      try {
        applicationJson = await file.text();
        const parsed = ApplicationJsonSchema.safeParse(JSON.parse(applicationJson));
        if (parsed.success) {
          const name = parsed.data.brandName?.trim();
          brandName = name ? name : null;
        } else {
          parseError = "Invalid application JSON";
        }
      } catch {
        parseError = "Could not read file";
      }

      const row = pairingRows?.[index];
      const pairedImageName =
        row && row.applicationName === file.name ? row.imageName : (row?.imageName ?? null);

      return {
        fileName: file.name,
        pairedImageName,
        brandName,
        parseError,
        applicationJson,
      };
    }),
  );
}

export async function buildBatchApplicationsPayload(
  images: File[],
  applicationFiles: File[],
): Promise<
  | { ok: true; applications: ApplicationJson[] }
  | { ok: false; message: string }
> {
  const paired = pairBatchFiles(images, applicationFiles);
  if (!paired.ok) {
    return { ok: false, message: paired.message };
  }

  const applications: ApplicationJson[] = [];
  for (const { application: appFile } of paired.result.pairs) {
    const read = await readApplicationJsonFile(appFile);
    if (!read.ok) {
      return { ok: false, message: read.message };
    }
    applications.push(read.application);
  }

  return { ok: true, applications };
}
