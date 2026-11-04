import {normalizeMatchRules,type MatchRules,type BoostId} from './MatchRules'
import { BattleGame, playCPU } from './ClassicBattle'
import {Tetromino} from './Tetromino'
import {sharedPiece} from './SharedPieces'
import { CLASSIC_MAPS } from './ClassicMaps'

export type ModeId = 'item' | 'speed' | 'classic' | 'battle2p' | 'marathon' | 'sprint' | 'ultra' | 'retro' | 'survival' | 'nblox' | 'arena' | 'battle6p' | 'rally8p' | 'sprint5p'
export interface ModeInfo { id: ModeId; name: string; group: 'solo' | 'multi'; players: number; goal: string; duration?: number; target?: number; source?: string }
export const ALL_MODES: ModeInfo[] = [
 { id:'battle2p', name:'기본전', group:'multi', players:2, goal:'2분 · 공격 줄과 KO로 승부', duration:120000, source:'battle2p' },
 { id:'item',name:'아이템전',group:'multi',players:2,goal:'아이템 5종 · 마지막 30초 피버 · 2분 · 3 KO',duration:120000 },
 { id:'speed', name:'스피드전', group:'multi', players:2, goal:'15초마다 가속 · 2분 · 3 KO 승리', duration:120000 },
 { id:'arena', name:'ARENA', group:'multi', players:6, goal:'마지막까지 살아남기 · CPU 5명', source:'live' },
 { id:'battle6p', name:'BATTLE 6P', group:'multi', players:6, goal:'2분 · CPU 5명과 공격 대전', duration:120000, source:'battle6p' },
 { id:'rally8p', name:'RALLY 8P', group:'multi', players:8, goal:'80줄 맵을 내려가 GOAL에 먼저 착지', target:80, source:'rally8p' },
 { id:'sprint5p', name:'SPRINT 5P', group:'multi', players:5, goal:'CPU 4명보다 먼저 40줄 지우기', target:40, source:'sprint5p' },
 { id:'marathon', name:'MARATHON', group:'solo', players:1, goal:'150줄 · 15레벨 완주', target:150, source:'marathon' },
 { id:'sprint', name:'SPRINT', group:'solo', players:1, goal:'40줄을 가장 빠르게', target:40, source:'sprint' },
 { id:'ultra', name:'ULTRA', group:'solo', players:1, goal:'2분 동안 최고 점수', duration:120000, source:'ultra' },
 { id:'retro', name:'1989', group:'solo', players:1, goal:'흑백 클래식 · HOLD / 빠른 낙하 없음', source:'mono' },
 { id:'survival', name:'SURVIVAL', group:'solo', players:1, goal:'20레벨 후 초고속 보너스 레벨', target:200, source:'survival' },
 { id:'nblox', name:'N-BLOX', group:'solo', players:1, goal:'기본 블록 게임 · 끝없이 점수 쌓기', source:'nblox' },
 { id:'classic', name:'CLASSIC CPU', group:'multi', players:2, goal:'기존 130초 클래식 CPU 대전', duration:130000 },
]
export const MODES = ALL_MODES.filter(m=>m.id==='battle2p'||m.id==='speed'||m.id==='item')
export const modeInfo = (id: ModeId) => ALL_MODES.find(m => m.id === id)!
const isRace = (id: ModeId) => id === 'rally8p' || id === 'sprint5p' || id === 'sprint'
const isRetro = (id: ModeId) => id === 'retro' || id === 'nblox'

