import {describe,it,expect} from 'vitest'
import {ModeSession} from './GameModes'
import {Tetromino} from './Tetromino'
import {Game} from './Game'
const well=(s:ModeSession,seat:number,n:number)=>{const g=s.players[seat]!;g.board.clear();for(let y=20-n;y<20;y++)g.board.grid[y]=Array.from({length:10},(_,x)=>x===5?0:8);g.currentPiece=new Tetromino('I',3,0);g.currentPiece.rotationIndex=1;g.hardDrop();return g}
describe('cleared rows are distinct from sent attacks',()=>{
 for(const mode of ['battle2p','speed','item'] as const)for(const seat of [0,1])it(`${mode} seat ${seat+1}: counts real 1/2/3/4 clears separately`,()=>{for(let n=1;n<=4;n++){const s=new ModeSession(mode,false),g=well(s,seat,n);expect(g.linesCleared).toBe(n);expect(g.event?.lines).toBe(n);expect(g.sent).toBe([0,0,1,2,4][n]);expect(s.players[1-seat]!.pending).toBe(g.sent);expect(Game.deserialize(g.serialize()).linesCleared).toBe(n)}})
 it('keeps real clear count even when all outgoing garbage is cancelled',()=>{const s=new ModeSession('battle2p',false);s.players[0]!.pending=4;const g=well(s,0,4);expect(g.linesCleared).toBe(4);expect(g.sent).toBe(0);expect(g.pending).toBe(0)})
 it('retains cleared rows after a KO and resets them on a fresh round',()=>{const s=new ModeSession('battle2p',false);well(s,0,2);s.players[0]!.isGameOver=true;s.update(1);expect(s.players[0]!.linesCleared).toBe(2);well(s,0,1);expect(s.players[0]!.linesCleared).toBe(3);expect(new ModeSession('battle2p',false).players[0]!.linesCleared).toBe(0)})
 it('does not call broom cleanup a player line clear',()=>{const s=new ModeSession('item',false);well(s,0,1);s.items[0]!.inventory=['broom'];expect(s.useItem(0)).toBe(true);expect(s.players[0]!.linesCleared).toBe(1)})
})
