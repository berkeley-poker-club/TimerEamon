export type LevelType = 'level' | 'break'

export interface Level {
  id: string
  type: LevelType
  sb: number
  bb: number
  ante: number
  minutes: number
}

// crypto.randomUUID is unavailable over plain http on a LAN IP, so roll our own.
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const makeLevel = (sb: number, bb: number, ante: number, minutes = 20): Level => ({
  id: newId(),
  type: 'level',
  sb,
  bb,
  ante,
  minutes,
})

export const makeBreak = (minutes = 10): Level => ({
  id: newId(),
  type: 'break',
  sb: 0,
  bb: 0,
  ante: 0,
  minutes,
})

/** 20-minute levels with a big-blind ante from level 4, and a break every four levels. */
export function defaultStructure(): Level[] {
  return [
    makeLevel(25, 50, 0),
    makeLevel(50, 100, 0),
    makeLevel(75, 150, 0),
    makeLevel(100, 200, 200),
    makeBreak(10),
    makeLevel(150, 300, 300),
    makeLevel(200, 400, 400),
    makeLevel(300, 600, 600),
    makeLevel(400, 800, 800),
    makeBreak(10),
    makeLevel(500, 1000, 1000),
    makeLevel(600, 1200, 1200),
    makeLevel(800, 1600, 1600),
    makeLevel(1000, 2000, 2000),
    makeBreak(10),
    makeLevel(1500, 3000, 3000),
    makeLevel(2000, 4000, 4000),
    makeLevel(3000, 6000, 6000),
    makeLevel(4000, 8000, 8000),
  ]
}

export const durationMs = (level: Level) => level.minutes * 60_000

/** 1-based level number, counting only non-break entries up to and including `index`. */
export function levelNumber(levels: Level[], index: number): number {
  let n = 0
  for (let i = 0; i <= index && i < levels.length; i++) {
    if (levels[i].type === 'level') n++
  }
  return n
}

export const formatChips = (n: number) => n.toLocaleString('en-US')

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Parses "ss", "m:ss" or "h:mm:ss" into milliseconds; null if invalid. */
export function parseClock(text: string): number | null {
  const parts = text.trim().split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
  const nums = parts.map(Number)
  // A bare number means minutes.
  const seconds = nums.length === 1 ? nums[0] * 60 : nums.reduce((acc, n) => acc * 60 + n, 0)
  return seconds * 1000
}

export function describeLevel(level: Level): string {
  if (level.type === 'break') return `Break · ${level.minutes} min`
  const blinds = `${formatChips(level.sb)} / ${formatChips(level.bb)}`
  return level.ante > 0 ? `${blinds} · ante ${formatChips(level.ante)}` : blinds
}
