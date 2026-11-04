import type {TetrominoType} from './Tetromino'
const TYPES:TetrominoType[]=['I','O','T','S','Z','J','L']
// A bag depends only on the round seed and bag number, never on the other player's speed.
export function sharedBag(seed:number,bag:number):TetrominoType[]{
 let state=(seed^Math.imul(bag+1,0x9e3779b9))>>>0
 const random=()=>{state=(state+0x6d2b79f5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296}
 const pieces=[...TYPES];for(let i=6;i>0;i--){const j=Math.floor(random()*(i+1));[pieces[i],pieces[j]]=[pieces[j]!,pieces[i]!]};return pieces
}
export function sharedPiece(seed:number,index:number):TetrominoType{if(!Number.isSafeInteger(index)||index<0)throw new RangeError('Invalid piece index');return sharedBag(seed,Math.floor(index/7))[index%7]!}
