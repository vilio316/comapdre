import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMcqHistory } from "@/app/lib/mcq-history";
import { getOrgContext } from "@/app/lib/org-membership";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const ctx = await getOrgContext(request.headers);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await listMcqHistory(100, ctx.organizationId);
    return NextResponse.json({
      history: history.filter((entry) =>
        entry.resultKey.includes(ctx.organizationId),
      ),
    });
  } catch (error) {
    console.error("Failed to load MCQ history:", error);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 },
    );
  }
}
