import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FaArrowLeft,
  FaCode,
  FaUserGroup,
  FaEnvelope,
  FaClipboard,
  FaBook,
  FaCamera,
  FaFileImport,
} from "react-icons/fa6";
import { getClassDetail, getClassDocuments, roleCanDelete } from "@/app/lib/classes";
import type { ClassMember } from "@/app/lib/class-types";
import { getSessionUserServer, requestOrigin } from "@/app/lib/server-session";
import { SetActiveClass } from "./set-active-class";
import InvitePanel from "./invite-panel";
import ClassDocsPanel from "./docs-panel";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  class_rep: "Class Rep",
  member: "Member",
};

const classTools = [
  {
    title: "MCQ",
    desc: "Generate practice questions",
    href: "/dashboard/mcq",
    icon: <FaClipboard />,
  },
  {
    title: "Exam Prep",
    desc: "Flashcards & summaries",
    href: "/dashboard/exam-prep",
    icon: <FaBook />,
  },
  {
    title: "OCR",
    desc: "Scan local documents for text",
    href: "/dashboard/ocr",
    icon: <FaCamera />,
  },
  {
    title: "Compile",
    desc: "Merge documents into one file",
    href: "/dashboard/compile",
    icon: <FaFileImport />,
  },
];

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  const { id } = await params;
  const origin = await requestOrigin();

  const [data, docs] = await Promise.all([
    getClassDetail(user.id, id, origin),
    getClassDocuments(user.id, id),
  ]);

  if (!data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">Could not load class</p>
        <p className="mt-1 text-sm text-ink-muted">
          You may not be a member of this class.
        </p>
        <Link
          href="/dashboard/classes"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-medium text-deep transition-colors hover:bg-gold-light"
        >
          <FaArrowLeft /> Back to classes
        </Link>
      </div>
    );
  }

  const { class: cls, canInvite, members } = data;
  const canDelete = roleCanDelete(cls.role);

  return (
    <div>
      <SetActiveClass classId={id} />

      <Link
        href="/dashboard/classes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-deep"
      >
        <FaArrowLeft /> Classes
      </Link>

      <div className="mb-6 rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-deep sm:text-xl">
                {cls.name}
              </h1>
              <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                {roleLabels[cls.role] ?? cls.role}
              </span>
            </div>
            {cls.description && (
              <p className="mt-1 text-sm text-ink-muted">{cls.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-gold">
                <FaCode /> {cls.code}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaUserGroup /> {cls.memberCount} member
                {cls.memberCount === 1 ? "" : "s"}
              </span>
              {cls.classRepName && (
                <span className="inline-flex items-center gap-1.5">
                  <FaEnvelope /> Class Rep: {cls.classRepName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {classTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border border-gray-200 bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md"
          >
            <div className="mb-2 text-deep transition-colors group-hover:text-gold">
              {tool.icon}
            </div>
            <p className="text-sm font-semibold text-deep">{tool.title}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{tool.desc}</p>
          </Link>
        ))}
      </div>

      <ClassDocsPanel
        classId={id}
        initialDocs={docs ?? []}
        canDelete={canDelete}
      />

      {canInvite && (
        <InvitePanel classId={id} initialInvitations={data.invitations} />
      )}

      <MembersSection members={members} />
    </div>
  );
}

function MembersSection({ members }: { members: ClassMember[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-deep">Members</h2>
      {members.length === 0 ? (
        <p className="text-sm text-ink-muted">No members yet.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-deep">
                  {member.name || "Unnamed"}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {member.email}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
                {roleLabels[member.role] ?? member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}