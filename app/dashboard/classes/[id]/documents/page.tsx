import Link from "next/link";
import { redirect } from "next/navigation";
import { getClassDocuments } from "@/app/lib/classes";
import { getSessionUserServer } from "@/app/lib/server-session";
import DocumentsManager from "./documents-manager";

export default async function ClassDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  const { id } = await params;

  const docs = await getClassDocuments(user.id, id);
  if (!docs) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">Could not load documents</p>
        <p className="mt-1 text-sm text-ink-muted">
          You may not be a member of this class.
        </p>
        <Link
          href="/dashboard/classes"
          className="mt-6 inline-block rounded-lg bg-gold px-5 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
        >
          Back to classes
        </Link>
      </div>
    );
  }

  return <DocumentsManager classId={id} initialDocs={docs} />;
}