import { useEffect, useState } from 'react'
import { Clock, Digits } from '../Digits'
import Logo from '../Logo'
import { playChime, unlockAudio } from '../sound'
import { useTournament } from '../store'
import { formatChips, formatClock, levelNumber, type Level } from '../structure'
import Suit from '../Suit'
import { describeClock, type Field } from '../timer'
import { fit, pad2, stagger, SUIT_CYCLE } from '../ui'
import { useFullscreen } from '../useFullscreen'
import { useIdle } from '../useIdle'
import { useWakeLock } from '../useWakeLock'
import './display.css'

const IDLE_MS = 3000
const HOUR = 3_600_000

function openControls(): boolean {
  // Named so a second click focuses the existing controls window instead of opening another.
  return window.open('?view=control', 'pab-controls', 'popup,width=1000,height=800') !== null
}

// Blinds and antes are fixed for a whole level, so they keep the font's natural spacing;
// only countdowns use <Digits> cells.
const blindsText = (level: Level) => `${formatChips(level.sb)}/${formatChips(level.bb)}`

function Blinds({ level }: { level: Level }) {
  return (
    <>
      {formatChips(level.sb)}
      <span className="sep">/</span>
      {formatChips(level.bb)}
    </>
  )
}

const upNextText = (level: Level | undefined) => {
  if (!level) return 'end of structure'
  if (level.type === 'break') return `break ${level.minutes} min`
  return blindsText(level) + (level.ante > 0 ? ` ante ${formatChips(level.ante)}` : '')
}

function UpNext({ level }: { level: Level | undefined }) {
  if (!level) return <span className="serif">end of structure</span>
  if (level.type === 'break')
    return (
      <>
        <span className="serif">break</span> {level.minutes}
        <span className="unit label">min</span>
      </>
    )
  return (
    <>
      <Blinds level={level} />
      {level.ante > 0 && (
        <span className="ante">
          <span className="serif">ante</span> {formatChips(level.ante)}
        </span>
      )}
    </>
  )
}

function StackFacts({ field, avg, bigBlind }: { field: Field; avg: number | null; bigBlind: number | null }) {
  if (avg === null) return null
  return (
    <div className="stack-facts">
      <div className="label">Avg stack</div>
      <div className="stack-value">{formatChips(avg)}</div>
      <div className="label side-meta">{field.remaining}/{field.entries} left</div>
      {bigBlind ? <div className="label side-meta">{Math.round(avg / bigBlind)} BB</div> : null}
    </div>
  )
}

