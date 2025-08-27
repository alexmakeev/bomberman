# UC-A001: Monitor Game Rooms - Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant GameServer
    participant Redis
    participant PostgreSQL
    participant WebSocket

    Admin->>AdminDashboard: Access dashboard
    AdminDashboard->>GameServer: Request active rooms
    GameServer->>Redis: Get active room states
    Redis-->>GameServer: Current room data
    GameServer->>PostgreSQL: Get room statistics
    PostgreSQL-->>GameServer: Historical room data
    GameServer->>GameServer: Merge real-time & historical data
    GameServer-->>AdminDashboard: Room list with comprehensive details
    AdminDashboard-->>Admin: Display rooms & statistics

    Note over Admin,WebSocket: Real-time updates via Redis Pub/Sub
    Redis->>WebSocket: Room state changes via pub/sub
    WebSocket->>AdminDashboard: Real-time room updates
    AdminDashboard->>Admin: Update display with live data

    alt No active rooms
        Redis-->>GameServer: Empty room cache
        GameServer-->>AdminDashboard: Empty room list
        AdminDashboard-->>Admin: Show "No active games"
    end

    alt Connection issues
        Redis-->>GameServer: Connection timeout
        GameServer->>PostgreSQL: Fallback to historical data
        PostgreSQL-->>GameServer: Cached room information
        AdminDashboard-->>Admin: Show cached data with timestamp
    end

    Note over Admin,PostgreSQL: Performance metrics from both sources
    AdminDashboard->>Redis: Get real-time metrics
    AdminDashboard->>PostgreSQL: Get aggregated statistics
```