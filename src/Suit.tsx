import type { SuitName } from './ui'

// Drawn as SVG rather than text so ♥/♦ never render as colour emoji.
const PATHS: Record<SuitName, string> = {
  spade:
    'M50 4C36 24 8 38 8 59c0 13 10 22 22 22 8 0 14-4 17-9-1 10-5 18-12 24h30c-7-6-11-14-12-24 3 5 9 9 17 9 12 0 22-9 22-22C92 38 64 24 50 4Z',
  heart:
    'M50 92C22 70 5 53 5 33 5 17 17 6 31 6c9 0 16 5 19 12 3-7 10-12 19-12 14 0 26 11 26 27 0 20-17 37-45 59Z',
  club:
    'M50 8a19 19 0 0 0-17 28 19 19 0 1 0 11 33c-1 11-5 19-12 26h36c-7-7-11-15-12-26a19 19 0 1 0 11-33A19 19 0 0 0 50 8Z',
  diamond: 'M50 3 87 50 50 97 13 50Z',
}

export default function Suit({ suit, className }: { suit: SuitName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden focusable="false">
      <path d={PATHS[suit]} fill="currentColor" />
    </svg>
  )
}
