<template>
  <div class="online-area" 
       ref="gameContainer"
       @touchstart="handleTouchStart" 
       @touchmove="handleTouchMove" 
       @touchend="handleTouchEnd">
    <!-- Name Input Overlay -->
    <div v-if="showNameInput" class="name-overlay" @touchstart.stop @touchmove.stop @touchend.stop @mousedown.stop @click.stop>
        <div class="name-box">
            <h2>Enter Your Name</h2>
            <input v-model="playerName" @keyup.enter="joinGame" placeholder="Display Name..." maxlength="10" autofocus />
            
            <!-- LAN Settings -->
            <div v-if="mode === 'lan'" class="lan-settings">
                <!-- Role Badge -->
                <div class="role-badge" :class="onlineGame.isHost ? 'host' : 'guest'">
                    {{ onlineGame.isHost ? '👑 HOST (You set the rules)' : '👤 GUEST (Settings from host)' }}
                </div>
                
                <label class="settings-label">
                    🎮 Attack Mode:
                    <select 
                      v-model="onlineGame.attackMode" 
                      class="mode-select"
                      :disabled="!onlineGame.isHost"
                    >
                        <option value="garbage">Garbage Lines</option>
                        <option value="lines">Score Attack</option>
                    </select>
                </label>
                <label class="settings-label">
                    🎆 Effect:
                    <select 
                      v-model="onlineGame.effectType" 
                      class="mode-select"
                      :disabled="!onlineGame.isHost"
                    >
                        <option value="explosion">🎆 Explosion</option>
                        <option value="sparkle">✨ Sparkle</option>
                        <option value="wave">🌊 Wave</option>
                        <option value="shatter">💥 Shatter</option>
                        <option value="classic">⚡ Classic</option>
                    </select>
                </label>
                <label class="settings-label ghost-toggle" :class="{ disabled: !onlineGame.isHost }">
                    <input 
                      type="checkbox" 
                      :checked="onlineGame.showGhostPiece" 
                      @change="onlineGame.isHost && onlineGame.toggleGhostPiece()"
                      :disabled="!onlineGame.isHost"
                    />
                    👻 Ghost Piece
                </label>
                <label class="settings-label ghost-toggle" :class="{ disabled: !onlineGame.isHost }">
                    <input 
                      type="checkbox" 
                      v-model="onlineGame.useCascadeGravity" 
                      :disabled="!onlineGame.isHost"
                    />
                    🔄 Cascade Gravity (Puyo Style)
                </label>
                <label class="settings-label ghost-toggle" :class="{ disabled: !onlineGame.isHost }">
                    <input 
                      type="checkbox" 
                      :checked="onlineGame.allowHoldPiece" 
                      @change="onlineGame.isHost && onlineGame.toggleHoldPiece()"
                      :disabled="!onlineGame.isHost"
                    />
                    ✋ Hold Piece
                </label>
            </div>
            
            <div class="btn-group">
                <button @click="joinGame" class="join-btn">Join Game</button>
                <button @click="emit('back')" class="cancel-btn">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Local Player (You) -->
    <div class="player-section">
      <div class="player-header p1">
        <span class="player-label">{{ playerName || 'YOU' }}</span>
        <span class="controls-hint">{{ controlsHintText }}</span>
      </div>

      <!-- Mobile: Opponent info bar (full width) -->
      <div class="mobile-opponent-bar mobile-only">
        <span class="opp-label">Opponent: <strong>{{ onlineGame.opponentName || '???' }}</strong></span>
        <span class="opp-score">{{ onlineGame.getOpponentScore().toLocaleString() }}</span>
      </div>
      
      <div class="board-wrapper" style="position: relative;">
          <PlayerBoard 
            :game="onlineGame" 
            :showHold="onlineGame.allowHoldPiece" 
            :showNext="true"
            :showGhost="onlineGame.showGhostPiece"
            playerColor="#00d4ff"
          >
            <template #under-next>
                 <div class="mini-opponent-board desktop-only">
                    <div class="mini-header">
                        <span class="mini-label">{{ onlineGame.opponentName || 'OPPONENT' }}</span>
                        <span class="mini-score">{{ onlineGame.getOpponentScore().toLocaleString() }}</span>
                    </div>
                    <canvas ref="opponentCanvas" :width="canvasWidth" :height="canvasHeight" class="game-canvas opponent"></canvas>
                 </div>
            </template>
          </PlayerBoard>
          
          <div v-if="isWaiting || (onlineGame.countdown !== null) || onlineGame.isPaused || onlineGame.isGameOver || onlineGame.isDraw" class="board-overlay">
             <div v-if="isWaiting" class="overlay-content">
                 <div class="spinner"></div>
                 <p>Waiting...</p>
             </div>
             <div v-else-if="onlineGame.countdown !== null" class="overlay-content">
                 <span class="countdown-number">{{ onlineGame.countdown === 0 ? 'GO!' : onlineGame.countdown }}</span>
             </div>
             <div v-else-if="onlineGame.isPaused && !onlineGame.isWinner" class="overlay-content">
                 <span class="paused-text">GAME PAUSED</span>
                 <div class="overlay-buttons">
                    <button class="resume-btn" @click="onlineGame.togglePause()">▶️ Resume</button>
                     <button class="home-btn" @click="emit('back')">Exit</button>
                 </div>
             </div>
             <div v-else class="overlay-content game-over-content">
                  <span v-if="onlineGame.isDraw" class="result-text draw">🤝 DRAW!</span>
                  <span v-else-if="onlineGame.isWinner" class="result-text win">🏆 YOU WIN!</span>
                  <span v-else class="result-text lose">GAME OVER</span>

                  <div v-if="onlineGame.isWinner && onlineGame.winScore !== null" class="win-score">
                      Win Score: {{ onlineGame.winScore?.toLocaleString() }}
                  </div>
                   <div v-if="onlineGame.isWinner && !onlineGame.isPaused" class="max-score">
                      Max Score: {{ onlineGame.score.toLocaleString() }}
                  </div>
                  
                  <div v-if="matchSaved" class="save-status">✅ Match Saved!</div>
                  
                  <div class="overlay-buttons">
                      <button v-if="onlineGame.isWinner && onlineGame.isPaused" @click="onlineGame.continueAfterWin()" class="continue-btn">
                          ▶️ Continue Playing
                      </button>
                  </div>
             </div>
          </div>
      </div>

      <div class="player-stats">
        <span class="score">{{ onlineGame.score.toLocaleString() }}</span>
        <span>L{{ onlineGame.level }} • {{ onlineGame.linesCleared }}</span>
        
        <div v-if="onlineGame.isWinner || onlineGame.isGameOver" class="winner-controls">
            <div v-if="matchSaved" class="save-status">✅ Match Saved!</div>
            <button v-if="!matchSaved" @click="saveAndExit" class="save-btn persistent-save-btn">💾 Save score</button>
            <button @click="emit('back')" class="home-btn small mt-2">Exit</button>
        </div>

        <div v-else-if="!showNameInput && !onlineGame.isPaused" class="active-controls">
             <button @click="emit('back')" class="home-btn small">Exit</button>
        </div>
      </div>
    </div>

    <!-- Center Status -->
    <div class="vs-section">
      <span class="vs-text">{{ mode === 'lan' ? '📡 LAN' : '🌐 ONLINE' }}</span>
      <span v-if="onlineGame.isOpponentConnected && !isWaiting && onlineGame.countdown === null" class="game-timer">⏱ {{ formattedTime }}</span>
      
      <div v-if="isWaiting" class="status-box waiting">
          <div class="spinner"></div>
          <div class="waiting-message">
            <span>Waiting for Opponent...</span>
          </div>
      </div>
      <div v-else-if="onlineGame.isOpponentConnected" class="status-box connected">
          <span>🟢 Connected</span>
      </div>
      
      <button v-if="!onlineGame.isGameOver && !onlineGame.isWinner && !onlineGame.isDraw && !showNameInput && !onlineGame.isPaused" @click="onlineGame.togglePause()" class="back-btn small">
        Pause
     </button>
     
     
     <!-- Quit button removed (redundant with Exit Game in player stats) -->
    </div>

    <!-- Remote Player (Opponent) - MOVED INTO PLAYER BOARD -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent, computed, watch } from 'vue'
