/**
 * OnlineGame - Manages the Local Player's game state and syncs with Server
 */
import { Game } from './Game'
import { socketService } from '~/services/SocketService'
import { EffectType, EffectSystem, type GameEffect, type Particle } from './EffectSystem'
import { applyGravity, clearLinesOnly } from './CascadeGravity'
import { calculateScore } from './LineClearing'

export class OnlineGame extends Game {
    isOpponentConnected = false
    opponentBoard: number[][] = [] // Visual representation of opponent grid
    opponentScore = 0
    opponentLines = 0
    opponentId: string | null = null
    opponentName: string | null = null
    opponentGameOver = false  // True when opponent lost
    isWinner = false          // True when we won (opponent game over)
    isDraw = false            // True when both players game over at same time
    winScore: number | null = null  // Score at time of winning (for leaderboard)
    matchId: string | null = null // Server-assigned match ID

    // Countdown Logic
    countdown: number | null = null
    timer: any = null

    // Game Duration Logic
    gameDuration = 0 // Seconds
    private durationInterval: any = null

    // Game Settings (LAN)
    attackMode: 'lines' | 'garbage' = 'garbage' // Default to garbage
    showGhostPiece = true // Toggle ghost piece visibility
    effectType: EffectType = EffectType.EXPLOSION // Visual effect type
    useCascadeGravity = false // Puyo-style cascade gravity
    allowHoldPiece = true // Toggle hold piece feature
    isHost = false // Default to false (Guest) until confirmed by server. Safe default.

    // Cascade Gravity State
    chainCount = 0
    isCascading = false
    private cascadeTimer = 0
    private readonly CASCADE_DELAY = 150 // ms

    // Effect System for visual line clear effects
    readonly effectSystem = new EffectSystem()

    // Expose effects for rendering
    get effects(): GameEffect[] {
        return this.effectSystem.effects
    }

    get particles(): Particle[] {
        return this.effectSystem.particles
    }

    constructor() {
        super()
        this.allowHold = true // [FIX] Enable hold for Online/LAN games
        this.opponentBoard = Array(20).fill(null).map(() => Array(10).fill(0))
    }

    // Public init method to be called AFTER reactive() wrapping
    public async init(wsUrl: string) {
        return this.initSocket(wsUrl)
    }

