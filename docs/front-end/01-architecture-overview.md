# Frontend Architecture Overview

> **Navigation**: [🏠 Frontend Docs](README.md) → **Architecture Overview** → [Component Structure →](02-component-structure.md) - Cooperative Multiplayer Bomberman

Comprehensive architecture for the cooperative multiplayer Bomberman game frontend, built with Vue 3, TypeScript, and mobile-first design principles.

## Architecture Overview

### Technology Stack
- **Vue 3**: Composition API with TypeScript
- **Pinia**: Modern state management (replaces Vuex)
- **Vite**: Build tool and development server
- **Canvas API**: Game rendering with 8-bit pixel art
- **WebSocket**: Real-time communication with EventBus integration
- **PWA**: Progressive Web App capabilities
- **Vitest**: Testing framework with component testing

### Mobile-First Design Principles

#### Screen Layout Strategy
```
Mobile Portrait (Priority 1):
┌─────────────────────┐
│ Info    │  Minimap  │ <- Top bar (fixed)
├─────────┴───────────┤
│                     │
│    Game Canvas      │ <- Square, centered
│     (8-bit view)    │
│                     │
├─────────────────────┤
│   Additional Info   │ <- Bottom bar (fixed)
└─────────────────────┘

Desktop Landscape:
┌─────┬───────────────┬─────┐
│Info │               │Mini │ <- Top corners
├─────┤  Game Canvas  ├─────┤
│Add'l│  (centered)   │     │
│Info │               │     │
└─────┴───────────────┴─────┘
```

#### Input Strategy
- **Mobile**: First finger = movement (drag), Second finger = bomb (tap)
- **Desktop**: Arrow keys = movement, Spacebar = bomb
- **Unified**: Touch and keyboard events processed through same action system

## Component Architecture

### 1. Application Structure

```
src/
├── main.ts                    # Vue 3 app initialization
├── App.vue                    # Root component with layout detection
├── components/                # Reusable UI components
│   ├── game/                  # Game-specific components
│   ├── ui/                    # Generic UI components
│   └── layout/               # Layout and navigation
├── views/                     # Page-level components
├── composables/               # Vue 3 composition functions
├── stores/                    # Pinia state management
├── services/                  # API and WebSocket services
├── utils/                     # Utility functions
├── types/                     # TypeScript type definitions
└── assets/                    # Static assets (sprites, sounds)
```

### 2. Core Game Components

#### GameCanvas.vue
```typescript
// Primary game rendering component
interface GameCanvasProps {
  width: number;
  height: number;
  gameState: GameState;
  playerPerspective: PlayerId;
  visibilityRadius: number;
}

// Responsibilities:
// - 8-bit pixel art rendering with limited visibility
// - Player positions, bombs, power-ups, monsters
// - Explosion animations and visual effects
// - Boss rendering with phase indicators
// - Performance optimization with viewport culling
```

#### GameHUD.vue
```typescript
// Heads-up display overlay
interface GameHUDProps {
  playerStats: PlayerStats;
  gameTimer: number;
  cooperativeObjectives: Objective[];
  teamStatus: TeamStatus;
}

// Mobile Layout:
// - Top-left: Player health, bomb count, power-ups
// - Top-right: Minimap component
// - Bottom: Cooperative objectives, team status
```

#### Minimap.vue
```typescript
// Strategic overview with fog of war
interface MinimapProps {
  mazeLayout: MazeData;
  playerPositions: Record<PlayerId, Position>;
  exploredAreas: Position[];
  visibleMonsters: Monster[];
  gates: Gate[];
  size: { width: number; height: number };
}

// Features:
// - Fog of war showing only explored areas
// - Player positions with different colors
// - Monster threat indicators
// - Gate locations and status
// - Click/tap navigation (desktop/mobile)
```

#### TouchControls.vue
```typescript
// Mobile-specific touch interface
interface TouchControlsProps {
  canvasElement: HTMLCanvasElement;
  playerPosition: Position;
  isGameActive: boolean;
}

// Touch Logic:
// - First finger: Movement joystick overlay
// - Second finger: Bomb placement at player position
// - Haptic feedback for actions
// - Visual feedback for touch areas
```

### 3. Layout Components

#### ResponsiveGameLayout.vue
```typescript
// Adaptive layout based on screen orientation and size
interface LayoutProps {
  screenType: 'mobile-portrait' | 'mobile-landscape' | 'desktop';
  gameState: 'menu' | 'lobby' | 'playing' | 'paused';
}

// Layout Logic:
// - Detects device type and orientation
// - Applies appropriate CSS Grid/Flexbox layouts
// - Manages component positioning and sizing
// - Handles safe area insets for mobile devices
```

