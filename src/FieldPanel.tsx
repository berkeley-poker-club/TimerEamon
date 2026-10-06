import { useState } from 'react'
import { formatChips } from './structure'
import { averageStack, type Field } from './timer'

interface Props {
  field: Field
  bigBlind: number | null
  onChange: (patch: Partial<Field>) => void
}

/** A whole-number input that saves on every valid keystroke and follows updates from elsewhere. */
function CountInput({ id, value, onCommit }: { id: string; value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value))
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setText(String(value))
  }
  const valid = /^\d+$/.test(text.replace(/,/g, '').trim())
  return (
    <input
      id={id}
      className={valid ? '' : 'invalid'}
      value={text}
      inputMode="numeric"
      onChange={(e) => {
        setText(e.target.value)
        const clean = e.target.value.replace(/,/g, '').trim()
        if (/^\d+$/.test(clean)) onCommit(Number(clean))
      }}
      onBlur={() => setText(String(value))}
    />
  )
}

export default function FieldPanel({ field, bigBlind, onChange }: Props) {
  const avg = averageStack(field)
  return (
    <section className="field-panel" aria-labelledby="field-title">
      <h2 id="field-title" className="label">
        Field
      </h2>
      <div className="field-cell">
        <label htmlFor="starting-stack" className="label">
          Starting stack
        </label>
        <CountInput id="starting-stack" value={field.startingStack} onCommit={(n) => onChange({ startingStack: n })} />
      </div>
      <div className="field-cell">
        <label htmlFor="entries" className="label">
          Entries <span className="hint">incl. re-entries</span>
        </label>
        <CountInput id="entries" value={field.entries} onCommit={(n) => onChange({ entries: n })} />
      </div>
      <div className="field-cell">
        <label htmlFor="remaining-players" className="label">
          Players left
        </label>
        <div className="stepper">
          <button
            onClick={() => onChange({ remaining: Math.max(0, field.remaining - 1) })}
            disabled={field.remaining === 0}
            aria-label="One player busted"
            title="One player busted"
          >
            −
          </button>
          <CountInput id="remaining-players" value={field.remaining} onCommit={(n) => onChange({ remaining: n })} />
          <button
            onClick={() => onChange({ remaining: field.remaining + 1 })}
            aria-label="Add a player"
            title="Add a player"
          >
            +
          </button>
        </div>
      </div>
      <div className="field-cell field-avg">
        <span className="label">Avg stack</span>
        <span className="field-avg-value">{avg !== null ? formatChips(avg) : '—'}</span>
        {avg !== null && bigBlind !== null && bigBlind > 0 && (
          <span className="label field-bb">{Math.round(avg / bigBlind)} BB</span>
        )}
      </div>
    </section>
  )
}
