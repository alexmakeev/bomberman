<template>
  <div class="game-view" :class="{ 'mobile': isMobile, 'landscape': isLandscape }">
    <!-- Game Canvas Area -->
    <div class="game-container">
      <canvas 
        ref="gameCanvas"
        class="game-canvas"
        :width="canvasSize.width"
        :height="canvasSize.height"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @contextmenu.prevent
      />
      
      <!-- Loading overlay -->
      <div v-if="gameStore.isLoading" class="game-loading">
        <div class="loading-spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
      
      <!-- Touch indicators for mobile -->
      <div v-if="isMobile" class="touch-indicators">
        <div 
          v-for="touch in activeTouches"
          :key="touch.id"
          class="touch-indicator"
          :class="`touch-${touch.type}`"
          :style="{
            left: touch.x + 'px',
            top: touch.y + 'px'
          }"
        />
      </div>
    </div>
    
    <!-- UI Overlay -->
    <div class="ui-overlay">
      <!-- Top Left: Game Info -->
      <div class="game-info top-left">
        <div class="player-stats">
          <div class="stat-item">
            <span class="stat-icon">❤️</span>
            <span class="stat-value">{{ playerStore.health }}/{{ playerStore.maxHealth }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">💣</span>
            <span class="stat-value">{{ playerStore.bombCount }}/{{ playerStore.maxBombs }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">⚡</span>
            <span class="stat-value">{{ playerStore.bombPower }}</span>
          </div>
        </div>
        
        <div class="game-timer" v-if="gameStore.gameTime > 0">
          {{ formatGameTime(gameStore.gameTime) }}
        </div>
      </div>
      
      <!-- Top Right: Minimap -->
      <div class="minimap-container top-right">
        <GameMinimap />
      </div>
      
      <!-- Bottom: Mobile Touch Controls -->
      <div v-if="isMobile" class="touch-controls bottom">
        <div class="control-hint">
          <p class="hint-text">First finger: Move • Second finger: Bomb</p>
        </div>
      </div>
      
      <!-- Desktop: Additional Info -->
      <div v-if="!isMobile && isLandscape" class="desktop-info">
        <div class="control-hint left">
          <p class="hint-text">WASD / Arrow Keys: Move</p>
          <p class="hint-text">Space: Place Bomb</p>
        </div>
        
        <div class="players-list right" v-if="gameStore.players.length > 1">
          <h4>Players ({{ gameStore.players.length }})</h4>
          <div class="player-item" v-for="player in gameStore.players" :key="player.id">
            <span class="player-color" :style="{ color: getPlayerColor(player.color) }">●</span>
            <span class="player-name">{{ player.name }}</span>
            <span class="player-status" :class="{ alive: player.isAlive }">
              {{ player.isAlive ? '✓' : '💀' }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Pause menu -->
      <div v-if="showPauseMenu" class="pause-overlay" @click.self="togglePause">
        <div class="pause-menu">
          <h3>Game Paused</h3>
          <button class="menu-btn primary" @click="togglePause">Resume</button>
          <button class="menu-btn secondary" @click="showSettings = true">Settings</button>
          <button class="menu-btn danger" @click="leaveGame">Leave Game</button>
        </div>
      </div>
    </div>
    
    <!-- Settings Modal -->
    <GameSettings v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '../../stores/playerStore'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { useNotificationStore } from '../../stores/notificationStore'
import GameMinimap from '@/components/GameMinimap.vue'
import GameSettings from '@/components/GameSettings.vue'
import { UnifiedInputManager } from '../../utils/inputManager'
import { setupCanvas, resizeCanvas, calculateViewportTransform } from '../../utils/renderingUtils'
import type { Position, Size } from '@/types/game'

interface Props {
  roomId?: string
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()

// Store instances
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()

// Refs
const gameCanvas = ref<HTMLCanvasElement>()
const inputManager = ref<UnifiedInputManager>()

// Reactive state
const showPauseMenu = ref(false)
const showSettings = ref(false)
const loadingMessage = ref('Connecting to game...')
const activeTouches = ref<Array<{ id: number; x: number; y: number; type: 'movement' | 'action' }>>([])

// Computed properties
const isMobile = computed(() => uiStore.isMobile)
const isLandscape = computed(() => uiStore.isLandscape)

const canvasSize = computed<Size>(() => {
  const container = gameCanvas.value?.parentElement
  if (!container) return { width: 800, height: 600 }
  
  const rect = container.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height) * 0.9
  
  return {
    width: Math.floor(size),
    height: Math.floor(size)
  }
})

// Touch handling
function handleTouchStart(event: TouchEvent) {
  event.preventDefault()
  if (!inputManager.value) return
  
  // Update touch indicators
  updateTouchIndicators(event)
  
  // Forward to input manager
  inputManager.value.handleTouch('start', event)
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault()
  if (!inputManager.value) return
  
  updateTouchIndicators(event)
  inputManager.value.handleTouch('move', event)
}

function handleTouchEnd(event: TouchEvent) {
  event.preventDefault()
  if (!inputManager.value) return
  
  updateTouchIndicators(event)
  inputManager.value.handleTouch('end', event)
}

// Mouse handling for desktop
function handleMouseDown(event: MouseEvent) {
  if (!inputManager.value || isMobile.value) return
  
  inputManager.value.handleMouse('down', event)
}

function handleMouseMove(event: MouseEvent) {
  if (!inputManager.value || isMobile.value) return
  
  inputManager.value.handleMouse('move', event)
}

function handleMouseUp(event: MouseEvent) {
  if (!inputManager.value || isMobile.value) return
  
  inputManager.value.handleMouse('up', event)
}

// Keyboard handling
function handleKeyDown(event: KeyboardEvent) {
  if (!inputManager.value) return
  
  // Handle game-specific keys
  switch (event.code) {
    case 'Escape':
      event.preventDefault()
      togglePause()
      break
    case 'KeyP':
      event.preventDefault()
      togglePause()
      break
    default:
      inputManager.value.handleKeyboard('down', event)
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (!inputManager.value) return
  inputManager.value.handleKeyboard('up', event)
}

// Touch indicators for visual feedback
function updateTouchIndicators(event: TouchEvent) {
  const canvas = gameCanvas.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const newTouches: typeof activeTouches.value = []
  
  Array.from(event.touches).forEach((touch, index) => {
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    
    newTouches.push({
      id: touch.identifier,
      x,
      y,
      type: index === 0 ? 'movement' : 'action'
    })
  })
  
  activeTouches.value = newTouches
}

// Game controls
function togglePause() {
  showPauseMenu.value = !showPauseMenu.value
  
  if (showPauseMenu.value) {
    gameStore.pauseGame()
  } else {
    gameStore.resumeGame()
  }
}

async function leaveGame() {
  try {
    await gameStore.leaveRoom()
    notificationStore.showInfo('Left Game', 'You have left the game room')
    await router.push('/')
  } catch (error) {
    console.error('Failed to leave game:', error)
    notificationStore.showError('Error', 'Failed to leave game properly')
    await router.push('/')
  }
}

// Utility functions
function formatGameTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function getPlayerColor(color?: string): string {
  const colors: Record<string, string> = {
    red: '#ff4444',
    blue: '#4444ff',
    green: '#44ff44',
    yellow: '#ffff44',
    purple: '#ff44ff',
    orange: '#ff8844'
  }
  return colors[color || 'blue'] || colors.blue
}

// Game rendering loop
let animationFrame: number | null = null
let lastTime = 0

function gameLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime
  lastTime = currentTime
  
  if (gameCanvas.value && gameStore.isPlaying) {
    const ctx = gameCanvas.value.getContext('2d')
    if (ctx) {
      // Clear canvas
      ctx.clearRect(0, 0, canvasSize.value.width, canvasSize.value.height)
      
      // Calculate viewport transform
      const transform = calculateViewportTransform(
        canvasSize.value,
        { width: 15, height: 11 }, // Maze size
        playerStore.position || { x: 7, y: 5 }
      )
      
      // Render game state
      gameStore.render(ctx, transform, deltaTime)
    }
  }
  
  if (!showPauseMenu.value) {
    animationFrame = requestAnimationFrame(gameLoop)
  }
}

function startGameLoop() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  lastTime = performance.now()
  animationFrame = requestAnimationFrame(gameLoop)
}

function stopGameLoop() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

// Canvas resize handling
function handleResize() {
  if (gameCanvas.value) {
    nextTick(() => {
      resizeCanvas(gameCanvas.value!, gameCanvas.value!.parentElement!)
    })
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    loadingMessage.value = 'Initializing game...'
    
    // Set up canvas
    if (gameCanvas.value) {
      const ctx = setupCanvas(gameCanvas.value, gameCanvas.value.parentElement!)
      if (ctx) {
        // Canvas is ready
        loadingMessage.value = 'Setting up controls...'
        
        // Initialize input manager
        inputManager.value = new UnifiedInputManager()
        await inputManager.value.initialize()
        
        // Configure for current device
        if (isMobile.value) {
          inputManager.value.registerTouchHandlers(gameCanvas.value)
          inputManager.value.setHapticFeedback(true)
        } else {
          inputManager.value.registerKeyboardHandlers()
        }
        
        // Set up input event listeners
        inputManager.value.on('player-move', (data) => {
          playerStore.startMoving(data.direction, data.intensity)
        })
        
        inputManager.value.on('player-stop', () => {
          playerStore.stopMoving()
        })
        
        inputManager.value.on('player-bomb', () => {
          playerStore.placeBomb()
        })
      }
    }
    
    // Join room if roomId is provided
    const targetRoomId = props.roomId || route.params.roomId as string
    if (targetRoomId) {
      loadingMessage.value = 'Joining game room...'
      await gameStore.joinRoom(targetRoomId)
    }
    
    // Set up keyboard listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    
    // Set up resize listener
    window.addEventListener('resize', handleResize)
    window.addEventListener('viewport-change', handleResize)
    
    // Start game loop
    startGameLoop()
    
    loadingMessage.value = ''
    notificationStore.showSuccess('Game Ready', 'Touch and drag to move, second finger to bomb!')
    
  } catch (error) {
    console.error('Failed to initialize game:', error)
    loadingMessage.value = 'Failed to connect to game'
    notificationStore.showError('Connection Failed', 'Unable to join the game room')
    
    // Redirect back to home after delay
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }
})

onUnmounted(() => {
  // Clean up
  stopGameLoop()
  
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('viewport-change', handleResize)
  
  if (inputManager.value) {
    inputManager.value.destroy()
  }
  
  // Leave room if still connected
  if (gameStore.isConnected) {
    gameStore.leaveRoom().catch(console.error)
  }
})

// Watch for pause menu changes
watch(showPauseMenu, (isPaused) => {
  if (isPaused) {
    stopGameLoop()
  } else {
    startGameLoop()
  }
})
</script>

<style scoped>
.game-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #1a1a1a;
}

