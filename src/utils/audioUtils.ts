/**
 * Audio Utility Functions
 * Sound effects and music management for 8-bit style audio
 * 
 * @see docs/front-end/01-architecture-overview.md - Audio layer
 */

import type { AudioSettings, SoundEffect } from '../types/game'

// Audio Context Management
let audioContext: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (!audioContext && (window.AudioContext || window.webkitAudioContext)) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

export function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    return ctx.resume()
  }
  return Promise.resolve()
}

// Sound Manager
export interface SoundManager {
  sounds: Map<string, HTMLAudioElement>
  settings: AudioSettings
  masterGain: GainNode | null
  soundEffectsGain: GainNode | null
  musicGain: GainNode | null
}

export function createSoundManager(): SoundManager {
  const ctx = getAudioContext()
  
  let masterGain: GainNode | null = null
  let soundEffectsGain: GainNode | null = null
  let musicGain: GainNode | null = null
  
  if (ctx) {
    masterGain = ctx.createGain()
    soundEffectsGain = ctx.createGain()
    musicGain = ctx.createGain()
    
    soundEffectsGain.connect(masterGain)
    musicGain.connect(masterGain)
    masterGain.connect(ctx.destination)
  }
  
  return {
    sounds: new Map(),
    settings: {
      masterVolume: 0.7,
      soundEffectsVolume: 0.8,
      musicVolume: 0.5,
      muteAll: false,
      spatialAudio: false
    },
    masterGain,
    soundEffectsGain,
    musicGain
  }
}

export function updateAudioSettings(manager: SoundManager, settings: Partial<AudioSettings>): void {
  Object.assign(manager.settings, settings)
  
  // Update gain nodes
  if (manager.masterGain) {
    manager.masterGain.gain.value = manager.settings.muteAll ? 0 : manager.settings.masterVolume
  }
  
  if (manager.soundEffectsGain) {
    manager.soundEffectsGain.gain.value = manager.settings.soundEffectsVolume
  }
  
  if (manager.musicGain) {
    manager.musicGain.gain.value = manager.settings.musicVolume
  }
}

// Sound Loading and Caching
export function loadSound(manager: SoundManager, id: string, url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url)
    audio.preload = 'auto'
    
    const handleLoad = () => {
      manager.sounds.set(id, audio)
      audio.removeEventListener('canplaythrough', handleLoad)
      audio.removeEventListener('error', handleError)
      resolve(audio)
    }
    
    const handleError = () => {
      audio.removeEventListener('canplaythrough', handleLoad)
      audio.removeEventListener('error', handleError)
      reject(new Error(`Failed to load sound: ${url}`))
    }
    
    audio.addEventListener('canplaythrough', handleLoad)
    audio.addEventListener('error', handleError)
    
    audio.load()
  })
}

export function preloadSounds(manager: SoundManager, sounds: SoundEffect[]): Promise<void[]> {
  const promises = sounds.map(sound => loadSound(manager, sound.id, sound.url))
  return Promise.all(promises).then(() => [])
}

// Sound Playback
export function playSound(
  manager: SoundManager,
  soundId: string,
  options: {
    volume?: number
    loop?: boolean
    rate?: number
    spatial?: { x: number; y: number; listenerX: number; listenerY: number }
  } = {}
): HTMLAudioElement | null {
  if (manager.settings.muteAll) return null
  
  const audio = manager.sounds.get(soundId)
  if (!audio) {
    console.warn(`Sound not found: ${soundId}`)
    return null
  }
  
  // Clone audio for multiple simultaneous plays
  const audioClone = audio.cloneNode() as HTMLAudioElement
  
  // Set volume
  const volume = (options.volume ?? 1) * 
                 manager.settings.soundEffectsVolume * 
                 manager.settings.masterVolume
  audioClone.volume = Math.max(0, Math.min(1, volume))
  
  // Set loop
  audioClone.loop = options.loop ?? false
  
  // Set playback rate for pitch effects
  if (options.rate) {
    audioClone.playbackRate = Math.max(0.25, Math.min(4, options.rate))
  }
  
  // Spatial audio (simple distance-based volume)
  if (options.spatial && manager.settings.spatialAudio) {
    const distance = Math.sqrt(
      Math.pow(options.spatial.x - options.spatial.listenerX, 2) +
      Math.pow(options.spatial.y - options.spatial.listenerY, 2)
    )
    
    // Reduce volume based on distance (max distance of 10 units)
    const spatialVolume = Math.max(0.1, 1 - (distance / 10))
    audioClone.volume *= spatialVolume
  }
  
  // Clean up after playing
  audioClone.addEventListener('ended', () => {
    if (!audioClone.loop) {
      audioClone.remove()
    }
  })
  
  audioClone.play().catch(error => {
    console.warn(`Failed to play sound ${soundId}:`, error)
  })
  
  return audioClone
}

