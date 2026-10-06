import { useState } from 'react'
import {
  defaultStructure,
  formatClock,
  makeBreak,
  makeLevel,
  newId,
  parseClock,
  type Level,
  type LevelType,
} from './structure'
import { pad2 } from './ui'

interface DraftRow {
  id: string
  type: LevelType
  sb: string
  bb: string
  ante: string
  minutes: string
}

export interface EditResult {
  levels: Level[]
  /** null keeps whichever level is live when the save lands. */
  currentId: string | null
  /** null leaves the running clock alone. */
  remainingMs: number | null
}

interface Props {
  levels: Level[]
  liveIndex: number
  liveRemainingMs: number
  onSave: (result: EditResult) => void
}

const toDraft = (l: Level): DraftRow => ({
  id: l.id,
  type: l.type,
  sb: String(l.sb),
  bb: String(l.bb),
  ante: String(l.ante),
  minutes: String(l.minutes),
})

const isWhole = (s: string) => /^\d+$/.test(s.trim())
const isPositive = (s: string) => /^\d+(\.\d+)?$/.test(s.trim()) && Number(s) > 0

export default function StructureEditor({ levels, liveIndex, liveRemainingMs, onSave }: Props) {
  const [rows, setRows] = useState<DraftRow[]>(() => levels.map(toDraft))
  const [rowsDirty, setRowsDirty] = useState(false)
  /** Set when the TD picks a level to jump to; otherwise the live level stays current. */
  const [jumpId, setJumpId] = useState<string | null>(null)
  /** Typed time remaining; empty means "don't touch the clock". */
  const [remaining, setRemaining] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [syncedLevels, setSyncedLevels] = useState(levels)

  const dirty = rowsDirty || jumpId !== null || remaining !== ''

  // Follow the live structure (e.g. Restore from another window) until the TD starts editing.
  if (!rowsDirty && syncedLevels !== levels) {
    setSyncedLevels(levels)
    setRows(levels.map(toDraft))
  }

  const liveId = levels[liveIndex]?.id
  const currentId = jumpId ?? liveId

  const editRows = (fn: (rs: DraftRow[]) => DraftRow[]) => {
    setRows(fn)
    setRowsDirty(true)
  }

  const update = (id: string, patch: Partial<DraftRow>) =>
    editRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const jumpTo = (row: DraftRow) => {
    setJumpId(row.id)
    setRemaining(formatClock((Number(row.minutes) || 0) * 60_000))
  }

  const move = (i: number, dir: -1 | 1) =>
    editRows((rs) => {
      const j = i + dir
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const remove = (i: number) => {
    const row = rows[i]
    const next = rows.filter((_, k) => k !== i)
    editRows(() => next)
    if (row.id === currentId && next.length > 0) jumpTo(next[Math.min(i, next.length - 1)])
  }

  const add = (type: LevelType) => {
    const lastLevel = [...rows].reverse().find((r) => r.type === 'level')
    const row: DraftRow =
      type === 'break'
        ? toDraft(makeBreak(10))
        : lastLevel
          ? { ...lastLevel, id: newId() }
          : toDraft(makeLevel(25, 50, 0))
    editRows((rs) => [...rs, row])
  }

  const restoreDefault = () => {
    const d = defaultStructure().map(toDraft)
    editRows(() => d)
    jumpTo(d[0])
  }

  const discard = () => {
    setRows(levels.map(toDraft))
    setSyncedLevels(levels)
    setRowsDirty(false)
    setJumpId(null)
    setRemaining('')
    setShowErrors(false)
  }

  const rowInvalid = (r: DraftRow) => ({
    sb: r.type === 'level' && !isWhole(r.sb),
    bb: r.type === 'level' && !isWhole(r.bb),
    ante: r.type === 'level' && !isWhole(r.ante),
    minutes: !isPositive(r.minutes),
  })
  const parsedRemaining = remaining.trim() === '' ? null : parseClock(remaining)
  const remainingInvalid = remaining.trim() !== '' && parsedRemaining === null
  const errors: string[] = []
  if (rows.length === 0) errors.push('The structure needs at least one level.')
  if (rows.some((r) => Object.values(rowInvalid(r)).some(Boolean)))
    errors.push('Blinds and antes must be whole numbers, and every row needs minutes greater than 0.')
  if (remainingInvalid) errors.push('Time remaining must look like 12:30 or 1:05:00.')

  const save = () => {
    if (errors.length > 0) {
      setShowErrors(true)
      return
    }
    const out: Level[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      sb: r.type === 'level' ? Number(r.sb) : 0,
      bb: r.type === 'level' ? Number(r.bb) : 0,
      ante: r.type === 'level' ? Number(r.ante) : 0,
      minutes: Number(r.minutes),
    }))
    onSave({ levels: out, currentId: jumpId, remainingMs: parsedRemaining })
    // The saved levels come back as props; adopt them as the new baseline.
    setRowsDirty(false)
    setJumpId(null)
    setRemaining('')
    setShowErrors(false)
  }

  const currentRowIndex = rows.findIndex((r) => r.id === currentId)
  const currentLabel = (() => {
    const r = rows[currentRowIndex]
    if (!r) return 'current level'
    if (r.type === 'break') return 'break'
    return `level ${rows.slice(0, currentRowIndex + 1).filter((x) => x.type === 'level').length}`
  })()

  let levelCount = 0

  return (
    <section className="editor" aria-labelledby="editor-title">
      <header className="editor-header">
        <h2 id="editor-title">Structure</h2>
        <div className="remaining-field">
          <label htmlFor="remaining" className="label">Set time remaining on {currentLabel}</label>
          <input
            id="remaining"
            className={showErrors && remainingInvalid ? 'invalid' : ''}
            value={remaining}
            inputMode="numeric"
            placeholder={jumpId ? 'mm:ss' : `${formatClock(liveRemainingMs)} (live)`}
            onChange={(e) => setRemaining(e.target.value)}
          />
        </div>
      </header>

      <div className="table-wrap">
        <table className="structure-table">
          <thead>
            <tr>
              <th className="label">Lvl</th>
              <th className="label">Small</th>
              <th className="label">Big</th>
              <th className="label">Ante</th>
              <th className="label">Min</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const bad = showErrors ? rowInvalid(r) : { sb: false, bb: false, ante: false, minutes: false }
              const isCurrent = r.id === currentId
              const label = r.type === 'break' ? 'Break' : pad2(++levelCount)
              return (
                <tr key={r.id} className={`${r.type}${isCurrent ? ' current' : ''}`}>
                  <td className={`row-label${r.type === 'break' ? ' serif' : ''}`}>{label}</td>
                  {r.type === 'level' ? (
                    (['sb', 'bb', 'ante'] as const).map((k) => (
                      <td key={k}>
                        <input
                          className={bad[k] ? 'invalid' : ''}
                          value={r[k]}
                          inputMode="numeric"
                          aria-label={`${k} for level ${label}`}
                          onChange={(e) => update(r.id, { [k]: e.target.value })}
                        />
                      </td>
                    ))
                  ) : (
                    <td colSpan={3} className="break-cell label">
                      Players rest
                    </td>
                  )}
                  <td>
                    <input
                      className={`minutes${bad.minutes ? ' invalid' : ''}`}
                      value={r.minutes}
                      inputMode="decimal"
                      aria-label={`minutes for ${r.type === 'break' ? 'break' : `level ${label}`}`}
                      onChange={(e) => update(r.id, { minutes: e.target.value })}
                    />
                  </td>
                  <td className="row-actions">
                    <button
                      className={isCurrent ? 'jump active' : 'jump'}
                      onClick={() => jumpTo(r)}
                      title="Make this the current level"
                    >
                      {isCurrent ? (jumpId ? 'Jump here' : 'Live') : 'Jump'}
                    </button>
                    <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up" aria-label="Move up">
                      ↑
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      title="Move down"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button className="danger" onClick={() => remove(i)} title="Delete" aria-label="Delete">
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="editor-add">
        <button onClick={() => add('level')}>+ Level</button>
        <button onClick={() => add('break')}>+ Break</button>
        <button className="subtle" onClick={restoreDefault}>
          Restore default structure
        </button>
      </div>

      {showErrors && errors.length > 0 && (
        <ul className="editor-errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <footer className="editor-footer">
        <span className="editor-status label">{dirty ? 'Unsaved changes' : 'In sync with the display'}</span>
        <button onClick={discard} disabled={!dirty}>
          Cancel
        </button>
        <button className="primary" onClick={save} disabled={!dirty}>
          Save
        </button>
      </footer>
    </section>
  )
}