import { OnlineGame } from '~/game/OnlineGame'
import { COLORS } from '~/game/shapes'
import { useTouchControls } from '~/composables/useTouchControls'
import { LeaderboardService } from '~/services/LeaderboardService'

const PlayerBoard = defineAsyncComponent(() => import('./PlayerBoard.vue'))

const props = defineProps<{
  onlineGame: OnlineGame
  mode?: 'online' | 'lan'
}>()

const emit = defineEmits(['back'])

// Name Input State
const showNameInput = ref(true)
const playerName = ref('')

const matchSaved = ref(false)
const savedMatchId = ref<string | null>(null) // To track the ID of saved match

// Detect mobile device for controls hint
const isMobile = computed(() => {
    if (typeof navigator === 'undefined') return false
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
})

// Controls hint text based on device
const controlsHintText = computed(() => {
    return isMobile.value ? 'Swipe ←→↑↓' : 'WASD + Q/E or Arrows'
})

// Computed state for waiting for opponent
const isWaiting = computed(() => !showNameInput.value && !props.onlineGame.isOpponentConnected && !props.onlineGame.isWinner && !props.onlineGame.isGameOver)

// Formatted Timer
const formattedTime = computed(() => {
    const totalSeconds = props.onlineGame.gameDuration || 0
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
})