export function stopSound(manager: SoundManager, soundId: string): void {
  const audio = manager.sounds.get(soundId)
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
}

export function stopAllSounds(manager: SoundManager): void {
  manager.sounds.forEach(audio => {
    audio.pause()
    audio.currentTime = 0
  })
}

// Music Management
export interface MusicManager {
  currentTrack: HTMLAudioElement | null
  playlist: string[]
  currentIndex: number
  isPlaying: boolean
  fadeTimer: NodeJS.Timeout | null
}

export function createMusicManager(): MusicManager {
  return {
    currentTrack: null,
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    fadeTimer: null
  }
}

export function playMusic(
  soundManager: SoundManager,
  musicManager: MusicManager,
  trackId: string,
  fadeIn: boolean = true
): void {
  // Stop current track
  if (musicManager.currentTrack) {
    if (fadeIn) {
      fadeOutMusic(soundManager, musicManager, () => {
        startNewTrack(soundManager, musicManager, trackId, fadeIn)
      })
    } else {
      musicManager.currentTrack.pause()
      startNewTrack(soundManager, musicManager, trackId, fadeIn)
    }
  } else {
    startNewTrack(soundManager, musicManager, trackId, fadeIn)
  }
}

function startNewTrack(
  soundManager: SoundManager,
  musicManager: MusicManager,
  trackId: string,
  fadeIn: boolean
): void {
  const audio = soundManager.sounds.get(trackId)
  if (!audio) {
    console.warn(`Music track not found: ${trackId}`)
    return
  }
  
  musicManager.currentTrack = audio.cloneNode() as HTMLAudioElement
  musicManager.currentTrack.loop = true
  musicManager.currentTrack.volume = fadeIn ? 0 : soundManager.settings.musicVolume * soundManager.settings.masterVolume
  
  musicManager.currentTrack.play().then(() => {
    musicManager.isPlaying = true
    
    if (fadeIn) {
      fadeInMusic(soundManager, musicManager)
    }
  }).catch(error => {
    console.warn(`Failed to play music ${trackId}:`, error)
  })
}

export function fadeInMusic(soundManager: SoundManager, musicManager: MusicManager): void {
  if (!musicManager.currentTrack || musicManager.fadeTimer) return
  
  const targetVolume = soundManager.settings.musicVolume * soundManager.settings.masterVolume
  const fadeStep = targetVolume / 20 // 20 steps
  
  musicManager.fadeTimer = setInterval(() => {
    if (musicManager.currentTrack) {
      musicManager.currentTrack.volume = Math.min(
        musicManager.currentTrack.volume + fadeStep,
        targetVolume
      )
      
      if (musicManager.currentTrack.volume >= targetVolume) {
        clearInterval(musicManager.fadeTimer!)
        musicManager.fadeTimer = null
      }
    }
  }, 50)
}

export function fadeOutMusic(
  soundManager: SoundManager,
  musicManager: MusicManager,
  onComplete?: () => void
): void {
  if (!musicManager.currentTrack || musicManager.fadeTimer) return
  
  const fadeStep = musicManager.currentTrack.volume / 20 // 20 steps
  
  musicManager.fadeTimer = setInterval(() => {
    if (musicManager.currentTrack) {
      musicManager.currentTrack.volume = Math.max(
        musicManager.currentTrack.volume - fadeStep,
        0
      )
      
      if (musicManager.currentTrack.volume <= 0) {
        musicManager.currentTrack.pause()
        musicManager.currentTrack = null
        musicManager.isPlaying = false
        
        clearInterval(musicManager.fadeTimer!)
        musicManager.fadeTimer = null
        
        if (onComplete) onComplete()
      }
    }
  }, 50)
}

export function stopMusic(musicManager: MusicManager): void {
  if (musicManager.currentTrack) {
    musicManager.currentTrack.pause()
    musicManager.currentTrack = null
    musicManager.isPlaying = false
  }
  
  if (musicManager.fadeTimer) {
    clearInterval(musicManager.fadeTimer)
    musicManager.fadeTimer = null
  }
}

