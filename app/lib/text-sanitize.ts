export function sanitizeText(raw: string | null | undefined): string {
  if (!raw) return "";

  let text = raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{1,3}[^`\n]+`{1,3}/g, (m) => m.replace(/`/g, ""))
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/^\d+[.)]\s+/gm, (m) => m.replace(/^\d+[.)]\s+/, "  "))
    .replace(/^---+$/gm, "")
    .replace(/\|(.+?)\|/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^={3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
