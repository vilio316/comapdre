'use client'

import { useState } from 'react'

export default function MCQPage() {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [questions, setQuestions] = useState<{ q: string; options: string[]; answer: number }[]>([])
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))

    const generated = Array.from({ length: count }, (_, i) => ({
      q: `Sample question #${i + 1} about "${topic}"?`,
      options: [
        `Option A for Q${i + 1}`,
        `Option B for Q${i + 1}`,
        `Option C for Q${i + 1}`,
        `Option D for Q${i + 1}`,
      ],
      answer: Math.floor(Math.random() * 4),
    }))
    setQuestions(generated)
    setSelected({})
    setLoading(false)
  }

  const score = Object.entries(selected).filter(
    ([i, v]) => questions[Number(i)]?.answer === v
  ).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-deep sm:text-3xl">MCQ Generation</h1>
      <p className="mt-1 text-sm text-ink-muted sm:mt-2 sm:text-base">
        Generate practice questions on any topic.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-ink-muted">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis, WW2, Calculus..."
            className="w-full rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </div>
        <div className="sm:w-24">
          <label className="mb-1 block text-sm font-medium text-ink-muted">Count</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-surface px-3 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          >
            {[3, 5, 10, 15].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="w-full rounded-lg bg-deep px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-deep-light disabled:opacity-50 sm:w-auto"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-8 sm:mt-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              Score: <span className="font-semibold text-deep">{score}/{questions.length}</span>
            </p>
            <button
              onClick={() => { setSelected({}); setQuestions([]); setTopic('') }}
              className="text-sm text-ink-muted underline hover:text-deep"
            >
              Clear
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-surface p-4 sm:p-5">
                <p className="mb-3 text-sm font-medium text-deep sm:text-base">{i + 1}. {q.q}</p>
                <div className="space-y-2">
                  {q.options.map((opt, j) => {
                    const isSelected = selected[i] === j
                    const isCorrect = q.answer === j
                    const showResult = selected[i] !== undefined
                    let className = 'flex w-full items-center rounded-lg border px-3 py-2.5 text-left text-sm transition-colors sm:px-4 '
                    if (showResult && isCorrect) {
                      className += 'border-green-400 bg-green-50 text-green-800'
                    } else if (showResult && isSelected && !isCorrect) {
                      className += 'border-red-400 bg-red-50 text-red-800'
                    } else if (isSelected) {
                      className += 'border-blue bg-blue/5 text-deep'
                    } else {
                      className += 'border-gray-200 text-ink-muted hover:border-gray-300'
                    }
                    return (
                      <button
                        key={j}
                        disabled={showResult}
                        onClick={() => setSelected((prev) => ({ ...prev, [i]: j }))}
                        className={className}
                      >
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
        </div>
      )}
    </div>
  )
}
