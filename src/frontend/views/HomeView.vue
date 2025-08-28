<template>
  <div class="home-view">
    <div class="hero-section">
      <div class="game-logo">
        <h1 class="title">💣 BOMBERMAN</h1>
        <p class="subtitle">Cooperative Multiplayer</p>
      </div>
      
      <div class="main-menu">
        <button 
          class="menu-button primary"
          @click="createGame"
          :disabled="loading"
        >
          <span class="button-icon">🎮</span>
          <span>Create Game</span>
        </button>
        
        <button 
          class="menu-button secondary"
          @click="showJoinDialog = true"
          :disabled="loading"
        >
          <span class="button-icon">🚪</span>
          <span>Join Game</span>
        </button>
        
        <button 
          class="menu-button secondary"
          @click="$router.push('/settings')"
        >
          <span class="button-icon">⚙️</span>
          <span>Settings</span>
        </button>
        
        <div class="recent-games" v-if="recentRooms.length > 0">
          <h3>Recent Games</h3>
          <div class="recent-list">
            <button 
              v-for="room in recentRooms.slice(0, 3)"
              :key="room.id"
              class="recent-room"
              @click="joinRoom(room.id)"
            >
              <div class="room-info">
                <span class="room-name">{{ room.name }}</span>
                <span class="room-details">
                  {{ room.playerCount }}/{{ room.maxPlayers || 4 }} players
                </span>
              </div>
              <span class="room-time">
                {{ formatTimeAgo(room.lastJoined) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Join Game Dialog -->
    <div v-if="showJoinDialog" class="dialog-overlay" @click.self="showJoinDialog = false">
      <div class="dialog">
        <h3>Join Game</h3>
        
        <div class="input-group">
          <label>Room Code</label>
          <input 
            ref="roomCodeInput"
            v-model="roomCode"
            type="text"
            placeholder="Enter room code (e.g., ABC123)"
            maxlength="12"
            @input="formatRoomCode"
            @keyup.enter="joinRoom()"
            class="room-input"
          >
        </div>
        
        <div class="dialog-actions">
          <button 
            class="menu-button secondary"
            @click="showJoinDialog = false"
          >
            Cancel
          </button>
          <button 
            class="menu-button primary"
            @click="joinRoom()"
            :disabled="!roomCode.trim() || loading"
          >
            Join
          </button>
        </div>
      </div>
    </div>
    
    <!-- Connection Status -->
    <div class="connection-status" :class="connectionStatusClass">
      <span class="status-indicator"></span>
      <span>{{ connectionStatusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
console.log('🏠 HomeView.vue script setup executing...')

import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
console.log('✅ Vue composition and router imports loaded')

import { usePlayerStore } from '../../stores/playerStore'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { useNotificationStore } from '../../stores/notificationStore'
console.log('✅ Store imports loaded')

import { getRecentRooms, type RecentRoom } from '../../utils/storageUtils'
import { isValidRoomId, sanitizeRoomId } from '../../utils/validationUtils'
console.log('✅ Utility imports loaded')

const router = useRouter()
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()

// Reactive state
const loading = ref(false)
const showJoinDialog = ref(false)
const roomCode = ref('')
const roomCodeInput = ref<HTMLInputElement>()
const recentRooms = ref<RecentRoom[]>([])

// Computed properties
const connectionStatusText = computed(() => {
  if (gameStore.isConnected) return 'Connected'
  if (gameStore.isConnecting) return 'Connecting...'
  return 'Offline'
})

const connectionStatusClass = computed(() => ({
  connected: gameStore.isConnected,
  connecting: gameStore.isConnecting,
  offline: !gameStore.isConnected && !gameStore.isConnecting
}))

// Methods
async function createGame() {
  loading.value = true
  
  try {
    // Initialize player if needed
    if (!playerStore.id) {
      await playerStore.initializePlayer()
    }
    
    // Create a new game room
    const roomId = await gameStore.createRoom({
      name: `${playerStore.name}'s Game`,
      maxPlayers: 4,
      gameMode: 'cooperative',
      difficulty: 'normal'
    })
    
    notificationStore.showSuccess('Game Created', 'Room created successfully!')
    
    // Navigate to game
    await router.push(`/game/${roomId}`)
    
  } catch (error) {
    console.error('Failed to create game:', error)
    notificationStore.showError('Failed to Create Game', 'Please try again.')
  } finally {
    loading.value = false
  }
}

async function joinRoom(roomId?: string) {
  const targetRoomId = roomId || roomCode.value.trim()
  
  if (!targetRoomId) {
    notificationStore.showWarning('Invalid Room Code', 'Please enter a valid room code.')
    return
  }
  
  const sanitizedRoomId = sanitizeRoomId(targetRoomId)
  if (!isValidRoomId(sanitizedRoomId)) {
    notificationStore.showWarning('Invalid Room Code', 'Room code must be 6-12 characters long.')
    return
  }
  
  loading.value = true
  
  try {
    // Initialize player if needed
    if (!playerStore.id) {
      await playerStore.initializePlayer()
    }
    
    // Join the room
    await gameStore.joinRoom(sanitizedRoomId)
    
    notificationStore.showSuccess('Joined Game', 'Successfully joined the game!')
    
    // Navigate to game
    await router.push(`/game/${sanitizedRoomId}`)
    
  } catch (error) {
    console.error('Failed to join game:', error)
    notificationStore.showError('Failed to Join Game', 'Room might not exist or be full.')
  } finally {
    loading.value = false
    showJoinDialog.value = false
    roomCode.value = ''
  }
}

function formatRoomCode() {
  // Auto-format room code to uppercase
  roomCode.value = sanitizeRoomId(roomCode.value)
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// Lifecycle
onMounted(async () => {
  console.log('🏠 HomeView onMounted hook executing...')
  
  try {
    console.log('📋 Loading recent rooms...')
    // Load recent rooms
    recentRooms.value = getRecentRooms()
    console.log(`✅ Loaded ${recentRooms.value.length} recent rooms`)
    
    console.log('👤 Initializing player store...')
    // Initialize player store
    await playerStore.initializePlayer()
    console.log('✅ Player store initialized')
    
    console.log('🎯 Setting up room code input focus...')
    // Focus room code input when dialog opens
    nextTick(() => {
      if (showJoinDialog.value && roomCodeInput.value) {
        roomCodeInput.value.focus()
      }
    })
    
    console.log('📱 Detecting device type...')
    // Detect device type for UI optimization
    uiStore.detectDevice()
    console.log('✅ Device detection completed')
    
    console.log('✅ HomeView fully mounted and ready')
  } catch (error) {
    console.error('❌ Error during HomeView mount:', error)
  }
})
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  position: relative;
}

.hero-section {
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.game-logo {
  margin-bottom: 40px;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #ff6b35;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  margin-bottom: 10px;
  letter-spacing: 3px;
}

.subtitle {
  font-size: 1rem;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.main-menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.menu-button {
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu-button.primary {
  background: linear-gradient(135deg, #ff6b35, #ff8c42);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.menu-button.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff8c42, #ff6b35);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
}

.menu-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.menu-button.secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.menu-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.button-icon {
  font-size: 20px;
}

.recent-games {
  margin-top: 32px;
  text-align: left;
}

.recent-games h3 {
  font-size: 14px;
  color: #ccc;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-room {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Courier New', monospace;
}

.recent-room:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.room-info {
  flex: 1;
  text-align: left;
}

.room-name {
  display: block;
  font-weight: bold;
  font-size: 14px;
}

.room-details {
  display: block;
  font-size: 12px;
  color: #ccc;
  margin-top: 2px;
}

.room-time {
  font-size: 11px;
  color: #999;
}

/* Dialog styles */
.dialog-overlay {
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

.dialog {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog h3 {
  margin: 0 0 20px 0;
  color: #ff6b35;
  font-size: 18px;
  text-align: center;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
  font-size: 14px;
  font-weight: bold;
}

.room-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.room-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

.room-input::placeholder {
  color: #666;
  text-transform: none;
  letter-spacing: normal;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.dialog-actions .menu-button {
  flex: 1;
  padding: 12px 20px;
  font-size: 14px;
}

/* Connection status */
.connection-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  font-size: 12px;
  color: #ccc;
  backdrop-filter: blur(4px);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.connection-status.connected .status-indicator {
  background: #4caf50;
}

.connection-status.connecting .status-indicator {
  background: #ff9800;
  animation: pulse 1.5s infinite;
}

.connection-status.offline .status-indicator {
  background: #f44336;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .title {
    font-size: 2rem;
  }
  
  .menu-button {
    font-size: 14px;
    padding: 14px 20px;
  }
  
  .dialog {
    margin: 20px;
    width: calc(100% - 40px);
  }
  
  .connection-status {
    bottom: 10px;
    right: 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .home-view {
    padding: 16px;
  }
  
  .title {
    font-size: 1.8rem;
    letter-spacing: 2px;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
  
  .menu-button {
    font-size: 13px;
    padding: 12px 16px;
  }
  
  .button-icon {
    font-size: 18px;
  }
}

/* Landscape mode adjustments */
@media (orientation: landscape) and (max-height: 500px) {
  .home-view {
    padding: 10px;
  }
  
  .game-logo {
    margin-bottom: 20px;
  }
  
  .title {
    font-size: 1.6rem;
    margin-bottom: 5px;
  }
  
  .subtitle {
    font-size: 0.8rem;
  }
  
  .main-menu {
    gap: 10px;
  }
  
  .menu-button {
    padding: 10px 16px;
    font-size: 12px;
  }
  
  .recent-games {
    margin-top: 16px;
  }
}
</style>