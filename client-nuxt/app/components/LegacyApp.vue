<template>
  <div class="container" tabindex="0" ref="gameContainer">
    <h1>🎮 Tetris Duo</h1>
    
    <!-- Mode Selection -->
    <div v-if="!gameMode" class="mode-select">
      <div class="mode-buttons">
        <button @click="startSolo" class="mode-btn solo">🎯 Normal</button>
        <button @click="startSpecial" class="mode-btn special">✨ Special</button>
        <button @click="startDuo" class="mode-btn duo">👥 Duo</button>
        <!-- <button @click="startOnline" class="mode-btn online">🌐 Online</button> -->
        <!-- Waiting for socket server deployment -->
        <button @click="startLAN" class="mode-btn lan">📡 LAN</button>
        <button @click="showLeaderboard = true" class="mode-btn leaderboard">🏆 Leaderboard</button>
      </div>
      
      <!-- Game Options -->
      <div class="game-options">
        <label class="toggle-switch">
          <input type="checkbox" v-model="increaseSpeed">
          <span class="toggle-slider"></span>
          <span class="toggle-label">⚡ Speed Increase</span>
        </label>
      </div>
    </div>
    
    <!-- Leaderboard Modal -->
    <Leaderboard 
      v-if="showLeaderboard" 
      @close="showLeaderboard = false" 
      :initialTab="(gameMode || 'solo') as any"
    />

    <!-- Version Info at Bottom -->
    <VersionInfo v-if="!gameMode" :showDetails="true" class="home-version" />


    <!-- Solo Mode -->
    <div v-else-if="gameMode === 'solo' || gameMode === 'special'" class="game-area">
      <SinglePlayerGame :game="soloGame!" @restart="restartGame" @back="backToMenu" :isSpecialMode="gameMode === 'special'" />
    </div>

    <!-- Duo Mode -->
    <div v-else-if="gameMode === 'duo'" class="duo-area" :class="{ 'force-fullscreen': isFullscreen }">
      <DuoGameComponent 
        :duoGame="duoGame!" 
        @restart="restartDuo" 
        @show-leaderboard="showLeaderboard = true"
        @back="backToMenu" 
      />
    </div>

    <!-- Online Mode -->
    <div v-else-if="gameMode === 'online'" class="online-area" :class="{ 'force-fullscreen': isFullscreen }">
      <OnlineGameComponent 
        :onlineGame="onlineGame!" 
        mode="online"
        @back="backToMenu" 
      />
    </div>

    <!-- LAN Mode -->
    <div v-else-if="gameMode === 'lan'" class="lan-area" :class="{ 'force-fullscreen': isFullscreen }">
      <LANGameComponent 
        v-if="!onlineGame"
        :connected="!!onlineGame"
        :connectionError="lanError"
        @back="backToMenu" 
        @connect="connectLAN"
      />
      <OnlineGameComponent 
        v-else
        :onlineGame="onlineGame!" 
        mode="lan"
        @back="backToMenu" 
      />
    </div>
    
    <InstallPwa />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent, reactive, shallowRef, triggerRef } from 'vue'
import { Game } from '~/game/Game'
import { SpecialGame } from '~/game/SpecialGame'
import { DuoGame } from '~/game/DuoGame'
import { OnlineGame } from '~/game/OnlineGame'

const SinglePlayerGame = defineAsyncComponent(() => import('~/components/SinglePlayerGame.vue'))
const DuoGameComponent = defineAsyncComponent(() => import('~/components/DuoGame.vue'))
const OnlineGameComponent = defineAsyncComponent(() => import('~/components/OnlineGame.vue'))
const LANGameComponent = defineAsyncComponent(() => import('~/components/LANGame.vue'))
const VersionInfo = defineAsyncComponent(() => import('~/components/VersionInfo.vue'))
const Leaderboard = defineAsyncComponent(() => import('~/components/Leaderboard.vue'))
const InstallPwa = defineAsyncComponent(() => import('~/components/InstallPwa.vue'))

