import Link from "next/link";
import { redirect } from "next/navigation";
import McqQuestions, { type McqQuestion } from "@/app/components/mcq-questions";
import { FaArrowLeft } from "react-icons/fa6";
import { getSessionUserServer } from "@/app/lib/server-session";
import { getMcqResult } from "@/app/lib/job-manager";

export default async function McqResultPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  const { key } = await params;
  let lookupKey = key;
  try {
    lookupKey = decodeURIComponent(key);
  } catch {
    // leave as-is if malformed
  }

  let cached = await getMcqResult(lookupKey);
  if (!cached) {
    try {
      cached = await getMcqResult(decodeURIComponent(lookupKey));
    } catch {
      // ignore malformed keys
    }
  }

  let questions: McqQuestion[] | null = null;
  let error: string | null = null;
  if (!cached) {
    error = "Result not found";
  } else {
    try {
      const parsed = JSON.parse(cached) as { questions?: unknown };
      questions = Array.isArray(parsed.questions)
        ? (parsed.questions as McqQuestion[])
        : null;
      if (!questions) error = "Invalid result";
    } catch {
      error = "Invalid result";
    }
  }

  if (error || !questions) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-lg font-semibold text-deep">
          Could not load questions
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {error ?? "Unknown error"}
        </p>
        <Link
          href="/dashboard/mcq"
          className="mt-6 inline-block rounded-lg bg-gold px-5 py-2 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
        >
          Back to MCQ Generator
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto px-3 py-6 sm:py-8 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/mcq"
            className="mb-1 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-deep transition-colors"
          >
            <FaArrowLeft />
            Back to Generator
          </Link>
          <h1 className="text-2xl font-bold text-deep sm:text-3xl">
            Practice Questions
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {questions.length} questions generated for your documents.
          </p>
        </div>
      </div>

      <McqQuestions questions={questions} />
    </div>
  );
}