# State Management with Pinia

> **Navigation**: [← Components](02-component-structure.md) → **State Management** → [Responsive Design →](04-responsive-design.md)

Comprehensive state management architecture using Pinia for the cooperative multiplayer Bomberman game, with TypeScript support and performance optimizations.

## Store Structure Overview

```
stores/
├── game/
│   ├── gameState.ts          # Core game state management
│   ├── gameActions.ts        # Player actions and input handling
│   ├── gameEntities.ts       # Entities (players, bombs, monsters)
│   └── gameObjectives.ts     # Cooperative objectives tracking
│
├── connection/
│   ├── websocket.ts          # WebSocket connection management
│   ├── room.ts               # Room and lobby state
│   └── network.ts            # Network status and latency
│
├── player/
│   ├── playerState.ts        # Individual player state
│   ├── playerStats.ts        # Statistics and achievements
│   └── playerSettings.ts     # User preferences and configuration
│
├── ui/
│   ├── layout.ts             # Responsive layout and screen management
│   ├── notifications.ts      # Toast notifications and alerts
│   ├── audio.ts              # Sound effects and music
│   └── controls.ts           # Input method and control settings
│
└── index.ts                  # Store composition and exports
```

## Core Store Implementations

### 1. Game State Store

```typescript
// stores/game/gameState.ts
export const useGameStateStore = defineStore('gameState', () => {
  // ===== STATE =====
  const gameId = ref<string | null>(null);
  const gameStatus = ref<GameStatus>('waiting');
  const gameTimer = ref<number>(0);
  const gameStartTime = ref<Date | null>(null);
  
  // Maze and environment
  const maze = ref<MazeData>({
    width: 15,
    height: 11,
    walls: [],
    destructibleWalls: [],
    powerUpSpawns: []
  });
  
  // Entity tracking with reactive Maps for performance
  const players = ref(new Map<PlayerId, PlayerGameState>());
  const bombs = ref(new Map<BombId, BombState>());
  const powerUps = ref<PowerUp[]>([]);
  const monsters = ref<Monster[]>([]);
  const boss = ref<Boss | null>(null);
  const gates = ref<Gate[]>([]);
  
  // Game configuration
  const settings = ref<GameSettings>({
    maxPlayers: 8,
    respawnTime: 10000,
    bombTimer: 3000,
    powerUpSpawnRate: 0.1,
    cooperativeMode: true,
    friendlyFire: false
  });
  
  // Cooperative gameplay
  const objectives = ref<Objective[]>([]);
  const teamProgress = ref<number>(0);
  const sharedResources = ref<SharedResources>({
    teamLives: 10,
    teamScore: 0,
    unlockedAreas: new Set<string>()
  });
  
  // ===== GETTERS =====
  const currentPlayer = computed(() => {
    const playerStore = usePlayerStore();
    return players.value.get(playerStore.playerId);
  });
  
  const alivePlayers = computed(() => {
    return Array.from(players.value.values())
      .filter(player => player.health > 0);
  });
  
  const gameProgress = computed(() => {
    if (objectives.value.length === 0) return 0;
    const completed = objectives.value.filter(obj => obj.isCompleted).length;
    return completed / objectives.value.length;
  });
  
  const visibleArea = computed(() => {
    if (!currentPlayer.value) return [];
    return calculateVisibleTiles(
      currentPlayer.value.position,
      maze.value,
      settings.value.visibilityRadius || 3
    );
  });
  
  const teamStatus = computed((): TeamStatus => {
    const alive = alivePlayers.value.length;
    const total = players.value.size;
    const health = Array.from(players.value.values())
      .reduce((sum, p) => sum + p.health, 0);
    
    return {
      playersAlive: alive,
      totalPlayers: total,
      averageHealth: total > 0 ? health / total : 0,
      teamLives: sharedResources.value.teamLives,
      teamScore: sharedResources.value.teamScore
    };
  });
  
  const gamePhase = computed((): GamePhase => {
    if (boss.value && boss.value.health > 0) return 'boss_fight';
    if (monsters.value.length > 0) return 'monster_waves';
    if (gates.value.some(g => g.isRevealed && !g.isDestroyed)) return 'gate_search';
    return 'exploration';
  });
  
  // ===== ACTIONS =====
  const initializeGame = (initialState: GameInitialState) => {
    gameId.value = initialState.gameId;
    gameStatus.value = 'playing';
    gameStartTime.value = new Date();
    
    maze.value = initialState.maze;
    settings.value = { ...settings.value, ...initialState.settings };
    objectives.value = initialState.objectives || [];
    
    // Initialize players
    players.value.clear();
    initialState.players.forEach(player => {
      players.value.set(player.id, player);
    });
    
    console.log(`🎮 Game initialized: ${gameId.value}`);
  };
  
  const updateGameState = (delta: GameStateDelta) => {
    // Batch updates for performance
    if (delta.players) {
      delta.players.forEach((playerData, playerId) => {
        const existing = players.value.get(playerId);
        if (existing) {
          Object.assign(existing, playerData);
        } else {
          players.value.set(playerId, playerData);
        }
      });
    }
    
    if (delta.bombs) {
      bombs.value.clear();
      delta.bombs.forEach((bombData, bombId) => {
        bombs.value.set(bombId, bombData);
      });
    }
    
    if (delta.powerUps) {
      powerUps.value = delta.powerUps;
    }
    
    if (delta.monsters) {
      monsters.value = delta.monsters;
    }
    
    if (delta.boss) {
      boss.value = delta.boss;
    }
    
    if (delta.objectives) {
      objectives.value = delta.objectives;
    }
    
    if (delta.timer !== undefined) {
      gameTimer.value = delta.timer;
    }
  };
  
  const placeBomb = (playerId: PlayerId, position: Position) => {
    const player = players.value.get(playerId);
    if (!player || player.bombsPlaced >= player.maxBombs) {
      return false;
    }
    
    // Check if position is valid
    if (!isValidBombPosition(position, maze.value, bombs.value)) {
      return false;
    }
    
    // Create bomb
    const bombId = `bomb_${Date.now()}_${playerId}`;
    const bomb: BombState = {
      id: bombId,
      playerId,
      position,
      timer: settings.value.bombTimer,
      range: player.bombRange,
      createdAt: Date.now()
    };
    
    bombs.value.set(bombId, bomb);
    player.bombsPlaced++;
    
    // Send to server
    const connectionStore = useConnectionStore();
    connectionStore.sendGameAction({
      type: 'place_bomb',
      playerId,
      position,
      timestamp: Date.now()
    });
    
    return true;
  };
  
  const explodeBomb = (bombId: BombId) => {
    const bomb = bombs.value.get(bombId);
    if (!bomb) return;
    
    // Calculate explosion area
    const explosionTiles = calculateExplosionArea(
      bomb.position,
      bomb.range,
      maze.value
    );
    
    // Apply damage to players and entities
    explosionTiles.forEach(tile => {
      // Damage players
      players.value.forEach(player => {
        if (positionsEqual(player.position, tile)) {
          damagePlayer(player.id, 1);
        }
      });
      
      // Destroy destructible walls
      const wallIndex = maze.value.destructibleWalls.findIndex(
        wall => positionsEqual(wall, tile)
      );
      if (wallIndex !== -1) {
        maze.value.destructibleWalls.splice(wallIndex, 1);
        spawnPowerUpChance(tile);
        checkGateReveal(tile);
      }
    });
    
    // Remove bomb and update player count
    bombs.value.delete(bombId);
    const player = players.value.get(bomb.playerId);
    if (player) {
      player.bombsPlaced = Math.max(0, player.bombsPlaced - 1);
    }
  };
  
  const damagePlayer = (playerId: PlayerId, damage: number) => {
    const player = players.value.get(playerId);
    if (!player) return;
    
    player.health = Math.max(0, player.health - damage);
    
    if (player.health === 0) {
      eliminatePlayer(playerId);
    }
  };
  
  const eliminatePlayer = (playerId: PlayerId) => {
    const player = players.value.get(playerId);
    if (!player) return;
    
    player.isAlive = false;
    player.eliminatedAt = Date.now();
    
    // Cooperative: Use shared team lives
    if (sharedResources.value.teamLives > 0) {
      sharedResources.value.teamLives--;
      
      // Schedule respawn
      setTimeout(() => {
        respawnPlayer(playerId);
      }, settings.value.respawnTime);
    }
    
    // Check game over condition
    if (alivePlayers.value.length === 0 && sharedResources.value.teamLives === 0) {
      endGame('defeat');
    }
  };
  
  const respawnPlayer = (playerId: PlayerId) => {
    const player = players.value.get(playerId);
    if (!player) return;
    
    // Find safe respawn position
    const spawnPosition = findSafeRespawnPosition(maze.value, players.value);
    
    player.health = 100;
    player.isAlive = true;
    player.position = spawnPosition;
    player.eliminatedAt = null;
    
    console.log(`🔄 Player ${playerId} respawned at (${spawnPosition.x}, ${spawnPosition.y})`);
  };
  
  const updateObjective = (objectiveId: string, progress: number) => {
    const objective = objectives.value.find(obj => obj.id === objectiveId);
    if (!objective) return;
    
    objective.progress = Math.min(progress, objective.maxProgress);
    objective.isCompleted = objective.progress >= objective.maxProgress;
    
    // Check win condition
    const requiredObjectives = objectives.value.filter(obj => obj.isRequired);
    const completedRequired = requiredObjectives.filter(obj => obj.isCompleted);
    
    if (completedRequired.length === requiredObjectives.length) {
      endGame('victory');
    }
    
    // Update team progress
    teamProgress.value = gameProgress.value;
  };
  
  const endGame = (result: 'victory' | 'defeat' | 'timeout') => {
    gameStatus.value = 'ended';
    
    const finalStats: GameEndStats = {
      result,
      duration: gameStartTime.value ? Date.now() - gameStartTime.value.getTime() : 0,
      teamScore: sharedResources.value.teamScore,
      objectivesCompleted: objectives.value.filter(obj => obj.isCompleted).length,
      totalObjectives: objectives.value.length,
      playersParticipated: players.value.size,
      finalTeamLives: sharedResources.value.teamLives
    };
    
    console.log(`🏁 Game ended with ${result}:`, finalStats);
    
    // Notify connection store for server sync
    const connectionStore = useConnectionStore();
    connectionStore.sendGameEvent('game_ended', finalStats);
  };
  
  const pauseGame = () => {
    if (gameStatus.value === 'playing') {
      gameStatus.value = 'paused';
    }
  };
  
  const resumeGame = () => {
    if (gameStatus.value === 'paused') {
      gameStatus.value = 'playing';
    }
  };
  
  const resetGame = () => {
    gameId.value = null;
    gameStatus.value = 'waiting';
    gameTimer.value = 0;
    gameStartTime.value = null;
    
    players.value.clear();
    bombs.value.clear();
    powerUps.value = [];
    monsters.value = [];
    boss.value = null;
    gates.value = [];
    objectives.value = [];
    
    teamProgress.value = 0;
    sharedResources.value = {
      teamLives: 10,
      teamScore: 0,
      unlockedAreas: new Set()
    };
  };
  
  // ===== HELPER FUNCTIONS =====
  const isValidBombPosition = (
    position: Position, 
    maze: MazeData, 
    existingBombs: Map<BombId, BombState>
  ): boolean => {
    // Check walls
    if (maze.walls.some(wall => positionsEqual(wall, position))) {
      return false;
    }
    
    // Check existing bombs
    if (Array.from(existingBombs.values()).some(bomb => 
      positionsEqual(bomb.position, position)
    )) {
      return false;
    }
    
    return true;
  };
  
  const calculateExplosionArea = (
    center: Position, 
    range: number, 
    maze: MazeData
  ): Position[] => {
    const tiles: Position[] = [center];
    
    // Four directions
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];
    
    directions.forEach(dir => {
      for (let i = 1; i <= range; i++) {
        const tile = {
          x: center.x + dir.x * i,
          y: center.y + dir.y * i
        };
        
        // Check bounds
        if (tile.x < 0 || tile.x >= maze.width || 
            tile.y < 0 || tile.y >= maze.height) {
          break;
        }
        
        tiles.push(tile);
        
        // Stop at solid walls
        if (maze.walls.some(wall => positionsEqual(wall, tile))) {
          break;
        }
        
        // Stop at destructible walls (but include them)
        if (maze.destructibleWalls.some(wall => positionsEqual(wall, tile))) {
          break;
        }
      }
    });
    
    return tiles;
  };
  
  const spawnPowerUpChance = (position: Position) => {
    if (Math.random() < settings.value.powerUpSpawnRate) {
      const powerUpTypes = ['bomb_up', 'flame_up', 'speed_up', 'life_up'];
      const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      powerUps.value.push({
        id: `powerup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: randomType,
        position,
        spawnedAt: Date.now()
      });
    }
  };
  
  const checkGateReveal = (position: Position) => {
    gates.value.forEach(gate => {
      if (positionsEqual(gate.hiddenPosition, position)) {
        gate.isRevealed = true;
        gate.position = position;
        
        // Trigger objective update
        updateObjective('find_gates', gates.value.filter(g => g.isRevealed).length);
      }
    });
  };
  
  const findSafeRespawnPosition = (
    maze: MazeData, 
    players: Map<PlayerId, PlayerGameState>
  ): Position => {
    const corners = [
      { x: 1, y: 1 },
      { x: maze.width - 2, y: 1 },
      { x: 1, y: maze.height - 2 },
      { x: maze.width - 2, y: maze.height - 2 }
    ];
    
    // Find first safe corner
    for (const corner of corners) {
      if (isSafePosition(corner, maze, players)) {
        return corner;
      }
    }
    
    // Fallback to center
    return { x: Math.floor(maze.width / 2), y: Math.floor(maze.height / 2) };
  };
  
  const isSafePosition = (
    position: Position, 
    maze: MazeData, 
    players: Map<PlayerId, PlayerGameState>
  ): boolean => {
    // Check for walls
    if (maze.walls.some(wall => positionsEqual(wall, position)) ||
        maze.destructibleWalls.some(wall => positionsEqual(wall, position))) {
      return false;
    }
    
    // Check for other players
    if (Array.from(players.values()).some(player => 
      player.isAlive && positionsEqual(player.position, position)
    )) {
      return false;
    }
    
    // Check for bombs
    if (bombs.value && Array.from(bombs.value.values()).some(bomb => 
      positionsEqual(bomb.position, position)
    )) {
      return false;
    }
    
    return true;
  };
  
  const calculateVisibleTiles = (
    playerPosition: Position, 
    maze: MazeData, 
    radius: number
  ): Position[] => {
    const visible: Position[] = [];
    
    for (let x = playerPosition.x - radius; x <= playerPosition.x + radius; x++) {
      for (let y = playerPosition.y - radius; y <= playerPosition.y + radius; y++) {
        if (x >= 0 && x < maze.width && y >= 0 && y < maze.height) {
          const distance = Math.sqrt(
            Math.pow(x - playerPosition.x, 2) + 
            Math.pow(y - playerPosition.y, 2)
          );
          
          if (distance <= radius) {
            visible.push({ x, y });
          }
        }
      }
    }
    
    return visible;
  };
  
  const positionsEqual = (pos1: Position, pos2: Position): boolean => {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  };
  
  return {
    // State
    gameId: readonly(gameId),
    gameStatus: readonly(gameStatus),
    gameTimer: readonly(gameTimer),
    maze: readonly(maze),
    players: readonly(players),
    bombs: readonly(bombs),
    powerUps: readonly(powerUps),
    monsters: readonly(monsters),
    boss: readonly(boss),
    gates: readonly(gates),
    settings: readonly(settings),
    objectives: readonly(objectives),
    teamProgress: readonly(teamProgress),
    sharedResources: readonly(sharedResources),
    
    // Getters
    currentPlayer,
    alivePlayers,
    gameProgress,
    visibleArea,
    teamStatus,
    gamePhase,
    
    // Actions
    initializeGame,
    updateGameState,
    placeBomb,
    explodeBomb,
    damagePlayer,
    eliminatePlayer,
    respawnPlayer,
    updateObjective,
    endGame,
    pauseGame,
    resumeGame,
    resetGame
  };
});
```

### 2. Connection Store

```typescript
// stores/connection/websocket.ts
export const useConnectionStore = defineStore('connection', () => {
  // ===== STATE =====
  const isConnected = ref(false);
  const connectionId = ref<string | null>(null);
  const websocket = ref<WebSocket | null>(null);
  const serverUrl = ref<string>('');
  
  // Connection quality
  const latency = ref<number>(0);
  const connectionQuality = ref<ConnectionQuality>('disconnected');
  const lastPing = ref<number>(0);
  const reconnectAttempts = ref<number>(0);
  const maxReconnectAttempts = ref<number>(5);
  
  // Message queues
  const outgoingQueue = ref<QueuedMessage[]>([]);
  const messageHistory = ref<MessageHistoryEntry[]>([]);
  const eventSubscriptions = ref<Set<string>>(new Set());
  
  // ===== GETTERS =====
  const connectionStatus = computed((): ConnectionStatus => {
    if (!isConnected.value) return 'disconnected';
    
    switch (connectionQuality.value) {
      case 'excellent': return 'connected';
      case 'good': return 'connected';
      case 'poor': return 'unstable';
      default: return 'disconnected';
    }
  });
  
  const canSendMessages = computed(() => {
    return isConnected.value && websocket.value?.readyState === WebSocket.OPEN;
  });
  
  // ===== ACTIONS =====
  const connect = async (url: string): Promise<void> => {
    if (isConnected.value) {
      console.warn('Already connected');
      return;
    }
    
    serverUrl.value = url;
    
    try {
      await establishConnection();
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  };
  
  const disconnect = () => {
    if (websocket.value) {
      websocket.value.close(1000, 'Client disconnect');
    }
    cleanup();
  };
  
  const sendMessage = (message: any): void => {
    const queuedMessage: QueuedMessage = {
      id: generateMessageId(),
      data: message,
      timestamp: Date.now(),
      attempts: 0,
      priority: message.priority || 'normal'
    };
    
    if (canSendMessages.value) {
      sendQueuedMessage(queuedMessage);
    } else {
      outgoingQueue.value.push(queuedMessage);
    }
  };
  
  const sendGameAction = (action: PlayerAction): void => {
    sendMessage({
      type: 'PLAYER_ACTION',
      data: action,
      priority: 'high',
      timestamp: Date.now()
    });
  };
  
  const sendGameEvent = (eventType: string, data: any): void => {
    sendMessage({
      type: 'GAME_EVENT',
      eventType,
      data,
      priority: 'normal',
      timestamp: Date.now()
    });
  };
  
  const subscribeToEvents = (eventPatterns: string[]): void => {
    if (!canSendMessages.value) {
      console.warn('Cannot subscribe: not connected');
      return;
    }
    
    eventPatterns.forEach(pattern => {
      eventSubscriptions.value.add(pattern);
    });
    
    sendMessage({
      type: 'SUBSCRIBE_EVENTS',
      patterns: eventPatterns,
      priority: 'high'
    });
  };
  
  const ping = async (): Promise<number> => {
    if (!canSendMessages.value) return -1;
    
    const startTime = Date.now();
    const pingId = generateMessageId();
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(-1), 5000);
      
      const handlePong = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'PONG' && message.pingId === pingId) {
          clearTimeout(timeout);
          websocket.value?.removeEventListener('message', handlePong);
          const pingTime = Date.now() - startTime;
          latency.value = pingTime;
          updateConnectionQuality(pingTime);
          resolve(pingTime);
        }
      };
      
      websocket.value?.addEventListener('message', handlePong);
      sendMessage({ type: 'PING', pingId, timestamp: startTime });
    });
  };
  
  // ===== PRIVATE METHODS =====
  const establishConnection = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl.value);
      websocket.value = ws;
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        isConnected.value = true;
        connectionId.value = generateConnectionId();
        reconnectAttempts.value = 0;
        
        setupHeartbeat();
        processOutgoingQueue();
        
        console.log('🔗 WebSocket connected');
        resolve();
      };
      
      ws.onmessage = handleIncomingMessage;
      ws.onclose = handleConnectionClose;
      ws.onerror = handleConnectionError;
    });
  };
  
  const handleIncomingMessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      // Add to message history
      messageHistory.value.push({
        type: 'incoming',
        data: message,
        timestamp: Date.now()
      });
      
      // Limit history size
      if (messageHistory.value.length > 100) {
        messageHistory.value.shift();
      }
      
      // Route message based on type
      switch (message.type) {
        case 'GAME_EVENT':
          handleGameEvent(message);
          break;
        case 'ROOM_EVENT':
          handleRoomEvent(message);
          break;
        case 'NOTIFICATION':
          handleNotification(message);
          break;
        case 'PONG':
          // Handled in ping method
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };
  
  const handleGameEvent = (message: any) => {
    const gameStore = useGameStateStore();
    
    switch (message.eventType) {
      case 'game_state_update':
        gameStore.updateGameState(message.data);
        break;
      case 'bomb_exploded':
        gameStore.explodeBomb(message.data.bombId);
        break;
      case 'player_eliminated':
        gameStore.eliminatePlayer(message.data.playerId);
        break;
      case 'objective_updated':
        gameStore.updateObjective(message.data.objectiveId, message.data.progress);
        break;
      default:
        console.log('Unknown game event:', message.eventType);
    }
  };
  
  const handleRoomEvent = (message: any) => {
    const roomStore = useRoomStore();
    
    switch (message.eventType) {
      case 'player_joined':
        roomStore.addPlayer(message.data.player);
        break;
      case 'player_left':
        roomStore.removePlayer(message.data.playerId);
        break;
      case 'game_starting':
        roomStore.setGameStarting(true);
        break;
      default:
        console.log('Unknown room event:', message.eventType);
    }
  };
  
  const handleNotification = (message: any) => {
    const uiStore = useUIStateStore();
    uiStore.showNotification({
      type: message.notificationType,
      title: message.title,
      message: message.message,
      duration: message.duration || 3000
    });
  };
  
  const handleConnectionClose = (event: CloseEvent) => {
    console.log('🔗 WebSocket closed:', event.code, event.reason);
    cleanup();
    
    // Attempt reconnection if not intentional
    if (event.code !== 1000 && reconnectAttempts.value < maxReconnectAttempts.value) {
      setTimeout(() => {
        reconnectAttempts.value++;
        console.log(`🔄 Reconnection attempt ${reconnectAttempts.value}/${maxReconnectAttempts.value}`);
        establishConnection().catch(console.error);
      }, Math.pow(2, reconnectAttempts.value) * 1000); // Exponential backoff
    }
  };
  
  const handleConnectionError = (error: Event) => {
    console.error('🔗 WebSocket error:', error);
  };
  
  const sendQueuedMessage = (queuedMessage: QueuedMessage): void => {
    if (!canSendMessages.value) return;
    
    try {
      websocket.value!.send(JSON.stringify(queuedMessage.data));
      
      // Add to message history
      messageHistory.value.push({
        type: 'outgoing',
        data: queuedMessage.data,
        timestamp: Date.now()
      });
      
      queuedMessage.attempts++;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Re-queue if not too many attempts
      if (queuedMessage.attempts < 3) {
        outgoingQueue.value.unshift(queuedMessage);
      }
    }
  };
  
  const processOutgoingQueue = (): void => {
    // Sort by priority (high first) then timestamp
    outgoingQueue.value.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
    
    // Send all queued messages
    const queue = [...outgoingQueue.value];
    outgoingQueue.value = [];
    
    queue.forEach(message => {
      sendQueuedMessage(message);
    });
  };
  
  const setupHeartbeat = (): void => {
    const heartbeatInterval = setInterval(async () => {
      if (!isConnected.value) {
        clearInterval(heartbeatInterval);
        return;
      }
      
      const pingTime = await ping();
      lastPing.value = Date.now();
      
      if (pingTime === -1) {
        console.warn('Ping timeout - connection may be lost');
      }
    }, 30000); // Ping every 30 seconds
  };
  
  const updateConnectionQuality = (pingTime: number): void => {
    if (pingTime < 100) {
      connectionQuality.value = 'excellent';
    } else if (pingTime < 300) {
      connectionQuality.value = 'good';
    } else if (pingTime < 1000) {
      connectionQuality.value = 'poor';
    } else {
      connectionQuality.value = 'disconnected';
    }
  };
  
  const cleanup = (): void => {
    isConnected.value = false;
    connectionId.value = null;
    websocket.value = null;
    connectionQuality.value = 'disconnected';
    outgoingQueue.value = [];
    eventSubscriptions.value.clear();
  };
  
  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  const generateConnectionId = (): string => {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  return {
    // State
    isConnected: readonly(isConnected),
    connectionId: readonly(connectionId),
    latency: readonly(latency),
    connectionQuality: readonly(connectionQuality),
    reconnectAttempts: readonly(reconnectAttempts),
    messageHistory: readonly(messageHistory),
    
    // Getters
    connectionStatus,
    canSendMessages,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    sendGameAction,
    sendGameEvent,
    subscribeToEvents,
    ping
  };
});
```

### 3. UI State Store

```typescript
// stores/ui/layout.ts
export const useUIStateStore = defineStore('uiState', () => {
  // ===== STATE =====
  const screenType = ref<LayoutType>('mobile-portrait');
  const orientation = ref<'portrait' | 'landscape'>('portrait');
  const screenSize = ref({ width: 0, height: 0 });
  const safeArea = ref<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 });
  
  // UI visibility
  const showHUD = ref(true);
  const showMinimap = ref(true);
  const hudOpacity = ref(0.9);
  const minimapSize = ref(120);
  const touchControlsVisible = ref(false);
  
  // Active UI elements
  const activeMenu = ref<string | null>(null);
  const activeModal = ref<string | null>(null);
  const notifications = ref<UINotification[]>([]);
  
  // Settings
  const gameSettings = ref<GameSettings>({
    pixelArt: true,
    showFPS: false,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    colorBlindSupport: 'none'
  });
  
  const audioSettings = ref<AudioSettings>({
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muteInBackground: true,
    spatialAudio: true
  });
  
  // ===== GETTERS =====
  const isMobile = computed(() => {
    return screenType.value.includes('mobile');
  });
  
  const isLandscape = computed(() => {
    return orientation.value === 'landscape';
  });
  
  const canvasSize = computed(() => {
    const padding = isMobile.value ? 20 : 40;
    const availableWidth = screenSize.value.width - padding;
    const availableHeight = screenSize.value.height - 
      (showHUD.value ? 120 : 0) - padding;
    
    // Square canvas, limited by smaller dimension
    const size = Math.min(availableWidth, availableHeight);
    return { width: size, height: size };
  });
  
  const hudLayout = computed((): HUDLayout => {
    if (isMobile.value) {
      return {
        infoPanel: { position: 'top-left', width: '50%', height: 'auto' },
        minimap: { position: 'top-right', width: `${minimapSize.value}px`, height: `${minimapSize.value}px` },
        additionalInfo: { position: 'bottom', width: '100%', height: 'auto' }
      };
    } else {
      return {
        infoPanel: { position: 'top-left', width: '200px', height: 'auto' },
        minimap: { position: 'top-right', width: `${minimapSize.value}px`, height: `${minimapSize.value}px` },
        additionalInfo: { position: 'bottom-left', width: '200px', height: 'auto' }
      };
    }
  });
  
  // ===== ACTIONS =====
  const updateScreenSize = (): void => {
    screenSize.value = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    updateOrientation();
    updateScreenType();
    updateSafeArea();
  };
  
  const updateOrientation = (): void => {
    orientation.value = screenSize.value.width > screenSize.value.height 
      ? 'landscape' : 'portrait';
  };
  
  const updateScreenType = (): void => {
    const width = screenSize.value.width;
    const height = screenSize.value.height;
    const isPortrait = orientation.value === 'portrait';
    
    if (width <= 768) {
      screenType.value = isPortrait ? 'mobile-portrait' : 'mobile-landscape';
    } else if (width <= 1024) {
      screenType.value = isPortrait ? 'tablet-portrait' : 'tablet-landscape';
    } else {
      screenType.value = 'desktop';
    }
    
    // Update touch controls visibility
    touchControlsVisible.value = screenType.value.includes('mobile');
  };
  
  const updateSafeArea = (): void => {
    // Use CSS env() values if available
    const computedStyle = getComputedStyle(document.documentElement);
    
    safeArea.value = {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-top')) || 0,
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-bottom')) || 0,
      left: parseInt(computedStyle.getPropertyValue('--safe-area-left')) || 0,
      right: parseInt(computedStyle.getPropertyValue('--safe-area-right')) || 0
    };
  };
  
  const showNotification = (notification: Omit<UINotification, 'id' | 'timestamp'>): void => {
    const fullNotification: UINotification = {
      id: generateNotificationId(),
      timestamp: Date.now(),
      ...notification
    };
    
    notifications.value.push(fullNotification);
    
    // Auto-dismiss if duration is set
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        dismissNotification(fullNotification.id);
      }, fullNotification.duration);
    }
    
    // Limit notification count
    if (notifications.value.length > 5) {
      notifications.value.shift();
    }
  };
  
  const dismissNotification = (notificationId: string): void => {
    const index = notifications.value.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };
  
  const toggleMinimap = (): void => {
    showMinimap.value = !showMinimap.value;
  };
  
  const setMinimapSize = (size: number): void => {
    minimapSize.value = Math.max(80, Math.min(200, size));
  };
  
  const setHUDOpacity = (opacity: number): void => {
    hudOpacity.value = Math.max(0.1, Math.min(1.0, opacity));
  };
  
  const openModal = (modalId: string): void => {
    activeModal.value = modalId;
  };
  
  const closeModal = (): void => {
    activeModal.value = null;
  };
  
  const setActiveMenu = (menuId: string | null): void => {
    activeMenu.value = menuId;
  };
  
  const updateGameSettings = (settings: Partial<GameSettings>): void => {
    gameSettings.value = { ...gameSettings.value, ...settings };
    
    // Persist to localStorage
    localStorage.setItem('bomberman-game-settings', JSON.stringify(gameSettings.value));
  };
  
  const updateAudioSettings = (settings: Partial<AudioSettings>): void => {
    audioSettings.value = { ...audioSettings.value, ...settings };
    
    // Persist to localStorage
    localStorage.setItem('bomberman-audio-settings', JSON.stringify(audioSettings.value));
    
    // Apply to audio store
    const audioStore = useAudioStore();
    audioStore.updateSettings(audioSettings.value);
  };
  
  const loadSettings = (): void => {
    // Load game settings
    const savedGameSettings = localStorage.getItem('bomberman-game-settings');
    if (savedGameSettings) {
      try {
        gameSettings.value = { ...gameSettings.value, ...JSON.parse(savedGameSettings) };
      } catch (error) {
        console.warn('Failed to load game settings:', error);
      }
    }
    
    // Load audio settings
    const savedAudioSettings = localStorage.getItem('bomberman-audio-settings');
    if (savedAudioSettings) {
      try {
        audioSettings.value = { ...audioSettings.value, ...JSON.parse(savedAudioSettings) };
      } catch (error) {
        console.warn('Failed to load audio settings:', error);
      }
    }
  };
  
  const generateNotificationId = (): string => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Initialize screen size detection
  const initializeLayout = (): void => {
    updateScreenSize();
    loadSettings();
    
    // Listen for resize events
    window.addEventListener('resize', updateScreenSize);
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(updateScreenSize, 100); // Delay for orientation change completion
    });
  };
  
  return {
    // State
    screenType: readonly(screenType),
    orientation: readonly(orientation),
    screenSize: readonly(screenSize),
    safeArea: readonly(safeArea),
    showHUD: readonly(showHUD),
    showMinimap: readonly(showMinimap),
    hudOpacity: readonly(hudOpacity),
    minimapSize: readonly(minimapSize),
    touchControlsVisible: readonly(touchControlsVisible),
    activeMenu: readonly(activeMenu),
    activeModal: readonly(activeModal),
    notifications: readonly(notifications),
    gameSettings: readonly(gameSettings),
    audioSettings: readonly(audioSettings),
    
    // Getters
    isMobile,
    isLandscape,
    canvasSize,
    hudLayout,
    
    // Actions
    updateScreenSize,
    showNotification,
    dismissNotification,
    toggleMinimap,
    setMinimapSize,
    setHUDOpacity,
    openModal,
    closeModal,
    setActiveMenu,
    updateGameSettings,
    updateAudioSettings,
    loadSettings,
    initializeLayout
  };
});
```

## Store Type Definitions

```typescript
// types/stores.d.ts
interface GameState {
  gameId: string;
  gameStatus: GameStatus;
  gameTimer: number;
  maze: MazeData;
  players: Map<PlayerId, PlayerGameState>;
  bombs: Map<BombId, BombState>;
  powerUps: PowerUp[];
  monsters: Monster[];
  boss: Boss | null;
  gates: Gate[];
  settings: GameSettings;
  objectives: Objective[];
  teamProgress: number;
  sharedResources: SharedResources;
}