type GameMode = 'solo' | 'special' | 'duo' | 'online' | 'lan' | null

const gameContainer = ref<HTMLDivElement | null>(null)
const gameMode = ref<GameMode>(null)
const soloGame = shallowRef<Game | null>(null)
const duoGame = shallowRef<DuoGame | null>(null)
const onlineGame = shallowRef<OnlineGame | null>(null)
const showLeaderboard = ref(false)

// Get runtime config for WebSocket URL
const config = useRuntimeConfig()
const lanError = ref('')

let animationId: number | null = null
let lastUpdate = 0
const increaseSpeed = ref(true)

// Fullscreen state
const isFullscreen = ref(false)

// Check if mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Request fullscreen for mobile
const requestMobileFullscreen = async () => {
  if (!isMobile()) return
  
  try {
    const elem = document.documentElement
    let succeeded = false

    if (elem.requestFullscreen) {
      try {
        await elem.requestFullscreen()
        succeeded = true
      } catch (e) {
        console.log('[Fullscreen] Standard API failed')
      }
    } else if ((elem as any).webkitRequestFullscreen) {
      try {
        await (elem as any).webkitRequestFullscreen()
        succeeded = true
      } catch (e) {
        console.log('[Fullscreen] Webkit API failed')
      }
    }

    // Always trigger CSS fallback for consistent experience on mobile
    isFullscreen.value = true
    
  } catch (e) {
    console.log('[Fullscreen] Could not enter fullscreen:', e)
    // Fallback
    isFullscreen.value = true
  }
}

const startSolo = async () => {
  console.log('[App] Starting Solo Mode')
  
  // Request fullscreen on mobile
  await requestMobileFullscreen()
  
  gameMode.value = 'solo'
  
  // Check for saved game
  let game: Game
  const savedState = localStorage.getItem('tetris-save-solo')
  if (savedState) {
      try {
          const data = JSON.parse(savedState)
          game = Game.deserialize(data)
          console.log('[App] Loaded saved game')
      } catch (e) {
          console.error('[App] Failed to load saved game', e)
          game = new Game()
      }
  } else {
      game = new Game()
  }

  game.increaseGravity = increaseSpeed.value
  soloGame.value = reactive(game) as any
  startGameLoop()
}

const startSpecial = async () => {
  console.log('[App] Starting Special Mode')
  
  // Request fullscreen on mobile
  await requestMobileFullscreen()
  
  gameMode.value = 'special'

  // Check for saved special game
  let game: SpecialGame
  const savedState = localStorage.getItem('tetris-save-special')
  if (savedState) {
      try {
          const data = JSON.parse(savedState)
          game = SpecialGame.deserialize(data)
          console.log('[App] Loaded saved special game')
      } catch (e) {
          console.error('[App] Failed to load saved special game', e)
          game = new SpecialGame()
      }
  } else {
      game = new SpecialGame()
  }

  game.increaseGravity = increaseSpeed.value
  soloGame.value = reactive(game) as any
  startGameLoop()
}

const startDuo = () => {
  console.log('[App] Starting Duo Mode')
  gameMode.value = 'duo'
  const game = new DuoGame()
  game.increaseGravity = increaseSpeed.value
  duoGame.value = game
  startGameLoop()
}

const startOnline = async () => {
    console.log('[App] Starting Online Mode')
    
    // Request fullscreen on mobile
    await requestMobileFullscreen()
    
    gameMode.value = 'online'
    const game = reactive(new OnlineGame()) as any
    game.increaseGravity = increaseSpeed.value
    // Auto-connect to default/prod server
    const url = config.public.wsUrl || 'wss://tetris-server.fly.dev'
    console.log('[App] Connecting to:', url)
    
    game.init(url).then(() => {
        console.log('[App] Online connected')
        onlineGame.value = game
        startGameLoop()
    }).catch((err: any) => {
        console.error('[App] Online init failed', err)
        alert('Could not connect to online server')
        gameMode.value = null
    })
}

