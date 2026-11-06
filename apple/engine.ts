// Native iOS/tvOS adapter. Gameplay remains in the existing TypeScript engine.
import {ModeSession, ITEMS, type ModeId} from '../client-nuxt/app/game/GameModes'
import {Tetromino} from '../client-nuxt/app/game/Tetromino'
let session:ModeSession
export function start(mode:ModeId='battle2p',cpu=true,map=0){session=new ModeSession(mode,cpu,map,{itemStyle:'collect',durationMs:120000,koTarget:3});return snapshot()}
export function tick(ms:number){session.update(ms);return snapshot()}
export function action(seat:number,action:string){
 if(session.paused||session.finished)return false
 const g=session.players[seat];if(!g||(!session.humanSeats.has(seat)))return false
 switch(action){case 'left':return g.moveLeft();case 'right':return g.moveRight();case 'down':return g.moveDown(true);case 'rotate':return g.rotate();case 'drop':return g.hardDrop();case 'hold':g.hold();return true;case 'item1':case 'item2':case 'item3':return session.useItem(seat,Number(action.slice(-1))-1)}
 return false
}
export function pause(value:boolean){session.paused=value;return snapshot()}
const piece=(type:any)=>type?new Tetromino(type,0,0).getBlocks():[]
export function snapshot(){return JSON.stringify({remaining:session.remaining,finished:session.finished,outcome:session.outcome,winner:session.winner,leader:session.leader,paused:session.paused,players:session.players.map((g,i)=>({score:g.score,activeType:g.currentPiece.type,heldType:g.heldPiece?.type??null,gameOver:g.isGameOver,grid:g.board.grid,active:g.currentPiece.getBlocks(),color:g.currentPiece.color,ghost:g.getGhostPiece().getBlocks(),hold:piece(g.heldPiece?.type),next:g.previewsShown.map(type=>({blocks:piece(type),color:new Tetromino(type).color})),lines:g.linesCleared,sent:g.sent,ko:session.kos[i],receivedKO:session.kos[1-i],combo:Math.max(0,g.combo),pending:g.pending,items:session.items[i]?.inventory.map(id=>ITEMS[id].icon)??[]}))})}
