/**
 * Game - Main game state manager for Tetris
 * 
 * Manages:
 * - Board state
 * - Current piece movement and collision
 * - Piece spawning and locking
 * - Score tracking
 * - Game over detection
 */
import { Board } from './Board'
import { Tetromino, type TetrominoType } from './Tetromino'
import { checkAndClearLines, calculateScore } from './LineClearing'

const PIECE_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Score values
const SCORE_SOFT_DROP = 1
const SCORE_HARD_DROP_PER_CELL = 2

export class Game {
    readonly board: Board
    currentPiece: Tetromino
    nextPiece: Tetromino
    heldPiece: Tetromino | null
    score: number
    level: number
    linesCleared: number
    isGameOver: boolean
    isPaused: boolean
    public allowHold: boolean = false
    protected pieceQueue: TetrominoType[]
    protected holdUsedThisTurn: boolean
    protected dropTimer: number = 0
    protected lockTimer: number = 0
    protected readonly LOCK_DELAY_MS = 500
    public increaseGravity: boolean = true

    constructor() {
        this.board = new Board()
        this.score = 0
        this.level = 1
        this.linesCleared = 0
        this.isGameOver = false
        this.isPaused = false
        this.heldPiece = null
        this.holdUsedThisTurn = false
        this.pieceQueue = this.generatePieceQueue()
        this.currentPiece = this.spawnPiece()
        this.nextPiece = this.spawnPiece()
    }

