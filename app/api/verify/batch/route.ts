import { handleVerifyBatchPost } from "@/lib/verify-handler";

export async function POST(req: Request) {
  return handleVerifyBatchPost(req);
}
