import { handleVerifyExtractOnlyPost } from "@/lib/verify-handler";

export async function POST(req: Request) {
  return handleVerifyExtractOnlyPost(req);
}
