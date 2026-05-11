import { handleVerifyPost } from "@/lib/verify-handler";

export async function POST(req: Request) {
  return handleVerifyPost(req);
}
