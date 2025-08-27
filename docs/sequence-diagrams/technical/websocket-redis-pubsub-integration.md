# WebSocket-Redis Pub/Sub Integration - Technical Sequence Diagram

This diagram shows the detailed flow of how WebSocket connections integrate with Redis pub/sub channels for real-time bidirectional messaging.

```mermaid
sequenceDiagram
    participant Client as GameClient (WebSocket)
    participant WS as GameServer (WebSocket Manager)
    participant Redis as Redis (Pub/Sub)
    participant Game as Game Logic
    participant Client2 as Other Clients

    Note over Client,Client2: Connection & Subscription Setup
    Client->>WS: WebSocket Connect
    WS->>WS: Create WebSocket connection
    WS->>Redis: Subscribe to player channels
    WS->>Redis: Subscribe to room channels
    WS->>Redis: Subscribe to game channels
    
    Client->>WS: Subscribe to specific channel
    Note over Client,WS: WebSocket Message: CHANNEL_SUBSCRIBE
    WS->>Redis: Redis SUBSCRIBE channel_pattern
    Redis-->>WS: Subscription confirmed
    WS-->>Client: Subscription success via WebSocket
    
    Note over Client,Client2: Client-to-Redis Publishing
    Client->>WS: Publish game event via WebSocket
    Note over Client,WS: WebSocket Message: PUBLISH_EVENT
    WS->>WS: Validate permissions & rate limits
    WS->>Game: Process game action
    Game->>Redis: Update game state
    Game->>Redis: Redis PUBLISH game_event
    
    Note over Redis,Client2: Redis-to-WebSocket Broadcasting
    Redis->>WS: game_event via pub/sub callback
    WS->>WS: Apply subscription filters
    WS->>WS: Route to subscribed connections
    WS->>Client: Forward event via WebSocket
    WS->>Client2: Broadcast to other clients via WebSocket
    
    Note over Client,Client2: Bidirectional Real-time Flow
    loop Real-time Event Loop
        alt Client Action
            Client->>WS: Player action via WebSocket
            WS->>Game: Process action
            Game->>Redis: Update state + PUBLISH event
            Redis->>WS: Event notification via pub/sub
            WS->>Client2: Broadcast via WebSocket
        else Server Event  
            Game->>Redis: Server-triggered event + PUBLISH
            Redis->>WS: Event notification via pub/sub
            WS->>Client: Forward via WebSocket
            WS->>Client2: Broadcast via WebSocket
        else External Event
            Redis->>WS: External event via pub/sub
            WS->>WS: Filter by subscriptions
            WS->>Client: Conditional forward via WebSocket
        end
    end
    
    Note over Client,Client2: Advanced Features
    Client->>WS: Subscribe with filters
    WS->>WS: Store filter preferences
    Redis->>WS: Raw event via pub/sub
    WS->>WS: Apply client-specific filters
    WS->>Client: Filtered event via WebSocket
    WS->>Client2: Different filtered view via WebSocket
    
    Note over Client,Client2: Connection Cleanup
    Client->>WS: WebSocket Disconnect
    WS->>Redis: UNSUBSCRIBE from channels
    WS->>WS: Cleanup connection state
    Redis-->>WS: Unsubscription confirmed
    
    Note over WS: WebSocket-Redis Bridge Features
    Note right of WS: • Auto-subscription based on context
    Note right of WS: • Rate limiting and permission checks
    Note right of WS: • Event filtering per connection
    Note right of WS: • Connection state synchronization
    Note right of WS: • Graceful reconnection handling
    Note right of WS: • Message queuing during disconnections
```

## Key Integration Points

### 1. **Connection Establishment**
- WebSocket connection automatically subscribes to relevant Redis channels
- Context-aware subscriptions (room, game, player-specific channels)
- Connection state tracked for proper cleanup

### 2. **Bidirectional Messaging**
- **Client → Redis**: WebSocket messages validated and published to Redis
- **Redis → Client**: Redis pub/sub events forwarded via WebSocket
- **Real-time synchronization** across all connected clients

### 3. **Event Filtering**
- Subscription-level filtering for bandwidth optimization
- Client-specific event routing based on permissions
- Dynamic filter updates during gameplay

### 4. **Performance Optimizations**
- Connection pooling for Redis subscriptions
- Event batching for high-frequency updates
- Selective broadcasting based on relevance

### 5. **Reliability Features**
- Automatic reconnection handling
- Message queuing during brief disconnections
- Graceful degradation during Redis unavailability

This architecture enables **millisecond-latency** real-time multiplayer gaming while maintaining scalability through Redis clustering and WebSocket load balancing.