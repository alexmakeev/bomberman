/**
 * Application Initialization
 * Sets up all frontend services, stores, and WebSocket connections
 * 
 * @see src/utils/websocketIntegration.ts - WebSocket integration layer
 * @see src/stores/ - Pinia stores
 */

import { initializeWebSocketIntegration } from './websocketIntegration';
import { usePlayerStore } from '../stores/playerStore';
import { useGameStore } from '../stores/gameStore';

export class AppInitializer {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    console.log('🚀 Initializing Bomberman app...');

    try {
      // 1. Initialize stores (they auto-initialize when first accessed)
      const playerStore = usePlayerStore();
      const gameStore = useGameStore();
      console.log('✅ Stores initialized');

      // 2. Set up WebSocket integration
      await initializeWebSocketIntegration();
      console.log('✅ WebSocket integration ready');

      // 3. Set up player data if needed
      this.initializePlayerData();
      console.log('✅ Player data initialized');

      this.isInitialized = true;
      console.log('🎮 Bomberman app ready!');

    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      throw error;
    }
  }

  private initializePlayerData(): void {
    const playerStore = usePlayerStore();
    
    // If no player data exists, create default
    if (!playerStore.id) {
      // Get player name from localStorage or generate default
      const savedName = localStorage.getItem('bomberman_player_name');
      const playerName = savedName || `Player_${Math.random().toString(36).substring(2, 8)}`;
      
      // Create default player
      playerStore.createPlayer({
        id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: playerName,
        color: 'red',
        position: { x: 64, y: 64 }, // Start at top-left corner
        health: 100,
        maxHealth: 100,
        bombCount: 1,
        maxBombs: 1,
        bombPower: 1,
        speed: 100,
        isAlive: true,
        isMoving: false,
        direction: null,
        score: 0,
        powerUps: [],
        respawnTimer: 0,
        lastMoveTime: 0,
      });

      // Save player name for next time
      if (!savedName) {
        localStorage.setItem('bomberman_player_name', playerName);
      }
    }
  }

  // Quick game setup methods
  async quickJoinRoom(roomId: string): Promise<void> {
    await this.initialize();
    
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    
    try {
      await gameStore.joinRoom(roomId, {
        id: playerStore.id,
        name: playerStore.name,
        color: playerStore.color,
      });
      console.log(`Joined room: ${roomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  async createAndJoinRoom(roomConfig: any = {}): Promise<string> {
    await this.initialize();
    
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    
    try {
      await gameStore.createRoom({
        maxPlayers: 4,
        gameMode: 'cooperative',
        difficulty: 'normal',
        ...roomConfig,
      });

      // Add self as first player
      gameStore.addPlayer({
        id: playerStore.id,
        name: playerStore.name,
        color: playerStore.color,
        position: playerStore.position,
        health: playerStore.health,
        maxHealth: playerStore.maxHealth,
        bombCount: playerStore.bombCount,
        maxBombs: playerStore.maxBombs,
        bombPower: playerStore.bombPower,
        speed: playerStore.speed,
        isAlive: playerStore.isAlive,
        isMoving: playerStore.isMoving,
        direction: playerStore.direction,
        score: playerStore.score,
        powerUps: [...playerStore.powerUps],
        respawnTimer: playerStore.respawnTimer,
      });

      console.log(`Created and joined room: ${gameStore.roomId}`);
      return gameStore.roomId;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  // Error recovery
  async reconnect(): Promise<void> {
    console.log('🔄 Attempting to reconnect...');
    try {
      await initializeWebSocketIntegration();
      console.log('✅ Reconnected successfully');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      throw error;
    }
  }

  // Cleanup
  shutdown(): void {
    // TODO: Clean up WebSocket connections, timers, etc.
    this.isInitialized = false;
    console.log('🛑 App shutdown');
  }
}

// Global app initializer
let appInitializer: AppInitializer | null = null;

export function getAppInitializer(): AppInitializer {
  if (!appInitializer) {
    appInitializer = new AppInitializer();
  }
  return appInitializer;
}

// Convenience functions
export async function initializeApp(): Promise<void> {
  const initializer = getAppInitializer();
  await initializer.initialize();
}

export async function quickJoinGame(roomId: string): Promise<void> {
  const initializer = getAppInitializer();
  await initializer.quickJoinRoom(roomId);
}

export async function createNewGame(config?: any): Promise<string> {
  const initializer = getAppInitializer();
  return await initializer.createAndJoinRoom(config);
}