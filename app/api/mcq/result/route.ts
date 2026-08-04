import { NextRequest, NextResponse } from "next/server";
import { getMcqResult } from "@/app/lib/job-manager";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  let cached = await getMcqResult(key);
  if (!cached) {
    try {
      cached = await getMcqResult(decodeURIComponent(key));
    } catch {
      // ignore malformed keys
    }
  }
  if (!cached) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(JSON.parse(cached));
  } catch {
    return NextResponse.json({ error: "Invalid cached result" }, { status: 500 });
  }
}
