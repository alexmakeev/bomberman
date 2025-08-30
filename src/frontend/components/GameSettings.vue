<template>
  <div class="game-settings-overlay" @click.self="$emit('close')">
    <div class="game-settings">
      <div class="settings-header">
        <h3>Game Settings</h3>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      
      <div class="settings-content">
        <div class="setting-group">
          <h4>Audio</h4>
          <div class="setting-item">
            <label>Master Volume</label>
            <input 
              v-model="audioSettings.masterVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              @input="updateAudio"
            >
            <span>{{ Math.round(audioSettings.masterVolume * 100) }}%</span>
          </div>
          
          <div class="setting-item">
            <label>Sound Effects</label>
            <input 
              v-model="audioSettings.soundEffectsVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              @input="updateAudio"
            >
            <span>{{ Math.round(audioSettings.soundEffectsVolume * 100) }}%</span>
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Display</h4>
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.showMinimap"
                type="checkbox"
                @change="updateUI"
              >
              Show Minimap
            </label>
          </div>
          
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.showFPS"
                type="checkbox"
                @change="updateUI"
              >
              Show FPS
            </label>
          </div>
        </div>
        
        <div class="setting-group" v-if="isMobile">
          <h4>Controls</h4>
          <div class="setting-item">
            <label>
              <input 
                v-model="uiSettings.hapticFeedback"
                type="checkbox"
                @change="updateUI"
              >
              Haptic Feedback
            </label>
          </div>
        </div>
      </div>
      
      <div class="settings-actions">
        <button class="settings-button secondary" @click="$emit('close')">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import { useUIStore } from '../../stores/uiStore'
import { 
  loadAudioSettings, 
  saveAudioSettings, 
  loadUISettings, 
  saveUISettings 
} from '../../utils/storageUtils'

defineEmits<{
  close: []
}>()

const uiStore = useUIStore()

const isMobile = computed(() => uiStore.isMobile)

const audioSettings = reactive({
  masterVolume: 0.7,
  soundEffectsVolume: 0.8,
  musicVolume: 0.5
})

const uiSettings = reactive({
  showMinimap: true,
  showFPS: false,
  hapticFeedback: true
})

function updateAudio() {
  saveAudioSettings(audioSettings)
}

function updateUI() {
  saveUISettings(uiSettings)
}

onMounted(() => {
  const savedAudio = loadAudioSettings()
  if (savedAudio) {
    Object.assign(audioSettings, savedAudio)
  }
  
  const savedUI = loadUISettings()
  if (savedUI) {
    Object.assign(uiSettings, savedUI)
  }
})
</script>

<style scoped>
.game-settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.game-settings {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-header h3 {
  color: #ff6b35;
  margin: 0;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-group {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.setting-group h4 {
  color: #ccc;
  margin: 0 0 12px 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  color: white;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.setting-item input[type="range"] {
  flex: 1;
  accent-color: #ff6b35;
}

.setting-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #ff6b35;
}

.setting-item span {
  color: #ccc;
  font-weight: bold;
  min-width: 35px;
  text-align: right;
}

.settings-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.settings-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.settings-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.settings-button.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Mobile adjustments */
@media (max-width: 480px) {
  .game-settings {
    width: 95%;
    padding: 16px;
    margin: 10px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .setting-item input[type="range"] {
    margin: 0;
  }
  
  .setting-item span {
    text-align: left;
  }
}
</style>