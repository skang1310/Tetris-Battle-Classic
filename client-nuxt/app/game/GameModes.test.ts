import { describe, it, expect } from 'vitest'
import { MODES, ModeGame, ModeSession } from './GameModes'
import { Tetromino } from './Tetromino'
describe('mode rules and human seats',()=>{
 it('creates every catalog mode with its participant count',()=>{for(const m of MODES){const s=new ModeSession(m.id);expect(s.players).toHaveLength(m.players)}})
 it('finishes sprint and marathon at their distinct goals',()=>{for(const [mode,goal] of [['sprint',40],['marathon',150],['sprint5p',40]] as const){const s=new ModeSession(mode);s.players[0]!.linesCleared=goal-1;s.checkGoals();expect(s.finished).toBe(false);s.players[0]!.linesCleared++;s.checkGoals();expect(s.winner).toBe(0)}})
 it('ultra finishes at two minutes and freezes afterwards',()=>{const s=new ModeSession('ultra');s.remaining=1;s.update(1);expect(s.finished).toBe(true);expect(s.winner).toBe(0);const elapsed=s.elapsed;s.update(999);expect(s.elapsed).toBe(elapsed)})
 it('pause freezes the complete session',()=>{const s=new ModeSession('battle6p');s.paused=true;s.update(3000);expect(s.remaining).toBe(120000);expect(s.players.every(g=>g.board.grid.flat().every(c=>!c))).toBe(true)})
 it('retro and N-Blox prohibit hold, ghost and hard drop',()=>{for(const mode of ['retro','nblox'] as const){const g=new ModeGame(mode);expect(g.showGhost).toBe(false);expect(g.hardDrop()).toBe(false);g.hold();expect(g.heldPiece).toBeNull();expect(g.previewsShown).toHaveLength(1)}})
 it('survival enters the bonus speed after 200 lines',()=>{const g=new ModeGame('survival');g.linesCleared=200;expect(g.getDropInterval()).toBe(16);const s=new ModeSession('survival');s.players[0]!.linesCleared=200;s.checkGoals();expect(s.finished).toBe(false)})
 it('rally gives all racers identical independent 80-row courses',()=>{const s=new ModeSession('rally8p');expect(s.players.every(g=>g.rallyRemaining===80)).toBe(true);expect(s.players[0]!.board.grid).toEqual(s.players[1]!.board.grid);expect(s.players[0]!.board.grid).not.toBe(s.players[1]!.board.grid);s.players[2]!.rallyGoal=true;s.checkGoals();expect(s.winner).toBe(2)})
 it('removes arena topouts and finishes with the surviving player',()=>{const s=new ModeSession('arena');s.players.slice(1).forEach(g=>g.isGameOver=true);s.update(1);expect(s.winner).toBe(0)})
 it('three KOs finish two-player battles',()=>{const s=new ModeSession('battle2p',false);for(let i=0;i<3;i++){s.players[1]!.isGameOver=true;s.update(1)}expect(s.kos[0]).toBe(3);expect(s.winner).toBe(0)})
 it('never controls assigned human seats with the CPU',()=>{const s=new ModeSession('battle6p');s.humanSeats=new Set([0,1,2]);s.update(1200);expect(s.players[1]!.board.grid.flat().filter(Boolean)).toHaveLength(0);expect(s.players[2]!.board.grid.flat().filter(Boolean)).toHaveLength(0);expect(s.players[3]!.board.grid.flat().filter(Boolean).length).toBeGreaterThan(0)})
 it('routes human attacks to their own selected opponent',()=>{const s=new ModeSession('battle6p');s.humanSeats.add(2);s.attackTargets[2]=4;s.players[2]!.onAttack(3);expect(s.players[4]!.pending).toBe(3);expect(s.players[1]!.pending).toBe(0)})
 it('local player two moves independently',()=>{const s=new ModeSession('battle2p',false);const x=s.players[0]!.currentPiece.x;s.players[1]!.moveLeft();expect(s.players[0]!.currentPiece.x).toBe(x);expect(s.players[1]!.currentPiece.x).toBe(x-1)})
})

describe('temporary KO badge',()=>{
 it('expires after two gameplay seconds without erasing the KO count',()=>{
  const s=new ModeSession('battle2p',false);s.players[1]!.isGameOver=true;s.update(1)
  expect(s.kos[0]).toBe(1);expect(s.koEffectTime[0]).toBe(2000)
  s.update(1999);expect(s.koEffectTime[0]).toBe(1)
  s.update(1);expect(s.koEffectTime[0]).toBe(0);expect(s.kos[0]).toBe(1)
 })
 it('freezes while paused and starts a fresh duration on the next KO',()=>{
  const s=new ModeSession('battle2p',false);s.players[1]!.isGameOver=true;s.update(1);s.update(1500)
  s.paused=true;s.update(3000);expect(s.koEffectTime[0]).toBe(500)
  s.paused=false;s.players[1]!.isGameOver=true;s.update(1);expect(s.kos[0]).toBe(2);expect(s.koEffectTime[0]).toBe(2000)
  s.update(2000);expect(s.koEffectTime[0]).toBe(0);expect(s.kos[0]).toBe(2)
 })
})

describe('Speed battle',()=>{
 it('accelerates both speed boards every 15 seconds, freezes on pause and retains speed after KO',()=>{
  const s=new ModeSession('speed',false);expect(s.players[0]!.getDropInterval()).toBe(800)
  s.update(15000);expect(s.speedStage).toBe(2);expect(s.players.every(g=>g.getDropInterval()===576)).toBe(true)
  s.paused=true;s.update(15000);expect(s.speedStage).toBe(2)
  s.paused=false;s.players[1]!.isGameOver=true;s.update(1);expect(s.players[1]!.getDropInterval()).toBe(576)
 })
})
