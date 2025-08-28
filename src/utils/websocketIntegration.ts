/**
 * WebSocket Integration Layer
 * Connects Pinia stores to WebSocket events for real-time game synchronization
 * 
 * @see src/stores/playerStore.ts - Player state management
 * @see src/stores/gameStore.ts - Game state management
 * @see src/utils/websocketService.ts - WebSocket service
 */

import { getWebSocketService } from './websocketService';
import { usePlayerStore } from '../stores/playerStore';
import { useGameStore } from '../stores/gameStore';
import type { WebSocketMessage } from '../types/websocket';

export class WebSocketIntegration {
  private readonly ws = getWebSocketService();
  private readonly playerStore = usePlayerStore();
  private readonly gameStore = useGameStore();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    // Connect to WebSocket
    await this.ws.connect();

    // Set up event listeners
    this.setupPlayerEventListeners();
    this.setupGameEventListeners();
    this.setupRoomEventListeners();
    this.setupConnectionEventListeners();

    this.isInitialized = true;
    console.log('WebSocket integration initialized');
  }

  private setupPlayerEventListeners(): void {
    // Player movement events
    this.ws.on('player_move', (data: any) => {
      this.gameStore.updatePlayer(data.playerId, {
        position: data.position,
        direction: data.direction,
        isMoving: true,
        lastMoveTime: Date.now(),
      });
    });

    this.ws.on('player_stop', (data: any) => {
      this.gameStore.updatePlayer(data.playerId, {
        direction: null,
        isMoving: false,
      });
    });

    // Player actions
    this.ws.on('player_bomb', (data: any) => {
      this.gameStore.addBomb({
        id: data.bombId,
        position: data.position,
        ownerId: data.playerId,
        timer: 3000, // 3 seconds
        power: data.power || 1,
        createdAt: Date.now(),
      });
    });

    this.ws.on('player_damage', (data: any) => {
      if (data.playerId === this.playerStore.id) {
        this.playerStore.takeDamage(data.damage);
      } else {
        this.gameStore.updatePlayer(data.playerId, {
          health: data.newHealth,
        });
      }
    });

    this.ws.on('player_death', (data: any) => {
      if (data.playerId === this.playerStore.id) {
        this.playerStore.die();
      } else {
        this.gameStore.updatePlayer(data.playerId, {
          isAlive: false,
          health: 0,
        });
      }
    });

    this.ws.on('player_respawn', (data: any) => {
      this.gameStore.updatePlayer(data.playerId, {
        isAlive: true,
        health: data.health || 100,
        position: data.position,
      });
    });

    // Power-up events
    this.ws.on('powerup_collected', (data: any) => {
      if (data.playerId === this.playerStore.id) {
        this.playerStore.applyPowerUp(data.powerUpType, data.duration);
      }
      // Remove power-up from game
      this.gameStore.removePowerUp(data.powerUpId);
    });
  }

  private setupGameEventListeners(): void {
    // Game state changes
    this.ws.on('game_state', (data: any) => {
      this.gameStore.gameState = data.state;
      if (data.timeRemaining) {
        this.gameStore.timeRemaining = data.timeRemaining;
      }
    });

    // Bomb events
    this.ws.on('bomb_exploded', (data: any) => {
      this.gameStore.explodeBomb(data.bombId, data.bomb);
      
      // Restore bomb count for owner
      if (data.bomb.ownerId === this.playerStore.id) {
        this.playerStore.onBombExploded(data.bombId);
      }
    });

    // Entity updates
    this.ws.on('monster_spawned', (data: any) => {
      this.gameStore.addMonster(data.monster);
    });

    this.ws.on('monster_killed', (data: any) => {
      this.gameStore.removeMonster(data.monsterId);
      
      // Award score if player killed it
      if (data.killedBy === this.playerStore.id) {
        this.playerStore.addScore(data.scoreReward, 1, 'monster_kill');
      }
    });

    this.ws.on('boss_spawned', (data: any) => {
      this.gameStore.addBoss(data.boss);
    });

    this.ws.on('boss_defeated', (data: any) => {
      this.gameStore.boss = null;
      
      // Check victory condition
      if (data.defeatedBy === this.playerStore.id) {
        this.playerStore.addBonusScore(1000, 'boss_defeat');
        this.gameStore.endGame('Victory - Boss Defeated!');
      }
    });

    // Power-up spawns
    this.ws.on('powerup_spawned', (data: any) => {
      this.gameStore.addPowerUp(data.powerUp);
    });
  }

  private setupRoomEventListeners(): void {
    // Room events
    this.ws.on('room_created', (data: any) => {
      console.log('Room created:', data.roomId);
    });

    this.ws.on('player_joined', (data: any) => {
      this.gameStore.addPlayer(data.player);
      console.log(`Player ${data.player.name} joined the room`);
    });

    this.ws.on('player_left', (data: any) => {
      this.gameStore.removePlayer(data.playerId);
      console.log('Player left the room');
    });

    this.ws.on('room_update', (data: any) => {
      // Update room settings
      if (data.maxPlayers) {this.gameStore.maxPlayers = data.maxPlayers;}
      if (data.gameMode) {this.gameStore.gameMode = data.gameMode;}
      if (data.difficulty) {this.gameStore.difficulty = data.difficulty;}
    });

    // Error handling
    this.ws.on('room_error', (data: any) => {
      console.error('Room error:', data.message);
    });

    this.ws.on('game_error', (data: any) => {
      console.error('Game error:', data.message);
    });
  }

  private setupConnectionEventListeners(): void {
    this.ws.on('connect', () => {
      console.log('Connected to game server');
    });

    this.ws.on('disconnect', (data: any) => {
      console.log('Disconnected from game server:', data.reason);
      // Could show reconnection UI here
    });

    this.ws.on('error', (data: any) => {
      console.error('WebSocket error:', data.error);
    });

    // Handle reconnection
    this.ws.on('connect', () => {
      if (this.playerStore.actionQueue.length > 0) {
        this.playerStore.onWebSocketReconnect();
      }
    });

    // Sync events
    this.ws.on('sync_request', () => {
      // Server requesting full state sync
      this.sendPlayerSync();
    });

    this.ws.on('full_sync', (data: any) => {
      // Server sending full game state
      this.handleFullSync(data);
    });
  }

  private sendPlayerSync(): void {
    if (this.playerStore.id) {
      this.ws.send({
        messageType: 'PLAYER_SYNC' as any,
        type: 'player_sync',
        data: {
          playerId: this.playerStore.id,
          position: this.playerStore.position,
          health: this.playerStore.health,
          isAlive: this.playerStore.isAlive,
          score: this.playerStore.score,
          powerUps: this.playerStore.powerUps,
          bombCount: this.playerStore.bombCount,
        },
        timestamp: Date.now(),
      });
    }
  }

  private handleFullSync(data: any): void {
    // Update player state
    if (data.player) {
      this.playerStore.syncWithServer(data.player);
    }

    // Update game state
    if (data.gameState) {
      this.gameStore.gameState = data.gameState.state;
      this.gameStore.timeRemaining = data.gameState.timeRemaining;
      this.gameStore.currentLevel = data.gameState.level;
    }

    // Update entities
    if (data.players) {
      this.gameStore.players.clear();
      data.players.forEach((player: any) => {
        this.gameStore.addPlayer(player);
      });
    }

    if (data.bombs) {
      this.gameStore.bombs.clear();
      data.bombs.forEach((bomb: any) => {
        this.gameStore.addBomb(bomb);
      });
    }

    if (data.monsters) {
      this.gameStore.monsters.clear();
      data.monsters.forEach((monster: any) => {
        this.gameStore.addMonster(monster);
      });
    }

    if (data.powerUps) {
      this.gameStore.powerUps.clear();
      data.powerUps.forEach((powerUp: any) => {
        this.gameStore.addPowerUp(powerUp);
      });
    }

    if (data.maze) {
      this.gameStore.maze = data.maze;
    }

    console.log('Full game state synchronized');
  }

  // Public methods for manual event triggering (useful for testing)
  triggerPlayerMove(playerId: string, direction: string, position: any): void {
    this.ws.emit('player_move', { playerId, direction, position });
  }

  triggerGameStateChange(state: string, timeRemaining?: number): void {
    this.ws.emit('game_state', { state, timeRemaining });
  }

  disconnect(): void {
    this.ws.disconnect();
    this.isInitialized = false;
  }
}

// Global instance
let wsIntegration: WebSocketIntegration | null = null;

export function getWebSocketIntegration(): WebSocketIntegration {
  if (!wsIntegration) {
    wsIntegration = new WebSocketIntegration();
  }
  return wsIntegration;
}

export async function initializeWebSocketIntegration(): Promise<void> {
  const integration = getWebSocketIntegration();
  await integration.initialize();
}