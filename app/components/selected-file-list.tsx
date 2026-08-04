"use client";

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
    <ul className="flex w-full flex-col gap-2">
      {files.map((f, i) => (
        <li
          key={i}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-surface px-3 py-2.5"
        >
          <svg
            className="h-5 w-5 shrink-0 text-ink-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
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
