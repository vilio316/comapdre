import { NextResponse } from "next/server";
import { getMcqJobStatus } from "@/app/lib/job-manager";
import { getSessionUser } from "@/app/lib/require-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await getSessionUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    console.error("Failed to get MCQ job status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get job status" },
      { status: 500 },
    );
  }
}
