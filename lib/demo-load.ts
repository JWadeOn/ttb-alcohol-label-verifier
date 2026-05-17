import {
  demoBatchApplicationFileName,
  demoBatchImageFileName,
  type DemoCaseId,
} from "@/lib/demo-cases";

export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}

export type BatchDemoLoadItem = {
  caseId: DemoCaseId;
  applicationJson: string;
  image: { fileName: string; mimeType: string; base64: string };
};

export function batchDemoItemsToUploadFiles(items: BatchDemoLoadItem[]): {
  images: File[];
  applications: File[];
} {
  return {
    images: items.map((item) =>
      base64ToFile(
        item.image.base64,
        demoBatchImageFileName(item.caseId, item.image.fileName),
        item.image.mimeType,
      ),
    ),
    applications: items.map(
      (item) =>
        new File([item.applicationJson], demoBatchApplicationFileName(item.caseId), {
          type: "application/json",
        }),
    ),
  };
}
