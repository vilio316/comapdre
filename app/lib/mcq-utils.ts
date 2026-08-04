export const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

export const extToMime: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
export const MAX_MCQS = 80;

export function resolveMime(name: string, declared: string): string {
  const mime = declared.toLowerCase();
  if (mime && SUPPORTED_MIME_TYPES.has(mime)) return mime;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = extToMime[ext];
  if (fromExt) return fromExt;
  throw new Error(`Unsupported file type: ${name}`);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