const saveGame = () => {
    // If we already saved, update the existing record (e.g. higher score after continuing)
    if (matchSaved.value && savedMatchId.value) {
        LeaderboardService.updateOnlineMatch(savedMatchId.value, {
            maxScore: props.onlineGame.score,
            duration: props.onlineGame.gameDuration
        })
        return
    }

    const result = LeaderboardService.addOnlineMatch({
        date: new Date().toISOString(),
        gameMode: props.mode || 'online',
        isWinner: props.onlineGame.isWinner,
        isDraw: props.onlineGame.isDraw,
        playerName: playerName.value || 'Player',
        opponentName: props.onlineGame.opponentName || 'Opponent',
        winScore: props.onlineGame.winScore,
        maxScore: props.onlineGame.score, // This will be the current score (win score or updated)
        opponentScore: props.onlineGame.opponentScore,
        duration: props.onlineGame.gameDuration,
        matchId: props.onlineGame.matchId || undefined
    })
    
    matchSaved.value = true
    savedMatchId.value = result.id
}

const saveAndExit = () => {
    if (!matchSaved.value) {
        saveGame()
    } else {
        // Force update before exit if already saved (e.g. manual click after continuing)
        saveGame()
    }
    emit('back')
}

// Auto-save Watchers
watch(() => props.onlineGame.isWinner, (newVal) => {
    if (newVal) {
        console.log('Auto-saving Winner result...')
        saveGame()
    }
})

watch(() => props.onlineGame.isGameOver, (newVal) => {
    if (newVal) {
         // Save irrespective of whether we won or lost prior.
         // If we lost immediately -> saves new match.
         // If we won -> continues -> died -> updates existing match (because matchSaved is true).
         console.log('Auto-saving Game Over result...')
         saveGame()
    }
})

const joinGame = () => {
    if (!playerName.value.trim()) {
        alert('Please enter your name!')
        return
    }
    props.onlineGame.joinGame(playerName.value.trim())
    showNameInput.value = false
}

watch(() => props.onlineGame.matchId, (newId, oldId) => {
    if (newId !== oldId) {
        matchSaved.value = false
        savedMatchId.value = null
    }
})

