import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname === "/api/docs") {
    return NextResponse.next();
  }

  if (method === "GET") {
    if (pathname === "/api/documents") return NextResponse.next();
    if (pathname.startsWith("/api/documents/")) return NextResponse.next();
    if (pathname === "/api/avatar") return NextResponse.next();
    if (pathname.startsWith("/api/classes/invite/")) return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