interface GameStateDelta {
  players?: Map<PlayerId, Partial<PlayerGameState>>;
  bombs?: Map<BombId, BombState>;
  powerUps?: PowerUp[];
  monsters?: Monster[];
  boss?: Boss | null;
  objectives?: Objective[];
  timer?: number;
}

interface PlayerGameState {
  id: PlayerId;
  name: string;
  position: Position;
  health: number;
  maxHealth: number;
  isAlive: boolean;
  lives: number;
  bombsPlaced: number;
  maxBombs: number;
  bombRange: number;
  speed: number;
  powerUps: PowerUpEffect[];
  score: number;
  eliminatedAt: number | null;
}

interface SharedResources {
  teamLives: number;
  teamScore: number;
  unlockedAreas: Set<string>;
}

interface TeamStatus {
  playersAlive: number;
  totalPlayers: number;
  averageHealth: number;
  teamLives: number;
  teamScore: number;
}

interface UINotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  persistent?: boolean;
}

interface HUDLayout {
  infoPanel: {
    position: string;
    width: string;
    height: string;
  };
  minimap: {
    position: string;
    width: string;
    height: string;
  };
  additionalInfo: {
    position: string;
    width: string;
    height: string;
  };
}

interface QueuedMessage {
  id: string;
  data: any;
  timestamp: number;
  attempts: number;
  priority: 'high' | 'normal' | 'low';
}

