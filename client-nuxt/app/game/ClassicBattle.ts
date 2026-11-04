import {rotateBattle} from './BattleRotation'
import { Game } from './Game'
import { Tetromino, type TetrominoType } from './Tetromino'
import { CLASSIC_MAPS } from './ClassicMaps'

export interface BattleClear { lines: number; attack: number; combo: number; spin: boolean; backToBack: boolean;mini?:boolean }
const TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

/** Additive Facebook-style battle rules; the original engine remains unchanged. */
export class BattleGame extends Game {
    bombGarbage=false
    twinBomb=false
    private lockResets=0
    private lastKick=0
    sent = 0
    pending = 0
    combo = -1
    backToBack = false
    rotated = false
    event: BattleClear | null = null
    effectTime = 0
    onAttack: (count: number) => void = () => {}

    constructor() { super(); this.allowHold = true; this.increaseGravity = false }
    protected override spawnPiece(): Tetromino {
        // Keep a complete next-five preview, including across seven-bag boundaries.
        while (this.pieceQueue.length < 6) {
            const bag = [...TYPES]
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
            }
            this.pieceQueue.unshift(...bag)
        }
        return super.spawnPiece()
    }
    get previews(): TetrominoType[] { return [this.nextPiece.type, ...this.pieceQueue.slice(-4).reverse()] }
    override canPlacePiece(piece:Tetromino):boolean{return piece.getBlocks().every(b=>b.x>=0&&b.x<10&&b.y>=-2&&b.y<20&&(b.y<0||this.board.isCellEmpty(b.x,b.y)))}
    override getGhostPiece():Tetromino{const ghost=this.currentPiece.clone();while(true){ghost.y++;if(!this.canPlacePiece(ghost)){ghost.y--;return ghost}}}
    override rotate():boolean{return this.turn(1)}
    rotateLeft():boolean{return this.turn(-1)}
    private turn(direction:1|-1){if(this.isPaused||this.isGameOver)return false;const grounded=this.grounded();const ok=rotateBattle(this.currentPiece,direction,piece=>this.canPlacePiece(piece),index=>{this.lastKick=index});if(ok){this.rotated=true;this.resetGroundLock(grounded)}return ok}
    override hold():void{const used=this.holdUsedThisTurn;super.hold();if(!used&&this.holdUsedThisTurn){this.lockResets=0;this.rotated=false;if(!this.canPlacePiece(this.currentPiece))this.isGameOver=true}}
    private grounded(){const piece=this.currentPiece.clone();piece.y++;return !this.canPlacePiece(piece)}
    private resetGroundLock(grounded:boolean){if(grounded&&this.lockResets<15){this.lockTimer=0;this.lockResets++}}
    override moveLeft(): boolean {const grounded=this.grounded();const ok=super.moveLeft();if(ok){this.rotated=false;this.resetGroundLock(grounded)}return ok}
    override moveRight(): boolean {const grounded=this.grounded();const ok=super.moveRight();if(ok){this.rotated=false;this.resetGroundLock(grounded)}return ok}
    protected override lockPiece(): void {
        const p = this.currentPiece
        if(p.getBlocks().some(block=>block.y<0)){this.isGameOver=true;return}
        let bombs=0
        if(this.bombGarbage){
            const blocks=p.getBlocks(),rows=new Set<number>()
            for(const block of blocks){let row=block.y+1;while(row<20&&this.board.getCell(block.x,row)===9){rows.add(row);row++}}
            if(rows.size){bombs=rows.size;this.board.grid=this.board.grid.filter((_,y)=>!rows.has(y));while(this.board.grid.length<20)this.board.grid.unshift(Array(10).fill(0));p.y+=bombs}
        }
        const corners = [[0, 0], [2, 0], [0, 2], [2, 2]]
            .filter(([dx, dy]) => !this.board.isCellEmpty(p.x + dx!, p.y + dy!)).length
        const spin = p.type === 'T' && this.rotated && corners >= 3
        const frontCorners=[[[0,0],[2,0]],[[2,0],[2,2]],[[0,2],[2,2]],[[0,0],[0,2]]][p.rotationIndex]!
        const front=frontCorners.filter(([dx,dy])=>!this.board.isCellEmpty(p.x+dx!,p.y+dy!)).length
        const before = this.linesCleared
        super.lockPiece();this.lockResets=0
        const lines = this.linesCleared - before
        const mini=spin&&lines===1&&front<2&&this.lastKick!==4
        const difficult = lines === 4 || (spin && lines > 0)
        const b2b = difficult && this.backToBack
        let attack = 0
        if (lines > 0) {
            this.combo++
            attack = mini?1:spin ? [0, 2, 4, 6][lines]! : [0, 0, 1, 2, 4][lines]!
            if (b2b) attack = mini?2:spin ? Math.floor(attack*1.5) : attack+2
            if (this.combo > 0) attack += Math.min(4, Math.floor((this.combo + 1) / 2))
            this.backToBack = difficult
            if(this.bombGarbage&&this.board.grid.every(row=>row.every(cell=>cell===0)))attack=Math.max(attack,10)
        } else if(bombs===0)this.combo = -1
        attack+=Math.floor(bombs/2)
        this.linesCleared+=bombs
        this.event = { lines, attack, combo: this.combo, spin, mini, backToBack: b2b }
        this.effectTime = lines > 0 ? 1200 : 0
        const cancelled = Math.min(attack, this.pending)
        this.pending -= cancelled
        attack -= cancelled
        this.sent += attack
        if (attack > 0) this.onAttack(attack)
        // Receive garbage at a lock boundary, preserving the active piece's collision state.
        if (lines === 0 && this.pending > 0) {
            const count = Math.min(12, this.pending)
            this.pending -= count
            this.addGarbage(count)
        }
        this.rotated = false
    }
    addGarbage(count: number): void {
        if(this.bombGarbage){
            const column=Math.floor(Math.random()*this.board.width)
            for(let i=0;i<count;i++){if(this.board.grid[0]!.some(Boolean))this.isGameOver=true;this.board.grid.shift();this.board.grid.push(Array.from({length:10},(_,x)=>x===column||(this.twinBomb&&x===(column+5)%10)?9:8))}
            if(!this.canPlacePiece(this.currentPiece))this.isGameOver=true
            return
        }
        const hole = Math.floor(Math.random() * this.board.width)
        for (let i = 0; i < count; i++) {
            if (this.board.grid[0]!.some(Boolean)) this.isGameOver = true
            this.board.grid.shift()
            this.board.grid.push(Array.from({ length: this.board.width }, (_, x) => x === hole ? 0 : 8))
        }
        if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true
    }
    override update(ms: number): void { super.update(ms); this.effectTime = Math.max(0, this.effectTime - ms) }
}

