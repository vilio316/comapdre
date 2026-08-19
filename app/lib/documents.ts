import prisma from "@/lib/prisma";
import { getObjectSignedUrl } from "@/lib/cloudflareHelper";

export interface DocumentViewerData {
  url: string;
  name: string;
  type: string;
  text?: string;
}

export async function getClassDocumentViewer(
  userId: string,
  organizationId: string,
  docKey: string,
): Promise<DocumentViewerData | null> {
  const membership = await prisma.member.findFirst({
    where: { organizationId, userId },
  });
  if (!membership) return null;

  const doc = await prisma.document.findFirst({
    where: { key: docKey, organizationId },
  });
  if (!doc) return null;

  const url = await getObjectSignedUrl(docKey);

  const type = doc.type.toLowerCase();
  const isText = type === "md" || type === "txt";
  const name = docKey.split("/").pop() ?? docKey;

  let text: string | undefined;
  if (isText) {
    const res = await fetch(url);
    if (res.ok) text = await res.text();
  }

  return { url, name, type, text };
}