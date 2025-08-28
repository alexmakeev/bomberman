<!--
GameUI Component - Main game UI overlay with player stats, notifications, and responsive layout
Handles all game UI elements and responsive positioning

@see docs/front-end/02-component-structure.md - Component architecture
@see tests/frontend/components/GameUI.test.ts - Comprehensive tests
-->

<template>
  <div 
    class="game-ui"
    :class="uiClasses"
  >
    <!-- Top Left - Player Stats and Game Info -->
    <div class="ui-top-left position-top-left">
      <!-- Player Health -->
      <div class="player-health-container">
        <div class="health-label">Health</div>
        <div 
          class="health-bar"
          :aria-label="`Player health: ${playerStore.health} out of ${playerStore.maxHealth}`"
          role="progressbar"
          :aria-valuenow="playerStore.health"
          :aria-valuemin="0"
          :aria-valuemax="playerStore.maxHealth"
        >
          <div 
            class="health-bar-fill"
            :class="healthBarClass"
            :style="{ width: `${playerStore.healthPercentage}%` }"
          ></div>
        </div>
        <div class="health-text">
          {{ playerStore.health }}/{{ playerStore.maxHealth }}
        </div>
      </div>

      <!-- Bomb Info -->
      <div class="bomb-info">
        <div class="bomb-count">
          Bombs: {{ playerStore.bombCount }}/{{ playerStore.maxBombs }}
        </div>
        <div class="bomb-power">
          Power: {{ playerStore.bombPower }}
        </div>
      </div>

      <!-- Score -->
      <div class="player-score">
        Score: {{ formatScore(playerStore.score) }}
      </div>

      <!-- Game Timer -->
      <div 
        class="game-timer"
        :class="{ 'timer-warning': isTimeWarning }"
      >
        Time: {{ gameStore.timeRemainingFormatted }}
      </div>

      <!-- Game Objective -->
      <div class="game-objective">
        {{ gameStore.objective }}
      </div>

      <!-- Level Info -->
      <div class="level-info">
        Level {{ gameStore.currentLevel }}
      </div>
    </div>

    <!-- Top Right - Minimap (handled by GameMinimap component) -->
    <div class="ui-top-right position-top-right">
      <slot name="minimap" />
    </div>

    <!-- Bottom Info - Additional Game Information -->
    <div class="ui-bottom-info">
      <!-- Active Power-ups -->
      <div v-if="playerStore.activePowerUps.length" class="active-powerups">
        <div class="powerups-label">Power-ups:</div>
        <div class="powerups-list">
          <div 
            v-for="powerUp in playerStore.activePowerUps"
            :key="powerUp"
            :class="`powerup-${powerUp}`"
            class="powerup-icon"
            :title="formatPowerUpName(powerUp)"
          >
            {{ getPowerUpIcon(powerUp) }}
          </div>
        </div>
      </div>

      <!-- Touch Controls Help (Mobile Only) -->
      <div v-if="showTouchHelp" class="touch-controls-help">
        <div class="touch-help-item">
          <span class="touch-icon">👆</span>
          Hold to move
        </div>
        <div class="touch-help-item">
          <span class="touch-icon">👆👆</span>
          Tap to bomb
        </div>
      </div>
    </div>

    <!-- Boss Health Bar (when boss is present) -->
    <div v-if="gameStore.boss" class="boss-health-container">
      <div class="boss-info">
        <span class="boss-name">{{ formatBossName(gameStore.boss.type) }}</span>
        <span class="boss-phase">Phase {{ gameStore.boss.phase }}</span>
      </div>
      <div 
        class="boss-health-bar"
        :aria-label="`Boss health: ${gameStore.boss.health} out of ${gameStore.boss.maxHealth}`"
        role="progressbar"
        :aria-valuenow="gameStore.boss.health"
        :aria-valuemin="0"
        :aria-valuemax="gameStore.boss.maxHealth"
      >
        <div 
          class="boss-health-fill"
          :style="{ width: `${(gameStore.boss.health / gameStore.boss.maxHealth) * 100}%` }"
        ></div>
      </div>
    </div>

    <!-- Player Leaderboard -->
    <div 
      v-if="showLeaderboard && gameStore.playersArray.length > 1"
      class="leaderboard"
    >
      <div class="leaderboard-title">Players</div>
      <div class="leaderboard-list">
        <div
          v-for="player in gameStore.playersByScore"
          :key="player.id"
          class="leaderboard-player"
          :class="{
            'current-player': player.id === playerStore.id,
            'player-dead': !player.isAlive
          }"
        >
          <span class="player-name">{{ player.name }}</span>
          <span class="player-score">{{ formatScore(player.score) }}</span>
        </div>
      </div>
    </div>

    <!-- Respawn Timer (when player is dead) -->
    <div 
      v-if="playerStore.isRespawning" 
      class="respawn-timer"
    >
      <div class="respawn-title">Respawning in</div>
      <div class="respawn-countdown">
        {{ Math.ceil(playerStore.respawnTimer / 1000) }}
      </div>
    </div>

    <!-- Notifications -->
    <div class="notifications-container">
      <div
        v-for="notification in visibleNotifications"
        :key="notification.id"
        class="notification-toast"
        :class="[
          `toast-${notification.type}`,
          { 'toast-high-priority': notification.priority === 'high' }
        ]"
      >
        <div class="toast-title">{{ notification.title }}</div>
        <div class="toast-message">{{ notification.message }}</div>
      </div>
    </div>

    <!-- Settings Button -->
    <button
      class="settings-button"
      @click="uiStore.toggleSettings"
      @keydown.enter="uiStore.toggleSettings"
      @keydown.space="uiStore.toggleSettings"
      :aria-label="uiStore.showSettings ? 'Close settings' : 'Open settings'"
    >
      ⚙️
    </button>

    <!-- Pause Overlay -->
    <div 
      v-if="gameStore.gameState === 'paused'" 
      class="pause-overlay"
    >
      <div class="pause-content">
        <h2>Game Paused</h2>
        <p>Press ESC or click the pause button to resume</p>
      </div>
    </div>

    <!-- Screen Reader Announcements -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      <span v-if="lastAnnouncement">{{ lastAnnouncement }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { useNotificationStore } from '../../stores/notificationStore'
import type { PowerUpType, NotificationMessage } from '../../types/game'

// Props
interface Props {
  showLeaderboard?: boolean
  showTouchHelp?: boolean
  maxNotifications?: number
}

const props = withDefaults(defineProps<Props>(), {
  showLeaderboard: true,
  showTouchHelp: true,
  maxNotifications: 5
})

// Store references
const playerStore = usePlayerStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()

// Component state
const lastAnnouncement = ref<string>('')

// Computed properties
const uiClasses = computed(() => ({
  'ui-mobile': uiStore.isMobile,
  'ui-tablet': uiStore.isTablet,
  'ui-desktop': uiStore.isDesktop,
  'ui-mobile-portrait': uiStore.isMobile && uiStore.isPortrait,
  'ui-mobile-landscape': uiStore.isMobile && uiStore.isLandscape,
  'ui-paused': gameStore.gameState === 'paused'
}))

const healthBarClass = computed(() => {
  const percentage = playerStore.healthPercentage
  if (percentage <= 25) return 'health-critical'
  if (percentage <= 50) return 'health-warning'
  return 'health-good'
})

const isTimeWarning = computed(() => 
  gameStore.timeRemaining <= 60000 // Last minute
)

const showTouchHelp = computed(() => 
  props.showTouchHelp && uiStore.touchControlsEnabled
)

const showLeaderboard = computed(() => 
  props.showLeaderboard && uiStore.showLeaderboard
)

const visibleNotifications = computed(() =>
  notificationStore.visibleMessages.slice(-props.maxNotifications)
)

// Methods
function formatScore(score: number): string {
  return score.toLocaleString()
}

function formatPowerUpName(powerUp: PowerUpType): string {
  return powerUp.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getPowerUpIcon(powerUp: PowerUpType): string {
  const icons: Record<PowerUpType, string> = {
    bomb_count: '💣',
    bomb_power: '🔥',
    speed_boost: '⚡',
    health: '❤️',
    max_health: '💖',
    speed_boost_temp: '🌟'
  }
  return icons[powerUp] || '?'
}

function formatBossName(bossType: string): string {
  return bossType.charAt(0).toUpperCase() + bossType.slice(1) + ' Boss'
}

// Screen reader announcements
function announceToScreenReader(message: string): void {
  lastAnnouncement.value = message
  
  // Clear after a short delay to allow for new announcements
  setTimeout(() => {
    lastAnnouncement.value = ''
  }, 3000)
}

// Watchers for important state changes
watch(() => playerStore.health, (newHealth, oldHealth) => {
  if (oldHealth && newHealth < oldHealth) {
    announceToScreenReader(`Health decreased to ${newHealth}%`)
  }
})

watch(() => playerStore.score, (newScore, oldScore) => {
  if (oldScore && newScore > oldScore) {
    const gained = newScore - oldScore
    announceToScreenReader(`Score increased by ${gained} points`)
  }
})

watch(() => gameStore.gameState, (newState) => {
  const stateMessages = {
    playing: 'Game started',
    paused: 'Game paused',
    ended: 'Game ended'
  }
  
  if (stateMessages[newState]) {
    announceToScreenReader(stateMessages[newState])
  }
})

watch(() => playerStore.isRespawning, (respawning) => {
  if (respawning) {
    announceToScreenReader(`Player eliminated. Respawning in ${Math.ceil(playerStore.respawnTimer / 1000)} seconds`)
  } else {
    announceToScreenReader('Player respawned')
  }
})

// Expose methods for testing
defineExpose({
  formatScore,
  formatPowerUpName,
  getPowerUpIcon,
  formatBossName,
  announceToScreenReader
})
</script>

<style scoped>
.game-ui {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
  font-family: 'Courier New', monospace;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.game-ui > * {
  pointer-events: auto;
}

/* Positioning Classes */
.position-top-left {
  position: absolute;
  top: 10px;
  left: 10px;
}

.position-top-right {
  position: absolute;
  top: 10px;
  right: 10px;
}

.position-bottom-left {
  position: absolute;
  bottom: 10px;
  left: 10px;
}

.position-bottom-right {
  position: absolute;
  bottom: 10px;
  right: 10px;
}

/* Top Left Panel */
.ui-top-left {
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  min-width: 200px;
  backdrop-filter: blur(5px);
}

.ui-top-left > * {
  margin-bottom: 8px;
}

.ui-top-left > *:last-child {
  margin-bottom: 0;
}

/* Health Bar */
.player-health-container {
  margin-bottom: 12px;
}

.health-label {
  font-size: 12px;
  margin-bottom: 4px;
  opacity: 0.8;
}

.health-bar {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.health-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 9px;
}

.health-bar-fill.health-good {
  background: linear-gradient(90deg, #4ade80, #22c55e);
}

.health-bar-fill.health-warning {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.health-bar-fill.health-critical {
  background: linear-gradient(90deg, #ef4444, #dc2626);
  animation: pulse-critical 1s infinite;
}

@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.health-text {
  font-size: 12px;
  text-align: center;
  margin-top: 2px;
}

/* Game Stats */
.bomb-info, .player-score, .game-timer, .game-objective, .level-info {
  font-size: 14px;
  padding: 4px 0;
}

.game-timer.timer-warning {
  color: #fbbf24;
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Bottom Info Panel */
.ui-bottom-info {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Power-ups */
.active-powerups {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 20px;
  backdrop-filter: blur(5px);
}

.powerups-label {
  font-size: 12px;
  opacity: 0.8;
}

.powerups-list {
  display: flex;
  gap: 4px;
}

.powerup-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-size: 12px;
  cursor: help;
}

/* Touch Controls Help */
.touch-controls-help {
  display: flex;
  gap: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(5px);
}

.touch-help-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.touch-icon {
  font-size: 16px;
}

/* Boss Health */
.boss-health-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
}

.boss-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: bold;
}

.boss-health-bar {
  width: 100%;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.boss-health-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #dc2626);
  transition: width 0.3s ease;
  border-radius: 7px;
}

/* Leaderboard */
.leaderboard {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 12px;
  border-radius: 4px;
  backdrop-filter: blur(5px);
  min-width: 150px;
}

.leaderboard-title {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
  opacity: 0.8;
}

.leaderboard-player {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  font-size: 11px;
}

.leaderboard-player.current-player {
  color: #4ade80;
  font-weight: bold;
}

.leaderboard-player.player-dead {
  opacity: 0.5;
}

/* Respawn Timer */
.respawn-timer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.9);
  padding: 20px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.respawn-title {
  font-size: 16px;
  margin-bottom: 8px;
  opacity: 0.8;
}

.respawn-countdown {
  font-size: 48px;
  font-weight: bold;
  color: #fbbf24;
  animation: pulse-respawn 1s infinite;
}

@keyframes pulse-respawn {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Notifications */
.notifications-container {
  position: absolute;
  top: 80px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
}

.notification-toast {
  background: rgba(0, 0, 0, 0.8);
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid;
  backdrop-filter: blur(5px);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-toast.toast-info {
  border-left-color: #3b82f6;
}

.notification-toast.toast-success {
  border-left-color: #22c55e;
}

.notification-toast.toast-warning {
  border-left-color: #f59e0b;
}

.notification-toast.toast-error {
  border-left-color: #ef4444;
}

.notification-toast.toast-high-priority {
  animation: slideIn 0.3s ease, pulse-notification 2s infinite;
}

@keyframes pulse-notification {
  0%, 100% { box-shadow: 0 0 0 rgba(255, 255, 255, 0); }
  50% { box-shadow: 0 0 8px rgba(255, 255, 255, 0.3); }
}

.toast-title {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 11px;
  opacity: 0.9;
}

/* Settings Button */
.settings-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  backdrop-filter: blur(5px);
  transition: all 0.2s ease;
}

.settings-button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.settings-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Pause Overlay */
.pause-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(10px);
}

.pause-content {
  text-align: center;
  background: rgba(0, 0, 0, 0.9);
  padding: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.pause-content h2 {
  font-size: 32px;
  margin-bottom: 16px;
  color: #fbbf24;
}

.pause-content p {
  font-size: 16px;
  opacity: 0.8;
}

.ui-paused {
  filter: blur(1px);
}

.ui-paused .pause-overlay {
  filter: none;
}

/* Screen Reader */
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

/* Responsive Adjustments */

/* Mobile Portrait */
.ui-mobile-portrait .ui-top-left {
  font-size: 12px;
  padding: 8px;
  min-width: 160px;
}

.ui-mobile-portrait .boss-health-container {
  width: 250px;
  top: 20%;
}

.ui-mobile-portrait .notifications-container {
  top: 60px;
  max-width: 250px;
}

/* Mobile Landscape */
.ui-mobile-landscape .ui-top-left {
  font-size: 11px;
  padding: 6px;
  min-width: 140px;
}

.ui-mobile-landscape .boss-health-container {
  width: 200px;
  top: 30%;
}

.ui-mobile-landscape .leaderboard {
  top: 20%;
  right: 5px;
  min-width: 120px;
}

/* Desktop */
.ui-desktop .ui-top-left {
  padding: 15px;
  min-width: 250px;
}

.ui-desktop .boss-health-container {
  width: 400px;
}

.ui-desktop .notifications-container {
  max-width: 350px;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .game-ui {
    text-shadow: 2px 2px 4px black;
  }
  
  .ui-top-left,
  .active-powerups,
  .touch-controls-help,
  .boss-health-container,
  .leaderboard,
  .notification-toast {
    background: black;
    border: 1px solid white;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .health-bar-fill,
  .boss-health-fill,
  .settings-button,
  .notification-toast {
    transition: none;
  }
  
  .pulse-critical,
  .pulse-warning,
  .pulse-notification,
  .pulse-respawn {
    animation: none;
  }
}</style>