export class ClassicBattle {
    players: [BattleGame, BattleGame] = [new BattleGame(), new BattleGame()]
    kos: [number, number] = [0, 0]
    remaining = 130000 // Matches reference settings.MAX_TIME.
    paused = false
    winner: 0 | 1 | -1 | null = null
    cpu = true
    private cpuClock = 0
    constructor(cpu = true, map = 0) {
        this.cpu = cpu
        this.wire()
        if (map > 0 && CLASSIC_MAPS[map - 1]) for (const game of this.players)
            game.board.grid = CLASSIC_MAPS[map - 1]!.map(row => [...row])
    }
    private wire(): void { this.players.forEach((g, i) => { g.onAttack = n => { this.players[1 - i]!.pending += n } }) }
    update(ms: number): void {
        if (this.paused || this.winner !== null) return
        this.remaining = Math.max(0, this.remaining - ms)
        this.players.forEach(g => g.update(ms))
        this.cpuClock += ms
        if (this.cpu && this.cpuClock >= 750) { this.cpuClock %= 750; this.cpuDrop() }
        this.players.forEach((g, i) => {
            if (!g.isGameOver) return
            this.kos[1 - i]!++
            if (this.kos[1 - i]! >= 3) { this.winner = (1 - i) as 0 | 1; return }
            const replacement = new BattleGame()
            replacement.sent = g.sent
            this.players[i] = replacement
        })
        this.wire()
        if (this.remaining === 0 && this.winner === null) {
            const a = this.players[0].sent, b = this.players[1].sent
            const height = (g: BattleGame) => { const top = g.board.grid.findIndex(row => row.some(Boolean)); return top < 0 ? 0 : 20 - top }
            this.winner = a === b ? (height(this.players[0]) === height(this.players[1]) ? -1 : height(this.players[0]) < height(this.players[1]) ? 0 : 1) : a > b ? 0 : 1
        }
    }
    cpuDrop(): void { playCPU(this.players[1]) }
}

export function playCPU(game: BattleGame, race = false): void {
        if (game.isGameOver) return
        let best: Tetromino | null = null, value = -Infinity
        for (let rotation = 0; rotation < 4; rotation++) for (let x = -3; x < 10; x++) {
            const p = new Tetromino(game.currentPiece.type, x, 0); p.rotationIndex = rotation
            if (!game.canPlacePiece(p)) continue
            while (true) { p.y++; if (!game.canPlacePiece(p)) { p.y--; break } }
            const grid = game.board.grid.map(row => [...row])
            for (const b of p.getBlocks()) grid[b.y]![b.x] = 1
            const cleared = grid.filter(row => row.every(Boolean)).length
            const rest = grid.filter(row => !row.every(Boolean))
            while (rest.length < 20) rest.unshift(Array(10).fill(0))
            const heights = Array.from({ length: 10 }, (_, col) => {
                const first = rest.findIndex(row => row[col] !== 0)
                return first < 0 ? 0 : 20 - first
            })
            let holes = 0
            for (let col = 0; col < 10; col++) for (let y = 20 - heights[col]!; y < 20; y++) if (rest[y]![col] === 0) holes++
            const bump = heights.slice(1).reduce((sum, h, i) => sum + Math.abs(h - heights[i]!), 0)
            const score = cleared * (race ? 14 : 8) - heights.reduce((a, b) => a + b, 0) * .5 - holes * 7 - bump * .4
            if (score > value) { best = p; value = score }
        }
        if (best) {
            best.y = 0
            game.currentPiece = best
            game.rotated = false
            game.hardDrop()
        } else game.isGameOver = true
    }