#### GameInfoPanels.vue
```typescript
// Information panels with responsive positioning
interface InfoPanelsProps {
  screenType: LayoutType;
  gameInfo: GameInformation;
  playerStats: PlayerStats;
  teamInfo: TeamInformation;
}

// Panel Contents:
// - Player health, lives, power-ups
// - Cooperative objectives
// - Team member status
// - Game timer and score
// - Connection status
```

### 4. Menu and Navigation

#### MainMenu.vue
```typescript
// Entry point with room management
interface MainMenuState {
  playerName: string;
  roomCode?: string;
  availableRooms: Room[];
  connectionStatus: ConnectionStatus;
}

// Features:
// - Create/join room functionality
// - Player name input
// - Room browser
// - Settings access
// - PWA install prompt
```

#### GameLobby.vue
```typescript
// Pre-game lobby with team coordination
interface GameLobbyProps {
  room: Room;
  players: Player[];
  gameSettings: GameSettings;
  isHost: boolean;
}

// Features:
// - Player list with ready status
// - Game settings (if host)
// - Room sharing (URL/QR code)
// - Chat functionality
// - Start game coordination
```

### 5. UI Components

#### PlayerList.vue
```typescript
// Cooperative team member display
interface PlayerListProps {
  players: Player[];
  currentPlayerId: PlayerId;
  showStatus: boolean;
}

// Information per player:
// - Name and avatar
// - Health and lives
// - Power-up status
// - Connection quality
// - Ready/Active status
```

#### ObjectiveTracker.vue
```typescript
// Cooperative game objectives
interface ObjectiveTrackerProps {
  objectives: Objective[];
  progress: ObjectiveProgress;
  timeRemaining?: number;
}

// Objective Types:
// - Defeat boss enemy
// - Find exit gates
// - Survive monster waves
// - Collect required items
// - Team-based goals
```

#### NotificationSystem.vue
```typescript
// In-game notifications and alerts
interface NotificationProps {
  notifications: GameNotification[];
  position: 'top' | 'center' | 'bottom';
}

// Notification Types:
// - Achievement unlocked
// - Player eliminated/respawned
// - Cooperative events
// - System messages
// - Error alerts
```

## State Management (Pinia Stores)

### 1. Game State Store

```typescript
// stores/gameState.ts
interface GameStateStore {
  // Current game state
  gameId: string | null;
  gameStatus: GameStatus;
  maze: MazeData;
  players: Record<PlayerId, PlayerGameState>;
  bombs: Record<BombId, BombState>;
  powerUps: PowerUp[];
  monsters: Monster[];
  boss: Boss | null;
  gates: Gate[];
  
  // Game settings
  settings: GameSettings;
  objectives: Objective[];
  cooperativeMode: boolean;
  
  // Actions
  updateGameState(delta: GameStateDelta): void;
  placeBomb(position: Position): void;
  movePlayer(direction: Direction): void;
  collectPowerUp(powerUpId: string): void;
  
  // Getters
  currentPlayer: ComputedRef<PlayerGameState>;
  visibleArea: ComputedRef<Position[]>;
  teamStatus: ComputedRef<TeamStatus>;
  gameProgress: ComputedRef<number>;
}
```

### 2. Connection Store

```typescript
// stores/connection.ts
interface ConnectionStore {
  // Connection state
  isConnected: boolean;
  connectionId: string | null;
  playerId: string | null;
  latency: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  
  // Room state
  room: Room | null;
  roomPlayers: Player[];
  isHost: boolean;
  
  // WebSocket management
  websocket: WebSocket | null;
  reconnectAttempts: number;
  lastPing: number;
  
  // Actions
  connect(serverUrl: string): Promise<void>;
  disconnect(): void;
  joinRoom(roomCode: string): Promise<void>;
  createRoom(settings: RoomSettings): Promise<void>;
  sendMessage(message: any): void;
  
  // Event handlers
  handleGameEvent(event: GameEvent): void;
  handleConnectionEvent(event: ConnectionEvent): void;
}
```

### 3. Player Store