export class ModeGame extends BattleGame {
 pieceSeed:number|undefined
 sequenceCursor=0
 mode: ModeId = 'classic'
 rallyReserve: number[][] = []
 rallyGoal = false
 slowTime = 0
 speedInterval = 800
 onLock: () => void = () => {}
 onItemCollect: (item:ItemId)=>void = ()=>{}
 collectibleItems=true
 itemLocks=0
 itemBlocks=0
 plantItemBlock():boolean {
   if(this.mode!=='item'||!this.collectibleItems)return false
   const cells=this.board.grid.flatMap((row,y)=>row.flatMap((cell,x)=>cell>0&&cell<8?[{x,y}]:[]))
   if(!cells.length)return false
   const position=cells[(this.itemBlocks*17+(this.pieceSeed??0))%cells.length]!
   const itemIndex=(this.itemBlocks+((this.pieceSeed??0)%5))%5
   this.board.grid[position.y]![position.x]=11+itemIndex;this.itemBlocks++;return true
 }
 constructor(mode: ModeId) { super(); this.mode = mode; this.allowHold = !isRetro(mode); this.increaseGravity = ['marathon','survival','retro','nblox'].includes(mode) }
 protected override spawnPiece():Tetromino {
   if(this.pieceSeed===undefined)return super.spawnPiece()
   const piece=new Tetromino(sharedPiece(this.pieceSeed,this.sequenceCursor++))
   this.fillSharedPreview();this.dropTimer=0;this.lockTimer=0
   return piece
 }
 private fillSharedPreview(){if(this.pieceSeed!==undefined)this.pieceQueue=Array.from({length:6},(_,i)=>sharedPiece(this.pieceSeed!,this.sequenceCursor+i)).reverse()}
 configureSequence(seed:number){this.pieceSeed=seed>>>0;this.sequenceCursor=0;this.currentPiece=this.spawnPiece();this.nextPiece=this.spawnPiece();if(!this.canPlacePiece(this.currentPiece))this.isGameOver=true}
 resumeSequence(previous:ModeGame){if(previous.pieceSeed===undefined)return;this.pieceSeed=previous.pieceSeed;this.sequenceCursor=previous.sequenceCursor;this.currentPiece=new Tetromino(previous.currentPiece.type);this.nextPiece=new Tetromino(previous.nextPiece.type);this.fillSharedPreview()}
 get showGhost() { return !isRetro(this.mode) }
 get previewsShown() { return isRetro(this.mode) ? this.previews.slice(0,1) : this.previews }
 override hardDrop(): boolean { if (isRetro(this.mode)) return false; return super.hardDrop() }
 override rotate(): boolean {
   if (!isRetro(this.mode)) return super.rotate()
   if (this.isPaused || this.isGameOver) return false
   this.currentPiece.rotate()
   if (this.canPlacePiece(this.currentPiece)) return true
   this.currentPiece.rotateCounterClockwise(); return false
 }
 override rotateLeft(): boolean {
   if (!isRetro(this.mode)) return super.rotateLeft()
   if (this.isPaused || this.isGameOver) return false
   this.currentPiece.rotateCounterClockwise()
   if (this.canPlacePiece(this.currentPiece)) return true
   this.currentPiece.rotate(); return false
 }
 override getDropInterval(): number {
   if(this.mode==='item'&&this.slowTime>0)return super.getDropInterval()*1.8
   if(this.mode==='speed')return this.speedInterval
   if (this.mode === 'survival' && this.linesCleared >= 200) return 16
   if (this.mode === 'retro') return Math.max(60, 800 * Math.pow(.78, this.level - 1))
   return super.getDropInterval()
 }
 seedRally(): void {
   // Same deterministic course for every racer; 70 hidden + 10 visible rows.
   const rows = Array.from({length:80},(_,i) => Array.from({length:10},(_,x) => x === (Math.floor(i / 3) * 3 + 4) % 10 ? 0 : 8))
   this.board.grid = [...Array.from({length:10},()=>Array(10).fill(0)), ...rows.slice(0,10).map(r=>[...r])]
   this.rallyReserve = rows.slice(10).map(r=>[...r])
 }
 get rallyRemaining() { return this.rallyReserve.length + this.board.grid.filter(row => row.includes(8)).length }
 protected override lockPiece(): void {
   const placed = this.currentPiece.getBlocks()
   const before = this.linesCleared, scoreBefore = this.score, levelBefore = this.level
   let garbageClears = 0
   if (this.mode === 'rally8p') {
     const simulated = this.board.grid.map(r=>[...r])
     for (const b of placed) if (b.y >= 0 && b.y < 20) simulated[b.y]![b.x] = 1
     garbageClears = simulated.filter(row=>row.every(Boolean) && row.includes(8)).length
     this.rallyGoal = this.rallyRemaining === 0 && placed.some(b=>b.y===19)
   }
   const collected:ItemId[]=[]
   if(this.mode==='item'&&this.collectibleItems){
     const simulated=this.board.grid.map(row=>[...row])
     for(const b of placed)if(b.y>=0&&b.y<20&&b.x>=0&&b.x<10)simulated[b.y]![b.x]=1
     for(const row of simulated)if(row.every(Boolean))for(const cell of row){const item=blockItem(cell);if(item)collected.push(item)}
   }
   super.lockPiece()
   for(const item of collected)this.onItemCollect(item)
   if(this.mode==='item'&&this.collectibleItems&&!this.isGameOver){this.itemLocks++;if(this.itemLocks%3===1)this.plantItemBlock()}
   const cleared = this.linesCleared - before
   if (isRetro(this.mode)) this.score = scoreBefore + [0,40,100,300,1200][cleared]! * levelBefore
   else if (cleared > 0 && this.event) {
     if (this.event.spin) this.score += (this.event.mini?100:[0,800,1200,1600][cleared]!) * levelBefore
     if (this.event.backToBack) this.score += 400 * levelBefore
     if (this.event.combo > 0) this.score += 50 * this.event.combo * levelBefore
   }
   if (this.mode === 'rally8p') for (let i=0; i<garbageClears && this.rallyReserve.length; i++) {
     if (this.board.grid[0]!.some(Boolean)) this.isGameOver = true
     this.board.grid.shift(); this.board.grid.push(this.rallyReserve.shift()!)
   }
   this.onLock()
 }
}