// ============ Mobile Touch Controls (using composable) ============
const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchControls(
    () => props.onlineGame,
    {
        checkPause: true,
        checkCountdown: () => props.onlineGame.countdown !== null,
        checkOpponentConnected: () => props.onlineGame.isOpponentConnected || props.onlineGame.isWinner
    }
)

const CELL_SIZE = 10
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const canvasWidth = BOARD_WIDTH * CELL_SIZE
const canvasHeight = BOARD_HEIGHT * CELL_SIZE

const opponentCanvas = ref<HTMLCanvasElement | null>(null)
let frameId: number | null = null

// Render Loop for Opponent Board
const render = () => {
    if (opponentCanvas.value) {
        renderOpponentBoard(opponentCanvas.value)
    }
    frameId = requestAnimationFrame(render)
}

const renderOpponentBoard = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Opponent Grid Only
    drawBoard(ctx, props.onlineGame.getOpponentBoard())
}

const drawBoard = (ctx: CanvasRenderingContext2D, grid: number[][]) => {
    // Clear
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Grid Lines
    ctx.strokeStyle = '#1a1a3a'
    ctx.lineWidth = 1
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvasWidth, y * CELL_SIZE); ctx.stroke();
    }

    // Draw Grid Blocks
    const pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const row = grid[y]
            if (row) {
                const cell = row[x]
                if (cell !== undefined && cell > 0) {
                     const color = cell === 8 ? '#666' : (COLORS[pieceTypes[cell - 1]!] ?? '#888')
                     drawBlock(ctx, x, y, color)
                }
            }
        }
    }
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const p = 1
  ctx.fillStyle = color
  ctx.fillRect(x * CELL_SIZE + p, y * CELL_SIZE + p, CELL_SIZE - p * 2, CELL_SIZE - p * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(x * CELL_SIZE + p, y * CELL_SIZE + p, CELL_SIZE - p * 2, 3)
}

// Ref for auto-scroll
const gameContainer = ref<HTMLElement | null>(null)

// Check if mobile
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

onMounted(() => {
    frameId = requestAnimationFrame(render)
    // Check local storage for name
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tetris-username')
        if (saved) playerName.value = saved
    }
    
    // Auto scroll on mobile
    if (isMobileDevice() && gameContainer.value) {
      setTimeout(() => {
        gameContainer.value?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
      }, 300)
    }
})

onUnmounted(() => {
    if (frameId) cancelAnimationFrame(frameId)
    // Save name
    if (playerName.value) localStorage.setItem('tetris-username', playerName.value)
    
    props.onlineGame.cleanup()
})
</script>

<style scoped>
.online-area {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  padding: 1rem;
  position: relative;
}

/* Desktop/Mobile visibility */
.mobile-only {
  display: none;
}

.desktop-only {
  display: block;
}

/* Mobile opponent bar (hidden on desktop) */
.mobile-opponent-bar {
  display: none;
}

.name-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 5rem;
    z-index: 100;
    border-radius: 12px;
}

.name-box {
    background: #1a1a2e;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #444;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    box-shadow: 0 0 30px rgba(0,0,0,0.8);
}

.name-box input {
    padding: 0.8rem;
    border-radius: 6px;
    border: 1px solid #555;
    background: #0f0c29;
    color: white;
    font-size: 1.2rem;
    text-align: center;
}

.lan-settings {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    width: 100%;
    padding: 1rem;
    background: rgba(0, 255, 136, 0.05);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 8px;
}

.role-badge {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: bold;
    text-align: center;
}

.role-badge.host {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2));
    border: 1px solid rgba(255, 215, 0, 0.5);
    color: #ffd700;
}

.role-badge.guest {
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 150, 255, 0.15));
    border: 1px solid rgba(0, 212, 255, 0.4);
    color: #00d4ff;
}

.mode-select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #1a1a2a;
}

.settings-label.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-group {
    display: flex;
    gap: 1rem;
}

.join-btn {
    background: #00ff88;
    color: #004400;
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
}

