let ctx: AudioContext | null = null

/** Browsers only allow audio after a user gesture, so call this from one. */
export function unlockAudio() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

/** A loud, bright three-note chime that carries across a room. */
export function playChime() {
  unlockAudio()
  const c = ctx!
  const start = c.currentTime + 0.05
  const notes = [784, 988, 1319] // G5, B5, E6
  for (let round = 0; round < 2; round++) {
    notes.forEach((freq, i) => {
      const t = start + round * 0.9 + i * 0.18
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      osc.connect(gain).connect(c.destination)
      osc.start(t)
      osc.stop(t + 0.65)
    })
  }
}