```typescript
// stores/player.ts
interface PlayerStore {
  // Player identity
  playerId: string;
  playerName: string;
  avatar: string;
  
  // Game state
  position: Position;
  health: number;
  lives: number;
  powerUps: PowerUpEffect[];
  abilities: PlayerAbilities;
  score: number;
  
  // Input state
  currentInput: InputState;
  lastAction: PlayerAction | null;
  inputBuffer: PlayerAction[];
  
  // Statistics
  stats: PlayerStats;
  achievements: Achievement[];
  
  // Actions
  updatePosition(newPosition: Position): void;
  takeDamage(damage: number): void;
  applyPowerUp(powerUp: PowerUpEffect): void;
  addScore(points: number): void;
  
  // Input actions
  processInput(input: InputEvent): void;
  queueAction(action: PlayerAction): void;
  sendActionToServer(): void;
}
```

### 4. UI State Store

```typescript
// stores/uiState.ts
interface UIStateStore {
  // Layout state
  screenType: LayoutType;
  orientation: 'portrait' | 'landscape';
  screenSize: { width: number; height: number };
  safeArea: { top: number; bottom: number; left: number; right: number };
  
  // UI state
  activeMenu: string | null;
  showMinimap: boolean;
  minimapSize: number;
  notifications: GameNotification[];
  modals: ModalState[];
  
  // Game UI
  showHUD: boolean;
  hudOpacity: number;
  touchControlsVisible: boolean;
  keyboardShortcuts: boolean;
  
  // Settings
  gameSettings: GameSettings;
  displaySettings: DisplaySettings;
  audioSettings: AudioSettings;
  
  // Actions
  updateScreenSize(): void;
  toggleMinimap(): void;
  showNotification(notification: GameNotification): void;
  openModal(modal: ModalState): void;
  updateSettings(settings: Partial<GameSettings>): void;
}
```

### 5. Audio Store

```typescript
// stores/audio.ts
interface AudioStore {
  // Audio state
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  
  // Audio context
  audioContext: AudioContext | null;
  currentMusic: HTMLAudioElement | null;
  soundEffects: Record<string, HTMLAudioElement>;
  
  // 8-bit audio assets
  musicTracks: AudioTrack[];
  soundLibrary: SoundEffect[];
  
  // Actions
  playMusic(trackId: string): void;
  playSound(soundId: string, volume?: number): void;
  stopMusic(): void;
  setVolume(type: 'master' | 'music' | 'sfx', volume: number): void;
  toggleMute(): void;
  
  // Dynamic audio
  playExplosion(position: Position): void;
  playFootsteps(surface: SurfaceType): void;
  playBossMusic(bossType: BossType): void;
}
```

## Composables (Vue 3 Composition API)

### 1. Game Logic Composables

```typescript
// composables/useGameRenderer.ts
export function useGameRenderer(canvas: Ref<HTMLCanvasElement | null>) {
  const ctx = ref<CanvasRenderingContext2D | null>(null);
  const sprites = ref<SpriteSheet | null>(null);
  const animationFrame = ref<number | null>(null);
  
  const initRenderer = async () => {
    // Initialize 2D context and load sprites
  };
  
  const render = (gameState: GameState, deltaTime: number) => {
    // Render game with 8-bit pixel art style
  };
  
  const renderPlayer = (player: PlayerGameState) => {
    // Render player with animations
  };
  
  const renderMaze = (maze: MazeData, viewPort: ViewPort) => {
    // Render maze with visibility limits
  };
  
  return {
    ctx: readonly(ctx),
    initRenderer,
    render,
    renderPlayer,
    renderMaze
  };
}
```

```typescript
// composables/useInputHandler.ts
export function useInputHandler() {
  const inputState = ref<InputState>({
    movement: { x: 0, y: 0 },
    bombPressed: false,
    touchActive: false,
    keyboardActive: false
  });
  
  const setupTouchControls = (element: HTMLElement) => {
    // Multi-touch gesture handling
    // First finger: movement
    // Second finger: bomb placement
  };
  
  const setupKeyboardControls = () => {
    // Arrow keys for movement
    // Spacebar for bomb placement
  };
  
  const processInput = (deltaTime: number): PlayerAction[] => {
    // Convert input state to game actions
  };
  
  return {
    inputState: readonly(inputState),
    setupTouchControls,
    setupKeyboardControls,
    processInput
  };
}
```

```typescript
// composables/useWebSocket.ts
export function useWebSocket() {
  const connectionStore = useConnectionStore();
  const gameStore = useGameStateStore();
  
  const connect = async (url: string) => {
    // Establish WebSocket connection
    // Set up event handlers
  };
  
  const sendGameAction = (action: PlayerAction) => {
    // Send action to server via WebSocket
  };
  
  const handleGameEvent = (event: GameEvent) => {
    // Process incoming game events
    // Update stores accordingly
  };
  
  const handleConnectionEvent = (event: ConnectionEvent) => {
    // Handle connection state changes
  };
  
  return {
    connect,
    sendGameAction,
    handleGameEvent,
    handleConnectionEvent
  };
}
```

