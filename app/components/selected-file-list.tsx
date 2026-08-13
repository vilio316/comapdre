"use client";

import { FaFile } from "react-icons/fa6";

function fileTypeLabel(name: string, mimeType: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  if (ext === "png") return "PNG";
  if (mimeType) return mimeType.split("/")[1]?.toUpperCase() || "FILE";
  return "FILE";
}

export default function SelectedFileList({ files }: { files: File[] }) {
  return (
    <ul className="flex max-w-64 md:max-w-200 flex-col gap-2">
      {files.map((f, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-surface px-3 py-2.5"
        >
          <FaFile />
          <p className="min-w-0 flex-1 truncate text-left text-sm font-medium text-deep">
            {f.name}
          </p>
          <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
            {fileTypeLabel(f.name, f.type)}
          </span>
        </li>
      ))}
    </ul>
  );
}
