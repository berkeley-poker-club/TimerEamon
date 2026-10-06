import { useEffect, useState } from 'react'

/** True once the mouse and keyboard have been quiet for `ms`. */
export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), ms)
    const wake = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), ms)
    }
    const events = ['mousemove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [ms])
  return idle
}