// 8-bit Audio Generation
export function generate8BitTone(
  frequency: number,
  duration: number,
  waveform: 'square' | 'triangle' | 'sawtooth' | 'sine' = 'square'
): AudioBuffer | null {
  const ctx = getAudioContext()
  if (!ctx) return null
  
  const sampleRate = ctx.sampleRate
  const frameCount = sampleRate * duration
  const buffer = ctx.createBuffer(1, frameCount, sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < frameCount; i++) {
    const t = i / sampleRate
    const angle = 2 * Math.PI * frequency * t
    
    switch (waveform) {
      case 'square':
        data[i] = Math.sin(angle) > 0 ? 0.3 : -0.3
        break
      case 'triangle':
        data[i] = (2 / Math.PI) * Math.asin(Math.sin(angle)) * 0.3
        break
      case 'sawtooth':
        data[i] = ((2 / Math.PI) * (frequency * Math.PI * (t % (1 / frequency)) - Math.PI / 2)) * 0.3
        break
      case 'sine':
        data[i] = Math.sin(angle) * 0.3
        break
    }
  }
  
  return buffer
}

export function play8BitTone(
  frequency: number,
  duration: number,
  waveform: 'square' | 'triangle' | 'sawtooth' | 'sine' = 'square'
): void {
  const ctx = getAudioContext()
  if (!ctx) return
  
  const buffer = generate8BitTone(frequency, duration, waveform)
  if (!buffer) return
  
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start()
}

// Game-Specific Sound Effects
export function playBombPlaceSound(manager: SoundManager, spatial?: { x: number; y: number; listenerX: number; listenerY: number }): void {
  playSound(manager, 'bomb_place', { volume: 0.6, spatial })
}

export function playBombExplodeSound(manager: SoundManager, spatial?: { x: number; y: number; listenerX: number; listenerY: number }): void {
  playSound(manager, 'bomb_explode', { volume: 0.8, spatial })
}

export function playPlayerMoveSound(manager: SoundManager, spatial?: { x: number; y: number; listenerX: number; listenerY: number }): void {
  playSound(manager, 'player_move', { volume: 0.3, spatial, rate: 0.8 + Math.random() * 0.4 })
}

export function playPowerUpSound(manager: SoundManager, powerUpType: string): void {
  const pitchMap: Record<string, number> = {
    bomb_count: 1.2,
    bomb_power: 1.0,
    speed_boost: 1.4,
    health: 0.8,
    max_health: 0.6
  }
  
  playSound(manager, 'powerup_collect', { 
    volume: 0.7, 
    rate: pitchMap[powerUpType] || 1.0 
  })
}

export function playPlayerDeathSound(manager: SoundManager): void {
  playSound(manager, 'player_death', { volume: 0.8 })
}

export function playMonsterDeathSound(manager: SoundManager, spatial?: { x: number; y: number; listenerX: number; listenerY: number }): void {
  playSound(manager, 'monster_death', { volume: 0.6, spatial })
}

export function playBossAttackSound(manager: SoundManager, bossType: string): void {
  playSound(manager, `boss_${bossType}_attack`, { volume: 0.9 })
}

export function playVictorySound(manager: SoundManager): void {
  playSound(manager, 'victory', { volume: 1.0 })
}

export function playDefeatSound(manager: SoundManager): void {
  playSound(manager, 'defeat', { volume: 0.8 })
}

export function playMenuSound(manager: SoundManager): void {
  playSound(manager, 'menu_select', { volume: 0.5 })
}

export function playErrorSound(manager: SoundManager): void {
  // Generate error beep programmatically
  play8BitTone(200, 0.2, 'square')
}

export function playSuccessSound(manager: SoundManager): void {
  // Generate success chime programmatically
  play8BitTone(800, 0.1, 'triangle')
  setTimeout(() => play8BitTone(1000, 0.1, 'triangle'), 100)
}

// Audio Settings Persistence
export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem('bomberman_audio_settings', JSON.stringify(settings))
  } catch (error) {
    console.warn('Failed to save audio settings:', error)
  }
}

export function loadAudioSettings(): AudioSettings | null {
  try {
    const saved = localStorage.getItem('bomberman_audio_settings')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('Failed to load audio settings:', error)
    return null
  }
}

// Browser Compatibility
export function isAudioSupported(): boolean {
  return !!(window.AudioContext || window.webkitAudioContext)
}

export function canAutoplay(): Promise<boolean> {
  const audio = new Audio()
  const canPlay = audio.play()
  
  if (canPlay instanceof Promise) {
    return canPlay.then(
      () => {
        audio.pause()
        return true
      },
      () => false
    )
  }
  
  return Promise.resolve(true)
}

// Initialize audio on user interaction
let audioInitialized = false

export function initializeAudio(): Promise<void> {
  if (audioInitialized) return Promise.resolve()
  
  return resumeAudioContext().then(() => {
    audioInitialized = true
  })
}

export function requiresUserGesture(): boolean {
  return !audioInitialized
}