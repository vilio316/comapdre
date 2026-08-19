import Link from "next/link";
import { redirect } from "next/navigation";
import { getClassDocumentViewer } from "@/app/lib/documents";
import { getSessionUserServer } from "@/app/lib/server-session";
import DocumentViewer from "./viewer";

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  const { id, docId } = await params;
  const decodedKey = decodeURIComponent(docId);

  const data = await getClassDocumentViewer(user.id, id, decodedKey);
  if (!data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">
          Could not load document
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          The document may not exist or you may not have access to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-gold px-5 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <DocumentViewer docId={decodedKey} initialData={data} />;
}