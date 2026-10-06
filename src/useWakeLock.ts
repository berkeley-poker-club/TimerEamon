import { useEffect, useState } from 'react'

export type WakeLockStatus = 'unsupported' | 'active' | 'inactive'

/** Keeps the screen awake while the page is visible, re-acquiring after tab switches. */
export function useWakeLock(): WakeLockStatus {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!supported) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void s.release()
          return
        }
        sentinel = s
        setActive(true)
        s.addEventListener('release', () => setActive(false))
      } catch {
        setActive(false)
      }
    }

    const retry = () => void request()
    void request()
    document.addEventListener('visibilitychange', retry)
    // Some browsers refuse until the user has interacted with the page.
    window.addEventListener('pointerdown', retry)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', retry)
      window.removeEventListener('pointerdown', retry)
      void sentinel?.release()
    }
  }, [supported])

  if (!supported) return 'unsupported'
  return active ? 'active' : 'inactive'
}
