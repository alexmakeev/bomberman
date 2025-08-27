# EventBusImpl Module

## Overview
The EventBusImpl module provides the core event-driven communication system for the Bomberman multiplayer game. It implements a unified event bus that enables decoupled communication between all game components through a publish-subscribe pattern.

## Role in Project
This module serves as the central nervous system of the game, handling:
- **Event Distribution**: Routes events between game components (UI, game logic, networking)
- **Decoupled Architecture**: Allows modules to communicate without direct dependencies
- **Real-time Communication**: Supports WebSocket event broadcasting to connected players
- **Event Persistence**: Optional event storage for replay and debugging capabilities

## Key Features
- **Universal Event System**: Handles all event types (player actions, game state, notifications)
- **Subscription Management**: Dynamic event listener registration and cleanup
- **Event Validation**: Ensures event structure integrity and security
- **Performance Optimization**: Efficient event routing with minimal latency
- **Monitoring & Metrics**: Event throughput tracking and performance analytics

## Architecture Integration
```
WebSocket ──→ EventBus ──→ GameEventHandler
    ↓             ↓              ↓
Server.ts ──→ EventBus ──→ UserNotificationHandler
    ↓             ↓              ↓
Client Actions → EventBus ──→ UserActionHandler
```

## Interface Implementation
Implements: `src/interfaces/core/EventBus.d.ts`

## Dependencies
- **Types**: `src/types/events.d.ts` - Event structure definitions
- **Common**: `src/types/common.d.ts` - Shared entity types

## Usage Examples
```typescript
// Publishing events
await eventBus.publish(gameEvent);
await eventBus.emit('PLAYER_MOVED', playerData);

// Subscribing to events
eventBus.subscribe('BOMB_EXPLODED', handleBombExplosion);
eventBus.unsubscribe('GAME_ENDED', handleGameEnd);
```

## Configuration
- Event TTL: 300 seconds default
- Max event size: 64KB
- Retry policy: 3 attempts with exponential backoff
- Monitoring: Real-time metrics collection

## Related Documentation
- Event System Architecture: `docs/event-system-architecture.md`
- Event Flow Diagrams: `docs/event-flow-diagrams.md`
- Performance Specifications: `docs/performance-requirements.md`