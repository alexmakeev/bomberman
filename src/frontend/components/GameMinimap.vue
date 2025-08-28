<template>
  <div class="minimap" :class="{ 'mobile': isMobile }">
    <canvas 
      ref="minimapCanvas"
      class="minimap-canvas"
      :width="canvasSize"
      :height="canvasSize"
    />
    <div class="minimap-legend" v-if="!isMobile">
      <div class="legend-item">
        <span class="legend-color player"></span>
        <span>You</span>
      </div>
      <div class="legend-item">
        <span class="legend-color teammate"></span>
        <span>Team</span>
      </div>
      <div class="legend-item">
        <span class="legend-color enemy"></span>
        <span>Enemy</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { useGameStore } from '@/stores/gameStore'
import { useUIStore } from '@/stores/uiStore'

const playerStore = usePlayerStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const minimapCanvas = ref<HTMLCanvasElement>()

const isMobile = computed(() => uiStore.isMobile)
const canvasSize = computed(() => isMobile.value ? 120 : 160)

let animationFrame: number | null = null

function renderMinimap() {
  const canvas = minimapCanvas.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const size = canvasSize.value
  ctx.clearRect(0, 0, size, size)
  
  // Draw maze outline
  ctx.fillStyle = '#333'
  ctx.fillRect(0, 0, size, size)
  
  // Draw grid
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  
  const cellSize = size / 15 // Assuming 15x11 maze
  
  for (let x = 0; x <= 15; x++) {
    ctx.beginPath()
    ctx.moveTo(x * cellSize, 0)
    ctx.lineTo(x * cellSize, size)
    ctx.stroke()
  }
  
  for (let y = 0; y <= 11; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * cellSize)
    ctx.lineTo(size, y * cellSize)
    ctx.stroke()
  }
  
  // Draw player (you)
  if (playerStore.position) {
    ctx.fillStyle = '#4caf50'
    ctx.beginPath()
    ctx.arc(
      playerStore.position.x * cellSize + cellSize / 2,
      playerStore.position.y * cellSize + cellSize / 2,
      cellSize / 3,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }
  
  // Draw other players
  gameStore.players.forEach(player => {
    if (player.id !== playerStore.id && player.isAlive) {
      ctx.fillStyle = '#2196f3'
      ctx.beginPath()
      ctx.arc(
        player.position.x * cellSize + cellSize / 2,
        player.position.y * cellSize + cellSize / 2,
        cellSize / 4,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  })
  
  // Draw monsters
  gameStore.monsters.forEach(monster => {
    if (monster.isAlive) {
      ctx.fillStyle = '#ff5722'
      ctx.beginPath()
      ctx.arc(
        monster.position.x * cellSize + cellSize / 2,
        monster.position.y * cellSize + cellSize / 2,
        cellSize / 4,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  })
  
  // Draw boss if present
  if (gameStore.boss && gameStore.boss.isAlive) {
    ctx.fillStyle = '#9c27b0'
    ctx.fillRect(
      gameStore.boss.position.x * cellSize,
      gameStore.boss.position.y * cellSize,
      cellSize,
      cellSize
    )
  }
}

function startRenderLoop() {
  function render() {
    renderMinimap()
    animationFrame = requestAnimationFrame(render)
  }
  
  render()
}

function stopRenderLoop() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

onMounted(() => {
  startRenderLoop()
})

onUnmounted(() => {
  stopRenderLoop()
})

// Watch for game state changes
watch([() => gameStore.players, () => gameStore.monsters], () => {
  renderMinimap()
}, { deep: true })
</script>

<style scoped>
.minimap {
  position: relative;
}

.minimap-canvas {
  display: block;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: #000;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.minimap-legend {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  padding: 8px;
  margin-top: 4px;
  backdrop-filter: blur(4px);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #ccc;
  margin-bottom: 2px;
}

.legend-item:last-child {
  margin-bottom: 0;
}

.legend-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-color.player {
  background: #4caf50;
}

.legend-color.teammate {
  background: #2196f3;
}

.legend-color.enemy {
  background: #ff5722;
}

.minimap.mobile .minimap-canvas {
  border-width: 1px;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .minimap-legend {
    display: none;
  }
}
</style>