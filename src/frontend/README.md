# Frontend Application

## Overview
Vue 3 + TypeScript frontend for the Bomberman multiplayer game. Focused on real-time gameplay with Canvas rendering, WebSocket communication, and responsive mobile-friendly design.

## Architecture
- **Vue 3** with Composition API for reactive game state
- **Vite** for fast development and optimized builds  
- **TypeScript** for type safety and developer experience
- **Pinia** for centralized game state management
- **Canvas API** for high-performance game rendering
- **WebSocket Client** for real-time server communication

## Directory Structure
```
frontend/
├── main.ts                 # Application entry point
├── App.vue                 # Root application component
├── components/             # Reusable Vue components
│   ├── game/              # Game-specific components
│   │   ├── GameCanvas.vue # Main game rendering canvas
│   │   ├── GameHUD.vue    # Head-up display (score, timer, etc.)
│   │   ├── MiniMap.vue    # Overview map component
│   │   └── PlayerList.vue # Connected players display
│   ├── ui/                # Generic UI components
│   │   ├── Button.vue     # Styled game buttons
│   │   ├── Modal.vue      # Modal dialog component
│   │   └── LoadingSpinner.vue # Loading indicators
│   └── layout/            # Layout components
│       ├── AppLayout.vue  # Main application layout
│       └── GameLayout.vue # In-game layout wrapper
├── views/                 # Page-level components
│   ├── HomeView.vue       # Landing/menu page
│   ├── LobbyView.vue      # Room selection/creation
│   └── GameView.vue       # Active gameplay view
├── stores/                # Pinia state stores
│   ├── gameState.ts       # Current game state management
│   ├── playerState.ts     # Player data and preferences
│   └── connectionState.ts # WebSocket connection status
├── composables/           # Reusable composition functions
│   ├── useWebSocket.ts    # WebSocket connection management
│   ├── useGameRenderer.ts # Canvas rendering logic
│   └── useInputHandler.ts # Keyboard/touch input handling
├── utils/                 # Utility functions
│   ├── gameUtils.ts       # Game-specific helper functions
│   ├── networkUtils.ts    # Network communication helpers
│   └── canvasUtils.ts     # Canvas rendering utilities
├── assets/                # Static assets
│   ├── sprites/           # Game sprite images
│   ├── sounds/            # Audio files
│   └── icons/             # UI icons and favicons
└── styles/                # Global styling
    ├── main.css           # Main stylesheet with 8-bit theme
    ├── components.css     # Component-specific styles
    └── mobile.css         # Mobile-responsive adjustments
```

## Key Features

### Real-time Gameplay
- WebSocket-based bidirectional communication
- Sub-100ms input latency for responsive controls
- Smooth 60 FPS canvas rendering
- Delta-based state synchronization

### Mobile Optimization
- Touch-friendly controls and UI scaling
- Responsive layout for phones and tablets  
- PWA capabilities for app-like experience
- Battery-efficient rendering optimizations

### 8-bit Aesthetic
- Pixel art sprite rendering
- Retro color palette and typography
- Crisp pixel-perfect scaling
- Classic arcade game feel

### Multiplayer Features
- Real-time player position updates
- Synchronized bomb explosions and effects
- Cooperative gameplay indicators
- Player communication system

## Development Commands
```bash
# Start development server
npm run dev:frontend

# Build for production
npm run build:frontend

# Type checking
npm run type-check:frontend

# Lint frontend code
npm run lint:frontend
```

## State Management
- **Game State**: Current maze, players, bombs, power-ups
- **Player State**: User preferences, controls, statistics
- **Connection State**: WebSocket status, room information
- **UI State**: Modal visibility, loading states, notifications

## Performance Considerations
- Canvas rendering optimized for mobile devices
- Efficient sprite batching and caching
- Minimal DOM updates during gameplay
- Debounced input handling for smooth controls
- Lazy loading for non-critical components

## Browser Support
- Modern browsers with WebSocket and Canvas support
- Mobile Safari and Chrome on iOS/Android
- Progressive enhancement for older browsers
- WebGL fallback for enhanced effects (optional)

## Related Documentation
- Game Mechanics: `docs/game-mechanics.md`
- WebSocket Protocol: `docs/websocket-protocol.md`
- Mobile Optimization: `docs/mobile-optimization.md`
- Performance Guide: `docs/frontend-performance.md`