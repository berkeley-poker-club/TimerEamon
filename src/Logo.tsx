import { useState } from 'react'

/** The club logo from public/logo-transparent.png (a transparent cut of logo.png); renders nothing if the file is missing. */
export default function Logo({ className }: { className?: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return null
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}logo-transparent.png`}
      alt="Poker at Berkeley"
      onError={() => setMissing(true)}
    />
  )
}