.join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.cancel-btn {
    background: transparent;
    border: 1px solid #666;
    color: #aaa;
    padding: 0.8rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
}

.player-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.player-label {
  font-size: 1.2rem;
  font-weight: bold;
}

.p1 .player-label { color: #00d4ff; }
.p2 .player-label { color: #ff6b6b; }

.game-canvas.opponent {
    opacity: 0.8;
    border: 2px solid #555;
    border-radius: 4px;
}

.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 5rem;
  min-width: 150px;
}

.vs-text {
  font-size: 2rem;
  font-weight: 900;
  color: #00ff88;
  font-style: italic;
  text-shadow: 0 0 10px rgba(0,255,136,0.3);
}

.status-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0,0,0,0.5);
    border-radius: 8px;
    width: 100%;
}

.waiting { color: #ffd700; }
.connected { color: #00ff88; }

.spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #ffd700;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.back-btn {
  background: transparent;
  border: 1px solid #666;
  color: #aaa;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.game-timer {
  font-family: monospace;
  font-size: 1.2rem;
  color: #fff;
  background: rgba(0,0,0,0.5);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  margin-top: 0.5rem;
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: center;
  font-family: monospace;
  color: #aaa;
}

.score {
  font-size: 1.5rem;
  color: #ffd700;
  font-weight: bold;
}

.game-over-box {
    font-weight: bold;
    font-size: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
}

.result-text {
    font-size: 2rem;
    font-weight: bold;
    text-shadow: 0 0 20px currentColor;
}

.result-text.win {
    color: #ffd700;
    animation: pulse 0.5s ease-in-out infinite alternate;
}

.result-text.lose {
    color: #ff6b6b;
}

.result-text.draw {
    color: #00d4ff;
    animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
    from { transform: scale(1); }
    to { transform: scale(1.05); }
}

.win-score {
    font-size: 1.2rem;
    color: #ffd700;
    margin: 0.3rem 0;
}

.max-score {
    font-size: 1rem;
    color: #00ff88;
    margin: 0.3rem 0;
}

.save-status {
    font-size: 0.9rem;
    color: #00ff88;
    margin: 0.5rem 0;
}

.save-btn {
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    color: #4a3000;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
}

.save-btn:hover {
    transform: scale(1.02);
}

.button-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
}

.continue-btn {
    background: linear-gradient(135deg, #00ff88, #00cc6a);
    color: #004400;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
}

.continue-btn:hover {
    transform: scale(1.02);
}

.board-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    border-radius: 4px; /* match board radius if any */
}

.overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: white;
    font-weight: bold;
}

.countdown-number {
    font-size: 5rem;
    color: #ffd700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
    animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}


.paused-text {
    font-size: 3rem;
    color: #00d4ff;
    font-weight: bold;
    letter-spacing: 2px;
}

.sub-text {
    font-size: 1rem;
    color: #aaa;
}

/* Fallback Fullscreen for iOS Safari */
.online-area.force-fullscreen {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  z-index: 9999;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  margin: 0;
  padding: 0.5rem;
  overflow-y: auto;
  align-items: center;
}

@keyframes pop {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.waiting-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.settings-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #ccc;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.mode-select {
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #444;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    outline: none;
}

.mode-select:focus {
    border-color: #646cff;
}

.ghost-toggle {
    cursor: pointer;
    user-select: none;
}

.ghost-toggle input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #00ff88;
    cursor: pointer;
}

/* Overlay Updates */
.overlay-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 80%;
  max-width: 250px;
}

.mini-opponent-board {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
}

.mini-header {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.6rem;
    color: #888;
    margin-bottom: 2px;
}

