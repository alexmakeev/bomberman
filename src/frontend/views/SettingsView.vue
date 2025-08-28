<template>
  <div class="settings-view">
    <div class="settings-container">
      <div class="settings-header">
        <button class="back-button" @click="$router.back()">
          <span class="back-icon">←</span>
          <span>Back</span>
        </button>
        <h1>Settings</h1>
      </div>
      
      <div class="settings-content">
        <div class="settings-section">
          <h3>Player</h3>
          <div class="setting-item">
            <label>Player Name</label>
            <input 
              v-model="playerName"
              type="text"
              maxlength="20"
              placeholder="Enter your name"
              @blur="updatePlayerName"
              class="setting-input"
            >
          </div>
          
          <div class="setting-item">
            <label>Preferred Color</label>
            <div class="color-picker">
              <button
                v-for="color in availableColors"
                :key="color.value"
                class="color-option"
                :class="{ active: playerColor === color.value }"
                :style="{ backgroundColor: color.hex }"
                @click="updatePlayerColor(color.value)"
                :title="color.name"
              />
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Audio</h3>
          <div class="setting-item">
            <label>Master Volume</label>
            <input 
              v-model="audioSettings.masterVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              @input="updateAudioSettings"
              class="setting-slider"
            >
            <span class="setting-value">{{ Math.round(audioSettings.masterVolume * 100) }}%</span>
          </div>
          
          <div class="setting-item">
            <label>Sound Effects</label>
            <input 
              v-model="audioSettings.soundEffectsVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              @input="updateAudioSettings"
              class="setting-slider"
            >
            <span class="setting-value">{{ Math.round(audioSettings.soundEffectsVolume * 100) }}%</span>
          </div>
          
          <div class="setting-item">
            <label>Music</label>
            <input 
              v-model="audioSettings.musicVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              @input="updateAudioSettings"
              class="setting-slider"
            >
            <span class="setting-value">{{ Math.round(audioSettings.musicVolume * 100) }}%</span>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Controls</h3>
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.hapticFeedback"
                type="checkbox"
                @change="updateUISettings"
              >
              Haptic Feedback (Mobile)
            </label>
          </div>
          
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.touchControlsEnabled"
                type="checkbox"
                @change="updateUISettings"
              >
              Touch Controls
            </label>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Display</h3>
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.showMinimap"
                type="checkbox"
                @change="updateUISettings"
              >
              Show Minimap
            </label>
          </div>
          
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.showFPS"
                type="checkbox"
                @change="updateUISettings"
              >
              Show FPS Counter
            </label>
          </div>
          
          <div class="setting-item">
            <label>Theme</label>
            <select 
              v-model="uiSettings.theme"
              @change="updateUISettings"
              class="setting-select"
            >
              <option value="auto">Auto</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Data</h3>
          <div class="setting-item">
            <button class="setting-button danger" @click="clearData">
              Clear All Data
            </button>
            <p class="setting-description">
              This will reset all settings and clear game history
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/playerStore'
import { useUIStore } from '@/stores/uiStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { 
  loadAudioSettings, 
  saveAudioSettings,
  loadUISettings,
  saveUISettings,
  exportUserData,
  clearStorage
} from '@/utils/storageUtils'

const playerStore = usePlayerStore()
const uiStore = useUIStore()
const notificationStore = useNotificationStore()

const playerName = ref('')
const playerColor = ref('blue')

const audioSettings = reactive({
  masterVolume: 0.7,
  soundEffectsVolume: 0.8,
  musicVolume: 0.5
})

const uiSettings = reactive({
  showMinimap: true,
  showFPS: false,
  hapticFeedback: true,
  touchControlsEnabled: true,
  theme: 'auto' as 'auto' | 'dark' | 'light'
})

const availableColors = [
  { name: 'Red', value: 'red', hex: '#ff4444' },
  { name: 'Blue', value: 'blue', hex: '#4444ff' },
  { name: 'Green', value: 'green', hex: '#44ff44' },
  { name: 'Yellow', value: 'yellow', hex: '#ffff44' },
  { name: 'Purple', value: 'purple', hex: '#ff44ff' },
  { name: 'Orange', value: 'orange', hex: '#ff8844' }
]

