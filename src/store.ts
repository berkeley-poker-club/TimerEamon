import { useSyncExternalStore } from 'react'
import {
  catchUp,
  freshState,
  parsePersisted,
  timerReducer,
  toPersisted,
  type TimerCommand,
  type TimerState,
} from './timer'

/*
 * One tournament shared by every open window (display + control).
 *
 * localStorage holds the source of truth. A window that changes the state writes it there and
 * broadcasts it on a BroadcastChannel; other windows adopt it if it is newer than theirs. The
 * 'storage' event is a fallback for browsers without BroadcastChannel. Ticks are never synced:
 * every window derives the same clock from the shared end timestamp.
 */

const STORAGE_KEY = 'pab-tournament-timer-v1'
const CHANNEL_NAME = 'pab-tournament-timer'
const TICK_MS = 200

export interface Snapshot {
  timer: TimerState
  now: number
}

/** Wire format, both in storage and on the channel. `alerted` tells the display to chime. */
type Message = ReturnType<typeof toPersisted> & { alerted: boolean }

function write(timer: TimerState, alerted: boolean): Message {
  const msg: Message = { ...toPersisted(timer), alerted }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msg))
  } catch {
    // Storage full or blocked; sync still works over the channel for this session.
  }
  return msg
}

function readInitial(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored = raw ? parsePersisted(JSON.parse(raw)) : null
    // If every window was closed mid-tournament, fast-forward silently to where the clock is now.
    if (stored) return catchUp(stored, Date.now(), false)
  } catch {
    // Corrupt storage; start over.
  }
  // Save the fresh default right away so a second window sees the same level ids.
  const fresh = freshState()
  write(fresh, false)
  return fresh
}

let snapshot: Snapshot = { timer: readInitial(), now: Date.now() }
const listeners = new Set<() => void>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null

function setSnapshot(timer: TimerState, now: number) {
  snapshot = { timer, now }
  listeners.forEach((l) => l())
}

export function dispatch(cmd: TimerCommand) {
  const now = Date.now()
  const prev = snapshot.timer
  let next = timerReducer(prev, { ...cmd, now })
  if (cmd.type !== 'tick' && next !== prev) {
    next = { ...next, updatedAt: Math.max(now, prev.updatedAt + 1) }
    const msg = write(next, next.alerts > prev.alerts)
    channel?.postMessage(msg)
  }
  setSnapshot(next, now)
}

function receive(data: unknown) {
  const incoming = parsePersisted(data)
  // Ignores our own echoes, and the duplicate when both the channel and storage event fire.
  if (!incoming || incoming.updatedAt <= snapshot.timer.updatedAt) return
  const alerted = (data as { alerted?: unknown }).alerted === true
  const now = Date.now()
  const alerts = snapshot.timer.alerts + (alerted ? 1 : 0)
  setSnapshot(catchUp({ ...incoming, alerts }, now, false), now)
}

if (channel) channel.onmessage = (e: MessageEvent) => receive(e.data)
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY || !e.newValue) return
  try {
    receive(JSON.parse(e.newValue))
  } catch {
    // Ignore malformed writes.
  }
})

let interval: number | undefined
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) interval = window.setInterval(() => dispatch({ type: 'tick' }), TICK_MS)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.clearInterval(interval)
  }
}

export function useTournament(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot)
}
