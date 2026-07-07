'use client'

import { useState } from 'react'

type Tab = 'flashcards' | 'mcq' | 'summary'

const sampleCards = [
  { front: 'What is photosynthesis?', back: 'The process by which plants convert light energy into chemical energy.' },
  { front: 'What is a prime number?', back: 'A number greater than 1 that has no positive divisors other than 1 and itself.' },
  { front: 'What is the capital of France?', back: 'Paris' },
  { front: 'What is Newton\'s first law?', back: 'An object at rest stays at rest unless acted on by an external force.' },
]

export default function ExamPrepPage() {
  const [tab, setTab] = useState<Tab>('flashcards')
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [mcqTopic, setMcqTopic] = useState('')
  const [mcqQuestions, setMcqQuestions] = useState<{ q: string; options: string[]; answer: number }[]>([])
  const [mcqSelected, setMcqSelected] = useState<Record<number, number>>({})
  const [mcqLoading, setMcqLoading] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'flashcards', label: 'Flashcards' },
    { key: 'mcq', label: 'Practice MCQs' },
    { key: 'summary', label: 'Guided Summary' },
  ]

  const nextCard = () => {
    setFlipped(false)
    setCardIndex((i) => (i + 1) % sampleCards.length)
  }
  const prevCard = () => {
    setFlipped(false)
    setCardIndex((i) => (i - 1 + sampleCards.length) % sampleCards.length)
  }

  const generateSummary = async () => {
    if (!summaryText.trim()) return
    setSummaryLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    const lines = summaryText.split('. ').filter(Boolean)
    const condensed = lines.slice(0, Math.ceil(lines.length / 2)).join('. ') + '.'
    setSummary(condensed || 'No content to summarize.')
    setSummaryLoading(false)
  }

  const generateMCQ = async () => {
    if (!mcqTopic.trim()) return
    setMcqLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    const generated = Array.from({ length: 5 }, (_, i) => ({
      q: `Practice question #${i + 1} about "${mcqTopic}"?`,
      options: [
        `Option A for Q${i + 1}`,
        `Option B for Q${i + 1}`,
        `Option C for Q${i + 1}`,
        `Option D for Q${i + 1}`,
      ],
      answer: Math.floor(Math.random() * 4),
    }))
    setMcqQuestions(generated)
    setMcqSelected({})
    setMcqLoading(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">Exam Prep</h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Flashcards, practice MCQs & guided summaries.
      </p>

      <div className="mt-5 flex gap-1 rounded-lg bg-gray-100 p-1 sm:mt-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              tab === key ? 'bg-surface text-deep shadow-sm' : 'text-ink-muted hover:text-deep'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'flashcards' && (
        <div className="mt-6 sm:mt-8">
          <div
            onClick={() => setFlipped(!flipped)}
            className="flex min-h-[200px] cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-surface p-6 shadow-sm transition-all hover:shadow-md sm:min-h-[220px] sm:p-8"
          >
            <p className="text-center text-base text-deep sm:text-lg">
              {flipped
                ? sampleCards[cardIndex].back
                : sampleCards[cardIndex].front}
            </p>
          </div>
          <p className="mt-2 text-center text-xs text-ink-muted">Tap card to flip</p>
          <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
            <button onClick={prevCard} className="rounded-lg border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 sm:px-4 sm:text-sm">
              Previous
            </button>
            <span className="text-xs text-ink-muted sm:text-sm">
              {cardIndex + 1} / {sampleCards.length}
            </span>
            <button onClick={nextCard} className="rounded-lg border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 sm:px-4 sm:text-sm">
              Next
            </button>
          </div>
        </div>
      )}

      {tab === 'mcq' && (
        <div className="mt-6 sm:mt-8">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={mcqTopic}
              onChange={(e) => setMcqTopic(e.target.value)}
              placeholder="Enter a topic..."
              className="flex-1 rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
            />
            <button
              onClick={generateMCQ}
              disabled={mcqLoading || !mcqTopic.trim()}
              className="w-full rounded-lg bg-deep px-5 py-2.5 text-sm font-medium text-white hover:bg-deep-light disabled:opacity-50 sm:w-auto"
            >
              {mcqLoading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {mcqQuestions.length > 0 && (
            <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
              {mcqQuestions.map((q, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-surface p-4 sm:p-5">
                  <p className="mb-3 text-sm font-medium text-deep sm:text-base">{i + 1}. {q.q}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, j) => {
                      const isSelected = mcqSelected[i] === j
                      const isCorrect = q.answer === j
                      const showResult = mcqSelected[i] !== undefined
                      let cls = 'flex w-full items-center rounded-lg border px-3 py-2.5 text-left text-sm sm:px-4 '
                      if (showResult && isCorrect) cls += 'border-green-400 bg-green-50 text-green-800'
                      else if (showResult && isSelected && !isCorrect) cls += 'border-red-400 bg-red-50 text-red-800'
                      else if (isSelected) cls += 'border-blue bg-blue/5 text-deep'
                      else cls += 'border-gray-200 text-ink-muted hover:border-gray-300'
                      return (
                        <button key={j} disabled={showResult} onClick={() => setMcqSelected((p) => ({ ...p, [i]: j }))} className={cls}>
                          <span className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                            {String.fromCharCode(65 + j)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div className="mt-6 sm:mt-8">
          <div className="flex flex-col gap-3">
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="Paste or type the text you want to summarize..."
              rows={6}
              className="w-full rounded-lg border border-gray-300 bg-surface px-4 py-3 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 resize-y"
            />
            <button
              onClick={generateSummary}
              disabled={summaryLoading || !summaryText.trim()}
              className="w-full rounded-lg bg-deep px-6 py-2.5 text-sm font-medium text-white hover:bg-deep-light disabled:opacity-50 sm:w-auto sm:self-start"
            >
              {summaryLoading ? 'Summarizing...' : 'Summarize'}
            </button>
          </div>
          {summary && (
            <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:mt-6 sm:p-5">
              <h3 className="mb-2 text-xs font-semibold text-gold sm:text-sm">Guided Summary</h3>
              <p className="text-sm text-deep leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