function updatePlayerName() {
  if (playerName.value.trim()) {
    playerStore.updateProfile({ name: playerName.value.trim() })
    notificationStore.showSuccess('Saved', 'Player name updated')
  }
}

function updatePlayerColor(color: string) {
  playerColor.value = color
  playerStore.updateProfile({ preferredColor: color })
  notificationStore.showSuccess('Saved', 'Player color updated')
}

function updateAudioSettings() {
  saveAudioSettings(audioSettings)
  notificationStore.showSuccess('Saved', 'Audio settings updated')
}

function updateUISettings() {
  saveUISettings(uiSettings)
  notificationStore.showSuccess('Saved', 'UI settings updated')
}

function clearData() {
  if (confirm('Are you sure? This will clear all your game data and settings.')) {
    try {
      clearStorage()
      notificationStore.showSuccess('Cleared', 'All data has been cleared')
      
      // Reset to defaults
      Object.assign(audioSettings, {
        masterVolume: 0.7,
        soundEffectsVolume: 0.8,
        musicVolume: 0.5
      })
      
      Object.assign(uiSettings, {
        showMinimap: true,
        showFPS: false,
        hapticFeedback: true,
        touchControlsEnabled: true,
        theme: 'auto'
      })
      
      playerName.value = 'Player'
      playerColor.value = 'blue'
      
    } catch (error) {
      notificationStore.showError('Error', 'Failed to clear data')
    }
  }
}

onMounted(() => {
  // Load current settings
  const savedAudio = loadAudioSettings()
  if (savedAudio) {
    Object.assign(audioSettings, savedAudio)
  }
  
  const savedUI = loadUISettings()
  if (savedUI) {
    Object.assign(uiSettings, savedUI)
  }
  
  // Load player info
  playerName.value = playerStore.name || 'Player'
  playerColor.value = playerStore.preferredColor || 'blue'
})
</script>

<style scoped>
.settings-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #1a1a1a;
}

.settings-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.settings-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.back-button {
  background: none;
  border: none;
  color: #ff6b35;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s ease;
  margin-right: 20px;
}

.back-button:hover {
  background: rgba(255, 107, 53, 0.1);
}

.back-icon {
  font-size: 20px;
}

.settings-header h1 {
  color: #ffffff;
  font-size: 24px;
  margin: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.settings-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-section h3 {
  color: #ff6b35;
  margin: 0 0 20px 0;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  color: #ffffff;
  font-weight: bold;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-family: 'Courier New', monospace;
}

.setting-input:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

.setting-slider {
  flex: 1;
  margin: 0 12px;
  accent-color: #ff6b35;
}

.setting-value {
  color: #ccc;
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}

.setting-select {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  font-family: 'Courier New', monospace;
}

.setting-select:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.2);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex: 1;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-option.active {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.5);
}

.color-option:hover {
  transform: scale(1.1);
}

.setting-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.setting-button.danger {
  background: rgba(244, 67, 54, 0.2);
  color: #ff4444;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.setting-button.danger:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: translateY(-1px);
}

.setting-description {
  color: #999;
  font-size: 12px;
  margin: 8px 0 0 0;
  line-height: 1.4;
}

/* Checkbox styling */
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #ff6b35;
  cursor: pointer;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .settings-container {
    padding: 16px;
  }
  
  .settings-header {
    margin-bottom: 20px;
  }
  
  .settings-header h1 {
    font-size: 20px;
  }
  
  .settings-content {
    gap: 20px;
  }
  
  .settings-section {
    padding: 16px;
  }
  
  .settings-section h3 {
    font-size: 16px;
    margin-bottom: 16px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .setting-item label {
    min-width: auto;
    margin-bottom: 4px;
  }
  
  .setting-slider {
    margin: 0;
  }
  
  .setting-value {
    text-align: left;
    min-width: auto;
  }
  
  .color-picker {
    justify-content: flex-start;
  }
  
  .color-option {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .settings-container {
    padding: 12px;
  }
  
  .back-button {
    font-size: 14px;
    padding: 6px 8px;
    margin-right: 12px;
  }
  
  .settings-section {
    padding: 12px;
  }
  
  .setting-item {
    margin-bottom: 12px;
  }
}
</style>