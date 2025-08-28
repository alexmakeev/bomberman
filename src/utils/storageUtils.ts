/**
 * Storage Utility Functions
 * Local storage, session storage, and IndexedDB helpers for game persistence
 * 
 * @see docs/front-end/01-architecture-overview.md - Data persistence layer
 */

import type { AudioSettings, GameSettings, GameStatistics, Player, UISettings } from '../types/game';

// Storage Keys
const STORAGE_KEYS = {
  PLAYER_PROFILE: 'bomberman_player_profile',
  GAME_SETTINGS: 'bomberman_game_settings',
  UI_SETTINGS: 'bomberman_ui_settings',
  AUDIO_SETTINGS: 'bomberman_audio_settings',
  GAME_STATISTICS: 'bomberman_statistics',
  INPUT_CONFIG: 'bomberman_input_config',
  RECENT_ROOMS: 'bomberman_recent_rooms',
  SAVED_GAMES: 'bomberman_saved_games',
  ACHIEVEMENTS: 'bomberman_achievements',
  PREFERENCES: 'bomberman_preferences',
} as const;

// Error Handling
export class StorageError extends Error {
  constructor(message: string, public operation: string, public key?: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// Storage Availability Checks
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function isSessionStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function isIndexedDBAvailable(): boolean {
  return 'indexedDB' in window && indexedDB !== null;
}

// Generic Storage Operations
export function setStorageItem<T>(key: string, value: T, useSession: boolean = false): void {
  try {
    const storage = useSession ? sessionStorage : localStorage;
    const serialized = JSON.stringify({
      value,
      timestamp: Date.now(),
      version: 1,
    });
    storage.setItem(key, serialized);
  } catch (error) {
    throw new StorageError(
      `Failed to save ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'set',
      key,
    );
  }
}

export function getStorageItem<T>(key: string, defaultValue: T, useSession: boolean = false): T {
  try {
    const storage = useSession ? sessionStorage : localStorage;
    const item = storage.getItem(key);
    
    if (!item) {return defaultValue;}
    
    const parsed = JSON.parse(item);
    
    // Validate structure
    if (!parsed || typeof parsed !== 'object' || !parsed.hasOwnProperty('value')) {
      return defaultValue;
    }
    
    return parsed.value as T;
  } catch (error) {
    console.warn(`Failed to load ${key}:`, error);
    return defaultValue;
  }
}

export function removeStorageItem(key: string, useSession: boolean = false): void {
  try {
    const storage = useSession ? sessionStorage : localStorage;
    storage.removeItem(key);
  } catch (error) {
    throw new StorageError(
      `Failed to remove ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'remove',
      key,
    );
  }
}

export function clearStorage(useSession: boolean = false): void {
  try {
    const storage = useSession ? sessionStorage : localStorage;
    storage.clear();
  } catch (error) {
    throw new StorageError(
      `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'clear',
    );
  }
}

// Player Profile Management
export interface PlayerProfile {
  id: string
  name: string
  preferredColor: string
  gamesPlayed: number
  totalScore: number
  bestScore: number
  achievements: string[]
  createdAt: number
  lastActive: number
}

export function getDefaultPlayerProfile(): PlayerProfile {
  return {
    id: generatePlayerId(),
    name: '',
    preferredColor: 'blue',
    gamesPlayed: 0,
    totalScore: 0,
    bestScore: 0,
    achievements: [],
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
}

export function savePlayerProfile(profile: PlayerProfile): void {
  profile.lastActive = Date.now();
  setStorageItem(STORAGE_KEYS.PLAYER_PROFILE, profile);
}

export function loadPlayerProfile(): PlayerProfile {
  return getStorageItem(STORAGE_KEYS.PLAYER_PROFILE, getDefaultPlayerProfile());
}

export function updatePlayerStats(stats: Partial<PlayerProfile>): void {
  const profile = loadPlayerProfile();
  Object.assign(profile, stats, { lastActive: Date.now() });
  savePlayerProfile(profile);
}

// Game Settings
export function getDefaultGameSettings(): GameSettings {
  return {
    maxHealth: 100,
    startingBombs: 1,
    startingPower: 2,
    startingSpeed: 1,
    respawnTime: 10,
    friendlyFire: false,
    powerUpSpawnRate: 0.3,
    monsterSpawnRate: 0.2,
  };
}

export function saveGameSettings(settings: GameSettings): void {
  setStorageItem(STORAGE_KEYS.GAME_SETTINGS, settings);
}

export function loadGameSettings(): GameSettings {
  return getStorageItem(STORAGE_KEYS.GAME_SETTINGS, getDefaultGameSettings());
}

// UI Settings
export function getDefaultUISettings(): UISettings {
  return {
    showMinimap: true,
    showFPS: false,
    showDebugInfo: false,
    soundVolume: 0.7,
    musicVolume: 0.5,
    hapticFeedback: true,
    touchControlsEnabled: true,
    theme: 'auto',
  };
}

export function saveUISettings(settings: UISettings): void {
  setStorageItem(STORAGE_KEYS.UI_SETTINGS, settings);
}

export function loadUISettings(): UISettings {
  return getStorageItem(STORAGE_KEYS.UI_SETTINGS, getDefaultUISettings());
}

// Audio Settings
export function getDefaultAudioSettings(): AudioSettings {
  return {
    masterVolume: 0.7,
    soundEffectsVolume: 0.8,
    musicVolume: 0.5,
    muteAll: false,
    spatialAudio: false,
  };
}

export function saveAudioSettings(settings: AudioSettings): void {
  setStorageItem(STORAGE_KEYS.AUDIO_SETTINGS, settings);
}

export function loadAudioSettings(): AudioSettings {
  return getStorageItem(STORAGE_KEYS.AUDIO_SETTINGS, getDefaultAudioSettings());
}

// Game Statistics
export function getDefaultGameStatistics(): GameStatistics {
  return {
    playTime: 0,
    totalPlayers: 0,
    totalBombs: 0,
    totalScore: 0,
    blocksDestroyed: 0,
    monstersKilled: 0,
    powerUpsCollected: 0,
    deaths: 0,
    assists: 0,
  };
}

export function saveGameStatistics(stats: GameStatistics): void {
  setStorageItem(STORAGE_KEYS.GAME_STATISTICS, stats);
}

export function loadGameStatistics(): GameStatistics {
  return getStorageItem(STORAGE_KEYS.GAME_STATISTICS, getDefaultGameStatistics());
}

export function updateGameStatistics(updates: Partial<GameStatistics>): void {
  const stats = loadGameStatistics();
  Object.assign(stats, updates);
  saveGameStatistics(stats);
}

// Recent Rooms
export interface RecentRoom {
  id: string
  name: string
  lastJoined: number
  playerCount: number
  gameMode: 'cooperative' | 'versus'
}

export function addRecentRoom(room: RecentRoom): void {
  const recent = getStorageItem<RecentRoom[]>(STORAGE_KEYS.RECENT_ROOMS, []);
  
  // Remove existing entry for this room
  const filtered = recent.filter(r => r.id !== room.id);
  
  // Add to front
  filtered.unshift(room);
  
  // Keep only last 10
  const trimmed = filtered.slice(0, 10);
  
  setStorageItem(STORAGE_KEYS.RECENT_ROOMS, trimmed);
}

export function getRecentRooms(): RecentRoom[] {
  return getStorageItem<RecentRoom[]>(STORAGE_KEYS.RECENT_ROOMS, []);
}

export function removeRecentRoom(roomId: string): void {
  const recent = getRecentRooms();
  const filtered = recent.filter(r => r.id !== roomId);
  setStorageItem(STORAGE_KEYS.RECENT_ROOMS, filtered);
}

// Saved Games (for offline play)
export interface SavedGame {
  id: string
  name: string
  gameState: any
  timestamp: number
  level: number
  players: Player[]
}

export function saveGame(game: SavedGame): void {
  const saved = getStorageItem<SavedGame[]>(STORAGE_KEYS.SAVED_GAMES, []);
  
  // Remove existing save with same ID
  const filtered = saved.filter(g => g.id !== game.id);
  
  // Add new save
  filtered.unshift(game);
  
  // Keep only last 5 saves
  const trimmed = filtered.slice(0, 5);
  
  setStorageItem(STORAGE_KEYS.SAVED_GAMES, trimmed);
}

export function loadSavedGames(): SavedGame[] {
  return getStorageItem<SavedGame[]>(STORAGE_KEYS.SAVED_GAMES, []);
}

export function deleteSavedGame(gameId: string): void {
  const saved = loadSavedGames();
  const filtered = saved.filter(g => g.id !== gameId);
  setStorageItem(STORAGE_KEYS.SAVED_GAMES, filtered);
}

// Achievements
export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt?: number
  progress?: number
  maxProgress?: number
}

export function saveAchievements(achievements: Achievement[]): void {
  setStorageItem(STORAGE_KEYS.ACHIEVEMENTS, achievements);
}

export function loadAchievements(): Achievement[] {
  return getStorageItem<Achievement[]>(STORAGE_KEYS.ACHIEVEMENTS, []);
}

export function unlockAchievement(achievementId: string): void {
  const achievements = loadAchievements();
  const achievement = achievements.find(a => a.id === achievementId);
  
  if (achievement && !achievement.unlockedAt) {
    achievement.unlockedAt = Date.now();
    saveAchievements(achievements);
  }
}

export function updateAchievementProgress(achievementId: string, progress: number): void {
  const achievements = loadAchievements();
  const achievement = achievements.find(a => a.id === achievementId);
  
  if (achievement) {
    achievement.progress = progress;
    
    // Auto-unlock if progress reaches max
    if (achievement.maxProgress && progress >= achievement.maxProgress && !achievement.unlockedAt) {
      achievement.unlockedAt = Date.now();
    }
    
    saveAchievements(achievements);
  }
}

// Preferences and Configuration
export interface UserPreferences {
  language: string
  timezone: string
  notifications: boolean
  analytics: boolean
  crashReports: boolean
  betaFeatures: boolean
  colorScheme: 'light' | 'dark' | 'auto'
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
}

export function getDefaultPreferences(): UserPreferences {
  return {
    language: navigator.language || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifications: true,
    analytics: true,
    crashReports: true,
    betaFeatures: false,
    colorScheme: 'auto',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    fontSize: 'medium',
  };
}

export function savePreferences(preferences: UserPreferences): void {
  setStorageItem(STORAGE_KEYS.PREFERENCES, preferences);
}

export function loadPreferences(): UserPreferences {
  return getStorageItem(STORAGE_KEYS.PREFERENCES, getDefaultPreferences());
}

// Storage Cleanup and Maintenance
export function cleanupOldData(maxAge: number = 30 * 24 * 60 * 60 * 1000): void { // 30 days
  const cutoffTime = Date.now() - maxAge;
  
  try {
    // Clean up recent rooms
    const recentRooms = getRecentRooms();
    const validRooms = recentRooms.filter(room => room.lastJoined > cutoffTime);
    if (validRooms.length !== recentRooms.length) {
      setStorageItem(STORAGE_KEYS.RECENT_ROOMS, validRooms);
    }
    
    // Clean up saved games
    const savedGames = loadSavedGames();
    const validGames = savedGames.filter(game => game.timestamp > cutoffTime);
    if (validGames.length !== savedGames.length) {
      setStorageItem(STORAGE_KEYS.SAVED_GAMES, validGames);
    }
  } catch (error) {
    console.warn('Failed to cleanup old data:', error);
  }
}

export function getStorageUsage(): { used: number; quota: number } {
  if (!isLocalStorageAvailable()) {
    return { used: 0, quota: 0 };
  }
  
  let used = 0;
  
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
  } catch (error) {
    console.warn('Failed to calculate storage usage:', error);
  }
  
  // Estimate quota (usually 5-10MB for localStorage)
  const quota = 10 * 1024 * 1024; // 10MB estimate
  
  return { used, quota };
}

export function exportUserData(): string {
  const data = {
    playerProfile: loadPlayerProfile(),
    gameSettings: loadGameSettings(),
    uiSettings: loadUISettings(),
    audioSettings: loadAudioSettings(),
    gameStatistics: loadGameStatistics(),
    recentRooms: getRecentRooms(),
    achievements: loadAchievements(),
    preferences: loadPreferences(),
    exportedAt: Date.now(),
    version: 1,
  };
  
  return JSON.stringify(data, null, 2);
}

export function importUserData(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data || typeof data !== 'object' || !data.version) {
      throw new Error('Invalid data format');
    }
    
    // Import each section
    if (data.playerProfile) {savePlayerProfile(data.playerProfile);}
    if (data.gameSettings) {saveGameSettings(data.gameSettings);}
    if (data.uiSettings) {saveUISettings(data.uiSettings);}
    if (data.audioSettings) {saveAudioSettings(data.audioSettings);}
    if (data.gameStatistics) {saveGameStatistics(data.gameStatistics);}
    if (data.recentRooms) {setStorageItem(STORAGE_KEYS.RECENT_ROOMS, data.recentRooms);}
    if (data.achievements) {saveAchievements(data.achievements);}
    if (data.preferences) {savePreferences(data.preferences);}
    
  } catch (error) {
    throw new StorageError(
      `Failed to import user data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'import',
    );
  }
}

// Utility Functions
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function isValidPlayerName(name: string): boolean {
  return name.length >= 2 && name.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(name);
}

// Storage Migration
export function migrateStorageData(): void {
  try {
    // Check if migration is needed
    const migrationKey = 'bomberman_storage_version';
    const currentVersion = getStorageItem(migrationKey, 0);
    const targetVersion = 1;
    
    if (currentVersion >= targetVersion) {return;}
    
    // Perform migrations
    if (currentVersion < 1) {
      // Migration from version 0 to 1
      // Add any necessary data transformations here
    }
    
    // Update version
    setStorageItem(migrationKey, targetVersion);
  } catch (error) {
    console.warn('Storage migration failed:', error);
  }
}