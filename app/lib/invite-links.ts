/**
 * Shared helpers for link-based class invitations.
 *
 * Invitations are stored in the existing `invitation` table and are
 * short-lived: by default they expire 24 hours after creation. The lifetime
 * can be overridden with the `INVITE_LINK_TTL_HOURS` environment variable.
 */

const DEFAULT_TTL_HOURS = 24;

function readTtlHours(): number {
  const raw = Number(process.env.INVITE_LINK_TTL_HOURS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_TTL_HOURS;
}

export function inviteLinkExpiresAt(): Date {
  return new Date(Date.now() + readTtlHours() * 60 * 60 * 1000);
}

export function inviteTtlHours(): number {
  return readTtlHours();
}

export function inviteUrlFor(origin: string, invitationId: string): string {
  return `${origin}/invite/${invitationId}`;
}