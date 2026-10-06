import type { CSSProperties } from 'react'

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Inline style for the staggered load reveal; `.reveal` reads `--i`. */
export const stagger = (i: number) => ({ '--i': i }) as CSSProperties

export type SuitName = 'spade' | 'heart' | 'club' | 'diamond'

/** The background suit cycles with the level. */
export const SUIT_CYCLE: SuitName[] = ['spade', 'heart', 'club', 'diamond']

/**
 * Sizes a number to its cell: CSS divides the cell width (cqi) by the character count, so long
 * values like "10,000 / 20,000" shrink instead of clipping. Pair with `.fit` in CSS.
 */
export const fit = (text: string) => ({ '--chars': Math.max(text.length, 3) }) as CSSProperties
