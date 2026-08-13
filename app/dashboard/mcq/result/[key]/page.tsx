"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import McqQuestions, { type McqQuestion } from "@/app/components/mcq-questions";
import { FaArrowLeft } from "react-icons/fa6";

export default function McqResultPage() {
  const params = useParams();
  const key = params.key as string;

  const [questions, setQuestions] = useState<McqQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;
    let lookupKey = key;
    try {
      lookupKey = decodeURIComponent(key);
    } catch {
      // leave as-is if malformed
    }
    fetch(`/api/mcq/result?key=${encodeURIComponent(lookupKey)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        if (!Array.isArray(res.questions)) throw new Error("Invalid result");
        setQuestions(res.questions);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [key]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
      </div>
    );
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
