# Vue Component Structure & Interfaces

Comprehensive component organization for the cooperative multiplayer Bomberman frontend with TypeScript interfaces and testing strategy.

## Component Tree Structure

```
App.vue (Root)
├── RouterView
├── NotificationSystem.vue
└── PWAInstallPrompt.vue

Views (Pages):
├── MainMenuView.vue
│   ├── MainMenu.vue
│   ├── PlayerSetup.vue
│   └── RoomBrowser.vue
│
├── GameLobbyView.vue
│   ├── GameLobby.vue
│   ├── PlayerList.vue
│   ├── GameSettings.vue
│   └── ChatComponent.vue
│
└── GameView.vue (Main Game)
    ├── ResponsiveGameLayout.vue
    │   ├── GameInfoPanels.vue
    │   │   ├── PlayerStats.vue
    │   │   ├── GameTimer.vue
    │   │   ├── ObjectiveTracker.vue
    │   │   └── TeamStatus.vue
    │   │
    │   ├── GameCanvas.vue (Core)
    │   │   ├── TouchControls.vue (Mobile)
    │   │   └── GameRenderer (Composable)
    │   │
    │   ├── Minimap.vue
    │   │   ├── MinimapRenderer.vue
    │   │   └── FogOfWar.vue
    │   │
    │   └── AdditionalInfo.vue
    │       ├── ConnectionInfo.vue
    │       └── GameActions.vue
    │
    └── GameModals.vue
        ├── PauseMenu.vue
        ├── GameOverModal.vue
        └── SettingsModal.vue
```

## Core Component Interfaces

### 1. Game Canvas System

#### GameCanvas.vue
```typescript
interface GameCanvasProps {
  /** Canvas dimensions */
  width: number;
  height: number;
  
  /** Current game state */
  gameState: GameState;
  
  /** Player perspective for limited visibility */
  playerPerspective: PlayerId;
  
  /** Visibility radius in tiles */
  visibilityRadius: number;
  
  /** Render settings */
  pixelArt: boolean;
  showDebugInfo: boolean;
  
  /** Performance settings */
  targetFPS: number;
  enableCulling: boolean;
}

interface GameCanvasEmits {
  /** Touch movement for mobile */
  touchMove: [direction: Direction, intensity: number];
  
  /** Touch bomb placement for mobile */
  touchBomb: [position: Position];
  
  /** Canvas interaction events */
  canvasClick: [worldPosition: Position];
  
  /** Rendering performance events */
  fpsUpdate: [fps: number];
  renderError: [error: Error];
}

interface GameCanvasSlots {
  /** Overlay content above canvas */
  overlay: {};
  
  /** Debug information display */
  debug: { fps: number; entityCount: number };
}
```

#### TouchControls.vue
```typescript
interface TouchControlsProps {
  /** Canvas element for coordinate mapping */
  canvasElement: HTMLCanvasElement;
  
  /** Current player position for bomb placement */
  playerPosition: Position;
  
  /** Game state controls */
  isGameActive: boolean;
  isPaused: boolean;
  
  /** Control settings */
  movementSensitivity: number;
  hapticFeedback: boolean;
  showVisualFeedback: boolean;
  
  /** Touch control layout */
  joystickSize: number;
  bombButtonSize: number;
}

interface TouchControlsEmits {
  /** Movement input */
  move: [direction: Direction];
  moveStop: [];
  
  /** Bomb placement */
  placeBomb: [];
  
  /** Control feedback */
  haptic: [type: 'light' | 'medium' | 'heavy'];
}

// Internal state management
interface TouchState {
  firstTouch: {
    id: number;
    startPosition: Position;
    currentPosition: Position;
    isActive: boolean;
  } | null;
  
  secondTouch: {
    id: number;
    position: Position;
    timestamp: number;
  } | null;
  
  movementVector: {
    x: number;
    y: number;
    magnitude: number;
  };
}
```

### 2. HUD and Information Components