const startLAN = async () => {
  console.log('[App] Starting LAN Mode')
  
  // Request fullscreen on mobile
  await requestMobileFullscreen()
  
  gameMode.value = 'lan'
  onlineGame.value = null // Reset until user connects
  lanError.value = ''
}

const connectLAN = async (wsUrl: string) => {
  lanError.value = ''
  const game = reactive(new OnlineGame()) as any
  game.increaseGravity = increaseSpeed.value
  try {
      await game.init(wsUrl)
      onlineGame.value = game
      startGameLoop()
  } catch (e: any) {
      console.error('Connection failed inside app.vue:', e)
      lanError.value = `Connection Failed: ${e?.message || 'Unknown Error'}`
      // Ensure we stay on LAN menu (onlineGame remains null)
  }
}

const restartGame = () => {
  if (gameMode.value === 'special') {
    soloGame.value = reactive(new SpecialGame()) as any
  } else {
    soloGame.value = reactive(new Game()) as any
  }
}

const restartDuo = () => {
  duoGame.value = new DuoGame()
}

const backToMenu = () => {
  // Cleanup
  if (onlineGame.value) {
      onlineGame.value.cleanup()
  }
  
  gameMode.value = null
  soloGame.value = null
  duoGame.value = null
  onlineGame.value = null
  
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// ============ Game Loop ============
let lastFrameTime = 0

const startGameLoop = () => {
  lastFrameTime = 0
  
  const gameLoop = (timestamp: number) => {
    // Calculate deltaTime for animations
    const deltaTime = lastFrameTime > 0 ? timestamp - lastFrameTime : 0
    lastFrameTime = timestamp
    
    // Update Game State (Gravity + Effects)
    if ((gameMode.value === 'solo' || gameMode.value === 'special') && soloGame.value) {
      soloGame.value.update(deltaTime)
    } else if (gameMode.value === 'duo' && duoGame.value) {
      duoGame.value.update(deltaTime)
    } else if ((gameMode.value === 'online' || gameMode.value === 'lan') && onlineGame.value) {
      onlineGame.value.update(deltaTime)
    }

    // [FIX] Trigger ref update manually since we switched to shallowRef
    if (gameMode.value === 'solo' || gameMode.value === 'special') triggerRef(soloGame)
    else if (gameMode.value === 'duo') triggerRef(duoGame)
    else if (gameMode.value === 'online' || gameMode.value === 'lan') triggerRef(onlineGame)

    animationId = requestAnimationFrame(gameLoop)
  }
  animationId = requestAnimationFrame(gameLoop)
}

// ============ Keyboard Controls ============
const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  
  if ((gameMode.value === 'solo' || gameMode.value === 'special') && soloGame.value) {
    handleSoloControls(e)
  } else if (gameMode.value === 'duo' && duoGame.value) {
    handleDuoControls(e)
  } else if ((gameMode.value === 'online' || gameMode.value === 'lan') && onlineGame.value) {
    handleOnlineControls(e)
  }
}

const handleSoloControls = (e: KeyboardEvent) => {
  if (!soloGame.value || soloGame.value.isGameOver) return
  
  switch (e.code) {
    case 'ArrowLeft': soloGame.value.moveLeft(); break
    case 'ArrowRight': soloGame.value.moveRight(); break
    case 'ArrowDown': soloGame.value.moveDown(true); break
    case 'ArrowUp': soloGame.value.rotate(); break
    case 'Space': e.preventDefault(); soloGame.value.hardDrop(); break
    case 'KeyC': case 'ShiftLeft': case 'ShiftRight': soloGame.value.hold(); break
    case 'KeyP': case 'Escape': soloGame.value.togglePause(); break
  }
}

