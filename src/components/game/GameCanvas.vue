<!--
GameCanvas Component - Main game canvas with input handling and rendering
Handles game rendering, input events, and real-time gameplay updates

@see docs/front-end/02-component-structure.md - Component architecture
@see tests/frontend/components/GameCanvas.test.ts - Comprehensive tests
-->

<template>
  <div 
    class="game-canvas-container"
    :class="containerClasses"
    @contextmenu.prevent
  >
    <canvas
      ref="canvasRef"
      class="game-canvas"
      :width="canvasSize.width"
      :height="canvasSize.height"
      @touchstart.prevent="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend.prevent="handleTouchEnd"
    />
    
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading game...</p>
    </div>
    
    <!-- Debug info overlay -->
    <div v-if="showDebugInfo" class="debug-overlay">
      <div class="debug-info">
        <p>FPS: {{ fps }}</p>
        <p>Entities: {{ entityCount }}</p>
        <p>Network Latency: {{ networkLatency }}ms</p>
        <p>Input Mode: {{ inputMode }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
// import { UnifiedInputManager } from '../../utils/inputManager'
import type { Position } from '../../types/game'

// Props
interface Props {
  showDebugInfo?: boolean
  disableInput?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false,
  disableInput: false
})

// Emits
const emit = defineEmits<{
  ready: []
  error: [error: Error]
  inputModeChanged: [mode: string]
}>()

// Store references
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

// Template refs
const canvasRef = ref<HTMLCanvasElement>()

// Component state
const isLoading = ref(true)
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const animationFrameId = ref<number>()
const inputManager = ref<any>(null) // TODO: Type when InputManager is implemented

// Performance metrics
const fps = ref(0)
const lastFrameTime = ref(0)
const frameCount = ref(0)

// Debug and metrics
const entityCount = ref(0)
const networkLatency = ref(0)
const inputMode = ref('unknown')

// Computed properties
const containerClasses = computed(() => ({
  'canvas-mobile': uiStore.isMobile,
  'canvas-desktop': uiStore.isDesktop,
  'canvas-landscape': uiStore.isLandscape,
  'canvas-portrait': uiStore.isPortrait,
  'canvas-loading': isLoading.value,
  'canvas-paused': gameStore.gameState === 'paused'
}))

const canvasSize = computed(() => uiStore.optimalCanvasSize)

const isPaused = computed(() => gameStore.gameState === 'paused')

// Lifecycle hooks
onMounted(async () => {
  try {
    await initializeCanvas()
    await initializeInputManager()
    startRenderLoop()
    setupEventListeners()
    
    isLoading.value = false
    emit('ready')
  } catch (error) {
    console.error('Failed to initialize GameCanvas:', error)
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  cleanup()
})

// Canvas initialization
async function initializeCanvas(): Promise<void> {
  if (!canvasRef.value) {
    throw new Error('Canvas element not found')
  }

  const context = canvasRef.value.getContext('2d')
  if (!context) {
    console.error('Failed to get canvas context')
    throw new Error('Failed to get canvas context')
  }

  canvasContext.value = context
  
  // Configure canvas for crisp pixel art
  context.imageSmoothingEnabled = false
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  
  // Handle high DPI displays
  const dpr = window.devicePixelRatio || 1
  if (dpr > 1) {
    const rect = canvasRef.value.getBoundingClientRect()
    canvasRef.value.width = rect.width * dpr
    canvasRef.value.height = rect.height * dpr
    context.scale(dpr, dpr)
  }
}

async function initializeInputManager(): Promise<void> {
  if (props.disableInput) return

  try {
    // TODO: Initialize UnifiedInputManager when implemented
    // inputManager.value = new UnifiedInputManager()
    // await inputManager.value.initialize()
    
    // Set up input event handlers
    // inputManager.value.on('player-move', handlePlayerMove)
    // inputManager.value.on('player-bomb', handlePlayerBomb)
    // inputManager.value.on('player-stop', handlePlayerStop)
    // inputManager.value.on('input-mode-changed', handleInputModeChanged)
    
    // Register canvas for touch events
    // if (canvasRef.value) {
    //   inputManager.value.registerTouchHandlers(canvasRef.value)
    // }
    // inputManager.value.registerKeyboardHandlers()
    
    console.warn('UnifiedInputManager not implemented yet')
  } catch (error) {
    console.error('Failed to initialize input manager:', error)
  }
}

// Rendering
function startRenderLoop(): void {
  const renderFrame = (timestamp: number) => {
    // Calculate FPS
    if (lastFrameTime.value) {
      const deltaTime = timestamp - lastFrameTime.value
      frameCount.value++
      
      if (frameCount.value % 60 === 0) {
        fps.value = Math.round(1000 / (deltaTime || 16))
      }
    }
    lastFrameTime.value = timestamp

    // Render game if not paused
    if (!isPaused.value && canvasContext.value) {
      render()
    }

    // Continue render loop
    animationFrameId.value = requestAnimationFrame(renderFrame)
  }

  animationFrameId.value = requestAnimationFrame(renderFrame)
}

function render(): void {
  if (!canvasContext.value || !canvasRef.value) return

  const ctx = canvasContext.value
  const canvas = canvasRef.value

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // TODO: Implement actual game rendering
  // - Draw maze background
  // - Draw players
  // - Draw bombs and explosions
  // - Draw monsters and boss
  // - Draw power-ups
  // - Draw UI overlays
  
  renderPlaceholder(ctx, canvas)
  
  // Update entity count for debug
  entityCount.value = calculateEntityCount()
}

function renderPlaceholder(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  // Placeholder rendering until game rendering is implemented
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw grid
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  
  const gridSize = 32
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }
  
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  
  // Draw placeholder text
  ctx.fillStyle = '#fff'
  ctx.font = '24px Arial'
  ctx.fillText('Bomberman Game Canvas', canvas.width / 2, canvas.height / 2)
  ctx.font = '16px Arial'
  ctx.fillText('Game rendering will be implemented here', canvas.width / 2, canvas.height / 2 + 40)
}

