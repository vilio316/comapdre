import Link from 'next/link'

const offerings = [
  {
    title: 'MCQ Generation',
    desc: 'Turn any topic into a custom quiz. Choose your subject, set the difficulty, and get instant practice questions with answer validation.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.251 2.251 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    title: 'Exam Preparation',
    desc: 'Flashcards, guided summaries, and timed practice tests — all the tools you need to ace your exams in one place.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: 'OCR Scanner',
    desc: 'Extract text from handwritten notes, typed documents, and images. Works with any document you upload or photograph.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
      </svg>
    ),
  },
  {
    title: 'Document Management',
    desc: 'Keep your class materials organized. Search, tag, and manage all your documents from a single dashboard.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    ),
  },
]

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-deep sm:text-6xl">
          Study smarter with <span className="text-gold">Compadre</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-muted sm:text-lg">
          Generate practice questions, prepare for exams, scan documents with OCR, and keep your
          class materials organized — all in one app.
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
          <h2 className="text-2xl font-bold text-deep sm:text-3xl">Everything you need to succeed</h2>
          <p className="mt-2 text-sm text-ink-muted">Four tools designed to work together.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {offerings.map((o) => (
            <div key={o.title} className="rounded-xl border border-gray-200 bg-surface p-6 shadow-sm transition-all hover:shadow-md sm:p-8">
              <div className="mb-4 text-deep">{o.icon}</div>
              <h3 className="text-lg font-semibold text-deep">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-200 bg-deep/5">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20 sm:px-6">
          <h2 className="text-2xl font-bold text-deep sm:text-3xl">Ready to get started?</h2>
          <p className="mt-2 text-sm text-ink-muted">Create your free account and start studying smarter today.</p>
          <Link
            href="/auth/sign-up"
            className="mt-6 inline-block rounded-lg bg-deep px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-deep-light"
          >
            Create your account
          </Link>
        </div>
      </section>
    </>
  )
}
