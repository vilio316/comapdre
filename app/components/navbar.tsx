'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/mcq', label: 'MCQ' },
  { href: '/exam-prep', label: 'Exam Prep' },
  { href: '/ocr', label: 'OCR' },
  { href: '/documents', label: 'Documents' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-deep shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="text-xl font-bold tracking-tight text-gold">Compadre</span>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center rounded-md p-1.5 text-blue-light hover:text-gold-light sm:hidden"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gold text-deep'
                    : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {open && (
        <nav className="border-t border-deep-light px-4 pb-3 pt-2 sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map(({ href, label }) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gold text-deep'
                      : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}