    /**
     * Generate a shuffled queue of all 7 piece types (7-bag randomizer)
     */
    private generatePieceQueue(): TetrominoType[] {
        const bag = [...PIECE_TYPES]
        // Fisher-Yates shuffle
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
        }
        return bag
    }

    /**
     * Spawn a new piece at the top of the board
     */
    protected spawnPiece(): Tetromino {
        if (this.pieceQueue.length === 0) {
            this.pieceQueue = this.generatePieceQueue()
        }
        const type = this.pieceQueue.pop()!
        const piece = new Tetromino(type)

        // Queue generation is not activation: only the current piece can top out.

        // Reset counters
        this.dropTimer = 0
        this.lockTimer = 0

        return piece
    }

    /**
     * Check if a piece can be placed at its current position
     */
    canPlacePiece(piece: Tetromino): boolean {
        const blocks = piece.getBlocks()
        return blocks.every(block => {
            // Check bounds
            if (block.x < 0 || block.x >= this.board.width) return false
            if (block.y < 0 || block.y >= this.board.height) return false
            // Check collision with existing blocks
            return this.board.isCellEmpty(block.x, block.y)
        })
    }

    /**
     * Try to move piece in a direction
     * Returns true if move was successful
     */
    private tryMove(dx: number, dy: number): boolean {
        if (this.isGameOver || this.isPaused) return false

        this.currentPiece.move(dx, dy)

        if (this.canPlacePiece(this.currentPiece)) {
            // If move successful, reset lock timer (Extended Lock Delay behavior)
            // But only if we are moving? Actually user requested delay *before* locking.
            // Standard behavior: any successful movement resets lock delay (up to a limit, but we'll keep it simple infinite for now as per request)
            return true
        }

        // Revert move
        this.currentPiece.move(-dx, -dy)
        return false
    }

    /**
     * Move piece left
     */
    moveLeft(): boolean {
        return this.tryMove(-1, 0)
    }

    /**
     * Move piece right
     */
    moveRight(): boolean {
        return this.tryMove(1, 0)
    }

    /**
     * Move piece down (soft drop)
     * @param isSoftDrop If true, adds score for soft drop (user action)
     */
    moveDown(isSoftDrop: boolean = false): boolean {
        // [FIXED] Critical: Check pause/gameover first to avoid unintended locking loop
        if (this.isGameOver || this.isPaused) return false

        const moved = this.tryMove(0, 1)

        if (moved) {
            // Soft drop score only for manual drop
            if (isSoftDrop) {
                this.score += SCORE_SOFT_DROP
            }
        }
        // [CHANGE] Removed automatic locking here. Locking is now handled in update() with delay.

        return moved
    }

    protected lockPiece(): void {
        const blocks = this.currentPiece.getBlocks()
        const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1

        blocks.forEach(block => {
            this.board.setCell(block.x, block.y, pieceColorIndex)
        })

        // Check for line clears
        const cleared = checkAndClearLines(this.board)
        if (cleared > 0) {
            this.linesCleared += cleared
            this.score += calculateScore(cleared, this.level)
            // Level up every 10 lines
            this.level = Math.floor(this.linesCleared / 10) + 1
        }

        // Move next piece to current, spawn new next piece
        this.currentPiece = this.nextPiece
        this.nextPiece = this.spawnPiece()

        // Reset hold lock
        this.holdUsedThisTurn = false
        this.lockTimer = 0 // Reset lock timer

        // Check if new current piece can be placed (game over)
        if (!this.canPlacePiece(this.currentPiece)) {
            this.isGameOver = true
        }
    }

    /**
     * Hold current piece - swap with held piece or store if empty
     */
    hold(): void {
        if (this.isGameOver || this.isPaused) return
        if (!this.allowHold) return // [FIX] Check if hold is allowed (disabled in Standard Solo)
        if (this.holdUsedThisTurn) return // Can only hold once per turn

        this.holdUsedThisTurn = true
        this.lockTimer = 0 // Reset lock timer when holding

        if (this.heldPiece === null) {
            // No held piece - store current, get next
            this.heldPiece = new Tetromino(this.currentPiece.type)
            this.currentPiece = this.nextPiece
            this.nextPiece = this.spawnPiece()
        } else {
            // Swap current with held
            const tempType = this.currentPiece.type
            this.currentPiece = new Tetromino(this.heldPiece.type)
            this.heldPiece = new Tetromino(tempType)
            // Reset position of swapped piece
            this.currentPiece.x = 3
            this.currentPiece.y = 0
        }
        if (!this.canPlacePiece(this.currentPiece)) this.isGameOver = true
    }

    /**
     * Rotate piece clockwise
     */
    rotate(): boolean {
        if (this.isGameOver || this.isPaused) return false

        this.currentPiece.rotate()

        if (this.canPlacePiece(this.currentPiece)) {
            return true
        }

        // Try wall kicks (simplified - just try moving left/right)
        const kicks = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: -2, dy: 0 },
            { dx: 2, dy: 0 },
            { dx: 0, dy: -1 },
        ]

        for (const kick of kicks) {
            this.currentPiece.move(kick.dx, kick.dy)
            if (this.canPlacePiece(this.currentPiece)) {
                return true
            }
            this.currentPiece.move(-kick.dx, -kick.dy)
        }

        // Revert rotation if no valid position found
        this.currentPiece.rotateCounterClockwise()
        return false
    }

    /**
     * Hard drop - instantly drop piece to bottom
     */
    hardDrop(): boolean {
        if (this.isGameOver || this.isPaused) return false

        let dropDistance = 0

        while (this.tryMove(0, 1)) {
            dropDistance++
        }

        // Add score for hard drop
        this.score += dropDistance * SCORE_HARD_DROP_PER_CELL

        // Lock the piece
        this.lockPiece()

        return true
    }

    /**
     * Get ghost piece (preview of where piece will land)
     */
    getGhostPiece(): Tetromino {
        const ghost = this.currentPiece.clone()

        while (true) {
            ghost.move(0, 1)
            if (!this.canPlacePieceGhost(ghost)) {
                ghost.move(0, -1)
                break
            }
        }

        return ghost
    }

    /**
     * Check if ghost piece can be placed (ignores current piece)
     */
    private canPlacePieceGhost(piece: Tetromino): boolean {
        const blocks = piece.getBlocks()
        return blocks.every(block => {
            if (block.x < 0 || block.x >= this.board.width) return false
            if (block.y < 0 || block.y >= this.board.height) return false
            return this.board.isCellEmpty(block.x, block.y)
        })
    }

    /**
     * Data structure for saved game state
     */
    serialize(): any {
        return {
            score: this.score,
            level: this.level,
            linesCleared: this.linesCleared,
            isGameOver: this.isGameOver,
            isPaused: this.isPaused, // Should save as true usually? Or keep current state.
            allowHold: this.allowHold,
            heldPiece: this.heldPiece ? {
                type: this.heldPiece.type,
                x: this.heldPiece.x,
                y: this.heldPiece.y,
                rotationIndex: this.heldPiece.rotationIndex
            } : null,
            currentPiece: {
                type: this.currentPiece.type,
                x: this.currentPiece.x,
                y: this.currentPiece.y,
                rotationIndex: this.currentPiece.rotationIndex
            },
            nextPiece: {
                type: this.nextPiece.type,
                x: this.nextPiece.x,
                y: this.nextPiece.y,
                rotationIndex: this.nextPiece.rotationIndex
            },
            board: this.board.grid, // 2D number array is serializable
            pieceQueue: this.pieceQueue,
            holdUsedThisTurn: this.holdUsedThisTurn,
            dropTimer: this.dropTimer,
            lockTimer: this.lockTimer,
            increaseGravity: this.increaseGravity
        }
    }

    /**
     * Restore game from saved state
     */
    static deserialize(data: any): Game {
        const game = new Game()

        // Basic stats
        game.score = data.score
        game.level = data.level
        game.linesCleared = data.linesCleared
        game.isGameOver = data.isGameOver
        game.isPaused = data.isPaused
        game.allowHold = data.allowHold
        game.holdUsedThisTurn = data.holdUsedThisTurn
        game.dropTimer = data.dropTimer
        game.lockTimer = data.lockTimer
        game.increaseGravity = data.increaseGravity

        // Queues
        if (data.pieceQueue) {
            game.pieceQueue = [...data.pieceQueue]
        }

        // Reconstruct Board
        // We assume board dimensions are standard 10x20. 
        // If grid size differs from default, Board class might handle it if we passed params, 
        // but here we just overwrite the grid.
        if (data.board) {
            // Deep copy grid to ensure no reference issues
            game.board.grid = data.board.map((row: number[]) => [...row])
        }

        // Reconstruct Pieces
        const restorePiece = (pieceData: any): Tetromino => {
            const piece = new Tetromino(pieceData.type, pieceData.x, pieceData.y)
            piece.rotationIndex = pieceData.rotationIndex
            return piece
        }

        if (data.currentPiece) {
            game.currentPiece = restorePiece(data.currentPiece)
        }

        if (data.nextPiece) {
            game.nextPiece = restorePiece(data.nextPiece)
        }

        if (data.heldPiece) {
            game.heldPiece = restorePiece(data.heldPiece)
        } else {
            game.heldPiece = null
        }

        return game
    }

    /**
     * Toggle pause state
     */
    togglePause(): void {
        this.isPaused = !this.isPaused
    }

    /**
     * Get drop interval in milliseconds based on current level
     * Formula: 1000ms * (0.9 ^ (level - 1))
     * Minimum speed caps at 100ms
     */
    getDropInterval(): number {
        if (!this.increaseGravity) return 1000
        const interval = 1000 * Math.pow(0.9, this.level - 1)
        return Math.max(100, Math.floor(interval))
    }

    /**
     * Update game state based on elapsed time
     * @param deltaTime Time in ms since last update
     */
    update(deltaTime: number): void {
        if (this.isPaused || this.isGameOver) return

        this.dropTimer += deltaTime
        const interval = this.getDropInterval()

        if (this.dropTimer >= interval) {
            this.moveDown()
            this.dropTimer = 0 // Reset timer
        }

        // Check if piece is on ground (cannot move down)
        // Check collision without moving
        const testPiece = this.currentPiece.clone()
        testPiece.move(0, 1)
        const canMoveDown = this.canPlacePiece(testPiece)

        if (!canMoveDown) {
            // Piece is on ground, increment lock timer
            this.lockTimer += deltaTime
            if (this.lockTimer >= this.LOCK_DELAY_MS) {
                this.lockPiece()
            }
        } else {
            // Piece is floating, reset lock timer
            this.lockTimer = 0
        }
    }
}
