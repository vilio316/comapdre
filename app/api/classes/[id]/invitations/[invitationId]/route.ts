import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> },
) {
  try {
    const { invitationId } = await params;

    await auth.api.cancelInvitation({
      body: { invitationId },
      headers: request.headers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as { status?: number; body?: { message?: string } };
    const message =
      err?.body?.message ??
      (error instanceof Error ? error.message : "Failed to cancel invitation");
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}