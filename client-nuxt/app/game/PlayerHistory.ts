import { validMap } from './ClassicMaps'
import { ALL_MODES, type ModeId } from './GameModes'

export const HISTORY_KEY = 'tetris-player-history-v1'
export interface RecentMode { mode: ModeId; cpu: boolean; map: number; network: boolean; spectator: boolean; playedAt: number }
export interface ModeRecord { games: number; wins: number; bestScore: number; bestLines: number; fastestMs: number | null }
export interface PlayerHistory { recent: RecentMode[]; records: Partial<Record<ModeId, ModeRecord>> }
export interface MatchResult { mode: ModeId; score: number; lines: number; elapsed: number; won: boolean }
export const emptyHistory = (): PlayerHistory => ({ recent: [], records: {} })
const validMode = (id: unknown): id is ModeId => ALL_MODES.some(m => m.id === id)
const nonnegative = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0
export function readHistory(raw: string | null): PlayerHistory {
  const history = emptyHistory()
  try {
    const data = JSON.parse(raw || '{}')
    if (Array.isArray(data.recent)) for (const item of data.recent) {
      if (validMode(item?.mode) && !history.recent.some(r => r.mode === item.mode) && typeof item.cpu === 'boolean' && validMap(item.map) && typeof item.network === 'boolean' && typeof item.spectator === 'boolean' && nonnegative(item.playedAt)) history.recent.push(item)
      if (history.recent.length === 4) break
    }
    for (const mode of ALL_MODES) {
      const r = data.records?.[mode.id]
      if (r && ['games', 'wins', 'bestScore', 'bestLines'].every(k => nonnegative(r[k])) && r.wins <= r.games && (r.fastestMs === null || nonnegative(r.fastestMs))) history.records[mode.id] = { games:r.games, wins:r.wins, bestScore:r.bestScore, bestLines:r.bestLines, fastestMs:r.fastestMs }
    }
  } catch {}
  return history
}
export function rememberMode(history: PlayerHistory, recent: RecentMode): PlayerHistory {
  return { ...history, recent: [recent, ...history.recent.filter(r => r.mode !== recent.mode)].slice(0, 4) }
}
export function recordMatch(history: PlayerHistory, result: MatchResult): { history: PlayerHistory; personalBest: boolean } {
  const previous = history.records[result.mode]
  const r: ModeRecord = previous ? { ...previous } : { games:0, wins:0, bestScore:0, bestLines:0, fastestMs:null }
  r.games++; if (result.won) r.wins++
  r.bestScore = Math.max(r.bestScore, result.score); r.bestLines = Math.max(r.bestLines, result.lines)
  const isTimedClear = ['sprint', 'sprint5p', 'rally8p', 'marathon'].includes(result.mode)
  const faster = isTimedClear && result.won && result.elapsed > 0 && (r.fastestMs === null || result.elapsed < r.fastestMs)
  if (faster) r.fastestMs = result.elapsed
  const personalBest = faster || result.score > (previous?.bestScore ?? 0) || result.lines > (previous?.bestLines ?? 0)
  return { history:{ ...history, records:{ ...history.records, [result.mode]:r } }, personalBest }
}
export function formatTime(ms: number): string { return `${(ms / 1000).toFixed(2)}초` }
