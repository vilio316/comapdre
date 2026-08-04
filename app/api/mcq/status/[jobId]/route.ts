import { NextResponse } from "next/server";
import { getMcqJobStatus } from "@/app/lib/job-manager";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await getMcqJobStatus(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    resultKey: job.resultKey,
    error: job.error,
  });
}