### 2. UI Composables

```typescript
// composables/useResponsiveLayout.ts
export function useResponsiveLayout() {
  const screenType = ref<LayoutType>('mobile-portrait');
  const screenSize = ref({ width: 0, height: 0 });
  const orientation = ref<'portrait' | 'landscape'>('portrait');
  
  const updateLayout = () => {
    // Detect screen size, orientation
    // Determine layout type
    // Update CSS custom properties
  };
  
  const getCanvasSize = (): { width: number; height: number } => {
    // Calculate optimal canvas size for current layout
  };
  
  const getComponentPositions = () => {
    // Return positioning for HUD components
  };
  
  return {
    screenType: readonly(screenType),
    screenSize: readonly(screenSize),
    orientation: readonly(orientation),
    updateLayout,
    getCanvasSize,
    getComponentPositions
  };
}
```

```typescript
// composables/useGameAudio.ts
export function useGameAudio() {
  const audioStore = useAudioStore();
  
  const playActionSound = (action: PlayerActionType) => {
    // Play sound for player actions
  };
  
  const playAmbientSounds = (gameState: GameState) => {
    // Background audio based on game state
  };
  
  const playCooperativeAudio = (event: CooperativeEvent) => {
    // Audio cues for team coordination
  };
  
  return {
    playActionSound,
    playAmbientSounds,
    playCooperativeAudio
  };
}
```

## Responsive Design System

### 1. CSS Custom Properties

```css
/* styles/responsive.css */
:root {
  /* Layout breakpoints */
  --mobile-max: 768px;
  --tablet-max: 1024px;
  
  /* Game canvas sizing */
  --canvas-size-mobile: min(90vw, 90vh);
  --canvas-size-desktop: min(60vh, 60vw);
  
  /* Component positioning */
  --hud-padding: 1rem;
  --minimap-size: 120px;
  --info-panel-width: 200px;
  
  /* Safe area handling */
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
  --safe-area-right: env(safe-area-inset-right);
}

/* Mobile-first responsive classes */
.mobile-portrait {
  display: grid;
  grid-template-areas: 
    "info minimap"
    "game game"
    "additional additional";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr auto;
}

.desktop-landscape {
  display: grid;
  grid-template-areas:
    "left-info game minimap"
    "additional game spacer";
  grid-template-columns: var(--info-panel-width) 1fr var(--minimap-size);
  grid-template-rows: 1fr auto;
}
```

### 2. Component Layouts

```vue
<!-- components/layout/ResponsiveGameLayout.vue -->
<template>
  <div 
    :class="layoutClass"
    :style="layoutStyles"
  >
    <!-- Game info panel -->
    <div class="info-panel">
      <PlayerStats />
      <GameTimer />
      <ObjectiveTracker />
    </div>
    
    <!-- Main game canvas -->
    <div class="game-container">
      <GameCanvas 
        :width="canvasSize.width"
        :height="canvasSize.height"
        @touch-move="handleTouchMove"
        @touch-bomb="handleTouchBomb"
      />
      <TouchControls 
        v-if="isMobile"
        :canvas-element="gameCanvas"
      />
    </div>
    
    <!-- Minimap -->
    <div class="minimap-container">
      <Minimap 
        :size="minimapSize"
        :game-state="gameState"
      />
    </div>
    
    <!-- Additional info (bottom/side) -->
    <div class="additional-info">
      <TeamStatus />
      <ConnectionInfo />
    </div>
  </div>
</template>
```

## Input System Architecture

### 1. Touch Input Handling

```typescript
// services/TouchInputService.ts
export class TouchInputService {
  private firstTouch: Touch | null = null;
  private secondTouch: Touch | null = null;
  private movementOrigin: Position | null = null;
  private movementThreshold = 10; // pixels
  
  handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      this.firstTouch = event.touches[0];
      this.movementOrigin = {
        x: this.firstTouch.clientX,
        y: this.firstTouch.clientY
      };
    } else if (event.touches.length === 2) {
      this.secondTouch = event.touches[1];
      // Second touch triggers bomb placement
      this.triggerBombPlacement();
    }
  }
  
  handleTouchMove(event: TouchEvent) {
    if (!this.firstTouch || !this.movementOrigin) return;
    
    const currentTouch = event.touches[0];
    const deltaX = currentTouch.clientX - this.movementOrigin.x;
    const deltaY = currentTouch.clientY - this.movementOrigin.y;
    
    if (Math.abs(deltaX) > this.movementThreshold || 
        Math.abs(deltaY) > this.movementThreshold) {
      this.processMovement(deltaX, deltaY);
    }
  }
  
  private processMovement(deltaX: number, deltaY: number) {
    const direction = this.calculateDirection(deltaX, deltaY);
    // Send movement action to game store
  }
  
  private triggerBombPlacement() {
    // Send bomb action to game store
    // Provide haptic feedback if available
  }
}
```

