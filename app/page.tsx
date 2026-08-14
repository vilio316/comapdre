"use client";

import Link from "next/link";
import { FaCamera, FaClipboard, FaBook, FaFile } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";

const offerings = [
  {
    title: "MCQ Generation",
    desc: "Turn any topic into a custom quiz. Choose your subject, set the difficulty, and get instant practice questions with answer validation.",
    icon: <FaClipboard />,
  },
  {
    title: "Exam Preparation",
    desc: "Flashcards, guided summaries, and timed practice tests — all the tools you need to ace your exams in one place.",
    icon: <FaBook />,
  },
  {
    title: "OCR Scanner",
    desc: "Extract text from handwritten notes, typed documents, and images. Works with any document you upload or photograph.",
    icon: <FaCamera />,
  },
  {
    title: "Document Management",
    desc: "Keep your class materials organized. Search, tag, and manage all your documents from a single dashboard.",
    icon: <FaFile />,
  },
];

export default function LandingPage() {
  const { data } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (data && data.user) {
      router.push("/dashboard");
    }
  }, [data]);

  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-deep sm:text-6xl">
          Study smarter with <span className="text-gold">Compadre</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-muted sm:text-lg">
          Generate practice questions, prepare for exams, scan documents with
          OCR, and keep your class materials organized — all in one app.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/sign-up"
            className="w-full rounded-lg bg-deep px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-deep-light sm:w-auto"
          >
            Get started free
          </Link>
          <Link
            href="/auth/sign-in"
            className="w-full rounded-lg border border-gray-300 bg-surface px-8 py-3 text-sm font-medium text-deep transition-colors hover:bg-gray-50 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:pb-28 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-deep sm:text-3xl">
            Everything you need to succeed
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Four tools designed to work together.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {offerings.map((o) => (
            <div
              key={o.title}
              className="rounded-xl border border-gray-200 bg-surface p-6 shadow-sm transition-all hover:shadow-md sm:p-8"
            >
              <div className="mb-4 text-deep">{o.icon}</div>
              <h3 className="text-lg font-semibold text-deep">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {o.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-deep/5">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20 sm:px-6">
          <h2 className="text-2xl font-bold text-deep sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Create your free account and start studying smarter today.
          </p>
          <Link
            href="/auth/sign-up"
            className="mt-6 inline-block rounded-lg bg-deep px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-deep-light"
          >
            Create your account
          </Link>
        </div>
      </section>
    </>
  );
}