export type ItemId='rocket'|'shield'|'broom'|'slow'|'gift'
export const BLOCK_ITEMS:ItemId[]=['rocket','shield','broom','slow','gift']
export function blockItem(cell:number):ItemId|undefined{return BLOCK_ITEMS[cell-11]}
export const ITEMS:Record<ItemId,{name:string;icon:string;description:string}>={
 rocket:{name:'로켓',icon:'🚀',description:'상대에게 3줄 공격 · 피버 때 4줄'},
 shield:{name:'방패',icon:'🛡️',description:'6초 안에 들어오는 공격 한 번 방어'},
 broom:{name:'빗자루',icon:'🧹',description:'아래 2줄 정리 · 대기 공격 4줄 제거'},
 slow:{name:'여유 타임',icon:'🫧',description:'8초 동안 내 블록이 천천히 내려와요'},
 gift:{name:'선물상자',icon:'🎁',description:'둘 다 아이템 하나 · 대기 공격 2줄 제거'},
}
export const BOOSTS:Record<BoostId,{name:string;icon:string;description:string;when:string}>={
 shield:{name:'방패',icon:'⬡',description:'이번 판에 들어오는 공격 일부를 자동으로 막습니다. 최대 15줄까지 방어해요.',when:'왼쪽 슬롯 숫자는 남은 방어량입니다.'},
 finalRush:{name:'Final Rush',icon:'⇧',description:'마지막 30초 동안 줄을 보내면 추가 공격이 붙습니다. 이번 판에 최대 15줄을 더 보내요.',when:'남은 시간이 30초 이하일 때 자동 적용됩니다.'},
 twinBomb:{name:'Twin Bomb',icon:'☢',description:'내게 올라오는 공격줄에 폭탄이 한 개 대신 두 개 생겨, 줄을 정리할 기회가 늘어요.',when:'공격받았을 때 내 보드에 적용됩니다.'},
}
export interface BoostState{selected:BoostId[];shieldLeft:number;rushLeft:number;blocked:number;checks:number}
export interface ItemState {inventory:ItemId[];cooldown:number;shield:number;guard:number;notice:string;noticeTime:number;revision:number}
/** Local rules inspired by Notris Foes, shared by CPU, keyboard and LAN sessions. */
export class ModeSession {
 readonly itemStyle:'boosts'|'collect'
 boosts:BoostState[]=[]
 readonly original:boolean
 readonly cooperative:boolean
 readonly goalLines:number
 readonly handicap:[number,number]
 readonly koTarget:number
 readonly pieceSeed=(Math.random()*4294967296)>>>0
 readonly info: ModeInfo
 players: ModeGame[]
 koEffectTime: number[]
 kos: number[]
 eliminated: boolean[]
 paused = false
 winner: number | -1 | null = null
 elapsed = 0
 remaining: number
 cpu: boolean
 humanSeats: Set<number>
 target = 1
 attackTargets: number[] = []
 private lastAttacker: number[] = []
 finished = false
 outcome = ''
 items:ItemState[]=[]
 itemClock=0
 private itemDraws:number[]=[]
 private cpuItemClock:number[]=[]
 private itemDeck:ItemId[]=['broom','rocket','slow','shield','gift']
 private cpuClocks: number[]
 constructor(readonly mode: ModeId, cpu = true, map = 0, options:Partial<MatchRules>={}) {
   const rules=normalizeMatchRules(options),custom=['battle2p','speed','item'].includes(mode)
   this.itemStyle=rules.itemStyle??'collect'
   this.original=!rules.cooperative&&(!!rules.original||rules.battleStyle==='facebook'||(mode==='item'&&this.itemStyle==='boosts'))
   this.cooperative=!!rules.cooperative&&custom;this.goalLines=rules.goalLines??40;this.handicap=rules.handicap??[0,0]
   this.koTarget=this.original?rules.koTarget:custom?rules.koTarget:3
   this.info = {...modeInfo(mode),...(custom?{duration:this.original?120000:rules.durationMs}:{})}; this.cpu = this.info.players > 2 || cpu
   this.humanSeats = new Set(this.cpu ? [0] : [0,1])
   this.boosts=Array.from({length:this.info.players},(_,i)=>{const selected=(mode==='item'&&this.itemStyle==='boosts'?(rules.boostLoadouts?.[i]??['shield','finalRush','twinBomb']):[]) as BoostId[];return {selected:[...selected],shieldLeft:selected.includes('shield')?15:0,rushLeft:selected.includes('finalRush')?15:0,blocked:0,checks:0}})
   this.players = Array.from({length:this.info.players},()=>new ModeGame(mode))
   this.koEffectTime = this.players.map(()=>0); this.kos = this.players.map(()=>0); this.eliminated = this.players.map(()=>false); this.cpuClocks = this.players.map(()=>0)
   this.attackTargets=this.players.map((_,i)=>(i+1)%this.players.length); this.lastAttacker=this.players.map(()=>-1)
   this.remaining = this.info.duration ?? 0
   for (const game of this.players) {
     if (mode === 'rally8p') game.seedRally()
     else if (this.info.group === 'multi' && map > 0 && CLASSIC_MAPS[map-1]) game.board.grid = CLASSIC_MAPS[map-1]!.map(r=>[...r])
   }
   this.players.forEach((game,i)=>{
     const count=this.handicap[i]??0,hole=this.pieceSeed%10
     if(count>0){
       game.board.grid.splice(0,count)
       for(let row=0;row<count;row++)game.board.grid.push(Array.from({length:10},(_,x)=>x===hole?0:8))
       // Leave a safe spawn area even on tall challenge layouts.
       for(let row=0;row<4;row++)game.board.grid[row]=Array(10).fill(0)
     }
     if(this.original)for(const row of game.board.grid)for(let x=0;x<10;x++)if(row[x]===8)row[x]=10
     game.collectibleItems=this.itemStyle==='collect';game.bombGarbage=this.original;game.twinBomb=this.boosts[i]!.selected.includes('twinBomb');game.configureSequence(this.pieceSeed)
   })
   this.items=this.players.map(()=>({inventory:(this.itemStyle==='boosts'?[]:['rocket','shield']) as ItemId[],cooldown:0,shield:0,guard:0,notice:this.itemStyle==='boosts'?'AUTO 부스트 · 숫자키 없이 자동 적용':'로켓과 방패로 시작! 1·2·3은 현재 가방 순서',noticeTime:2500,revision:0}))
   this.itemDraws=this.players.map(()=>0);this.cpuItemClock=this.players.map(()=>0)
   // One shared shuffled deck gives both players the same sequence, at their own pace.
   this.itemDeck=this.itemDeck.map(value=>({value,order:Math.random()})).sort((a,b)=>a.order-b.order).map(entry=>entry.value)
   if(mode==='item'&&this.itemStyle==='collect')this.players.forEach(game=>{game.plantItemBlock();game.plantItemBlock()})
   this.wire()
 }
 get timed() { return !!this.info.duration }
 get solo() { return this.info.players === 1 }
 get localTwoPlayer() { return this.info.players === 2 && !this.cpu }
 private wire(): void {
   this.players.forEach((game,i)=>{
     game.onAttack = n=>{
       if(this.cooperative){game.sent=Math.max(0,game.sent-n);return}
       if (this.solo || isRace(this.mode) || this.eliminated[i]) return
       const targets = this.players.map((_,j)=>j).filter(j=>j!==i && !this.eliminated[j])
       const j = this.humanSeats.has(i) && targets.includes(this.attackTargets[i]!) ? this.attackTargets[i] : targets[Math.floor(Math.random()*targets.length)]
       if (j !== undefined && !(this.mode==='item'&&this.itemStyle==='collect'&&this.blockItemAttack(j))) {
         const boost=this.boosts[i]!,bonus=this.remaining<=30000&&boost.rushLeft>0?1:0
         boost.rushLeft-=bonus;game.sent+=bonus
         const received=this.receiveBoostAttack(j,n+bonus)
         this.players[j]!.pending += received;if(received>0)this.lastAttacker[j]=i
       }
     }
     game.onItemCollect=item=>{if(!this.giveItem(i,item))this.itemNotice(i,'가방이 가득 찼어요! V/B/N으로 사용해 주세요.')}
     game.onLock = ()=>{this.checkGoals()}
   })
 }
 private receiveBoostAttack(player:number,lines:number){
  const boost=this.boosts[player]!;let received=0
  for(let i=0;i<lines;i++){boost.checks++;let hash=(this.pieceSeed^Math.imul(boost.checks,2654435761))>>>0;hash=Math.imul(hash^(hash>>>16),2246822507)>>>0
   if(boost.shieldLeft>0&&(hash&1)===0){boost.shieldLeft--;boost.blocked++}else received++
  }
  return received
 }
 get itemFever(){return this.mode==='item'&&this.remaining<=30000}
 get nextItemIn(){return Math.max(0,(this.itemFever?8000:12000)-this.itemClock)}
 private itemNotice(player:number,text:string){const state=this.items[player]!;state.notice=text;state.noticeTime=2400;state.revision++}
 giveItem(player:number,collected?:ItemId):boolean{
  if(this.mode!=='item'||this.itemStyle==='boosts'||!this.items[player]||this.items[player]!.inventory.length>=3)return false
  const item=collected??this.itemDeck[this.itemDraws[player]!%this.itemDeck.length]!;if(!collected)this.itemDraws[player]!++
  this.items[player]!.inventory.push(item);this.itemNotice(player,`${ITEMS[item].icon} ${ITEMS[item].name} 획득!`);return true
 }
 private blockItemAttack(player:number):boolean{
  const item=this.items[player]!
  if(item.guard>0){this.itemNotice(player,'✨ KO 후 보호 중!');return true}
  if(item.shield>0){item.shield=0;this.itemNotice(player,'🛡️ 공격을 막았어요!');return true}
  return false
 }
 useItem(player:number,slot=0):boolean{
  if(this.mode!=='item'||this.paused||this.finished||!Number.isInteger(player)||!Number.isInteger(slot)||slot<0||slot>2)return false
  const state=this.items[player],game=this.players[player];if(!state||!game||game.isGameOver)return false
  if(this.itemStyle==='boosts'){this.itemNotice(player,'AUTO 부스트는 자동 적용돼요. 숫자키 사용은 블록 수집 방식에서 가능합니다');return false}
  if(state.cooldown>0){this.itemNotice(player,`⏳ ${Math.ceil(state.cooldown/1000)}초 후 다시 사용할 수 있어요`);return false}
  const item=state.inventory[slot];if(!item){this.itemNotice(player,`빈 ${slot+1}번 칸 · 아이템 블록이 든 줄을 지워 채우세요`);return false}
  state.inventory.splice(slot,1);state.cooldown=2000
  const opponent=1-player
  this.itemNotice(player,`${ITEMS[item].icon} ${ITEMS[item].name} 사용!`)
  if(item==='rocket'&&this.cooperative){const partner=this.players[opponent]!;partner.pending=Math.max(0,partner.pending-4);this.giveItem(opponent);this.itemNotice(opponent,'🚀 협동 로켓! 아이템 선물과 대기 공격 정리')}else if(item==='rocket'){
   if(!this.blockItemAttack(opponent)){const lines=this.itemFever?4:3;this.players[opponent]!.pending+=lines;game.sent+=lines;this.lastAttacker[opponent]=player;this.itemNotice(opponent,`🚀 로켓! ${lines}줄 공격이 와요`)}
   else this.itemNotice(player,'🛡️ 상대가 로켓을 막았어요!')
  }else if(item==='shield')state.shield=6000
  else if(item==='broom'){game.board.grid.splice(18,2);game.board.grid.unshift(Array(10).fill(0),Array(10).fill(0));game.pending=Math.max(0,game.pending-4);while(!game.canPlacePiece(game.currentPiece)&&game.currentPiece.y>-4)game.currentPiece.y--}
  else if(item==='slow')game.slowTime=8000
  else if(item==='gift')for(let seat=0;seat<2;seat++){this.players[seat]!.pending=Math.max(0,this.players[seat]!.pending-2);const received=this.giveItem(seat);this.itemNotice(seat,received?'🎁 함께 받는 선물!':'🎁 가방은 가득! 대기 공격 2줄 정리')}
  return true
 }
 get speedStage(){return this.mode==='speed'?Math.min(8,1+Math.floor(this.elapsed/15000)):1}
 cycleTarget(seat=0): void {
   const targets = this.players.map((_,i)=>i).filter(i=>i!==seat && !this.eliminated[i])
   if (targets.length) this.attackTargets[seat] = targets[(targets.indexOf(this.attackTargets[seat]!)+1)%targets.length]!; this.target=this.attackTargets[0]!
 }
 private complete(winner: number | -1, outcome: string) { this.winner=winner; this.outcome=outcome; this.finished=true }
 checkGoals(): void {
   if (this.finished) return
   if(this.cooperative){if(this.teamLines>=this.goalLines)this.complete(0,`함께 ${this.goalLines}줄 달성! 협동 성공`);return}
   if (this.mode === 'rally8p') {
     const winner = this.players.findIndex((p,i)=>!this.eliminated[i] && p.rallyGoal)
     if (winner>=0) this.complete(winner,'GOAL에 먼저 도착했습니다')
   } else if (this.mode === 'sprint' || this.mode === 'sprint5p' || this.mode === 'marathon') {
     const winner = this.players.findIndex((p,i)=>!this.eliminated[i] && p.linesCleared >= this.info.target!)
     if (winner>=0) this.complete(winner,this.mode==='marathon'?'15레벨 완주!':'40줄 완주!')
   }
 }
 update(ms: number): void {
   if (this.paused || this.finished) return
   const dt = this.timed ? Math.min(ms,this.remaining) : ms
   this.koEffectTime = this.koEffectTime.map(time=>Math.max(0,time-dt))
   this.elapsed += dt; if (this.timed) this.remaining=Math.max(0,this.remaining-dt)
   if(this.mode==='item'&&this.itemStyle==='collect'){
    this.items.forEach((item,i)=>{for(const key of ['cooldown','shield','guard','noticeTime'] as const)item[key]=Math.max(0,item[key]-dt);this.players[i]!.slowTime=Math.max(0,this.players[i]!.slowTime-dt)})
    this.itemClock+=dt;const interval=this.itemFever?8000:12000
    while(this.itemClock>=interval){this.itemClock-=interval;this.players.forEach(game=>game.plantItemBlock())}
    if(this.cpu)this.players.forEach((game,i)=>{if(this.humanSeats.has(i))return;this.cpuItemClock[i]!+=dt;if(this.cpuItemClock[i]!<4000)return;this.cpuItemClock[i]=0;const inventory=this.items[i]!.inventory;const preferences:ItemId[]=game.pending>=2?['broom','shield','slow','rocket','gift']:game.board.grid.flat().filter(Boolean).length>30?['broom','slow','rocket','gift']:['rocket','gift'];const item=preferences.find(item=>inventory.includes(item));if(item)this.useItem(i,inventory.indexOf(item))})
   }
   this.players.forEach(g=>{g.speedInterval=Math.max(80,800*Math.pow(.72,this.speedStage-1))})
   this.players.forEach((g,i)=>{ if (!this.eliminated[i] && !this.finished) g.update(dt) })
   if (this.cpu) this.players.forEach((g,i)=>{
     if (this.humanSeats.has(i) || this.eliminated[i] || this.finished) return
     this.cpuClocks[i]!+=dt
     const interval = this.mode==='speed'?Math.max(160,(720+i*110)*Math.pow(.8,this.speedStage-1)):720+i*110
     if (this.cpuClocks[i]!>=interval) { this.cpuClocks[i]!%=interval; playCPU(g,isRace(this.mode)) }
   })
   this.checkGoals()
   if (this.finished) return
   this.players.forEach((g,i)=>{
     if (!g.isGameOver || this.eliminated[i]) return
     if (this.solo) { this.complete(-1,'GAME OVER'); return }
     if (this.mode === 'arena' || isRace(this.mode)) this.eliminated[i]=true
     else {
       const fallback = this.players.map((p,j)=>({j,sent:p.sent})).filter(p=>p.j!==i && !this.eliminated[p.j]).sort((a,b)=>b.sent-a.sent)[0]?.j
       const attacker=this.lastAttacker[i]!>=0 ? this.lastAttacker[i] : fallback
       if (!this.cooperative&&attacker!==undefined) { this.kos[attacker]!++; this.koEffectTime[attacker]=2000 }
       const fresh = new ModeGame(this.mode);fresh.collectibleItems=this.itemStyle==='collect';fresh.bombGarbage=this.original;fresh.twinBomb=this.boosts[i]!.selected.includes('twinBomb');fresh.resumeSequence(g);fresh.speedInterval=g.speedInterval; fresh.sent=g.sent; fresh.score=g.score; fresh.linesCleared=g.linesCleared; fresh.level=g.level; this.lastAttacker[i]=-1; this.players[i]=fresh;if(this.mode==='item'&&this.itemStyle==='collect'){this.items[i]!.guard=4000;this.items[i]!.shield=0;this.itemNotice(i,'✨ 4초 보호! 다시 도전해요')}
     }
   })
   if(!this.cooperative&&this.info.players===2&&Math.max(...this.kos)>=this.koTarget){const [first,second]=this.kos;if(first===second)this.complete(-1,`동시에 ${this.koTarget} KO · 무승부`);else this.complete(first!>second!?0:1,`${this.koTarget} KO를 먼저 달성했어요!`)}
   this.wire()
   const alive = this.eliminated.map((dead,i)=>dead?-1:i).filter(i=>i>=0)
   if (!this.solo && (this.mode==='arena' || isRace(this.mode)) && alive.length<=1) this.complete(alive[0]??-1,'마지막 생존자!')
   if (!this.finished && this.timed && this.remaining===0) {
     if(this.cooperative)this.complete(-1,`시간 종료 · 합산 ${this.teamLines}/${this.goalLines}줄 · 다시 함께 도전해요!`)
     else if (this.solo) this.complete(0,'2분 도전 완료!')
     else {
       const sorted = this.players.map((g,i)=>({i,kos:this.kos[i]!,sent:g.sent,score:g.score,height:20-g.board.grid.findIndex(row=>row.some(Boolean))})).map(p=>({...p,height:p.height===21?0:p.height})).sort((a,b)=>b.kos-a.kos || b.sent-a.sent || (this.original?a.height-b.height:b.score-a.score))
       const first=sorted[0]!,second=sorted[1]!
       if(first.kos===second.kos&&first.sent===second.sent&&(this.original?first.height===second.height:first.score===second.score))this.complete(-1,this.original?'시간 종료 · KO·보낸 줄·블록 높이가 모두 같아요':'시간 종료 · KO·보낸 줄·점수가 모두 같아요')
       else this.complete(first.i,this.original&&first.kos===second.kos&&first.sent===second.sent?'시간 종료 · 남은 블록이 더 낮아요':`시간 종료 · ${first.kos!==second.kos?'KO':first.sent!==second.sent?'보낸 줄':'점수'}가 더 높아요`)
     }
   }
 }
 stackHeight(i:number){const top=this.players[i]!.board.grid.findIndex(row=>row.some(Boolean));return top<0?0:20-top}
 get ranking(): number[] {
   return this.players.map((_,i)=>i).sort((a,b)=>{
     if (isRace(this.mode)) return this.progress(b)-this.progress(a)
     return Number(this.eliminated[a])-Number(this.eliminated[b]) || this.kos[b]!-this.kos[a]! || this.players[b]!.sent-this.players[a]!.sent || (this.original?this.stackHeight(a)-this.stackHeight(b):this.players[b]!.score-this.players[a]!.score)
   })
 }
 get teamLines(){return this.players.reduce((sum,game)=>sum+game.linesCleared,0)}
 get leader():number|null{if(this.cooperative)return null;if(this.finished)return this.winner===-1?null:this.winner;const sorted=this.ranking;if(sorted.length<2)return sorted[0]??null;const a=sorted[0]!,b=sorted[1]!;return this.kos[a]===this.kos[b]&&this.players[a]!.sent===this.players[b]!.sent&&(this.original?this.stackHeight(a)===this.stackHeight(b):this.players[a]!.score===this.players[b]!.score)?null:a}
 progress(i: number): number { return this.mode==='rally8p' ? 80-this.players[i]!.rallyRemaining : this.players[i]!.linesCleared }
}
