# Unified Event System Architecture

This document describes the comprehensive event-driven architecture that maximizes code reuse across all system components through a unified EventBus infrastructure.

## System Overview

The Bomberman multiplayer game uses a **unified event system** that handles:

- **Game Events**: Player actions, state changes, mechanics
- **User Notifications**: Achievements, invitations, system messages  
- **User Actions**: Input tracking, analytics, behavior analysis
- **Admin Events**: Moderation, configuration, monitoring
- **System Events**: Performance, security, status updates

## Architecture Components

### 1. Core EventBus (`src/interfaces/core/EventBus.d.ts`)

The foundation component providing:
- **Universal Event Format**: Single event interface for all event types
- **Flexible Pub/Sub**: Category-based subscriptions with filtering
- **Multiple Delivery Modes**: Fire-and-forget, at-least-once, exactly-once
- **Event Persistence**: Redis for real-time, PostgreSQL for historical
- **Performance Optimization**: Batching, compression, priority queues

```typescript
// Universal event that works for all use cases
interface UniversalEvent<TData = any> {
  eventId: EntityId;
  category: EventCategory;  // GAME_STATE, USER_NOTIFICATION, etc.
  type: string;             // Specific event type within category
  sourceId: EntityId;
  targets: EventTarget[];   // Who should receive this event
  data: TData;              // Event payload
  metadata: EventMetadata;  // Priority, TTL, delivery options
  timestamp: Timestamp;
  version: string;
}
```

### 2. Specialized Event Handlers

#### GameEventHandler (`src/interfaces/specialized/GameEventHandler.d.ts`)
- **Game-specific events**: Player moves, bomb explosions, power-ups
- **Real-time optimization**: High-frequency updates, delta compression
- **Team coordination**: Cooperative gameplay events, friendly fire warnings
- **State management**: Game state reconstruction from events

#### UserNotificationHandler (`src/interfaces/specialized/UserNotificationHandler.d.ts`)
- **Multi-channel delivery**: In-game, WebSocket, email, push notifications
- **Notification templates**: Reusable notification formats
- **User preferences**: Channel preferences, quiet hours, frequency limits
- **Delivery tracking**: Read receipts, engagement metrics

#### UserActionHandler (`src/interfaces/specialized/UserActionHandler.d.ts`)
- **Action tracking**: All user interactions and behaviors
- **Analytics pipeline**: Pattern detection, conversion funnels, A/B testing
- **Personalization**: Action recommendations, user segmentation
- **Anomaly detection**: Unusual behavior patterns, security events

### 3. WebSocket Integration (`src/types/websocket.d.ts`)

WebSocket layer built on top of the unified EventBus:
- **Event-driven messaging**: All WebSocket messages are events
- **Auto-subscription**: Context-aware event subscriptions
- **Efficient delivery**: Compression, batching, priority routing
- **Real-time synchronization**: Sub-millisecond event distribution

### 4. Unified GameServer (`src/interfaces/core/UnifiedGameServer.d.ts`)

Enhanced server interface that orchestrates all components:
- **EventBus integration**: Direct access to all event handlers
- **Context-aware subscriptions**: Auto-subscribe based on room/game context
- **Unified broadcasting**: Single interface for all event types
- **Performance monitoring**: Comprehensive metrics across all systems

## Event Flow Examples

### 1. Game Action Flow
```mermaid
sequenceDiagram
    participant Player
    participant WebSocket
    participant GameServer
    participant EventBus
    participant GameHandler
    participant Redis
    participant OtherPlayers

    Player->>WebSocket: Place bomb action
    WebSocket->>GameServer: Publish game event
    GameServer->>EventBus: Publish GAME_MECHANICS event
    EventBus->>GameHandler: Route to game handler
    GameHandler->>Redis: Update game state
    GameHandler->>EventBus: Publish bomb_placed event
    EventBus->>Redis: Distribute via pub/sub
    Redis->>WebSocket: Forward to subscribed connections
    WebSocket->>OtherPlayers: Real-time bomb placement
```

### 2. Notification Flow
```mermaid
sequenceDiagram
    participant System
    participant EventBus
    participant NotificationHandler
    participant UserPrefs
    participant Channels
    participant User

    System->>EventBus: Achievement unlocked
    EventBus->>NotificationHandler: Route notification event
    NotificationHandler->>UserPrefs: Check user preferences
    NotificationHandler->>Channels: Send via preferred channels
    Channels->>User: Multi-channel delivery
```

### 3. Action Tracking Flow
```mermaid
sequenceDiagram
    participant User
    participant WebSocket
    participant ActionHandler
    participant Analytics
    participant EventBus
    participant AdminDashboard

    User->>WebSocket: User action
    WebSocket->>ActionHandler: Track action
    ActionHandler->>Analytics: Update behavior profile
    ActionHandler->>EventBus: Publish analytics event
    EventBus->>AdminDashboard: Real-time analytics
```