    private startDurationTimer() {
        if (this.durationInterval) clearInterval(this.durationInterval)
        this.durationInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver) {
                this.gameDuration++
            }
        }, 1000)
    }

    private stopDurationTimer() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval)
            this.durationInterval = null
        }
    }

    private initSocket(wsUrl: string) {
        // Register listeners BEFORE connecting to ensure we don't miss immediate events (like room_status)
        // Check if we should clear listeners first? Ideally yes, but removeAllListeners in cleanup handles it for re-runs.
        // But OnlineGame is usually one-shot.

        // Listener registration (moved up)
        socketService.on('game_start', (payload: any) => {
            console.log('Game Started vs', payload.opponentName, 'MatchID:', payload.matchId)
            this.opponentId = payload.opponentId
            this.opponentName = payload.opponentName
            this.matchId = payload.matchId

            // Sync attack mode from server (use host's setting)
            if (payload.attackMode) {
                const previousMode = this.attackMode
                this.attackMode = payload.attackMode
                console.log(`[CONFIG] AttackMode synced: ${previousMode} -> ${payload.attackMode} (isHost: ${this.isHost})`)
            }

            console.log(`[GAME START] Role: ${this.isHost ? 'HOST' : 'GUEST'}, AttackMode: ${this.attackMode}, Ghost: ${this.showGhostPiece}, Effect: ${this.effectType}`)

            this.isOpponentConnected = true
            this.reset()
            this.startCountdown()
        })

        socketService.on('game_state', (payload: any) => {
            if (payload.grid) this.opponentBoard = payload.grid
            if (payload.score !== undefined) this.opponentScore = payload.score
            if (payload.lines !== undefined) this.opponentLines = payload.lines
        })

        socketService.on('attack', (payload: any) => {
            if (payload.lines) {
                console.log('Received attack:', payload.lines)
                this.receiveGarbage(payload.lines)
            }
        })

        socketService.on('player_left', () => {
            console.log('Opponent has left the game.') // Standardize logging
            this.isOpponentConnected = false

            // If we already won, don't force Game Over. Let them continue if they want.
            if (!this.isWinner) {
                alert('Opponent disconnected!')
                this.isGameOver = true
                this.stopDurationTimer()
            }
            // Even if we won, we might want to stop the "vs" synchronization logic via a flag, 
            // but isOpponentConnected=false handles that in broadcastState().

            if (this.timer) clearInterval(this.timer)
        })

        socketService.on('waiting_for_opponent', () => {
            console.log('Waiting for opponent... (You are the host)')
            this.isHost = true // Confirm host role
        })

        socketService.on('room_status', (payload: any) => {
            console.log('[ROOM_STATUS] Received:', payload)

            if (payload.hasHost) {
                // Someone is already waiting - we are guest
                console.log('[ROOM_STATUS] Host found, becoming GUEST')
                this.isHost = false

                if (payload.hostSettings) {
                    console.log('[ROOM_STATUS] Syncing host settings:', payload.hostSettings)
                    if (payload.hostSettings.attackMode) {
                        this.attackMode = payload.hostSettings.attackMode
                    }
                    if (payload.hostSettings.showGhostPiece !== undefined) {
                        this.showGhostPiece = payload.hostSettings.showGhostPiece
                    }
                    if (payload.hostSettings.effectType) {
                        this.effectType = payload.hostSettings.effectType
                    }
                    if (payload.hostSettings.useCascadeGravity !== undefined) {
                        this.useCascadeGravity = payload.hostSettings.useCascadeGravity
                    }
                    if (payload.hostSettings.allowHoldPiece !== undefined) {
                        this.allowHoldPiece = payload.hostSettings.allowHoldPiece
                        this.allowHold = payload.hostSettings.allowHoldPiece
                    }
                    if (payload.hostSettings.increaseGravity !== undefined) {
                        console.log('[ROOM_STATUS] Syncing increaseGravity:', payload.hostSettings.increaseGravity)
                        this.increaseGravity = payload.hostSettings.increaseGravity
                    }
                }
            } else {
                // No host waiting - we will be host
                console.log('[ROOM_STATUS] No host, becoming HOST')
                this.isHost = true
            }

            console.log('[ROOM_STATUS] Final isHost:', this.isHost)
        })

        socketService.on('pause', () => {
            if (!this.isPaused) {
                console.log('Opponent paused the game')
                this.isPaused = true
                // Note: We don't stop our timer if opponent pauses, 
                // but usually online games pause for both. 
                // For now, let's assume pause state is global or synchronized?
                // The current togglePause implementation sends 'pause' and sets local isPaused.
            }
        })

        socketService.on('resume', () => {
            if (this.isPaused) {
                console.log('Opponent resumed the game')
                this.isPaused = false
            }
        })

        socketService.on('game_over', () => {
            // Guard: only process once
            if (this.isWinner || this.opponentGameOver || this.isDraw) return

            this.stopDurationTimer()

            this.opponentGameOver = true

            // Check if both game over at same time = Draw
            if (this.isGameOver) {
                console.log('Both players game over! Draw!')
                this.isDraw = true
            } else {
                console.log('Opponent lost! You win!')
                this.isWinner = true
                this.isPaused = true  // Pause to show win message
                this.winScore = this.score  // Record score at win time
            }
        })

        // Finally connect
        return socketService.connect(wsUrl).then(() => {
            console.log('OnlineGame connected to socket:', wsUrl)
        }).catch(err => {
            console.error('OnlineGame connection failed', err)
            throw err // Propagate error
        })
    }

    joinGame(name: string) {
        console.log(`[JOIN] Joining as "${name}" with settings:`, {
            attackMode: this.attackMode,
            showGhostPiece: this.showGhostPiece,
            effectType: this.effectType,
            useCascadeGravity: this.useCascadeGravity,
            allowHoldPiece: this.allowHoldPiece,
            isHost: this.isHost
        })
        socketService.send('join_game', {
            name,
            attackMode: this.attackMode,
            showGhostPiece: this.showGhostPiece,
            effectType: this.effectType,
            useCascadeGravity: this.useCascadeGravity,
            allowHoldPiece: this.allowHoldPiece,
            increaseGravity: this.increaseGravity
        })
    }

    override togglePause() {
        super.togglePause()
        const event = this.isPaused ? 'pause' : 'resume'
        console.log(`Sending ${event} signal`)
        socketService.send(event)
    }

    toggleHoldPiece() {
        this.allowHoldPiece = !this.allowHoldPiece
        this.allowHold = this.allowHoldPiece
    }

    toggleGhostPiece() {
        this.showGhostPiece = !this.showGhostPiece
    }

    /**
     * Update effect animations and cascade gravity (call from game loop)
     */
    override update(deltaTime: number): void {
        // Update effects
        this.effectSystem.update(deltaTime)

        // Handle Gravity (inherited from Game)
        if (this.countdown === null && (this.isOpponentConnected || this.isWinner)) {
            super.update(deltaTime)
        }

        // Cascade Gravity Logic
        if (!this.useCascadeGravity || !this.isCascading) return

        this.cascadeTimer += deltaTime
        if (this.cascadeTimer >= this.CASCADE_DELAY) {
            const moved = applyGravity(this.board)
            this.cascadeTimer = 0

            if (!moved) {
                const result = clearLinesOnly(this.board)
                if (result.count > 0) {
                    this.chainCount++
                    this.linesCleared += result.count
                    this.score += calculateScore(result.count, this.level) * this.chainCount
                    this.level = Math.floor(this.linesCleared / 10) + 1

                    // Create visual effects
                    this.effectSystem.setEffectType(this.effectType)
                    this.effectSystem.createEffects(result.indices, result.count)

                    console.log('[OnlineGame] Chain', this.chainCount, '- lines:', result.count)

                    // Broadcast updated state and send garbage if applicable
                    this.broadcastState()
                    if (result.count >= 2 && this.attackMode === 'garbage') {
                        const garbage = this.calculateGarbage(result.count)
                        if (garbage > 0) {
                            socketService.send('attack', { lines: garbage })
                        }
                    }
                } else {
                    this.isCascading = false
                    this.spawnCascadeNextPiece()
                    console.log('[OnlineGame] Cascade complete')
                }
            }
        }
    }

    /**
     * Spawn next piece after cascade complete
     */
    private spawnCascadeNextPiece(): void {
        this.currentPiece = this.nextPiece
        this.nextPiece = this.spawnPiece()
        this.holdUsedThisTurn = false

        if (!this.canPlacePiece(this.currentPiece)) {
            this.isGameOver = true
            this.stopDurationTimer()
        }
    }

    // Continue playing solo after winning (for high score)
    continueAfterWin() {
        if (this.isWinner) {
            this.isPaused = false
            console.log('Continuing solo play after winning')
            this.startDurationTimer() // Resume timer for max score tracking
        }
    }

    private startCountdown() {
        console.log('Starting Countdown...')
        this.countdown = 3
        if (this.timer) clearInterval(this.timer)

        this.timer = setInterval(() => {
            if (this.countdown !== null) {
                this.countdown--
                if (this.countdown <= 0) {
                    clearInterval(this.timer)
                    this.countdown = null
                    this.start()
                }
            }
        }, 1000)
    }

    override moveDown() {
        if (this.countdown !== null) return false
        return super.moveDown()
    }

    protected override lockPiece() {
        const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

        // Set effect type before clearing
        this.effectSystem.setEffectType(this.effectType)

        if (this.useCascadeGravity) {
            // Cascade Mode: Use clearLinesOnly and start cascade animation
            const blocks = this.currentPiece.getBlocks()
            const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1

            blocks.forEach(block => {
                this.board.setCell(block.x, block.y, pieceColorIndex)
            })

            const result = clearLinesOnly(this.board)
            console.log('[OnlineGame] lockPiece cascade - initial lines:', result.count)

            if (result.count > 0) {
                this.chainCount = 1
                this.linesCleared += result.count
                this.score += calculateScore(result.count, this.level)
                this.level = Math.floor(this.linesCleared / 10) + 1

                // Create visual effects
                this.effectSystem.createEffects(result.indices, result.count)

                this.isCascading = true
                this.cascadeTimer = 0

                // Broadcast state and send garbage
                this.broadcastState()
                if (result.count >= 2 && this.attackMode === 'garbage') {
                    const garbage = this.calculateGarbage(result.count)
                    if (garbage > 0) {
                        socketService.send('attack', { lines: garbage })
                    }
                }
            } else {
                this.chainCount = 0
                this.spawnCascadeNextPiece()
                this.broadcastState()
            }
        } else {
            // Normal Mode: Use parent lockPiece
            const linesBefore = this.linesCleared
            super.lockPiece()

            this.broadcastState()

            if (this.isGameOver) {
                this.stopDurationTimer()
            }

            const linesDiff = this.linesCleared - linesBefore

            // Create visual effects for cleared lines
            if (linesDiff > 0) {
                const indices: number[] = []
                for (let i = 0; i < linesDiff; i++) {
                    indices.push(19 - i)
                }
                this.effectSystem.createEffects(indices, linesDiff)
            }

            // Send garbage attack for 2+ lines
            if (linesDiff >= 2 && this.attackMode === 'garbage') {
                const garbage = this.calculateGarbage(linesDiff)
                if (garbage > 0) {
                    socketService.send('attack', { lines: garbage })
                }
            }
        }
    }

    broadcastState() {
        if (!this.isOpponentConnected) return

        socketService.send('game_state', {
            grid: this.board.grid,
            score: this.score,
            lines: this.linesCleared
        })

        if (this.isGameOver) {
            // Only send Game Over if we actually lost the match.
            // If we are winner, we are just ending our post-win solo run, so don't notify opponent.
            if (!this.isWinner) {
                socketService.send('game_over')
            }
            this.stopDurationTimer()
        }
    }

    private calculateGarbage(lines: number): number {
        switch (lines) {
            case 2: return 1
            case 3: return 2
            case 4: return 4
            default: return 0
        }
    }

    receiveGarbage(count: number) {
        for (let i = 0; i < count; i++) {
            this.addGarbageLine()
        }
        this.broadcastState()
    }

    private addGarbageLine() {
        const width = this.board.width
        const height = this.board.height

        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width; x++) {
                this.board.grid[y]![x] = this.board.grid[y + 1]![x]!
            }
        }

        const hole = Math.floor(Math.random() * width)
        for (let x = 0; x < width; x++) {
            this.board.grid[height - 1]![x] = (x === hole) ? 0 : 8
        }
    }

    getOpponentBoard(): number[][] {
        return this.opponentBoard
    }

    getOpponentScore(): number {
        return this.opponentScore
    }

    cleanup() {
        socketService.disconnect()
        socketService.removeAllListeners()
        if (this.timer) clearInterval(this.timer)
        this.stopDurationTimer()
    }

    reset() {
        this.board.clear()
        this.score = 0
        this.linesCleared = 0
        this.level = 1
        this.isGameOver = false
        this.gameDuration = 0
        this.stopDurationTimer()
        this.currentPiece = this.spawnPiece()
        this.nextPiece = this.spawnPiece()

        // Reset match outcome states
        this.isWinner = false
        this.isDraw = false
        this.opponentGameOver = false
        this.winScore = null
    }

    start() {
        this.isPaused = false
        this.startDurationTimer()
    }
}
