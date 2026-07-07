'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/app/context/auth-context'

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const inDashboard = pathname.startsWith('/dashboard')

  return (
    <header className="sticky top-0 z-50 bg-deep shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2" onClick={() => setOpen(false)}>
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
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  inDashboard && pathname === '/dashboard'
                    ? 'bg-gold text-deep'
                    : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/mcq"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard/mcq'
                    ? 'bg-gold text-deep'
                    : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                }`}
              >
                MCQ
              </Link>
              <Link
                href="/dashboard/exam-prep"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard/exam-prep'
                    ? 'bg-gold text-deep'
                    : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                }`}
              >
                Exam Prep
              </Link>
              <Link
                href="/dashboard/ocr"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard/ocr'
                    ? 'bg-gold text-deep'
                    : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                }`}
              >
                OCR
              </Link>
              <Link
                href="/dashboard/documents"
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === '/dashboard/documents'
                    ? 'bg-gold text-deep'
                    : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                }`}
              >
                Documents
              </Link>
              <button
                onClick={logout}
                className="ml-2 rounded-md px-3 py-1.5 text-sm font-medium text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {pathname !== '/' && (
                <Link
                  href="/"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === '/'
                      ? 'bg-gold text-deep'
                      : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
                  }`}
                >
                  Home
                </Link>
              )}
              <Link
                href="/auth/sign-in"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-light transition-colors hover:bg-deep-light hover:text-gold-light"
              >
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-deep transition-colors hover:bg-gold-light"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>

      {open && (
        <nav className="border-t border-deep-light px-4 pb-3 pt-2 sm:hidden">
          <div className="flex flex-col gap-1">
            {user ? (
              <>
                <MobileLink href="/dashboard" label="Dashboard" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/mcq" label="MCQ" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/exam-prep" label="Exam Prep" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/ocr" label="OCR" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/dashboard/documents" label="Documents" pathname={pathname} onClick={() => setOpen(false)} />
                <button onClick={() => { logout(); setOpen(false) }} className="rounded-md px-3 py-2 text-left text-sm font-medium text-blue-light hover:bg-deep-light hover:text-gold-light">
                  Sign out
                </button>
              </>
            ) : (
              <>
                {pathname !== '/' && <MobileLink href="/" label="Home" pathname={pathname} onClick={() => setOpen(false)} />}
                <MobileLink href="/auth/sign-in" label="Sign in" pathname={pathname} onClick={() => setOpen(false)} />
                <MobileLink href="/auth/sign-up" label="Sign up" pathname={pathname} onClick={() => setOpen(false)} gold />
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

function MobileLink({ href, label, pathname, onClick, gold }: { href: string; label: string; pathname: string; onClick: () => void; gold?: boolean }) {
  const isActive = pathname === href
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-gold text-deep'
          : gold
            ? 'bg-gold text-deep'
            : 'text-blue-light hover:bg-deep-light hover:text-gold-light'
      }`}
    >
      {label}
    </Link>
  )
}
