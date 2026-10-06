import { defaultStructure, durationMs, levelNumber, type Level } from './structure'

/** Who is still in, for the average stack. */
export interface Field {
  startingStack: number
  /** Total buy-ins, including re-entries. */
  entries: number
  remaining: number
}

export interface TimerState {
  levels: Level[]
  index: number
  running: boolean
  /** Wall-clock time the current level ends; only meaningful while running. */
  endsAt: number | null
  /** Time left on the current level while paused. */
  remainingMs: number
  /** When a user last changed the state; lets windows ignore stale sync messages. */
  updatedAt: number
  field: Field
  /** Bumped whenever the clock rolls into a new level on its own; drives the chime. Not persisted. */
  alerts: number
}

export type PersistedState = Omit<TimerState, 'alerts'>

type WithNow<T> = T & { now: number }
export type TimerAction =
  | WithNow<{ type: 'start' }>
  | WithNow<{ type: 'pause' }>
  | WithNow<{ type: 'tick' }>
  | WithNow<{ type: 'goto'; index: number }>
  | WithNow<{ type: 'adjust'; deltaMs: number }>
  | WithNow<{
      type: 'edit'
      levels: Level[]
      /** null keeps whichever level is live right now. */
      currentId: string | null
      /** null keeps the live countdown (or a full level, if the current level changed). */
      remainingMs: number | null
    }>
  | WithNow<{ type: 'field'; patch: Partial<Field> }>

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type TimerCommand = DistributiveOmit<TimerAction, 'now'>

export function remainingMs(s: TimerState, now: number): number {
  return s.running && s.endsAt !== null ? Math.max(0, s.endsAt - now) : s.remainingMs
}

/** Advance past every level whose end time has already passed. */
export function catchUp(s: TimerState, now: number, alert: boolean): TimerState {
  if (!s.running || s.endsAt === null || now < s.endsAt) return s
  let index = s.index
  let endsAt = s.endsAt
  while (endsAt <= now && index < s.levels.length - 1) {
    index++
    endsAt += durationMs(s.levels[index])
  }
  const alerts = alert ? s.alerts + 1 : s.alerts
  if (endsAt <= now) {
    // Ran off the end of the structure.
    return { ...s, index, running: false, endsAt: null, remainingMs: 0, alerts }
  }
  return { ...s, index, endsAt, alerts }
}

function setPosition(s: TimerState, levels: Level[], index: number, rem: number, now: number): TimerState {
  const i = Math.min(Math.max(index, 0), levels.length - 1)
  const next = { ...s, levels, index: i, remainingMs: rem, endsAt: s.running ? now + rem : null }
  return catchUp(next, now, false)
}

export function timerReducer(s: TimerState, a: TimerAction): TimerState {
  switch (a.type) {
    case 'start':
      if (s.running || s.levels.length === 0) return s
      return catchUp({ ...s, running: true, endsAt: a.now + s.remainingMs }, a.now, true)
    case 'pause':
      if (!s.running) return s
      return { ...s, running: false, endsAt: null, remainingMs: remainingMs(s, a.now) }
    case 'tick':
      return catchUp(s, a.now, true)
    case 'goto': {
      const i = Math.min(Math.max(a.index, 0), s.levels.length - 1)
      if (i === s.index) return s
      return setPosition(s, s.levels, i, durationMs(s.levels[i]), a.now)
    }
    case 'adjust': {
      const rem = Math.max(0, remainingMs(s, a.now) + a.deltaMs)
      const next = { ...s, remainingMs: rem, endsAt: s.running ? a.now + rem : null }
      return catchUp(next, a.now, true)
    }
    case 'edit': {
      if (a.levels.length === 0) return s
      const liveId = s.levels[s.index]?.id
      const id = a.currentId ?? liveId
      let index = a.levels.findIndex((l) => l.id === id)
      const sameLevel = index !== -1 && id === liveId
      if (index === -1) index = Math.min(s.index, a.levels.length - 1)
      const rem = a.remainingMs ?? (sameLevel ? remainingMs(s, a.now) : durationMs(a.levels[index]))
      return setPosition(s, a.levels, index, rem, a.now)
    }
    case 'field': {
      const field = { ...s.field, ...a.patch }
      // Remaining tracks entries until players start busting (handy while registration is open).
      if (a.patch.entries !== undefined && a.patch.remaining === undefined) {
        if (s.field.remaining === 0 || s.field.remaining === s.field.entries) field.remaining = a.patch.entries
      }
      return { ...s, field }
    }
  }
}