#### GameInfoPanels.vue
```typescript
interface GameInfoPanelsProps {
  /** Current layout type */
  screenType: LayoutType;
  
  /** Game information */
  gameInfo: {
    timer: number;
    score: number;
    level: number;
    difficulty: string;
  };
  
  /** Current player stats */
  playerStats: PlayerStats;
  
  /** Team information */
  teamInfo: {
    members: TeamMember[];
    objectives: Objective[];
    overallProgress: number;
  };
  
  /** Display settings */
  showAdvancedStats: boolean;
  compactMode: boolean;
}

interface PlayerStats {
  health: number;
  maxHealth: number;
  lives: number;
  bombCount: number;
  bombRange: number;
  speed: number;
  powerUps: PowerUpEffect[];
  score: number;
  kills: number;
  deaths: number;
}
```

#### Minimap.vue
```typescript
interface MinimapProps {
  /** Minimap dimensions */
  size: {
    width: number;
    height: number;
  };
  
  /** Current game state for rendering */
  gameState: GameState;
  
  /** Player perspective for fog of war */
  playerPerspective: PlayerId;
  
  /** Explored areas (fog of war) */
  exploredAreas: Position[];
  
  /** Display options */
  showPlayers: boolean;
  showMonsters: boolean;
  showPowerUps: boolean;
  showBombs: boolean;
  showGates: boolean;
  
  /** Interaction settings */
  allowNavigation: boolean;
  showGrid: boolean;
}

interface MinimapEmits {
  /** Navigation clicks/taps */
  navigate: [worldPosition: Position];
  
  /** Zoom controls */
  zoomIn: [];
  zoomOut: [];
  
  /** Minimap settings */
  toggleLayer: [layer: MinimapLayer];
}

enum MinimapLayer {
  Players = 'players',
  Monsters = 'monsters',
  PowerUps = 'powerups',
  Bombs = 'bombs',
  Gates = 'gates',
  Objectives = 'objectives'
}
```

#### ObjectiveTracker.vue
```typescript
interface ObjectiveTrackerProps {
  /** Current objectives */
  objectives: Objective[];
  
  /** Overall progress */
  progress: ObjectiveProgress;
  
  /** Time limits */
  timeRemaining?: number;
  globalTimer?: number;
  
  /** Display settings */
  showProgress: boolean;
  showDetails: boolean;
  compactView: boolean;
}

interface Objective {
  id: string;
  type: ObjectiveType;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  isRequired: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeLimit?: number;
  rewards?: ObjectiveReward[];
}

enum ObjectiveType {
  DefeatBoss = 'defeat_boss',
  FindGates = 'find_gates',
  SurviveWaves = 'survive_waves',
  CollectItems = 'collect_items',
  CooperativeAction = 'cooperative_action',
  TimeChallenge = 'time_challenge'
}
```

### 3. Layout and Navigation Components

#### ResponsiveGameLayout.vue
```typescript
interface ResponsiveGameLayoutProps {
  /** Current screen configuration */
  screenType: LayoutType;
  orientation: 'portrait' | 'landscape';
  
  /** Layout customization */
  hudOpacity: number;
  minimapPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  infoPosition: 'top' | 'left' | 'right';
  
  /** Safe area handling */
  respectSafeArea: boolean;
  safeAreaInsets: SafeAreaInsets;
  
  /** Performance settings */
  enableAnimations: boolean;
  reducedMotion: boolean;
}

enum LayoutType {
  MobilePortrait = 'mobile-portrait',
  MobileLandscape = 'mobile-landscape',
  TabletPortrait = 'tablet-portrait',
  TabletLandscape = 'tablet-landscape',
  Desktop = 'desktop'
}

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
```

#### MainMenu.vue
```typescript
interface MainMenuProps {
  /** Connection status */
  connectionStatus: ConnectionStatus;
  
  /** Available rooms */
  availableRooms: Room[];
  
  /** Player configuration */
  playerConfig: PlayerConfig;
  
  /** Menu state */
  activeSection: MenuSection;
}

interface MainMenuEmits {
  /** Room management */
  createRoom: [settings: RoomSettings];
  joinRoom: [roomCode: string];
  refreshRooms: [];
  
  /** Player configuration */
  updatePlayerName: [name: string];
  updatePlayerAvatar: [avatar: string];
  
  /** Navigation */
  navigateToSettings: [];
  navigateToHelp: [];
  
  /** PWA actions */
  installApp: [];
}

enum MenuSection {
  Main = 'main',
  CreateRoom = 'create_room',
  JoinRoom = 'join_room',
  Settings = 'settings',
  Help = 'help'
}
```

### 4. Game State Components

