import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { invitationId } = await params;

    const invitation = await auth.api.getInvitation({
      query: { id: invitationId },
      headers: request.headers,
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: new Date(invitation.createdAt).toISOString(),
        organizationId: invitation.organizationId,
        organizationName: invitation.organizationName,
        organizationSlug: invitation.organizationSlug,
        inviterEmail: invitation.inviterEmail,
      },
    });
  } catch (error) {
    const err = error as { status?: number; body?: { message?: string; code?: string } };
    const message =
      err?.body?.message ??
      (error instanceof Error ? error.message : "Failed to load invitation");
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { invitationId } = await params;

    const result = await auth.api.acceptInvitation({
      body: { invitationId },
      headers: request.headers,
    });

    return NextResponse.json({
      member: result.member,
      invitation: result.invitation,
    });
  } catch (error) {
    const err = error as { status?: number; body?: { message?: string } };
    const message =
      err?.body?.message ??
      (error instanceof Error ? error.message : "Failed to accept invitation");
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { invitationId } = await params;

    await auth.api.rejectInvitation({
      body: { invitationId },
      headers: request.headers,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as { status?: number; body?: { message?: string } };
    const message =
      err?.body?.message ??
      (error instanceof Error ? error.message : "Failed to reject invitation");
    const status = err?.status ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}