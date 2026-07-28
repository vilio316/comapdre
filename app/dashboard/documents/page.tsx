'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import UploadPipeline from '@/app/components/upload-pipeline'
import type { UploadedFile } from '@/app/components/upload-pipeline'
import ConfirmDialog from '@/app/components/confirm-dialog'

interface Doc {
  id: string
  name: string
  type: string
  size: string
  uploaded: string
  tags: string[]
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        if (data.docs) setDocs(data.docs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchTag = !tagFilter || d.tags.includes(tagFilter)
    return matchSearch && matchTag
  })

  const allTags = [...new Set(docs.flatMap((d) => d.tags))]

  const handleUpload = (uf: UploadedFile, tags: string[]) => {
    const doc: Doc = {
      id: uf.id,
      name: uf.name,
      type: uf.type,
      size: uf.size,
      uploaded: new Date().toISOString().slice(0, 10),
      tags,
    }
    setDocs((prev) => [doc, ...prev])
    setShowUpload(false)
  }

  const handleDelete = async () => {
    if (!deleteKey) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(deleteKey)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setDocs((prev) => prev.filter((d) => d.id !== deleteKey))
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
      setDeleteKey(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-deep sm:text-3xl">Documents</h1>
          <p className="mt-0.5 text-sm text-ink-muted sm:mt-1 sm:text-base">
            Manage and organize your class materials.
          </p>
        </div>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="w-full rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light sm:w-auto"
          >
            + Upload
          </button>
        )}
      </div>

      {showUpload && (
        <div className="mb-6">
          <UploadPipeline
            onComplete={handleUpload}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 sm:min-w-[220px] sm:flex-1"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-surface px-3 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-deep" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-ink-muted">No documents found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-surface p-3 transition-colors hover:border-gold/40 sm:gap-4 sm:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-deep/5 text-xs font-bold text-deep sm:h-10 sm:w-10">
                {doc.type}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/documents/${encodeURIComponent(doc.id)}`}
                  className="truncate text-sm font-medium text-deep hover:text-gold transition-colors"
                >
                  {doc.name}
                </Link>
                <p className="text-xs text-ink-muted">{doc.size} &middot; {doc.uploaded}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {doc.tags.map((t) => (
                  <span key={t} className="rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href={`/dashboard/documents/${encodeURIComponent(doc.id)}`}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-ink-muted hover:bg-gray-50 sm:px-3"
              >
                Details
              </Link>
              <button
                onClick={() => setDeleteKey(doc.id)}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${doc.name}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteKey !== null}
        title="Delete document"
        message={`Are you sure you want to delete "${deleteKey}"? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) setDeleteKey(null) }}
      />
    </div>
  )
}
