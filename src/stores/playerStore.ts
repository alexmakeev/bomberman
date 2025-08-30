/**
 * Player Store - Pinia Store for Player State Management
 * Handles player stats, actions, power-ups, and network synchronization
 * 
 * @see docs/front-end/03-state-management.md - Store architecture
 * @see tests/frontend/stores/playerStore.test.ts - Comprehensive tests
 */

import { defineStore } from 'pinia';
import { computed, readonly, ref } from 'vue';
import type { 
  Direction, 
  GameAction, 
  Player, 
  PlayerAction,
  Position,
  PowerUpType,
} from '../types/game';
import { getWebSocketService } from '../utils/websocketService';
import { generateId } from '../utils/gameUtils';

export const usePlayerStore = defineStore('player', () => {
  // State - Player Properties
  const id = ref<string>('');
  const name = ref<string>('');
  const color = ref<string>('red');
  const position = ref<Position>({ x: 0, y: 0 });
  const health = ref<number>(100);
  const maxHealth = ref<number>(100);
  const bombCount = ref<number>(1);
  const maxBombs = ref<number>(1);
  const bombPower = ref<number>(1);
  const speed = ref<number>(100);
  const isAlive = ref<boolean>(true);
  const isMoving = ref<boolean>(false);
  const direction = ref<Direction | null>(null);
  const score = ref<number>(0);
  const powerUps = ref<PowerUpType[]>([]);
  const respawnTimer = ref<number>(0);
  
  // State - Internal
  const actionQueue = ref<GameAction[]>([]);
  const lastMoveTime = ref<number>(0);
  const networkSyncTime = ref<number>(0);

  // Computed Properties
  const healthPercentage = computed(() => 
    maxHealth.value > 0 ? (health.value / maxHealth.value) * 100 : 0,
  );

  const canPlaceBomb = computed(() => 
    isAlive.value && bombCount.value > 0,
  );

  const isRespawning = computed(() => 
    !isAlive.value && respawnTimer.value > 0,
  );

  const activePowerUps = computed(() => 
    powerUps.value.filter(powerUp => powerUp !== null),
  );

  const currentSpeed = computed(() => {
    let finalSpeed = speed.value;
    if (powerUps.value.includes('speed_boost')) {
      finalSpeed *= 1.25;
    }
    if (powerUps.value.includes('speed_boost_temp')) {
      finalSpeed *= 1.5;
    }
    return finalSpeed;
  });

  // Actions - Player Creation and Management
  function createPlayer(playerData: Player): void {
    id.value = playerData.id;
    name.value = playerData.name;
    color.value = playerData.color || 'red';
    position.value = { ...playerData.position };
    health.value = playerData.health;
    maxHealth.value = playerData.maxHealth;
    bombCount.value = playerData.bombCount;
    maxBombs.value = playerData.maxBombs;
    bombPower.value = playerData.bombPower;
    speed.value = playerData.speed;
    isAlive.value = playerData.isAlive;
    isMoving.value = playerData.isMoving;
    direction.value = playerData.direction;
    score.value = playerData.score;
    powerUps.value = [...playerData.powerUps];
    respawnTimer.value = playerData.respawnTimer;
    
    console.log(`Player ${playerData.name} created successfully`);
  }

  function resetPlayer(): void {
    // Reset to default values
    id.value = '';
    name.value = '';
    color.value = 'red';
    position.value = { x: 0, y: 0 };
    health.value = 100;
    maxHealth.value = 100;
    bombCount.value = 1;
    maxBombs.value = 1;
    bombPower.value = 1;
    speed.value = 100;
    isAlive.value = true;
    isMoving.value = false;
    direction.value = null;
    score.value = 0;
    powerUps.value = [];
    respawnTimer.value = 0;
    actionQueue.value = [];
    lastMoveTime.value = 0;
    networkSyncTime.value = 0;
  }

  async function initializePlayer(playerData?: Partial<Player>): Promise<void> {
    console.log('🔄 Initializing player store...');
    
    try {
      // If playerData provided, use it to populate store
      if (playerData) {
        if (playerData.id) id.value = playerData.id;
        if (playerData.name) name.value = playerData.name;
        if (playerData.color) color.value = playerData.color;
        if (playerData.position) position.value = { ...playerData.position };
        if (typeof playerData.health === 'number') health.value = playerData.health;
        if (typeof playerData.maxHealth === 'number') maxHealth.value = playerData.maxHealth;
        if (typeof playerData.bombCount === 'number') bombCount.value = playerData.bombCount;
        if (typeof playerData.maxBombs === 'number') maxBombs.value = playerData.maxBombs;
        if (typeof playerData.bombPower === 'number') bombPower.value = playerData.bombPower;
        if (typeof playerData.speed === 'number') speed.value = playerData.speed;
        if (typeof playerData.isAlive === 'boolean') isAlive.value = playerData.isAlive;
        if (typeof playerData.score === 'number') score.value = playerData.score;
        if (playerData.powerUps) powerUps.value = [...playerData.powerUps];
      } else {
        // Create a new player with default values if no data provided
        const defaultPlayer: Player = {
          id: generateId(),
          name: `Player_${Math.floor(Math.random() * 1000)}`,
          color: 'red',
          position: { x: 64, y: 64 },
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
        };
        createPlayer(defaultPlayer);
      }
      
      console.log('✅ Player store initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize player store:', error);
      throw error;
    }
  }

  function initializeWithRoomConfig(config: any): void {
    if (config.maxHealth) {maxHealth.value = config.maxHealth;}
    if (config.startingBombs) {
      bombCount.value = config.startingBombs;
      maxBombs.value = config.startingBombs;
    }
    if (config.startingSpeed) {speed.value = config.startingSpeed;}
    if (config.startingPower) {bombPower.value = config.startingPower;}
    
    // Reset health to max health after applying config
    health.value = maxHealth.value;
  }

  // Actions - Movement
  function movePlayer(newDirection: Direction, intensity: number): void {
    if (!isAlive.value) {return;}
    
    // Update movement state
    direction.value = newDirection;
    isMoving.value = true;
    lastMoveTime.value = Date.now();
    
    // Send movement to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.sendPlayerMove(id.value, newDirection, position.value);
    } else {
      // Queue action for when connection is restored
      queueAction({
        id: generateId(),
        type: 'move',
        playerId: id.value,
        data: { direction: newDirection, intensity },
        timestamp: Date.now(),
      });
    }
  }

  function stopMovement(): void {
    direction.value = null;
    isMoving.value = false;
    
    // Send stop action to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.sendPlayerAction({
        id: generateId(),
        type: 'stop',
        playerId: id.value,
        data: { position: position.value },
        timestamp: Date.now(),
      });
    }
  }

  function updatePosition(): void {
    if (!isMoving.value || !direction.value || !isAlive.value) {return;}
    
    const now = Date.now();
    const deltaTime = (now - lastMoveTime.value) / 1000; // Convert to seconds
    const moveDistance = currentSpeed.value * deltaTime;
    
    // Calculate new position based on direction
    const newPos = { ...position.value };
    switch (direction.value) {
      case 'up':
        newPos.y -= moveDistance;
        break;
      case 'down':
        newPos.y += moveDistance;
        break;
      case 'left':
        newPos.x -= moveDistance;
        break;
      case 'right':
        newPos.x += moveDistance;
        break;
    }
    
    // TODO: Add collision detection with maze walls and other players
    // For now, just update position (collision detection would be handled by game store)
    position.value = newPos;
    lastMoveTime.value = now;
  }

  // Actions - Combat
  function placeBomb(): boolean {
    if (!canPlaceBomb.value) {return false;}
    
    // Decrease available bomb count
    bombCount.value--;
    
    // Get grid position for bomb placement
    const bombPosition = getBombGridPosition();
    
    // Send bomb placement to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.sendPlayerBomb(id.value, bombPosition);
    } else {
      // Queue action for when connection is restored
      queueAction({
        id: generateId(),
        type: 'bomb',
        playerId: id.value,
        data: { position: bombPosition },
        timestamp: Date.now(),
      });
    }
    
    return true;
  }

  function onBombExploded(bombId: string): void {
    // Restore bomb count when bomb explodes
    if (bombCount.value < maxBombs.value) {
      bombCount.value++;
    }
  }

  function getBombGridPosition(): Position {
    // Snap current position to nearest grid cell (64px grid to match test expectations)
    const gridSize = 64;
    return {
      x: Math.round(position.value.x / gridSize) * gridSize,
      y: Math.round(position.value.y / gridSize) * gridSize,
    };
  }

  // Actions - Health Management
  function takeDamage(damage: number): void {
    if (!isAlive.value) {return;}
    
    // Reduce health
    health.value = Math.max(0, health.value - damage);
    
    // Send damage event to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.sendPlayerAction({
        id: generateId(),
        type: 'damage',
        playerId: id.value,
        data: { damage, newHealth: health.value },
        timestamp: Date.now(),
      });
    }
    
    // Check if player died
    if (health.value <= 0) {
      die();
    }
  }

  function takeDamagePercent(percentage: number): void {
    // TODO: Implement percentage-based damage
    // Calculate damage based on max health percentage
    const damage = (maxHealth.value * percentage) / 100;
    takeDamage(damage);
  }

  function heal(amount: number): void {
    if (!isAlive.value) {return;}
    
    const oldHealth = health.value;
    health.value = Math.min(maxHealth.value, health.value + amount);
    
    // Send heal event to server if health actually changed
    if (health.value > oldHealth) {
      const ws = getWebSocketService();
      if (ws.isConnected) {
        ws.sendPlayerAction({
          id: generateId(),
          type: 'heal',
          playerId: id.value,
          data: { healAmount: amount, newHealth: health.value },
          timestamp: Date.now(),
        });
      }
    }
  }

  function die(): void {
    isAlive.value = false;
    isMoving.value = false;
    direction.value = null;
    powerUps.value = []; // Clear power-ups on death
    respawnTimer.value = 10000; // 10 seconds in milliseconds
    
    // Send death event to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.sendPlayerAction({
        id: generateId(),
        type: 'respawn',
        playerId: id.value,
        data: { reason: 'death' },
        timestamp: Date.now(),
      });
    }
    
    // Start respawn countdown
    const countdown = setInterval(() => {
      respawnTimer.value -= 1000; // Decrease by 1 second (1000ms)
      if (respawnTimer.value <= 0) {
        clearInterval(countdown);
        respawn();
      }
    }, 1000);
  }

  function respawn(): void {
    // Reset health and status
    health.value = maxHealth.value;
    isAlive.value = true;
    respawnTimer.value = 0;
    
    // Move to random corner position (test expects these specific positions)
    const corners = [
      { x: 64, y: 64 },      // Top-left
      { x: 832, y: 64 },     // Top-right  
      { x: 64, y: 832 },     // Bottom-left
      { x: 832, y: 832 },     // Bottom-right
    ];
    position.value = corners[Math.floor(Math.random() * corners.length)];
    
    console.log(`Player ${name.value} respawned at`, position.value);
  }

  // Actions - Power-ups
  function applyPowerUp(powerUpType: PowerUpType, duration?: number): void {
    // Apply power-up effects
    switch (powerUpType) {
      case 'bomb_count':
        maxBombs.value = Math.min(10, maxBombs.value + 1);
        bombCount.value = Math.min(maxBombs.value, bombCount.value + 1);
        break;
      case 'bomb_power':
        bombPower.value = Math.min(10, bombPower.value + 1);
        break;
      case 'speed_boost':
        if (!powerUps.value.includes('speed_boost')) {
          speed.value = Math.min(200, speed.value * 1.25);
        }
        break;
      case 'health':
        heal(25); // Heal 25 HP
        break;
      case 'max_health':
        maxHealth.value = Math.min(200, maxHealth.value + 25);
        health.value = maxHealth.value; // Full heal when max health increases
        break;
      case 'speed_boost_temp':
        // Temporary speed boost handled below
        break;
    }
    
    // Add to power-ups list
    if (!powerUps.value.includes(powerUpType)) {
      powerUps.value.push(powerUpType);
    }
    
    // Handle temporary power-ups
    if (duration && duration > 0) {
      setTimeout(() => {
        removePowerUp(powerUpType);
      }, duration * 1000);
    }
    
    // Send power-up event to server
    const ws = getWebSocketService();
    if (ws.isConnected) {
      ws.sendPlayerAction({
        id: generateId(),
        type: 'powerup_collect',
        playerId: id.value,
        data: { powerUpType, duration },
        timestamp: Date.now(),
      });
    }
  }

  function removePowerUp(powerUpType: PowerUpType): void {
    const index = powerUps.value.indexOf(powerUpType);
    if (index === -1) {return;}
    
    // Remove from active list
    powerUps.value.splice(index, 1);
    
    // Revert stat modifications for temporary power-ups
    switch (powerUpType) {
      case 'speed_boost_temp':
        // Revert temporary speed boost
        speed.value = Math.max(100, speed.value / 1.5);
        break;
      // Permanent power-ups (bomb_count, bomb_power, etc.) are not reverted
    }
  }

  // Actions - Score Management
  function addScore(points: number, multiplier: number = 1, source?: string): void {
    const finalPoints = Math.floor(points * multiplier);
    const newScore = Math.max(0, score.value + finalPoints);
    
    if (newScore !== score.value) {
      score.value = newScore;
      
      // Send score event to server with source tracking
      const ws = getWebSocketService();
      if (ws.isConnected) {
        ws.sendPlayerAction({
          id: generateId(),
          type: 'score',
          playerId: id.value,
          data: { points: finalPoints, source, newTotal: score.value },
          timestamp: Date.now(),
        });
      }
    }
  }

  function addBonusScore(points: number, reason: string): void {
    // Add bonus points for special achievements with 1.5x multiplier
    addScore(points, 1.5, `bonus_${reason}`);
  }

  // Actions - Network Synchronization
  function syncWithServer(serverData: Partial<Player>): void {
    // Validate incoming data and update local state
    if (serverData.id && serverData.id !== id.value) {
      console.warn('Server sync: ID mismatch', serverData.id, 'vs', id.value);
      return;
    }
    
    // Update position (server is authoritative)
    if (serverData.position) {
      position.value = { ...serverData.position };
    }
    
    // Update health (server is authoritative)
    if (typeof serverData.health === 'number') {
      health.value = serverData.health;
    }
    
    // Update movement state
    if (typeof serverData.isMoving === 'boolean') {
      isMoving.value = serverData.isMoving;
    }
    if (serverData.direction !== undefined) {
      direction.value = serverData.direction;
    }
    
    // Update alive status
    if (typeof serverData.isAlive === 'boolean') {
      isAlive.value = serverData.isAlive;
    }
    
    // Update bomb count (server is authoritative)
    if (typeof serverData.bombCount === 'number') {
      bombCount.value = serverData.bombCount;
    }
    
    // Update power-ups
    if (serverData.powerUps) {
      powerUps.value = [...serverData.powerUps];
    }
    
    // Update score (server is authoritative)
    if (typeof serverData.score === 'number') {
      score.value = serverData.score;
    }
    
    networkSyncTime.value = Date.now();
  }

  function queueAction(action: GameAction): void {
    // Add action to queue for offline play
    actionQueue.value.push(action);
    
    // Limit queue size to prevent memory issues (keep last 100 actions)
    if (actionQueue.value.length > 100) {
      actionQueue.value = actionQueue.value.slice(-100);
    }
  }

  function onWebSocketReconnect(): void {
    const ws = getWebSocketService();
    
    // Flush queued actions to server
    while (actionQueue.value.length > 0) {
      const action = actionQueue.value.shift()!;
      ws.sendPlayerAction(action);
    }
    
    // Request state synchronization
    ws.sendSyncRequest(id.value);
  }

  // Compatibility aliases for GameView.vue
  function startMoving(newDirection: Direction, intensity: number = 1): void {
    movePlayer(newDirection, intensity);
  }

  function stopMoving(): void {
    stopMovement();
  }

  // Return store interface
  return {
    // State (reactive but not readonly since they're modified internally)
    id,
    name,
    color,
    position,
    health,
    maxHealth,
    bombCount,
    maxBombs,
    bombPower,
    speed,
    isAlive,
    isMoving,
    direction,
    score,
    powerUps,
    respawnTimer,
    actionQueue,

    // Computed
    healthPercentage,
    canPlaceBomb,
    isRespawning,
    activePowerUps,
    currentSpeed,

    // Actions
    createPlayer,
    resetPlayer,
    initializePlayer,
    initializeWithRoomConfig,
    movePlayer,
    stopMovement,
    updatePosition,
    placeBomb,
    onBombExploded,
    getBombGridPosition,
    takeDamage,
    takeDamagePercent,
    heal,
    die,
    respawn,
    applyPowerUp,
    removePowerUp,
    addScore,
    addBonusScore,
    syncWithServer,
    queueAction,
    onWebSocketReconnect,
    
    // Compatibility aliases
    startMoving,
    stopMoving,
  };
});