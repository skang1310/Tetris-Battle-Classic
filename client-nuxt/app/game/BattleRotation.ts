import type {Tetromino} from './Tetromino'
// SRS tests use positive Y upward; the board uses positive Y downward.
const ordinary:Record<string,[number,number][]>= {
 '01':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'10':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
 '12':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'21':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
 '23':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'32':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
 '30':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'03':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
}
const straight:Record<string,[number,number][]>= {
 '01':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'10':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
 '12':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'21':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
 '23':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'32':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
 '30':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'03':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
}
export function rotateBattle(piece:Tetromino,direction:1|-1,canPlace:(piece:Tetromino)=>boolean,onKick?:(index:number)=>void):boolean{
 const from=piece.rotationIndex,to=(from+direction+4)%4,x=piece.x,y=piece.y
 piece.rotationIndex=to
 const originCorrection=piece.type==='I'?Number(to===0)-Number(from===0):0
 const kicks=piece.type==='O'?[[0,0]]:(piece.type==='I'?straight:ordinary)[`${from}${to}`]!
 for(const [index,[dx,dy]] of kicks.entries()){piece.x=x+dx!;piece.y=y+originCorrection-dy!;if(canPlace(piece)){onKick?.(index);return true}}
 piece.x=x;piece.y=y;piece.rotationIndex=from;return false
}
