import {describe,it,expect} from 'vitest'
import {readProfiles,defaultProfile,profileKey} from './PlayerProfiles'
import {MatchHighlights} from './MatchHighlights'
import {Tetromino} from './Tetromino'
const player=()=>({board:{grid:Array.from({length:20},()=>Array(10).fill(0))},currentPiece:new Tetromino('T'),linesCleared:0,event:null as {combo:number;lines:number;spin:boolean}|null})
describe('player profiles',()=>{
 it('recovers malformed storage and rejects invalid bindings',()=>{expect(readProfiles('{')[0]).toEqual(defaultProfile(0));const p=readProfiles(JSON.stringify([{name:'  Wife  ',avatar:'⭐',delay:900,repeat:0,keys:{left:'a'}}]))[0];expect(p.name).toBe('Wife');expect(p.delay).toBe(400);expect(p.repeat).toBe(30);expect(p.keys).toEqual(defaultProfile(0).keys)})
 it('restores independent controls and speed for both players',()=>{const a=defaultProfile(0),b=defaultProfile(1);a.keys.rotate='x';a.delay=310;b.repeat=40;const saved=readProfiles(JSON.stringify([a,b]));expect(profileKey(saved[0],'x')).toBe('ArrowUp');expect(saved[1].repeat).toBe(40);expect(saved[0].delay).toBe(310)})
})
describe('bounded match highlights',()=>{
 it('tracks actual combo maxima across clear and KO and freezes copied boards',()=>{const h=new MatchHighlights(),p=[player(),player()];for(let t=0;t<=5000;t+=100)h.observe(t,p,[0,0]);p[0]!.linesCleared=4;p[0]!.event={combo:4,lines:4,spin:false};h.observe(5100,p,[0,0]);expect(h.maxCombo).toEqual([4,0]);expect(h.clips[0]!.label).toContain('COMBO');const old=h.clips[0]!.frames[0]!.boards[0]![190];p[0]!.board.grid[19]![0]=6;h.observe(5200,p,[1,0]);expect(h.clips[0]!.frames[0]!.boards[0]![190]).toBe(old);expect(h.clips[1]!.label).toContain('KO');expect(h.clips[0]!.frames.length).toBeGreaterThan(40)})
 it('caps memory and clip count and provides a no-event ending',()=>{const h=new MatchHighlights(),p=[player(),player()];for(let t=0;t<120000;t+=100)h.observe(t,p,[0,0]);expect(h.ring).toHaveLength(90);h.finish();expect(h.clips[0]!.frames).toHaveLength(60);for(let n=1;n<10;n++)h.observe(120000+n*100,p,[n,0]);expect(h.clips).toHaveLength(3)})
})