/** The projector screen: read-only, big type, no controls beyond a toolbar that hides itself. */
export default function DisplayView() {
  const { timer, now } = useTournament()
  const fullscreen = useFullscreen()
  const toggleFullscreen = fullscreen.toggle
  const wakeLock = useWakeLock()
  const idle = useIdle(IDLE_MS)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const c = describeClock(timer, now)
  const { levels, index, running } = timer

  // Only this window chimes, so the sound comes out of the projector/room speakers.
  useEffect(() => {
    if (timer.alerts > 0) playChime()
  }, [timer.alerts])

  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio)
    window.addEventListener('keydown', unlockAudio)
    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFullscreen])

  const paused = !running && !c.finished
  const boardClass = [
    'board',
    c.isBreak ? 'is-break' : 'is-level',
    running ? 'is-running' : '',
    paused ? 'is-paused' : '',
    c.finished ? 'is-finished' : '',
    c.lastMinute ? 'is-warning' : '',
    idle ? 'is-idle' : '',
  ].join(' ')
  const clockClass = `clock${c.left >= HOUR ? ' clock-long' : ''}`
  const suit = SUIT_CYCLE[index % SUIT_CYCLE.length]
  const totalLevels = levels.filter((l) => l.type === 'level').length
  const levelsLeft = levels.slice(index + 1).filter((l) => l.type === 'level').length

  const statusRule = (
    <div className="status-rule" aria-live="polite">
      <span>{c.finished ? 'Finished' : 'Paused'}</span>
    </div>
  )

  return (
    <div className={boardClass}>
      <Suit key={suit} suit={suit} className="bg-suit" />
      <div className="grain" aria-hidden />
      {/* Keyed on the level so it replays (sweep, slide-up) every time the level changes. */}
      <div key={`sweep-${c.level.id}`} className="sweep" aria-hidden />

      <div className="toolbar" aria-hidden={idle}>
        {wakeLock !== 'unsupported' && (
          <span className="toolbar-note">{wakeLock === 'active' ? 'Screen stays on' : 'Screen may sleep'}</span>
        )}
        {popupBlocked && <span className="toolbar-note">Popup blocked: allow popups</span>}
        <button onClick={playChime}>Test sound</button>
        {fullscreen.supported && (
          <button onClick={toggleFullscreen}>{fullscreen.isFullscreen ? 'Exit full' : 'Fullscreen'}</button>
        )}
        <button className="primary" onClick={() => setPopupBlocked(!openControls())}>
          Open controls
        </button>
      </div>

      {c.isBreak ? (
        <>
          <section className="cell cell-hero reveal" style={stagger(0)}>
            <Logo className="corner-logo" />
            <div className="break-hero">
              <span className="break-word serif">Break</span>
              <Clock ms={c.left} className={clockClass} />
            </div>
            {statusRule}
          </section>
          <section className="cell cell-resume reveal" style={stagger(1)}>
            <div className="label">Resumes with</div>
            <div className="slot">
              <div key={c.level.id} className="resume-value fit slide-up" style={fit(upNextText(c.next))}>
                <UpNext level={c.next} />
              </div>
            </div>
          </section>
          <aside className="cell cell-resume-level reveal" style={stagger(2)}>
            <div className="label">Level</div>
            <div className="strip-value">
              {c.next?.type === 'level' ? pad2(levelNumber(levels, index + 1)) : '—'}
            </div>
            <StackFacts field={timer.field} avg={c.averageStack} bigBlind={c.bigBlind} />
          </aside>
        </>
      ) : (
        <>
          <section className="cell cell-clock reveal" style={stagger(0)}>
            <Logo className="corner-logo" />
            <Clock ms={c.left} className={clockClass} />
            {statusRule}
          </section>

          <aside
            className={`cell cell-side reveal${c.averageStack !== null ? ' has-stack' : ''}`}
            style={stagger(1)}
          >
            <div className="side-level">
              <div className="label">Level</div>
              <div className="slot">
                <div key={c.level.id} className="level-num slide-up">
                  {pad2(levelNumber(levels, index))}
                </div>
              </div>
              <div className="label side-meta">
                of {pad2(totalLevels)} · {c.level.minutes} min
              </div>
            </div>
            <StackFacts field={timer.field} avg={c.averageStack} bigBlind={c.bigBlind} />
          </aside>

          <section className="cell cell-blinds reveal" style={stagger(2)}>
            <div className="label">Blinds</div>
            <div className="slot">
              <div key={c.level.id} className="blinds fit slide-up" style={fit(blindsText(c.level))}>
                <Blinds level={c.level} />
              </div>
            </div>
          </section>

          <section className="cell cell-ante reveal" style={stagger(3)}>
            <div className="slot">
              <div key={c.level.id} className="ante-cell slide-up">
                <span className="serif ante-word">{c.level.ante > 0 ? 'ante' : 'no ante'}</span>
                {c.level.ante > 0 && (
                  <span className="ante-value fit" style={fit(formatChips(c.level.ante))}>
                    {formatChips(c.level.ante)}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="cell cell-next reveal" style={stagger(4)}>
            <div className="label">Next</div>
            <div className="strip-value fit" style={fit(upNextText(c.next))}>
              <UpNext level={c.next} />
            </div>
          </section>

          <section className="cell cell-breakin reveal" style={stagger(5)}>
            <div className="label">{c.nextBreakIn !== null ? 'Break in' : 'Levels left'}</div>
            <div className="strip-value">
              <Digits text={c.nextBreakIn !== null ? formatClock(c.nextBreakIn) : pad2(levelsLeft)} />
            </div>
          </section>
        </>
      )}

      <div className="edge-progress" aria-hidden>
        <div style={{ transform: `scaleX(${c.progress})` }} />
      </div>
    </div>
  )
}