interface MessageHistoryEntry {
  type: 'incoming' | 'outgoing';
  data: any;
  timestamp: number;
}

type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';
type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'unstable';
type GameStatus = 'waiting' | 'starting' | 'playing' | 'paused' | 'ended';
type GamePhase = 'exploration' | 'gate_search' | 'monster_waves' | 'boss_fight';
type LayoutType = 'mobile-portrait' | 'mobile-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
```

## Store Composition and Performance

```typescript
// stores/index.ts
export const useStores = () => {
  const gameState = useGameStateStore();
  const connection = useConnectionStore();
  const player = usePlayerStore();
  const ui = useUIStateStore();
  const audio = useAudioStore();
  const room = useRoomStore();
  
  return {
    gameState,
    connection,
    player,
    ui,
    audio,
    room
  };
};

// Performance optimizations
export const setupStoreOptimizations = () => {
  // Batch state updates
  const gameState = useGameStateStore();
  const connection = useConnectionStore();
  
  // Debounce frequent updates
  const debouncedUpdateGameState = debounce(gameState.updateGameState, 16); // 60fps
  
  // Subscribe to connection events
  connection.subscribeToEvents([
    'GAME_STATE.*',
    'ROOM_EVENT.*',
    'USER_NOTIFICATION.*'
  ]);
};
```

This comprehensive Pinia store architecture provides:

1. **Reactive State Management** with Vue 3 composition API
2. **Performance Optimizations** using Maps, computed properties, and batching
3. **WebSocket Integration** with automatic reconnection and message queuing
4. **Cooperative Gameplay Support** with shared resources and team objectives
5. **Mobile-First UI Management** with responsive layout detection
6. **Comprehensive Type Safety** with TypeScript interfaces
7. **Persistent Settings** with localStorage integration
8. **Real-time Synchronization** with server-side events

The stores work together to provide seamless cooperative multiplayer gameplay across all devices.

---

**Next Steps**: Continue with [Responsive Design & Mobile-First Layouts →](04-responsive-design.md) to understand the CSS architecture and adaptive layouts.