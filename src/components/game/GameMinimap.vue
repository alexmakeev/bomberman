<!--
GameMinimap Component - Real-time minimap with entity rendering and responsive positioning
Displays game overview with players, monsters, and maze layout

@see docs/front-end/02-component-structure.md - Component architecture  
@see tests/frontend/components/GameMinimap.test.ts - Comprehensive tests
-->

<template>
  <div 
    class="minimap-container"
    :class="containerClasses"
  >
    <canvas
      ref="minimapCanvas"
      class="minimap-canvas"
      :width="minimapSize"
      :height="minimapSize"
      :aria-label="screenReaderDescription"
      role="img"
    />
    
    <!-- Screen reader description -->
    <div class="sr-only">
      {{ screenReaderDescription }}
    </div>
    
    <!-- Minimap legend -->
    <div v-if="showLegend" class="minimap-legend">
      <div class="legend-item">
        <span class="legend-color player"></span>
        <span>Players</span>
      </div>
      <div class="legend-item">
        <span class="legend-color monster"></span>
        <span>Monsters</span>
      </div>
      <div class="legend-item" v-if="gameStore.boss">
        <span class="legend-color boss"></span>
        <span>Boss</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useUIStore } from '../../stores/uiStore'
import type { Position, Player, Monster, Boss, Bomb, PowerUp } from '../../types/game'

// Props
interface Props {
  size?: number
  showLegend?: boolean
  updateInterval?: number
  showPowerUps?: boolean
  showBombs?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 200,
  showLegend: false,
  updateInterval: 16, // ~60fps
  showPowerUps: true,
  showBombs: true
})

// Store references
const gameStore = useGameStore()
const playerStore = usePlayerStore()
const uiStore = useUIStore()

// Template refs
const minimapCanvas = ref<HTMLCanvasElement>()

// Component state
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const renderTimer = ref<number>()
const lastRenderTime = ref(0)

// Configuration
const minimapSize = computed(() => props.size * (uiStore.uiScale || 1))
const cellSize = computed(() => minimapSize.value / 15) // 15x15 maze
const showGrid = ref(false)

// Computed properties
const containerClasses = computed(() => ({
  'minimap-mobile': uiStore.isMobile,
  'minimap-desktop': uiStore.isDesktop,
  'minimap-landscape': uiStore.isLandscape,
  'minimap-portrait': uiStore.isPortrait,
  'minimap-hidden': !uiStore.showMinimap
}))

const screenReaderDescription = computed(() => {
  const playerCount = gameStore.alivePlayers.length
  const monsterCount = gameStore.monsters.size
  const bossPresent = gameStore.boss ? 'Boss present. ' : ''
  
  return `Game minimap showing ${playerCount} players and ${monsterCount} monsters. ${bossPresent}Use arrow keys to navigate.`
})

// Color schemes
const colors = {
  wall: '#4a4a4a',
  destructible: '#8b4513',
  empty: '#1a1a1a',
  player: '#00ff00',
  playerCurrent: '#00ff00',
  playerOther: '#00aa00',
  playerDead: '#666666',
  monster: '#ff4444',
  boss: '#ff0000',
  bomb: '#ffaa00',
  explosion: '#ffffff',
  powerUp: {
    bomb_count: '#00aaff',
    bomb_power: '#ff8800',
    speed_boost: '#ffff00',
    health: '#ff0088'
  }
}

// Lifecycle hooks
onMounted(async () => {
  await initializeMinimap()
  startRenderLoop()
  setupWatchers()
})

onUnmounted(() => {
  cleanup()
})

// Initialization
async function initializeMinimap(): Promise<void> {
  if (!minimapCanvas.value) {
    console.error('Minimap canvas element not found')
    return
  }

  const context = minimapCanvas.value.getContext('2d')
  if (!context) {
    console.error('Failed to get minimap canvas context')
    return
  }

  canvasContext.value = context
  
  // Configure for pixel-perfect rendering
  context.imageSmoothingEnabled = false
  
  // Handle high DPI displays
  const dpr = window.devicePixelRatio || 1
  if (dpr > 1) {
    const size = minimapSize.value
    minimapCanvas.value.width = size * dpr
    minimapCanvas.value.height = size * dpr
    minimapCanvas.value.style.width = `${size}px`
    minimapCanvas.value.style.height = `${size}px`
    context.scale(dpr, dpr)
  }
  
  // Initial render
  render()
}