.mini-label {
    color: #ff6b6b;
    font-weight: bold;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mini-score {
    color: #ffd700;
}

.game-over-content {
    font-weight: bold;
    font-size: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    width: 100%;
}

.resume-btn {
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  color: #004400;
  padding: 0.8rem;
  font-size: 1.2rem;
  font-weight: bold;
  width: 100%;
  border-radius: 8px;
  border: none;
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
  animation: pulse-green 2s infinite;
  cursor: pointer;
}

.home-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #666;
  color: #ccc;
  padding: 0.8rem;
  width: 100%;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.home-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

@keyframes pulse-green {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
}

.active-controls {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    width: 100%;
}

.home-btn.small {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
}

.mt-2 {
    margin-top: 0.5rem;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .mobile-only {
      display: block !important;
  }

  .desktop-only {
      display: none !important;
  }

  /* Mobile opponent bar - full width */
  .mobile-opponent-bar {
      display: flex !important;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 100vw;
      background: rgba(22, 33, 62, 0.95);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 107, 107, 0.3);
  }

  .opp-label {
      color: #aaa;
      font-size: 0.9rem;
  }

  .opp-label strong {
      color: #ff6b6b;
  }

  .opp-score {
      color: #ffd700;
      font-weight: bold;
      font-size: 1.2rem;
  }


  /* MAIN MOBILE CONTAINER */
  .online-area {
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 0;
      padding: 0;
      width: 100vw;
      height: 100%; /* Changed from 100dvh */
      overflow: hidden;
      background: #0f0c29;
      position: relative;
  }

  .name-overlay {
      padding-top: 2rem;
  }

  .name-box {
      padding: 1rem;
      max-width: 90vw;
  }

  .name-box h2 {
      font-size: 1.2rem;
  }

  .name-box input {
      font-size: 1rem;
      padding: 0.6rem;
  }

  .lan-settings {
      padding: 0.5rem;
      gap: 0.5rem;
  }

  .settings-label {
      font-size: 0.8rem;
      padding: 0.4rem 0.8rem;
  }

  .btn-group {
      gap: 0.5rem;
  }

  .join-btn, .cancel-btn {
      padding: 0.6rem 1rem;
      font-size: 0.9rem;
  }

  /* Player Section - Full Height */
  .player-section {
      width: 100%;
      height: 100%;
      gap: 0;
      display: grid;
      grid-template-rows: auto 1fr; /* Top Bar, Board */
  }

  .player-header {
      display: none;
  }

  /* Board - Maximize */
  .board-wrapper {
      transform: none;
      margin: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
  }

  /* Stats Overlay -> Converted to Top Bar 1:1 with Pause */
  /* Stats Overlay -> Converted to Top Bar 1:1 with Pause */
  .player-stats {
      grid-row: 1;
      width: 100%;
      height: 28px; /* TINY HEIGHT MATCH SOLO */
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 0;
      background: transparent;
      gap: 0.3rem; /* Matched Gap */
      z-index: 50;
      margin-bottom: 0.3rem; /* Matched Spacing */
  }
  
  /* Reuse stats container for score */
  .player-stats span {
    display: none; /* Hide default span texts */
  }
  
  .player-stats .score {
    display: flex;
    flex: 1;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    color: #ffd700;
    font-size: 0.75rem; /* Match Solo */
    font-weight: bold;
    justify-content: center;
    align-items: center;
    padding: 0;
    border-radius: 4px;
    height: 100%;
  }
  
  /* Active Controls (Pause Button container) */
  .active-controls {
    flex: 1;
    margin: 0;
    height: 100%;
    display: flex;
  }

  .active-controls .home-btn {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #ff416c, #ff4b2b);
      border: none;
      font-size: 0.7rem; /* Smaller font */
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      border-radius: 4px;
      padding: 0;
  }
  
  /* Hide unwanted sections */
  .vs-section, 
  .mobile-opponent-bar,
  .winner-controls {
     display: none; /* Or minimal overlay if needed */
  }
  
  /* If game over/winner, show winner controls as overlay */
  .player-stats:has(.winner-controls) {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      height: auto;
      background: rgba(0,0,0,0.9);
      flex-direction: column;
      padding: 1rem;
      border-radius: 12px;
      border: 1px solid #ffd700;
  }
  
  .player-stats:has(.winner-controls) .winner-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
  }
}
</style>
