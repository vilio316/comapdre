import prisma from "@/lib/prisma";
import { inviteUrlFor } from "./invite-links";
import type {
  ClassDetail,
  ClassDoc,
  MyClass,
} from "./class-types";

const INVITE_ROLES = new Set(["owner", "admin", "class_rep"]);

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

export async function getMyClasses(userId: string): Promise<MyClass[]> {
  const memberships = await prisma.member.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          members: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((m) => {
    const creator = m.organization.members.find(
      (member) => member.role === "class_rep",
    );
    return {
      id: m.organization.id,
      name: m.organization.name,
      code: m.organization.slug,
      description: m.organization.description,
      role: m.role,
      classRepName: creator?.user.name ?? null,
      memberCount: m.organization.members.length,
      createdAt: m.organization.createdAt.toISOString(),
    };
  });
}

export async function getClassDetail(
  userId: string,
  id: string,
  origin: string,
): Promise<ClassDetail | null> {
  const membership = await prisma.member.findFirst({
    where: { organizationId: id, userId },
  });
  if (!membership) return null;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!organization) return null;

  const creator = organization.members.find(
    (member) => member.role === "class_rep",
  );

  const invitations = INVITE_ROLES.has(membership.role)
    ? await prisma.invitation.findMany({
        where: { organizationId: id, status: "pending" },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return {
    class: {
      id: organization.id,
      name: organization.name,
      code: organization.slug,
      description: organization.description,
      role: membership.role,
      classRepName: creator?.user.name ?? null,
      memberCount: organization.members.length,
      createdAt: organization.createdAt.toISOString(),
    },
    canInvite: INVITE_ROLES.has(membership.role),
    members: organization.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    })),
    invitations: invitations.map((inv) => ({
      id: inv.id,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      inviteUrl: inviteUrlFor(origin, inv.id),
    })),
  };
}

export async function getClassDocuments(
  userId: string,
  id: string,
): Promise<ClassDoc[] | null> {
  const membership = await prisma.member.findFirst({
    where: { organizationId: id, userId },
  });
  if (!membership) return null;

  const documents = await prisma.document.findMany({
    where: { organizationId: id },
    orderBy: { createdAt: "desc" },
  });

  return documents.map((doc) => ({
    id: doc.key,
    name: doc.name,
    type: doc.type,
    size: formatBytes(doc.size),
    uploaded: doc.createdAt.toISOString().slice(0, 10),
    tags: parseTags(doc.tags),
  }));
}

export function roleCanDelete(role: string): boolean {
  return ["owner", "admin", "class_rep"].includes(role);
}
