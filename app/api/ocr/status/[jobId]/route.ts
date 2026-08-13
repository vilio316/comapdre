import { NextResponse } from "next/server";
import { getJobStatus } from "@/app/lib/job-manager";
import { getSessionUser } from "@/app/lib/require-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const job = await getJobStatus(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    result: job.result,
    error: job.error,
  });
}