function calculateEntityCount(): number {
  return gameStore.playersArray.length + 
         gameStore.activeBombs.length + 
         gameStore.monsters.size + 
         gameStore.powerUps.size +
         (gameStore.boss ? 1 : 0)
}

// Input event handlers
function handleTouchStart(event: TouchEvent): void {
  // TODO: Forward to input manager when implemented
  console.log('Touch start:', event.touches.length)
}

function handleTouchMove(event: TouchEvent): void {
  // TODO: Forward to input manager when implemented
  console.log('Touch move:', event.touches.length)
}

function handleTouchEnd(event: TouchEvent): void {
  // TODO: Forward to input manager when implemented
  console.log('Touch end:', event.changedTouches.length)
}

function handlePlayerMove(action: any): void {
  // TODO: Handle player movement
  console.log('Player move:', action)
  playerStore.movePlayer(action.direction, action.intensity)
}

function handlePlayerBomb(action: any): void {
  // TODO: Handle bomb placement
  console.log('Player bomb:', action)
  playerStore.placeBomb()
}

function handlePlayerStop(): void {
  // TODO: Handle player stop
  console.log('Player stop')
  playerStore.stopMovement()
}

function handleInputModeChanged(mode: string): void {
  inputMode.value = mode
  emit('inputModeChanged', mode)
}

// Event listeners
function setupEventListeners(): void {
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleOrientationChange)
  
  // Handle visibility change (pause when tab hidden)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

function handleResize(): void {
  // Throttle resize events
  setTimeout(() => {
    uiStore.updateViewportSize()
    updateCanvasSize()
  }, 100)
}

function handleOrientationChange(): void {
  // Wait for orientation change to complete
  setTimeout(() => {
    uiStore.handleOrientationChange()
    updateCanvasSize()
  }, 500)
}

function handleVisibilityChange(): void {
  if (document.hidden && gameStore.gameState === 'playing') {
    gameStore.pauseGame()
  }
}

function updateCanvasSize(): void {
  if (!canvasRef.value) return
  
  const newSize = canvasSize.value
  canvasRef.value.width = newSize.width
  canvasRef.value.height = newSize.height
  
  // Reconfigure context after size change
  if (canvasContext.value) {
    canvasContext.value.imageSmoothingEnabled = false
  }
}

// Cleanup
function cleanup(): void {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
  
  if (inputManager.value) {
    inputManager.value.destroy()
  }
  
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', handleOrientationChange)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
}

// Expose methods for testing
defineExpose({
  initializeCanvas,
  initializeInputManager,
  render: renderFrame,
  handleResize,
  cleanup
})
</script>

<style scoped>
.game-canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.game-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border: 2px solid #333;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.canvas-loading {
  pointer-events: none;
}

.canvas-paused {
  filter: grayscale(0.5) blur(1px);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.debug-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  z-index: 20;
}

.debug-info p {
  margin: 2px 0;
}

/* Mobile-specific styles */
.canvas-mobile {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.canvas-mobile .game-canvas {
  width: 100vmin;
  height: 100vmin;
  max-width: calc(100vw - 20px);
  max-height: calc(100vh - 20px);
}

/* Desktop-specific styles */
.canvas-desktop .game-canvas {
  width: min(80vh, 80vw);
  height: min(80vh, 80vw);
}

/* Landscape layout */
.canvas-landscape {
  flex-direction: row;
}

/* Portrait layout */
.canvas-portrait {
  flex-direction: column;
}
</style>