#### PlayerList.vue
```typescript
interface PlayerListProps {
  /** List of players in current room/game */
  players: Player[];
  
  /** Current player ID for highlighting */
  currentPlayerId: PlayerId;
  
  /** Display options */
  showStatus: boolean;
  showStats: boolean;
  showPing: boolean;
  allowKick: boolean; // For host
  
  /** Layout options */
  layout: 'horizontal' | 'vertical' | 'grid';
  compactMode: boolean;
}

interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  ping: number;
  
  // Game-specific data
  gameState?: PlayerGameState;
  stats?: PlayerStats;
  
  // Cooperative data
  teamRole?: TeamRole;
  lastAction?: PlayerAction;
  lastSeen?: Date;
}

enum TeamRole {
  Leader = 'leader',
  Support = 'support',
  Explorer = 'explorer',
  Fighter = 'fighter'
}
```

#### NotificationSystem.vue
```typescript
interface NotificationSystemProps {
  /** Active notifications */
  notifications: GameNotification[];
  
  /** Display settings */
  maxVisible: number;
  position: NotificationPosition;
  animationDuration: number;
  
  /** Auto-dismiss settings */
  autoDismiss: boolean;
  dismissDelay: number;
  
  /** Sound settings */
  enableSounds: boolean;
  soundVolume: number;
}

interface GameNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  color?: string;
  priority: NotificationPriority;
  
  /** Timing */
  timestamp: Date;
  duration?: number; // Auto-dismiss time
  persistent?: boolean; // Requires manual dismiss
  
  /** Actions */
  actions?: NotificationAction[];
  
  /** Animation */
  animationType: 'slide' | 'fade' | 'bounce' | 'pulse';
  
  /** Sound */
  sound?: string;
}

enum NotificationType {
  Achievement = 'achievement',
  Warning = 'warning',
  Error = 'error',
  Info = 'info',
  Success = 'success',
  GameEvent = 'game_event',
  CooperativeEvent = 'cooperative_event'
}

enum NotificationPosition {
  TopLeft = 'top-left',
  TopRight = 'top-right',
  TopCenter = 'top-center',
  BottomLeft = 'bottom-left',
  BottomRight = 'bottom-right',
  BottomCenter = 'bottom-center',
  Center = 'center'
}
```

## Component Testing Interfaces

### 1. Testing Utilities

```typescript
// tests/utils/component-testing.ts
interface ComponentTestUtils {
  /** Mount component with game state */
  mountWithGameState<T>(
    component: T, 
    props?: any, 
    gameState?: Partial<GameState>
  ): VueWrapper<T>;
  
  /** Mock touch events */
  mockTouchEvent(
    type: 'touchstart' | 'touchmove' | 'touchend',
    touches: TouchData[]
  ): TouchEvent;
  
  /** Mock keyboard events */
  mockKeyboardEvent(
    type: 'keydown' | 'keyup',
    key: string,
    modifiers?: KeyModifier[]
  ): KeyboardEvent;
  
  /** Mock canvas context */
  mockCanvasContext(): CanvasRenderingContext2D;
  
  /** Mock WebSocket connection */
  mockWebSocket(): MockWebSocket;
  
  /** Create test game state */
  createTestGameState(overrides?: Partial<GameState>): GameState;
  
  /** Wait for canvas render */
  waitForRender(): Promise<void>;
}

interface TouchData {
  identifier: number;
  clientX: number;
  clientY: number;
  force?: number;
}

interface KeyModifier {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}
```

### 2. Component Test Specifications

```typescript
// Component testing contracts
interface GameCanvasTestSuite {
  /** Rendering tests */
  'should render game state correctly': () => void;
  'should handle viewport changes': () => void;
  'should render with pixel art style': () => void;
  'should cull off-screen entities': () => void;
  
  /** Interaction tests */
  'should handle touch input on mobile': () => void;
  'should handle mouse input on desktop': () => void;
  'should emit correct events': () => void;
  
  /** Performance tests */
  'should maintain target FPS': () => void;
  'should handle large entity counts': () => void;
  'should clean up resources on unmount': () => void;
}

interface TouchControlsTestSuite {
  /** Touch gesture tests */
  'should detect first finger movement': () => void;
  'should trigger bomb on second finger': () => void;
  'should handle multi-touch correctly': () => void;
  'should provide haptic feedback': () => void;
  
  /** Visual feedback tests */
  'should show joystick overlay': () => void;
  'should highlight bomb button': () => void;
  'should animate touch responses': () => void;
  
  /** Edge case tests */
  'should handle rapid touch events': () => void;
  'should recover from touch interruption': () => void;
  'should work with touch accessibility': () => void;
}

interface ResponsiveLayoutTestSuite {
  /** Layout adaptation tests */
  'should detect mobile portrait layout': () => void;
  'should detect desktop landscape layout': () => void;
  'should handle orientation changes': () => void;
  'should respect safe area insets': () => void;
  
  /** Component positioning tests */
  'should position HUD elements correctly': () => void;
  'should adjust canvas size appropriately': () => void;
  'should handle component overflow': () => void;
  
  /** Performance tests */
  'should minimize layout thrashing': () => void;
  'should debounce resize events': () => void;
}
```