const handleOnlineControls = (e: KeyboardEvent) => {
  if (!onlineGame.value || onlineGame.value.isGameOver || (!onlineGame.value.isOpponentConnected && !onlineGame.value.isWinner)) return
  if (onlineGame.value.countdown !== null) return
  
  switch (e.code) {
    case 'ArrowLeft': 
    case 'KeyA': onlineGame.value.moveLeft(); break
    
    case 'ArrowRight': 
    case 'KeyD': onlineGame.value.moveRight(); break
    
    case 'ArrowDown': 
    case 'KeyS': onlineGame.value.moveDown(); break
    
    case 'ArrowUp': 
    case 'KeyW': onlineGame.value.rotate(); break
    
    case 'Space': 
    case 'Enter': e.preventDefault(); onlineGame.value.hardDrop(); break
    
    case 'KeyC': 
    case 'KeyQ':
    case 'ShiftLeft':
    case 'ShiftRight': onlineGame.value.hold(); break

    // Pause
    case 'KeyP':
    case 'Escape': onlineGame.value.togglePause(); break
  }
}

const handleDuoControls = (e: KeyboardEvent) => {
  if (!duoGame.value || duoGame.value.winner) return
  
  // Pause toggle
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    duoGame.value.togglePause()
    return
  }
  
  if (duoGame.value.isPaused) return
  
  // Player 1
  switch (e.key.toLowerCase()) {
    case 'a': duoGame.value.p1MoveLeft(); break
    case 'd': duoGame.value.p1MoveRight(); break
    case 's': duoGame.value.p1MoveDown(); break
    case 'w': duoGame.value.p1Rotate(); break
    case 'q': duoGame.value.p1Hold(); break
    case 'e': duoGame.value.p1HardDrop(); break
  }
  
  // Player 2
  switch (e.key) {
    case 'ArrowLeft': duoGame.value.p2MoveLeft(); break
    case 'ArrowRight': duoGame.value.p2MoveRight(); break
    case 'ArrowDown': duoGame.value.p2MoveDown(); break
    case 'ArrowUp': duoGame.value.p2Rotate(); break
    case ',': duoGame.value.p2Hold(); break
    case '.': duoGame.value.p2HardDrop(); break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.container {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0; /* Disable padding */
  font-family: 'Segoe UI', sans-serif;
  text-align: center;
  outline: none;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  box-sizing: border-box;
}


h1 {
  color: #00d4ff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

/* Mode Selection */
.mode-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 4rem;
}

.mode-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  max-width: 500px;
}

.mode-btn {
  padding: 1.5rem 2.5rem;
  font-size: 1.25rem;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-weight: bold;
}

.mode-btn.solo {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.mode-btn.special {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

.mode-btn.duo {
  background: linear-gradient(135deg, #ff9966, #ff5e62);
  color: white;
}

.mode-btn.online {
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  color: white;
}

.mode-btn.lan {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: white;
}

.mode-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.mode-btn.leaderboard {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: white;
  grid-column: span 2;
}

/* Duos */
.duo-area, .online-area, .lan-area {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

/* Global Styles */
.game-area {
  display: flex;
  justify-content: center;
  height: 100%; /* Full height */
}

/* Game Options - Toggle Switch */
.game-options {
  margin-top: 2.5rem;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem 1.25rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.toggle-switch:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(0, 212, 255, 0.4);
}

.toggle-switch input {
  display: none;
}

.toggle-slider {
  width: 42px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #00d4ff, #0072ff);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.toggle-label {
  color: #e0e0e0;
  font-size: 0.95rem;
  font-weight: 500;
  user-select: none;
}

.toggle-switch input:checked ~ .toggle-label {
  color: #00d4ff;
}

@media (max-width: 600px) {
  .mode-buttons {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0 1rem;
  }

  .mode-btn.leaderboard {
    grid-column: span 1;
  }
  
  .mode-select {
    margin-top: 2rem;
  }
  
  h1 {
    font-size: 2rem;
  }

  /* Hide Duo mode on mobile */
  .mode-btn.duo {
    display: none;
  }
}

/* Fallback Fullscreen for iOS Safari (Global) */
.force-fullscreen {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  z-index: 9999;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  margin: 0;
  padding: 0 !important;
  overflow-y: auto;
  align-items: center;
  justify-content: center;
}
</style>
