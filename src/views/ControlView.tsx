import { useEffect } from 'react'
import { Clock, Digits } from '../Digits'
import FieldPanel from '../FieldPanel'
import Logo from '../Logo'
import StructureEditor from '../StructureEditor'
import { dispatch, useTournament } from '../store'
import { formatChips, formatClock, levelNumber, type Level } from '../structure'
import { describeClock } from '../timer'
import { pad2 } from '../ui'
import './control.css'

const MINUTE = 60_000

function LevelValue({ level }: { level: Level | undefined }) {
  if (!level) return <span className="serif">end of structure</span>
  if (level.type === 'break')
    return (
      <>
        <span className="serif">break</span> <Digits text={String(level.minutes)} />
        <span className="unit label">min</span>
      </>
    )
  return (
    <>
      <Digits text={`${formatChips(level.sb)} / ${formatChips(level.bb)}`} />
      {level.ante > 0 && (
        <span className="ante">
          <span className="serif">ante</span> <Digits text={formatChips(level.ante)} />
        </span>
      )}
    </>
  )
}

/** The TD's window: transport controls and the structure editor. Never chimes. */
export default function ControlView() {
  const { timer, now } = useTournament()
  const c = describeClock(timer, now)
  const { running, index, levels } = timer
  const paused = !running && !c.finished

  useEffect(() => {
    document.title = 'Controls · Tournament Clock'
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const handlers: Record<string, () => void> = {
        ' ': () => dispatch({ type: running ? 'pause' : 'start' }),
        ArrowRight: () => dispatch({ type: 'goto', index: index + 1 }),
        ArrowLeft: () => dispatch({ type: 'goto', index: index - 1 }),
        ArrowUp: () => dispatch({ type: 'adjust', deltaMs: MINUTE }),
        ArrowDown: () => dispatch({ type: 'adjust', deltaMs: -MINUTE }),
        '+': () => dispatch({ type: 'adjust', deltaMs: MINUTE }),
        '=': () => dispatch({ type: 'adjust', deltaMs: MINUTE }),
        '-': () => dispatch({ type: 'adjust', deltaMs: -MINUTE }),
      }
      const handler = handlers[e.key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, index])

  const consoleClass = [
    'console',
    running ? 'is-running' : '',
    c.lastMinute ? 'is-warning' : '',
    c.isBreak ? 'is-break' : '',
  ].join(' ')

  return (
    <div className={consoleClass}>
      <header className="console-head">
        <Logo className="console-logo" />
        <span className="label">Tournament controls</span>
        <span className="label console-state">{c.finished ? 'Finished' : running ? 'Running' : 'Paused'}</span>
      </header>

      <section className="console-status">
        <div className="status-clock-cell">
          <div className="label">
            {c.isBreak ? 'Break' : `Level ${pad2(levelNumber(levels, index))}`}
          </div>
          <Clock ms={c.left} className="console-clock" />
          <div className="status-rule" style={{ visibility: paused || c.finished ? 'visible' : 'hidden' }}>
            <span>{c.finished ? 'Finished' : 'Paused'}</span>
          </div>
        </div>
        <dl className="status-facts">
          <div>
            <dt className="label">{c.isBreak ? 'On' : 'Blinds'}</dt>
            <dd>
              <LevelValue level={c.level} />
            </dd>
          </div>
          <div>
            <dt className="label">Next</dt>
            <dd>
              <LevelValue level={c.next} />
            </dd>
          </div>
          <div>
            <dt className="label">Break in</dt>
            <dd>{c.nextBreakIn !== null ? <Digits text={formatClock(c.nextBreakIn)} /> : '—'}</dd>
          </div>
        </dl>
        <div className="console-progress" aria-hidden>
          <div style={{ transform: `scaleX(${c.progress})` }} />
        </div>
      </section>

      <nav className="transport" aria-label="Clock controls">
        <button onClick={() => dispatch({ type: 'goto', index: index - 1 })} disabled={index === 0}>
          ← Prev
        </button>
        <button onClick={() => dispatch({ type: 'adjust', deltaMs: -MINUTE })}>−1 min</button>
        <button
          className="primary"
          onClick={() => dispatch({ type: running ? 'pause' : 'start' })}
          disabled={c.finished}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={() => dispatch({ type: 'adjust', deltaMs: MINUTE })}>+1 min</button>
        <button onClick={() => dispatch({ type: 'goto', index: index + 1 })} disabled={index === levels.length - 1}>
          Next →
        </button>
      </nav>
      <p className="shortcuts">Space start/pause · ←/→ level · ↑/↓ ±1 min</p>

      <FieldPanel
        field={timer.field}
        bigBlind={c.bigBlind}
        onChange={(patch) => dispatch({ type: 'field', patch })}
      />

      <StructureEditor
        levels={levels}
        liveIndex={index}
        liveRemainingMs={c.left}
        onSave={(r) => dispatch({ type: 'edit', ...r })}
      />
    </div>
  )
}
