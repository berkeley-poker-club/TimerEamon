import { useCallback, useEffect, useState } from 'react'

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => document.fullscreenElement !== null)
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])
  return { isFullscreen, toggle, supported: document.fullscreenEnabled }
}