### 2. Keyboard Input Handling

```typescript
// services/KeyboardInputService.ts
export class KeyboardInputService {
  private activeKeys = new Set<string>();
  private keyMappings = {
    'ArrowUp': 'move_up',
    'ArrowDown': 'move_down',
    'ArrowLeft': 'move_left',
    'ArrowRight': 'move_right',
    'Space': 'place_bomb',
    'KeyW': 'move_up',
    'KeyS': 'move_down',
    'KeyA': 'move_left',
    'KeyD': 'move_right'
  };
  
  handleKeyDown(event: KeyboardEvent) {
    event.preventDefault();
    const action = this.keyMappings[event.code];
    if (action && !this.activeKeys.has(event.code)) {
      this.activeKeys.add(event.code);
      this.processAction(action, true);
    }
  }
  
  handleKeyUp(event: KeyboardEvent) {
    const action = this.keyMappings[event.code];
    if (action && this.activeKeys.has(event.code)) {
      this.activeKeys.delete(event.code);
      this.processAction(action, false);
    }
  }
  
  private processAction(action: string, pressed: boolean) {
    // Convert keyboard action to game action
    // Send to input handler
  }
}
```

## PWA Integration

### 1. Service Worker for Offline Support

```typescript
// public/sw.js - Service Worker
const CACHE_NAME = 'bomberman-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/sprites.png',
  '/assets/sounds.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // Network-first strategy for game data
  // Cache-first for static assets
});
```

### 2. PWA Manifest

```json
{
  "name": "Cooperative Bomberman",
  "short_name": "Bomberman",
  "description": "Multiplayer cooperative Bomberman game",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a1a",
  "background_color": "#000000",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["games", "entertainment"],
  "lang": "en"
}
```

## Performance Optimization

### 1. Canvas Rendering Optimization

```typescript
// services/RenderOptimization.ts
export class RenderOptimizationService {
  private offscreenCanvas: OffscreenCanvas;
  private spriteCache = new Map<string, ImageBitmap>();
  private viewportCulling = true;
  
  optimizeRendering(gameState: GameState, viewport: ViewPort) {
    // Only render entities within viewport
    const visibleEntities = this.cullEntities(gameState, viewport);
    
    // Batch similar rendering operations
    this.batchRender(visibleEntities);
    
    // Use sprite caching for repeated elements
    this.cacheSprites();
  }
  
  private cullEntities(gameState: GameState, viewport: ViewPort) {
    // Remove entities outside visible area
    // Implement frustum culling
  }
}
```

### 2. State Management Optimization

```typescript
// stores/optimizations.ts
export const gameStateStore = defineStore('gameState', {
  state: () => ({
    // Use Maps for O(1) lookups
    players: new Map<PlayerId, PlayerGameState>(),
    bombs: new Map<BombId, BombState>(),
    
    // Separate frequently updated data
    playerPositions: new Map<PlayerId, Position>(),
    animationStates: new Map<EntityId, AnimationState>()
  }),
  
  actions: {
    // Batch updates to minimize reactivity triggers
    batchUpdatePositions(updates: PositionUpdate[]) {
      updates.forEach(update => {
        this.playerPositions.set(update.playerId, update.position);
      });
    },
    
    // Delta updates instead of full state replacement
    applyGameStateDelta(delta: GameStateDelta) {
      // Only update changed properties
    }
  }
});
```

This comprehensive frontend architecture provides:

1. **Mobile-First Design** with adaptive layouts
2. **Unified Input System** for touch and keyboard
3. **Component-Based Architecture** with clear separation
4. **Performance Optimization** with canvas rendering and state management
5. **PWA Capabilities** for installation and offline support
6. **TypeScript Integration** for type safety
7. **Comprehensive Testing Strategy** preparation

---

**Next Steps**: Continue with [Component Structure & Interfaces →](02-component-structure.md) to understand the Vue 3 component hierarchy and TypeScript interfaces.

The architecture follows Vue 3 best practices, implements the cooperative gameplay requirements, and provides excellent user experience across all devices and screen sizes.