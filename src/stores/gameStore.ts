/**
 * Game Store - Pinia Store for Game State Management
 * Handles game rooms, multiplayer coordination, entities, and game flow
 * 
 * @see docs/front-end/03-state-management.md - Store architecture
 * @see tests/frontend/stores/gameStore.test.ts - Comprehensive tests
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  Bomb,
  Boss,
  Explosion,
  GameRoom,
  GameSettings,
  GameState,
  GameStatistics,
  Maze,
  MazeCell,
  Monster,
  Player,
  Position,
  PowerUp,
  WebSocketMessage,
} from '../types/game';
import { getWebSocketService } from '../utils/websocketService';
import { generateId, generateRoomId } from '../utils/gameUtils';

export const useGameStore = defineStore('game', () => {
  // State - Game Room and Session
  const roomId = ref<string>('');
  const gameState = ref<GameState>('waiting');
  const currentLevel = ref<number>(1);
  const timeRemaining = ref<number>(300000); // 5 minutes in ms
  const objective = ref<string>('Find the exit');
  const gameStartTime = ref<number>(0);
  const gameResult = ref<string | null>(null);
  
  // State - Room Settings
  const maxPlayers = ref<number>(4);
  const gameMode = ref<string>('cooperative');
  const difficulty = ref<string>('normal');
  
  // State - Entities (using Maps for O(1) lookup)
  const players = ref<Map<string, Player>>(new Map());
  const bombs = ref<Map<string, Bomb>>(new Map());
  const monsters = ref<Map<string, Monster>>(new Map());
  const powerUps = ref<Map<string, PowerUp>>(new Map());
  const explosions = ref<Map<string, Explosion>>(new Map());
  const boss = ref<Boss | null>(null);
  
  // State - Maze and Level
  const maze = ref<Maze>([]);
  
  // State - Internal Timers
  const gameTimer = ref<NodeJS.Timer | null>(null);
  const syncTimer = ref<NodeJS.Timer | null>(null);

  // Computed Properties - Game State
  const isGameActive = computed(() => 
    gameState.value === 'playing' || gameState.value === 'starting',
  );

  const playersArray = computed(() => 
    Array.from(players.value.values()),
  );

  const alivePlayers = computed(() => 
    playersArray.value.filter(player => player.isAlive),
  );

  const deadPlayers = computed(() => 
    playersArray.value.filter(player => !player.isAlive),
  );

  const activeBombs = computed(() => 
    Array.from(bombs.value.values()),
  );

  const playersByScore = computed(() => 
    [...playersArray.value].sort((a, b) => b.score - a.score),
  );

  const totalScore = computed(() => 
    playersArray.value.reduce((total, player) => total + player.score, 0),
  );

  const timeRemainingFormatted = computed(() => {
    const minutes = Math.floor(timeRemaining.value / 60000);
    const seconds = Math.floor((timeRemaining.value % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  // Actions - Room Management
  async function createRoom(roomConfig: any): Promise<void> {
    // Generate room ID
    roomId.value = generateRoomId();
    
    // Set room configuration
    maxPlayers.value = roomConfig.maxPlayers || 4;
    gameMode.value = roomConfig.gameMode || 'cooperative';
    difficulty.value = roomConfig.difficulty || 'normal';
    
    // Initialize game state
    resetGameState();
    gameState.value = 'waiting';
    
    // Initialize maze
    initializeMaze();
    
    // Connect to WebSocket and send room creation request
    const ws = getWebSocketService();
    await ws.connect();
    
    ws.send({
      messageType: 'ROOM_CREATE' as any,
      type: 'room_create',
      data: {
        roomId: roomId.value,
        config: roomConfig,
      },
      timestamp: Date.now(),
    });
    
    console.log(`Room ${roomId.value} created successfully`);
  }

  async function joinRoom(targetRoomId: string, playerData: any): Promise<void> {
    // Set room ID
    roomId.value = targetRoomId;
    
    // Connect to WebSocket
    const ws = getWebSocketService();
    await ws.connect();
    
    // Send join request
    ws.send({
      messageType: 'ROOM_JOIN' as any,
      type: 'room_join',
      data: {
        roomId: targetRoomId,
        player: playerData,
      },
      timestamp: Date.now(),
    });
    
    // Reset game state for new room
    resetGameState();
  }

  async function leaveRoom(): Promise<void> {
    if (!roomId.value) {return;}
    
    // Send leave message to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.send({
        messageType: 'ROOM_LEAVE' as any,
        type: 'room_leave',
        data: { roomId: roomId.value },
        timestamp: Date.now(),
      });
    }
    
    // Reset game state
    resetGameState();
    roomId.value = '';
    
    // Disconnect WebSocket
    ws.disconnect();
  }

  // Actions - Game Flow
  function startGame(): void {
    gameState.value = 'playing';
    gameStartTime.value = Date.now();
    timeRemaining.value = 300000; // Reset to 5 minutes
    
    // Start game timer
    startGameTimer();
    
    // Send start message to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.send({
        messageType: 'GAME_START' as any,
        type: 'game_start',
        data: { roomId: roomId.value },
        timestamp: Date.now(),
      });
    }
    
    console.log('Game started!');
  }

  function pauseGame(): void {
    if (gameState.value === 'playing') {
      gameState.value = 'paused';
      stopGameTimer();
      
      // Send pause message to server
      const ws = getWebSocketService();
      if (ws.isConnected) {
        ws.send({
          messageType: 'GAME_PAUSE' as any,
          type: 'game_pause',
          data: { roomId: roomId.value },
          timestamp: Date.now(),
        });
      }
    }
  }

  function resumeGame(): void {
    if (gameState.value === 'paused') {
      gameState.value = 'playing';
      startGameTimer();
      
      // Send resume message to server
      const ws = getWebSocketService();
      if (ws.isConnected) {
        ws.send({
          messageType: 'GAME_RESUME' as any,
          type: 'game_resume',
          data: { roomId: roomId.value },
          timestamp: Date.now(),
        });
      }
    }
  }

  function endGame(result: string): void {
    gameState.value = 'ended';
    gameResult.value = result;
    stopGameTimer();
    
    // Send end message to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.send({
        messageType: 'GAME_END' as any,
        type: 'game_end',
        data: { 
          roomId: roomId.value,
          result,
          finalScore: totalScore.value,
        },
        timestamp: Date.now(),
      });
    }
    
    console.log(`Game ended: ${result}`);
  }

  function startGameTimer(): void {
    stopGameTimer(); // Clear any existing timer
    
    gameTimer.value = setInterval(() => {
      timeRemaining.value -= 1000; // Decrease by 1 second
      
      if (timeRemaining.value <= 0) {
        endGame('Time up');
      }
    }, 1000);
  }
  
  function stopGameTimer(): void {
    if (gameTimer.value) {
      clearInterval(gameTimer.value);
      gameTimer.value = null;
    }
  }
  
  function resetGameState(): void {
    gameState.value = 'waiting';
    currentLevel.value = 1;
    timeRemaining.value = 300000;
    gameStartTime.value = 0;
    gameResult.value = null;
    players.value.clear();
    bombs.value.clear();
    monsters.value.clear();
    powerUps.value.clear();
    explosions.value.clear();
    boss.value = null;
    maze.value = [];
    stopGameTimer();
  }

  // Actions - Player Management
  function addPlayer(player: Player): void {
    if (!player.id || !player.name) {
      console.warn('Invalid player data:', player);
      return;
    }
    
    players.value.set(player.id, player);
    console.log(`Player ${player.name} added to game`);
  }

  function removePlayer(playerId: string): void {
    players.value.delete(playerId);
    
    // Clean up player-owned entities
    for (const [bombId, bomb] of bombs.value) {
      if (bomb.ownerId === playerId) {
        bombs.value.delete(bombId);
      }
    }
    
    console.log(`Player ${playerId} removed from game`);
  }

  function updatePlayer(playerId: string, updates: Partial<Player>): void {
    const player = players.value.get(playerId);
    if (!player) {return;}
    
    // Apply updates
    Object.assign(player, updates);
    players.value.set(playerId, player);
  }

  // Actions - Entity Management
  function addBomb(bomb: Bomb): void {
    // TODO: Implement bomb addition
    // Add to bombs map
    // Start bomb timer
    console.warn('addBomb not implemented');
  }

  function removeBomb(bombId: string): void {
    // TODO: Implement bomb removal
    // Remove from bombs map
    // Clean up timers
    console.warn('removeBomb not implemented');
  }

  function updateBombTimer(bombId: string, timer: number): void {
    // TODO: Implement bomb timer update
    // Find bomb and update timer
    console.warn('updateBombTimer not implemented');
  }

  function startBombTimer(bombId: string): void {
    const bomb = bombs.value.get(bombId);
    if (!bomb) {return;}
    
    setTimeout(() => {
      explodeBomb(bombId, bomb);
    }, bomb.timer);
  }

  function explodeBomb(bombId: string, bomb: Bomb): void {
    // Remove bomb from map
    bombs.value.delete(bombId);
    
    // Create explosion
    const explosion: Explosion = {
      id: generateId(),
      center: bomb.position,
      cells: calculateExplosionCells(bomb.position, bomb.power),
      damage: 25,
      createdAt: Date.now(),
      duration: 1000,
    };
    
    explosions.value.set(explosion.id, explosion);
    
    // Remove explosion after duration
    setTimeout(() => {
      explosions.value.delete(explosion.id);
    }, explosion.duration);
  }

  function addMonster(monster: Monster): void {
    // TODO: Implement monster addition
    // Add to monsters map
    // Start AI behavior
    console.warn('addMonster not implemented');
  }

  function removeMonster(monsterId: string): void {
    // TODO: Implement monster removal
    // Remove from monsters map
    // Award points to players
    console.warn('removeMonster not implemented');
  }

  function spawnMonsterWave(config: any): void {
    // TODO: Implement monster wave spawning
    // Create multiple monsters
    // Send spawn request to server
    console.warn('spawnMonsterWave not implemented');
  }

  function addBoss(newBoss: Boss): void {
    // TODO: Implement boss addition
    // Set boss reference
    // Initialize boss behavior
    console.warn('addBoss not implemented');
  }

  function removeBoss(bossId: string): void {
    // TODO: Implement boss removal
    // Clear boss reference
    // Check victory condition
    console.warn('removeBoss not implemented');
  }

  function updateBoss(bossId: string, updates: Partial<Boss>): void {
    // TODO: Implement boss updates
    // Apply updates to boss
    // Check phase changes
    // Handle death
    console.warn('updateBoss not implemented');
  }

  function addPowerUp(powerUp: PowerUp): void {
    // TODO: Implement power-up addition
    // Add to powerUps map
    console.warn('addPowerUp not implemented');
  }

  function collectPowerUp(powerUpId: string, playerId: string): void {
    // TODO: Implement power-up collection
    // Remove from powerUps map
    // Apply to player
    // Send collection event
    console.warn('collectPowerUp not implemented');
  }

  function spawnPowerUpFromBlock(position: Position): void {
    // TODO: Implement power-up spawning from destroyed blocks
    // Random chance to spawn power-up
    // Create power-up at position
    console.warn('spawnPowerUpFromBlock not implemented');
  }

  // Actions - Maze Management
  function initializeMaze(): void {
    // Initialize a 15x15 maze (960px / 64px = 15 cells)
    const size = 15;
    maze.value = Array(size).fill(null).map(() => Array(size).fill(0));
    
    // Add walls around perimeter
    for (let x = 0; x < size; x++) {
      maze.value[0][x] = 1; // Top wall
      maze.value[size - 1][x] = 1; // Bottom wall
      maze.value[x][0] = 1; // Left wall
      maze.value[x][size - 1] = 1; // Right wall
    }
    
    // Add some destructible blocks randomly
    for (let y = 2; y < size - 2; y++) {
      for (let x = 2; x < size - 2; x++) {
        if (Math.random() < 0.3) { // 30% chance
          maze.value[y][x] = 2; // Destructible block
        }
      }
    }
  }

  function destroyBlock(x: number, y: number): void {
    // TODO: Implement block destruction
    // Check if block is destructible
    // Set to empty
    // Spawn power-up chance
    console.warn('destroyBlock not implemented');
  }

  function checkCollision(position: Position): boolean {
    // TODO: Implement collision detection
    // Check if position is blocked by wall/block
    console.warn('checkCollision not implemented');
    return false;
  }

  function getValidSpawnPositions(): Position[] {
    // TODO: Implement spawn position calculation
    // Return safe corner positions
    console.warn('getValidSpawnPositions not implemented');
    return [];
  }

  // Actions - Game Statistics
  function getGameStatistics(): GameStatistics {
    // TODO: Implement statistics calculation
    // Calculate play time, scores, etc.
    console.warn('getGameStatistics not implemented');
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

  function updateAllMonsters(): void {
    // TODO: Implement monster AI updates
    // Update all monster positions and AI
    console.warn('updateAllMonsters not implemented');
  }

  // Actions - Network Synchronization
  function handleServerMessage(message: WebSocketMessage): void {
    // TODO: Implement server message handling
    // Route messages by type
    // Update game state accordingly
    console.warn('handleServerMessage not implemented');
  }

  function requestSync(): void {
    // TODO: Implement sync request
    // Request full state sync from server
    console.warn('requestSync not implemented');
  }

  // Initialize maze on store creation
  initializeMaze();

  // Return store interface
  return {
    // State
    roomId: readonly(roomId),
    gameState: readonly(gameState),
    currentLevel: readonly(currentLevel),
    timeRemaining: readonly(timeRemaining),
    objective: readonly(objective),
    gameStartTime: readonly(gameStartTime),
    gameResult: readonly(gameResult),
    maxPlayers: readonly(maxPlayers),
    gameMode: readonly(gameMode),
    difficulty: readonly(difficulty),
    players: readonly(players),
    bombs: readonly(bombs),
    monsters: readonly(monsters),
    powerUps: readonly(powerUps),
    explosions: readonly(explosions),
    boss: readonly(boss),
    maze: readonly(maze),

    // Computed
    isGameActive,
    playersArray,
    alivePlayers,
    deadPlayers,
    activeBombs,
    playersByScore,
    totalScore,
    timeRemainingFormatted,

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    startGameTimer,
    addPlayer,
    removePlayer,
    updatePlayer,
    addBomb,
    removeBomb,
    updateBombTimer,
    startBombTimer,
    explodeBomb,
    addMonster,
    removeMonster,
    spawnMonsterWave,
    addBoss,
    removeBoss,
    updateBoss,
    addPowerUp,
    collectPowerUp,
    spawnPowerUpFromBlock,
    initializeMaze,
    destroyBlock,
    checkCollision,
    getValidSpawnPositions,
    getGameStatistics,
    updateAllMonsters,
    handleServerMessage,
    requestSync,
  };
});