// Rendering
function startRenderLoop(): void {
  const renderFrame = () => {
    const now = performance.now()
    
    // Throttle to specified update interval
    if (now - lastRenderTime.value >= props.updateInterval) {
      render()
      lastRenderTime.value = now
    }
    
    renderTimer.value = requestAnimationFrame(renderFrame)
  }
  
  renderTimer.value = requestAnimationFrame(renderFrame)
}

function render(): void {
  if (!canvasContext.value || !uiStore.showMinimap) return
  
  const ctx = canvasContext.value
  const size = minimapSize.value
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size)
  
  // Draw components in order
  drawMaze()
  if (props.showPowerUps) drawPowerUps()
  if (props.showBombs) drawBombs()
  drawMonsters()
  if (gameStore.boss) drawBoss()
  drawPlayers()
  
  // Draw grid if enabled
  if (showGrid.value) drawGrid()
}

function drawMaze(): void {
  if (!canvasContext.value || !gameStore.maze.length) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  
  for (let y = 0; y < gameStore.maze.length; y++) {
    for (let x = 0; x < gameStore.maze[y].length; x++) {
      const cell = gameStore.maze[y][x]
      let color = colors.empty
      
      switch (cell) {
        case 1: // Wall
          color = colors.wall
          break
        case 2: // Destructible
          color = colors.destructible
          break
        default: // Empty
          continue
      }
      
      ctx.fillStyle = color
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  }
}

function drawPlayers(): void {
  if (!canvasContext.value) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  
  gameStore.alivePlayers.forEach(player => {
    const gridPos = worldToGrid(player.position)
    const centerX = (gridPos.x * cellSize) + (cellSize / 2)
    const centerY = (gridPos.y * cellSize) + (cellSize / 2)
    const radius = cellSize / 3
    
    // Determine color based on whether it's current player
    const isCurrentPlayer = player.id === playerStore.id
    const color = isCurrentPlayer ? colors.playerCurrent : colors.playerOther
    
    // Draw player circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    
    // Add outline for current player
    if (isCurrentPlayer) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  })
  
  // Draw dead players differently
  gameStore.deadPlayers.forEach(player => {
    const gridPos = worldToGrid(player.position)
    const centerX = (gridPos.x * cellSize) + (cellSize / 2)
    const centerY = (gridPos.y * cellSize) + (cellSize / 2)
    const radius = cellSize / 4
    
    ctx.fillStyle = colors.playerDead
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawMonsters(): void {
  if (!canvasContext.value) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  
  gameStore.monsters.forEach(monster => {
    const gridPos = worldToGrid(monster.position)
    const x = gridPos.x * cellSize
    const y = gridPos.y * cellSize
    const size = cellSize * 0.6
    const offset = cellSize * 0.2
    
    // Different shapes for different monster types
    ctx.fillStyle = colors.monster
    
    switch (monster.type) {
      case 'basic':
        // Square for basic monsters
        ctx.fillRect(x + offset, y + offset, size, size)
        break
      case 'fast':
        // Diamond for fast monsters
        ctx.save()
        ctx.translate(x + cellSize / 2, y + cellSize / 2)
        ctx.rotate(Math.PI / 4)
        ctx.fillRect(-size / 2, -size / 2, size, size)
        ctx.restore()
        break
      case 'tank':
        // Circle for tank monsters
        ctx.beginPath()
        ctx.arc(x + cellSize / 2, y + cellSize / 2, size / 2, 0, Math.PI * 2)
        ctx.fill()
        break
      default:
        ctx.fillRect(x + offset, y + offset, size, size)
    }
  })
}

function drawBoss(): void {
  if (!canvasContext.value || !gameStore.boss) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  const boss = gameStore.boss
  
  const gridPos = worldToGrid(boss.position)
  const centerX = (gridPos.x * cellSize) + (cellSize / 2)
  const centerY = (gridPos.y * cellSize) + (cellSize / 2)
  const radius = cellSize * 0.8
  
  // Boss health indicator color
  const healthPercent = boss.health / boss.maxHealth
  const red = Math.floor(255 * (1 - healthPercent))
  const green = Math.floor(255 * healthPercent)
  
  ctx.fillStyle = `rgb(${red}, ${green}, 0)`
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // Boss outline
  ctx.strokeStyle = colors.boss
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawBombs(): void {
  if (!canvasContext.value) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  
  gameStore.activeBombs.forEach(bomb => {
    const gridPos = worldToGrid(bomb.position)
    const centerX = (gridPos.x * cellSize) + (cellSize / 2)
    const centerY = (gridPos.y * cellSize) + (cellSize / 2)
    
    // Blinking effect based on timer
    const blinkRate = bomb.timer < 1000 ? 200 : 500
    const shouldShow = Math.floor(Date.now() / blinkRate) % 2 === 0
    
    if (shouldShow) {
      const size = cellSize * 0.4
      ctx.fillStyle = colors.bomb
      ctx.fillRect(
        centerX - size / 2,
        centerY - size / 2,
        size,
        size
      )
    }
  })
}

function drawPowerUps(): void {
  if (!canvasContext.value) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  
  gameStore.powerUps.forEach(powerUp => {
    if (powerUp.isCollected) return
    
    const gridPos = worldToGrid(powerUp.position)
    const centerX = (gridPos.x * cellSize) + (cellSize / 2)
    const centerY = (gridPos.y * cellSize) + (cellSize / 2)
    const size = cellSize * 0.3
    
    const color = colors.powerUp[powerUp.type] || '#ffffff'
    
    ctx.fillStyle = color
    ctx.fillRect(
      centerX - size / 2,
      centerY - size / 2,
      size,
      size
    )
  })
}

function drawGrid(): void {
  if (!canvasContext.value) return
  
  const ctx = canvasContext.value
  const cellSize = this.cellSize.value
  const size = minimapSize.value
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 1
  
  // Vertical lines
  for (let x = 0; x <= size; x += cellSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  
  // Horizontal lines
  for (let y = 0; y <= size; y += cellSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }
}

// Utility functions
function worldToGrid(position: Position): Position {
  return {
    x: Math.floor(position.x / 64), // 64px grid cells
    y: Math.floor(position.y / 64)
  }
}

// Watchers
function setupWatchers(): void {
  // Re-render when game state changes
  watch(() => gameStore.playersArray.length, render, { flush: 'post' })
  watch(() => gameStore.monsters.size, render, { flush: 'post' })
  watch(() => gameStore.activeBombs.length, render, { flush: 'post' })
  watch(() => gameStore.boss, render, { flush: 'post' })
  
  // Handle minimap visibility changes
  watch(() => uiStore.showMinimap, (visible) => {
    if (visible) {
      nextTick(() => render())
    }
  })
  
  // Handle size changes
  watch(() => minimapSize.value, () => {
    nextTick(() => initializeMinimap())
  })
}

// Cleanup
function cleanup(): void {
  if (renderTimer.value) {
    cancelAnimationFrame(renderTimer.value)
  }
}

// Expose methods for testing
defineExpose({
  render,
  drawMaze,
  drawPlayers,
  drawMonsters,
  drawBoss,
  drawBombs,
  drawPowerUps,
  worldToGrid
})
</script>

<style scoped>
.minimap-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
}

.minimap-canvas {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.8);
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.minimap-legend {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  font-size: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 4px;
  border-radius: 2px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 8px;
  height: 8px;
  border-radius: 1px;
}

.legend-color.player {
  background: #00ff00;
}

.legend-color.monster {
  background: #ff4444;
}

.legend-color.boss {
  background: #ff0000;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.minimap-hidden {
  display: none;
}

/* Mobile positioning */
.minimap-mobile {
  position: fixed;
  top: 10px;
  right: 10px;
}

.minimap-mobile .minimap-canvas {
  width: 120px;
  height: 120px;
}

/* Tablet positioning */
.minimap-tablet {
  position: fixed;
  top: 15px;
  right: 15px;
}

.minimap-tablet .minimap-canvas {
  width: 150px;
  height: 150px;
}

/* Desktop positioning */
.minimap-desktop {
  position: fixed;
  top: 20px;
  right: 20px;
}

.minimap-desktop .minimap-canvas {
  width: 200px;
  height: 200px;
}

/* Landscape layout adjustments */
.minimap-landscape {
  top: 10px;
  right: 10px;
}

/* Portrait layout adjustments */
.minimap-portrait {
  top: 10px;
  right: 10px;
}

/* Hover effects for desktop */
@media (hover: hover) {
  .minimap-container:hover .minimap-canvas {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .minimap-canvas {
    animation: none;
  }
}

@media (prefers-contrast: high) {
  .minimap-canvas {
    border-color: white;
    background: black;
  }
}</style>