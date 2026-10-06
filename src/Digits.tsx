import { Fragment } from 'react'
import { formatClock } from './structure'

/** Renders text with every digit in a fixed-width cell so numbers never jiggle. */
export function Digits({ text }: { text: string }) {
  return (
    <>
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="digit">
            {ch}
          </span>
        ) : ch === ':' ? (
          <span key={i} className="colon">
            :
          </span>
        ) : (
          <Fragment key={i}>{ch}</Fragment>
        ),
      )}
    </>
  )
}

export function Clock({ ms, className }: { ms: number; className?: string }) {
  const text = formatClock(ms)
  return (
    <div className={className} role="timer" aria-label={text}>
      <Digits text={text} />
    </div>
  )
}