export function averageStack(f: Field): number | null {
  if (f.entries <= 0 || f.remaining <= 0 || f.startingStack <= 0) return null
  return Math.round((f.startingStack * f.entries) / f.remaining)
}

const DEFAULT_FIELD: Field = { startingStack: 10_000, entries: 0, remaining: 0 }

export function freshState(): TimerState {
  const levels = defaultStructure()
  return {
    levels,
    index: 0,
    running: false,
    endsAt: null,
    remainingMs: durationMs(levels[0]),
    updatedAt: 0,
    field: { ...DEFAULT_FIELD },
    alerts: 0,
  }
}

export function toPersisted(s: TimerState): PersistedState {
  const { levels, index, running, endsAt, remainingMs, updatedAt, field } = s
  return { levels, index, running, endsAt, remainingMs, updatedAt, field }
}

function isLevel(x: unknown): x is Level {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  return (
    typeof l.id === 'string' &&
    (l.type === 'level' || l.type === 'break') &&
    ['sb', 'bb', 'ante', 'minutes'].every((k) => typeof l[k] === 'number' && Number.isFinite(l[k]))
  )
}

function parseField(x: unknown): Field {
  const f = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>
  const count = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : fallback
  return {
    startingStack: count(f.startingStack, DEFAULT_FIELD.startingStack),
    entries: count(f.entries, DEFAULT_FIELD.entries),
    remaining: count(f.remaining, DEFAULT_FIELD.remaining),
  }
}

/** Validates untrusted JSON (from storage or another window) into a TimerState, or null. */
export function parsePersisted(x: unknown): TimerState | null {
  if (typeof x !== 'object' || x === null) return null
  const p = x as Record<string, unknown>
  if (!Array.isArray(p.levels) || p.levels.length === 0 || !p.levels.every(isLevel)) return null
  const levels = p.levels as Level[]
  const endsAt = typeof p.endsAt === 'number' ? p.endsAt : null
  return {
    levels,
    index: Math.min(Math.max(Number(p.index) || 0, 0), levels.length - 1),
    running: p.running === true && endsAt !== null,
    endsAt,
    remainingMs: typeof p.remainingMs === 'number' ? Math.max(0, p.remainingMs) : 0,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0,
    field: parseField(p.field),
    alerts: 0,
  }
}

/** Everything a screen needs to show about where the tournament is right now. */
export function describeClock(s: TimerState, now: number) {
  const level = s.levels[s.index]
  const left = remainingMs(s, now)
  const isBreak = level.type === 'break'

  // Time until the next break starts, counting the rest of this level and everything before the break.
  let nextBreakIn: number | null = null
  if (!isBreak) {
    let acc = left
    for (let i = s.index + 1; i < s.levels.length; i++) {
      if (s.levels[i].type === 'break') {
        nextBreakIn = acc
        break
      }
      acc += durationMs(s.levels[i])
    }
  }

  const next = s.levels[s.index + 1] as Level | undefined

  return {
    level,
    next,
    /** Big blind to measure stacks against; during a break, the level it resumes with. */
    bigBlind: level.type === 'level' ? level.bb : next?.type === 'level' ? next.bb : null,
    averageStack: averageStack(s.field),
    left,
    isBreak,
    title: isBreak ? 'Break' : `Level ${levelNumber(s.levels, s.index)}`,
    finished: !s.running && left === 0 && s.index === s.levels.length - 1,
    progress: Math.min(1, Math.max(0, 1 - left / durationMs(level))),
    lastMinute: s.running && left <= 60_000,
    nextBreakIn,
  }
}