## Code Reuse Benefits

### 1. **Single Event Infrastructure**
- One pub/sub system handles all event types
- Consistent error handling and retry logic
- Unified monitoring and debugging tools
- Shared performance optimizations

### 2. **Composable Event Handlers**
- Specialized handlers extend the base EventBus
- Mix and match functionality as needed
- Easy to add new event types and handlers
- Consistent interfaces across all handlers

### 3. **WebSocket Integration**
- All WebSocket messages use the event system
- Automatic routing based on subscriptions
- Context-aware delivery optimization
- Unified connection management

### 4. **Cross-System Communication**
```typescript
// Game events can trigger notifications
gameEventHandler.onEvent('player_eliminated', async (event) => {
  await notificationHandler.sendNotification(event.data.playerId, {
    type: 'ACHIEVEMENT',
    title: 'Better luck next time!',
    content: 'You were eliminated but can respawn in 10 seconds'
  });
});

// User actions can trigger game events
userActionHandler.onEvent('admin_action', async (event) => {
  if (event.data.action === 'kick_player') {
    await gameEventHandler.publishPlayerEliminated({
      playerId: event.data.targetId,
      cause: 'admin_kick',
      // ... other data
    });
  }
});
```

## Implementation Patterns

### 1. **Event Categories as Modules**
```typescript
// Each category maps to specialized functionality
const eventCategories = {
  GAME_STATE: gameEventHandler,
  USER_NOTIFICATION: notificationHandler, 
  USER_ACTION: userActionHandler,
  ADMIN_ACTION: adminEventHandler,
  SYSTEM_STATUS: systemEventHandler
};
```

### 2. **Layered Architecture**
```
┌─────────────────────────────────────────┐
│           WebSocket Layer               │ ← Client connections
├─────────────────────────────────────────┤
│        Specialized Handlers             │ ← Domain-specific logic
├─────────────────────────────────────────┤
│           Unified EventBus              │ ← Core event infrastructure
├─────────────────────────────────────────┤
│        Storage Layer (Redis/PG)         │ ← Persistence & pub/sub
└─────────────────────────────────────────┘
```

### 3. **Configuration-Driven Behavior**
```typescript
// Single configuration controls all event behavior
const eventConfig: EventBusConfig = {
  defaultTTL: 300000,           // 5 minutes
  maxEventSize: 1024 * 1024,    // 1MB
  enablePersistence: true,      // Use PostgreSQL
  enableTracing: true,          // Debug support
  batchSize: 100,               // Performance optimization
  compressionLevel: 6           // Network optimization
};
```

## Performance Optimizations

### 1. **Event Batching**
- Batch high-frequency events (game state updates)
- Configurable batch size and timeout
- Reduces network overhead and processing load

### 2. **Smart Routing**
- Events only sent to relevant subscribers
- Context-aware filtering reduces noise
- Priority-based delivery for critical events

### 3. **Caching and Persistence**
- Redis for real-time event distribution
- PostgreSQL for long-term storage and analytics
- Automatic cleanup of expired events

### 4. **Compression and Encoding**
- Optional message compression for bandwidth
- Binary encoding for high-frequency events
- Adaptive compression based on network conditions

## Monitoring and Debugging

### 1. **Unified Metrics**
```typescript
interface EventSystemMetrics {
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  averageProcessingTime: number;
  errorCount: number;
  subscriptionMetrics: SubscriptionMetrics;
}
```

### 2. **Event Tracing**
- Trace events across all system components
- Performance profiling and bottleneck identification
- Debug event routing and delivery issues

### 3. **Health Monitoring**
- Component health checks (Redis, PostgreSQL, WebSocket)
- Performance indicators and alerting
- Automatic failover and recovery

## Extensibility

### 1. **Adding New Event Types**
```typescript
// 1. Define new event category
enum EventCategory {
  // ... existing categories
  MARKETPLACE = 'marketplace'  // New category
}

// 2. Create specialized handler
interface MarketplaceEventHandler extends EventBus {
  publishItemPurchase(data: ItemPurchaseData): Promise<EventPublishResult>;
  subscribeToUserPurchases(userId: EntityId, handler: EventHandler): Promise<void>;
}

// 3. Integrate with GameServer
interface UnifiedGameServer {
  readonly marketplace: MarketplaceEventHandler;  // Auto-available
}
```

### 2. **Custom Event Middleware**
```typescript
// Add custom processing to any event category
server.addEventMiddleware(EventCategory.GAME_STATE, async (event, next) => {
  // Custom validation, logging, transformation
  if (event.type === 'player_move') {
    // Anti-cheat validation
    await validatePlayerMovement(event.data);
  }
  await next();
});
```

This unified event system provides maximum code reuse while maintaining high performance and flexibility for the multiplayer Bomberman game's diverse event handling needs.