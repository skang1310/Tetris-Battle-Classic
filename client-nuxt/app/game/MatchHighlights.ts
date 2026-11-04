export interface HighlightFrame{time:number;boards:number[][];kos:number[]}
export interface HighlightClip{label:string;at:number;frames:HighlightFrame[]}
export class MatchHighlights{
 ring:HighlightFrame[]=[];clips:HighlightClip[]=[];maxCombo=[0,0];private lastTime=-100;private kos=[0,0];private clears=[0,0]
 observe(time:number,players:{board:{grid:number[][]};currentPiece:{type?:string;getBlocks():{x:number;y:number}[]};linesCleared:number;event:{combo:number;lines:number;spin:boolean}|null}[],kos:number[],force=false){
 let label='';players.forEach((p,i)=>{this.maxCombo[i]=Math.max(this.maxCombo[i]??0,p.event?.combo??0);if(p.linesCleared>(this.clears[i]??0)){if((p.event?.combo??0)>=2)label=`${i+1}P · ${p.event!.combo} COMBO`;else if(p.event?.spin)label=`${i+1}P · T-SPIN`;else if((p.event?.lines??0)>=4)label=`${i+1}P · TETRIS`;this.clears[i]=p.linesCleared}})
 if(kos.some((k,i)=>k>(this.kos[i]??0)))label=`${kos.findIndex((k,i)=>k>(this.kos[i]??0))+1}P · KO!`;this.kos=[...kos]
 if(!force&&!label&&time-this.lastTime<100)return;this.lastTime=time
 const frame:HighlightFrame={time,kos:[...kos],boards:players.map(p=>{const cells=p.board.grid.flat();for(const {x,y} of p.currentPiece.getBlocks())if(x>=0&&x<10&&y>=0&&y<20)cells[y*10+x]=Math.max(1,["I","O","T","S","Z","J","L"].indexOf(p.currentPiece.type??"L")+1);return cells})};this.ring.push(frame);while(this.ring.length>90)this.ring.shift()
 for(const c of this.clips)if(time>c.at&&time<=c.at+1500)c.frames.push(frame)
 if(label){this.clips.push({label,at:time,frames:this.ring.filter(f=>f.time>=time-4500)});if(this.clips.length>3)this.clips.shift()}
 }
 finish(){if(!this.clips.length&&this.ring.length)this.clips.push({label:'마지막 승부',at:this.lastTime,frames:[...this.ring].slice(-60)})}
}
