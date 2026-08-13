import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export interface OrgContext {
  user: {
    id: string;
    name: string;
    email: string;
  };
  organizationId: string;
  role: string;
}

const COMPILE_ROLES = new Set(["owner", "admin", "class_rep"]);

export async function getOrgContext(
  headers: Headers,
): Promise<OrgContext | null> {
  const session = await auth.api.getSession({ headers });
  const user = session?.user;
  if (!user) return null;

  const activeOrganizationId =
    (session.session as { activeOrganizationId?: string } | undefined)
      ?.activeOrganizationId ?? null;

  const membership = activeOrganizationId
    ? await prisma.member.findFirst({
        where: { organizationId: activeOrganizationId, userId: user.id },
      })
    : null;

  const resolved = membership ?? (await findMostRecentMembership(user.id));

  if (!resolved) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    organizationId: resolved.organizationId,
    role: resolved.role,
  };
}

export async function findMostRecentMembership(userId: string) {
  return prisma.member.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function canCompile(role: string): boolean {
  return COMPILE_ROLES.has(role);
}
