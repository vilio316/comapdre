import { NextResponse } from "next/server";
import { listObjectsInBucket } from "@/lib/cloudflareHelper";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function extType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  if (ext === "png") return "PNG";
  if (ext === "md" || ext === "txt") return ext.toUpperCase();
  return (ext ?? "FILE").toUpperCase();
}

function basename(key: string): string {
  return key.split("/").pop() ?? key;
}

export async function GET() {
  try {
    const objects = await listObjectsInBucket();

    const docs = objects.map((obj) => ({
      id: obj.name,
      name: basename(obj.name),
      type: extType(obj.name),
      size: formatBytes(obj.size),
      uploaded: obj.uploaded instanceof Date
        ? obj.uploaded.toISOString().slice(0, 10)
        : String(obj.uploaded).slice(0, 10),
      tags: [] as string[],
    }));

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Failed to list documents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list documents" },
      { status: 500 },
    );
  }
}