.game-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.game-canvas {
  display: block;
  border: 2px solid #333;
  border-radius: 4px;
  background: #000;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.game-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 100;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top: 3px solid #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.touch-indicators {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.touch-indicator {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.touch-indicator.touch-movement {
  background: rgba(76, 175, 80, 0.3);
  border: 2px solid rgba(76, 175, 80, 0.6);
}

.touch-indicator.touch-action {
  background: rgba(255, 107, 53, 0.3);
  border: 2px solid rgba(255, 107, 53, 0.6);
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}

.top-left, .top-right, .bottom, .left, .right {
  position: absolute;
  pointer-events: auto;
}

.top-left {
  top: 16px;
  left: 16px;
}

.top-right {
  top: 16px;
  right: 16px;
}

.bottom {
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.left {
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
}

.right {
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}

/* Game info styles */
.game-info {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
}

.stat-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.stat-value {
  font-weight: bold;
}

.game-timer {
  color: #ff6b35;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
  font-family: monospace;
}

/* Minimap container */
.minimap-container {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 8px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Touch controls */
.touch-controls {
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  padding: 12px 20px;
  backdrop-filter: blur(4px);
}

.control-hint {
  text-align: center;
}

.hint-text {
  color: #ccc;
  font-size: 12px;
  margin: 0;
  line-height: 1.3;
}

/* Desktop info */
.desktop-info .control-hint {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(4px);
  max-width: 200px;
}

.players-list {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(4px);
  min-width: 150px;
}

.players-list h4 {
  color: #ff6b35;
  margin: 0 0 8px 0;
  font-size: 12px;
  text-transform: uppercase;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}

.player-color {
  font-size: 16px;
}

.player-name {
  flex: 1;
  color: white;
}

.player-status {
  color: #666;
}

.player-status.alive {
  color: #4caf50;
}

/* Pause menu */
.pause-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.pause-menu {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pause-menu h3 {
  color: #ff6b35;
  margin: 0 0 24px 0;
  font-size: 24px;
}

.menu-btn {
  display: block;
  width: 200px;
  padding: 12px 24px;
  margin: 8px auto;
  border: none;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
}

.menu-btn.primary {
  background: linear-gradient(135deg, #ff6b35, #ff8c42);
  color: white;
}

.menu-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.menu-btn.danger {
  background: rgba(244, 67, 54, 0.2);
  color: #ff4444;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.menu-btn:hover {
  transform: translateY(-2px);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .game-view.mobile .top-left,
  .game-view.mobile .top-right {
    top: 8px;
  }
  
  .game-view.mobile .top-left {
    left: 8px;
  }
  
  .game-view.mobile .top-right {
    right: 8px;
  }
  
  .game-view.mobile .bottom {
    bottom: 8px;
  }
  
  .game-info {
    padding: 8px;
    font-size: 12px;
  }
  
  .stat-item {
    font-size: 12px;
  }
  
  .stat-icon {
    font-size: 14px;
    width: 16px;
  }
  
  .game-timer {
    font-size: 16px;
  }
  
  .minimap-container {
    padding: 6px;
  }
  
  .hint-text {
    font-size: 11px;
  }
  
  .pause-menu {
    margin: 20px;
    padding: 24px;
    width: calc(100% - 40px);
    max-width: 300px;
  }
  
  .pause-menu h3 {
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  .menu-btn {
    width: 100%;
    font-size: 13px;
    padding: 10px 20px;
  }
}

/* Landscape mobile adjustments */
@media (orientation: landscape) and (max-height: 500px) {
  .game-view.mobile.landscape .game-info,
  .game-view.mobile.landscape .minimap-container {
    transform: scale(0.8);
    transform-origin: top left;
  }
  
  .game-view.mobile.landscape .top-right .minimap-container {
    transform-origin: top right;
  }
  
  .game-view.mobile.landscape .touch-controls {
    padding: 8px 16px;
  }
  
  .game-view.mobile.landscape .hint-text {
    font-size: 10px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>