## File Organization

```
src/
├── components/
│   ├── game/
│   │   ├── GameCanvas.vue
│   │   ├── GameCanvas.test.ts
│   │   ├── TouchControls.vue
│   │   ├── TouchControls.test.ts
│   │   ├── Minimap.vue
│   │   ├── Minimap.test.ts
│   │   └── index.ts (exports)
│   │
│   ├── hud/
│   │   ├── PlayerStats.vue
│   │   ├── PlayerStats.test.ts
│   │   ├── GameTimer.vue
│   │   ├── GameTimer.test.ts
│   │   ├── ObjectiveTracker.vue
│   │   ├── ObjectiveTracker.test.ts
│   │   └── index.ts
│   │
│   ├── layout/
│   │   ├── ResponsiveGameLayout.vue
│   │   ├── ResponsiveGameLayout.test.ts
│   │   ├── GameInfoPanels.vue
│   │   ├── GameInfoPanels.test.ts
│   │   └── index.ts
│   │
│   ├── ui/
│   │   ├── NotificationSystem.vue
│   │   ├── NotificationSystem.test.ts
│   │   ├── PlayerList.vue
│   │   ├── PlayerList.test.ts
│   │   └── index.ts
│   │
│   └── menu/
│       ├── MainMenu.vue
│       ├── MainMenu.test.ts
│       ├── GameLobby.vue
│       ├── GameLobby.test.ts
│       └── index.ts
│
├── types/
│   ├── components.d.ts
│   ├── game-state.d.ts
│   ├── ui-events.d.ts
│   └── testing.d.ts
│
└── tests/
    ├── unit/
    │   ├── components/
    │   └── composables/
    ├── integration/
    │   ├── touch-controls.test.ts
    │   ├── responsive-layout.test.ts
    │   └── game-flow.test.ts
    └── utils/
        ├── component-testing.ts
        ├── mock-factories.ts
        └── test-data.ts
```

## Global Type Definitions

```typescript
// types/components.d.ts
declare global {
  interface ComponentCustomProperties {
    $gameStore: ReturnType<typeof useGameStateStore>;
    $connectionStore: ReturnType<typeof useConnectionStore>;
    $playerStore: ReturnType<typeof usePlayerStore>;
    $uiStore: ReturnType<typeof useUIStateStore>;
    $audioStore: ReturnType<typeof useAudioStore>;
  }
}

// Component registration for better TypeScript support
declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    GameCanvas: typeof import('./components/game/GameCanvas.vue')['default'];
    TouchControls: typeof import('./components/game/TouchControls.vue')['default'];
    Minimap: typeof import('./components/game/Minimap.vue')['default'];
    ResponsiveGameLayout: typeof import('./components/layout/ResponsiveGameLayout.vue')['default'];
    NotificationSystem: typeof import('./components/ui/NotificationSystem.vue')['default'];
    PlayerList: typeof import('./components/ui/PlayerList.vue')['default'];
    // ... other components
  }
}
```

This comprehensive component structure provides:

1. **Clear Interface Definitions** for all components with props, emits, and slots
2. **Responsive Design Support** with layout-aware components  
3. **Touch and Keyboard Input** handling with proper event management
4. **Testing Contracts** with specific test suites for each component
5. **TypeScript Integration** with proper type definitions
6. **Component Organization** following Vue 3 best practices
7. **Cooperative Gameplay Support** with team-oriented UI components

The structure supports both mobile and desktop gameplay while maintaining clean separation of concerns and comprehensive testing capabilities.