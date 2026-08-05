import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listMcqHistory } from "@/app/lib/mcq-history";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await listMcqHistory(100);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to load MCQ history:", error);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 },
    );
  }
}
