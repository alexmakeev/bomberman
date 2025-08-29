/**
 * Game Store - Pinia Store for Game State Management
 * Handles game rooms, multiplayer coordination, entities, and game flow
 * 
 * @see docs/front-end/03-state-management.md - Store architecture
 * @see tests/frontend/stores/gameStore.test.ts - Comprehensive tests
 */

import { defineStore } from 'pinia';
import { computed, ref, readonly } from 'vue';
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
    // Add bomb to the map
    bombs.value.set(bomb.id, bomb);
    
    // Start bomb timer (automatically explodes after duration)
    setTimeout(() => {
      explodeBomb(bomb.id);
    }, bomb.timer);
    
    console.log(`Bomb ${bomb.id} added at (${bomb.position.x}, ${bomb.position.y})`);
  }

  function removeBomb(bombId: string): void {
    // Remove bomb from the map
    if (bombs.value.has(bombId)) {
      bombs.value.delete(bombId);
      console.log(`Bomb ${bombId} removed`);
    }
  }

  function updateBombTimer(bombId: string, timer: number): void {
    // Find and update bomb timer
    const bomb = bombs.value.get(bombId);
    if (bomb) {
      bomb.timer = timer;
      console.log(`Bomb ${bombId} timer updated to ${timer}ms`);
    }
  }

  function startBombTimer(bombId: string): void {
    const bomb = bombs.value.get(bombId);
    if (!bomb) {return;}
    
    setTimeout(() => {
      explodeBomb(bombId, bomb);
    }, bomb.timer);
  }

  // Helper function to calculate explosion cells
  function calculateExplosionCells(center: Position, power: number): Position[] {
    const cells: Position[] = [center]; // Center cell always explodes
    
    // Four directions: up, down, left, right
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];
    
    for (const direction of directions) {
      for (let i = 1; i <= power; i++) {
        const cell = {
          x: center.x + direction.x * i * 64, // 64px per cell
          y: center.y + direction.y * i * 64
        };
        
        // Check bounds and obstacles
        if (cell.x >= 0 && cell.x < 1280 && cell.y >= 0 && cell.y < 720) {
          cells.push(cell);
        }
      }
    }
    
    return cells;
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
    // Add monster to the map
    monsters.value.set(monster.id, monster);
    console.log(`Monster ${monster.id} added at (${monster.position.x}, ${monster.position.y})`);
  }

  function removeMonster(monsterId: string): void {
    // Remove monster from the map
    if (monsters.value.has(monsterId)) {
      monsters.value.delete(monsterId);
      console.log(`Monster ${monsterId} removed`);
    }
  }

  function spawnMonsterWave(config: any): void {
    // Create monsters based on config
    const count = config.count || 5;
    const type = config.type || 'basic';
    
    for (let i = 0; i < count; i++) {
      const monster: Monster = {
        id: `monster-wave-${Date.now()}-${i}`,
        type,
        position: { x: Math.random() * 1200, y: Math.random() * 600 },
        health: 50,
        maxHealth: 50,
        speed: 2,
        damage: 10,
        lastDirection: { x: 1, y: 0 },
        isAlive: true,
        lastMoved: Date.now()
      };
      
      addMonster(monster);
    }
    
    console.log(`Spawned ${count} monsters`);
  }

  function addBoss(newBoss: Boss): void {
    // Set boss reference
    boss.value = newBoss;
    console.log(`Boss ${newBoss.id} added with ${newBoss.health}/${newBoss.maxHealth} health`);
  }

  function removeBoss(bossId: string): void {
    // Clear boss reference if IDs match
    if (boss.value && boss.value.id === bossId) {
      boss.value = null;
      // Check victory condition
      if (gameState.value === 'playing') {
        gameState.value = 'ended';
        gameResult.value = 'victory';
      }
      console.log(`Boss ${bossId} removed`);
    }
  }

  function updateBoss(bossId: string, updates: Partial<Boss>): void {
    // Update boss if IDs match
    if (boss.value && boss.value.id === bossId) {
      Object.assign(boss.value, updates);
      
      // Check if boss was defeated
      if (updates.health !== undefined && updates.health <= 0) {
        removeBoss(bossId);
      }
      
      console.log(`Boss ${bossId} updated`);
    }
  }

  function addPowerUp(powerUp: PowerUp): void {
    // Add power-up to the map
    powerUps.value.set(powerUp.id, powerUp);
    console.log(`Power-up ${powerUp.id} (${powerUp.type}) added at (${powerUp.position.x}, ${powerUp.position.y})`);
  }

  function collectPowerUp(powerUpId: string, playerId: string): void {
    // Remove power-up from the map
    const powerUp = powerUps.value.get(powerUpId);
    if (powerUp) {
      powerUps.value.delete(powerUpId);
      
      // Apply effect to player
      const player = players.value.get(playerId);
      if (player) {
        switch (powerUp.type) {
          case 'speed':
            player.speed = Math.min(player.speed + 1, 5);
            break;
          case 'bomb_power':
            player.bombPower = Math.min(player.bombPower + 1, 10);
            break;
          case 'bomb_count':
            player.maxBombs = Math.min(player.maxBombs + 1, 10);
            break;
        }
      }
      
      console.log(`Power-up ${powerUpId} collected by player ${playerId}`);
    }
  }

  function spawnPowerUpFromBlock(position: Position): void {
    // Random chance to spawn power-up (30%)
    if (Math.random() < 0.3) {
      const types = ['speed', 'bomb_power', 'bomb_count'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const powerUp: PowerUp = {
        id: `powerup-${Date.now()}`,
        type: randomType,
        position,
        createdAt: Date.now()
      };
      
      addPowerUp(powerUp);
    }
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

  function destroyBlock(x: number, y: number): boolean {
    // Check if block at grid coordinates is destructible
    if (maze.value[y] && maze.value[y][x]) {
      const cell = maze.value[y][x];
      if (cell.type === 'destructible') {
        cell.type = 'empty';
        spawnPowerUpFromBlock({ x: x * 64, y: y * 64 });
        return true;
      }
    }
    return false;
  }

  function checkCollision(position: Position): boolean {
    // Convert pixel position to grid coordinates
    const cellX = Math.floor(position.x / 64);
    const cellY = Math.floor(position.y / 64);
    
    // Check bounds
    if (cellX < 0 || cellY < 0 || cellX >= 20 || cellY >= 15) {
      return true; // Out of bounds = collision
    }
    
    // Check maze cell
    if (maze.value[cellY] && maze.value[cellY][cellX]) {
      const cell = maze.value[cellY][cellX];
      return cell.type === 'wall' || cell.type === 'destructible';
    }
    
    return false;
  }

  function getValidSpawnPositions(): Position[] {
    // Return the four corner spawn positions (standard Bomberman)
    return [
      { x: 64, y: 64 },     // Top-left
      { x: 1152, y: 64 },   // Top-right  
      { x: 64, y: 576 },    // Bottom-left
      { x: 1152, y: 576 }   // Bottom-right
    ];
  }

  // Actions - Game Statistics
  function getGameStatistics(): GameStatistics {
    const currentTime = Date.now();
    const elapsedTime = gameStartTime.value > 0 ? currentTime - gameStartTime.value : 0;
    
    return {
      playTime: elapsedTime,
      totalPlayers: playersArray.value.length,
      totalBombs: activeBombs.value.length,
      totalScore: totalScore.value,
      blocksDestroyed: 0, // Would track this in real implementation
      monstersKilled: 0, // Would track this in real implementation
      powerUpsCollected: 0, // Would track this in real implementation
      deaths: deadPlayers.value.length,
      assists: 0,
    };
  }

  function updateAllMonsters(): void {
    // Basic monster position updates
    monsters.value.forEach((monster) => {
      if (monster.isAlive) {
        // Simple random movement (would be more sophisticated in real implementation)
        const directions = [
          { x: 32, y: 0 }, { x: -32, y: 0 }, { x: 0, y: 32 }, { x: 0, y: -32 }
        ];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        const newPosition = {
          x: monster.position.x + direction.x,
          y: monster.position.y + direction.y
        };
        
        if (!checkCollision(newPosition)) {
          monster.position = newPosition;
          monster.lastMoved = Date.now();
        }
      }
    });
  }

  // Actions - Network Synchronization
  function handleServerMessage(message: WebSocketMessage): void {
    // Basic message handling
    console.log('Server message:', message.type);
    
    switch (message.type) {
      case 'room_joined':
        if (message.data && message.data.roomId) {
          roomId.value = message.data.roomId;
        }
        break;
      case 'player_joined':
        if (message.data && message.data.player) {
          addPlayer(message.data.player);
        }
        break;
      case 'player_left':
        if (message.data && message.data.playerId) {
          removePlayer(message.data.playerId);
        }
        break;
      case 'game_state_update':
        if (message.data) {
          // Update relevant game state
          if (message.data.gameState) gameState.value = message.data.gameState;
          if (message.data.timeRemaining) timeRemaining.value = message.data.timeRemaining;
        }
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  function requestSync(): void {
    // Request full state sync from server
    const ws = getWebSocketService();
    if (ws.isConnected && roomId.value) {
      ws.send({
        messageType: 'SYNC_REQUEST' as any,
        type: 'sync_request',
        data: { roomId: roomId.value },
        timestamp: Date.now(),
      });
    }
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