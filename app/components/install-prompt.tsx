'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'compadre-install-dismissed'

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

function isDev(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
      return
    }

    if (!isDev()) {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setVisible(true)
      }
      window.addEventListener('beforeinstallprompt', handler)

      if (isIOS()) {
        const timer = setTimeout(() => setVisible(true), 3000)
        return () => {
          window.removeEventListener('beforeinstallprompt', handler)
          clearTimeout(timer)
        }
      }

      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || isDev() || isStandalone()) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {}
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-surface p-4 shadow-lg sm:left-auto sm:right-4 sm:bottom-4 sm:w-80 sm:rounded-xl sm:border">
      <div className="flex items-start gap-3 sm:flex-col">
        <div className="flex-1">
          <p className="text-sm font-semibold text-deep">Install Compadre</p>
          {isIOS() && !deferredPrompt ? (
            <p className="mt-1 text-xs text-ink-muted">
              Tap the Share button <span className="inline-block align-middle text-sm">⎙</span> then scroll down and tap &quot;Add to Home Screen&quot;.
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Install this app on your device for quick access and offline use.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2 sm:mt-3 sm:w-full">
          {!isIOS() && deferredPrompt && (
            <button
              onClick={install}
              className="rounded-lg bg-deep px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-deep-light sm:flex-1"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-gray-50 sm:flex-1"
          >
            {isIOS() && !deferredPrompt ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  )
}
