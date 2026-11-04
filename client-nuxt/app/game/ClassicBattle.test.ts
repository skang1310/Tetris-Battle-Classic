import { describe, it, expect } from 'vitest'
import { BattleGame, ClassicBattle } from './ClassicBattle'
import { Tetromino } from './Tetromino'
import { classicKey } from './ClassicKeys'
function well(g: BattleGame, lines: number) {
  g.board.clear()
  for (let y = 20 - lines; y < 20; y++) for (let x = 0; x < 10; x++) g.board.setCell(x, y, x === 5 ? 0 : 8)
  g.currentPiece = new Tetromino('I', 3, 0); g.currentPiece.rotationIndex = 1
}
describe('Classic battle adapter', () => {
  it('keeps hold and pause controls working with Korean input selected', () => {
    expect(classicKey({ code: 'KeyC', key: 'ㅊ' })).toBe('c')
    expect(classicKey({ code: 'KeyP', key: 'ㅔ' })).toBe('p')
    expect(classicKey({ code: 'Space', key: ' ' })).toBe(' ')
  })
  it('shows the actual next five across bag boundaries', () => {
    const g = new BattleGame()
    for (let i = 0; i < 25; i++) {
      const expected = g.previews[0]
      g.board.clear(); g.hardDrop()
      expect(g.currentPiece.type).toBe(expected)
      expect(g.previews).toHaveLength(5)
    }
  })
  it('sends four lines for Tetris and a back-to-back bonus', () => {
    const battle = new ClassicBattle(false), g = battle.players[0]
    well(g, 4); g.hardDrop()
    expect(g.sent).toBe(4); expect(battle.players[1].pending).toBe(4)
    well(g, 4); g.hardDrop()
    expect(g.event?.backToBack).toBe(true); expect(g.sent).toBe(11)
  })
  it('cancels pending garbage before sending an attack', () => {
    const battle = new ClassicBattle(false), g = battle.players[0]
    g.pending = 3; well(g, 4); g.hardDrop()
    expect(g.pending).toBe(0); expect(g.sent).toBe(1); expect(battle.players[1].pending).toBe(1)
  })
  it('receives garbage at lock and has one consistent hole', () => {
    const g = new BattleGame(); g.pending = 2; g.hardDrop()
    expect(g.pending).toBe(0)
    expect(g.board.grid[19]!.filter(c => c === 8)).toHaveLength(9)
    expect(g.board.grid[18]).toEqual(g.board.grid[19])
  })
  it('detects a garbage topout rather than discarding the upper row', () => {
    const g = new BattleGame(); g.board.setCell(0, 0, 8); g.addGarbage(1)
    expect(g.isGameOver).toBe(true)
  })
  it('freezes time and state while paused', () => {
    const b = new ClassicBattle(); const before = JSON.stringify(b.players[0].serialize())
    b.paused = true; b.update(3000)
    expect(b.remaining).toBe(130000); expect(JSON.stringify(b.players[0].serialize())).toBe(before)
  })
  it('resets a knocked-out board and ends on three KOs', () => {
    const b = new ClassicBattle(false)
    for (let i = 0; i < 3; i++) { b.players[1].isGameOver = true; b.update(1) }
    expect(b.kos[0]).toBe(3); expect(b.winner).toBe(0)
    const t = b.remaining; b.update(1000); expect(b.remaining).toBe(t)
  })
  it('declares a draw at timeout for equal empty boards', () => {
    const b = new ClassicBattle(false); b.remaining = 1; b.update(1)
    expect(b.winner).toBe(-1)
  })
  it('the CPU locks pieces through the retained game engine', () => {
    const b = new ClassicBattle(); b.update(800)
    expect(b.players[1].board.grid.flat().filter(Boolean)).toHaveLength(4)
  })
  it('loads colored original map layouts', () => {
    const b = new ClassicBattle(false, 1)
    expect(b.players[0].board.getCell(0, 15)).toBe(5)
    expect(b.players[0].board.grid).toEqual(b.players[1].board.grid)
    expect(b.players[0].board.grid).not.toBe(b.players[1].board.grid)
  })
  it('hold is enabled and cannot be used twice per piece', () => {
    const g = new BattleGame(), first = g.currentPiece.type
    g.hold(); const second = g.currentPiece.type; g.hold()
    expect(g.heldPiece?.type).toBe(first); expect(g.currentPiece.type).toBe(second)
  })
})
