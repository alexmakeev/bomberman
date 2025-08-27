# UC-G006: Respawn After Elimination - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameServer
    participant Redis
    participant PostgreSQL
    participant OtherPlayers

    Note over Gamer,PostgreSQL: Player Elimination
    GameServer->>Redis: Update player health = 0
    Redis->>Redis: Publish player death event
    Redis->>GameClient: Player eliminated via pub/sub
    GameClient-->>Gamer: Show elimination screen
    GameClient->>GameClient: Start 10-second countdown
    
    loop Countdown Timer
        GameClient-->>Gamer: Display countdown (10, 9, 8...)
        GameClient->>GameServer: Request game spectator view
        GameServer->>Redis: Get current game state
        Redis-->>GameServer: Live game data
        GameServer-->>GameClient: Spectator view data
        GameClient-->>Gamer: Show eliminated player view of ongoing game
        
        alt Game ends during countdown
            Redis->>Redis: Publish game over event
            Redis->>GameClient: Game ended via pub/sub
            GameClient-->>Gamer: Join next round option
        end
    end

    Note over Gamer,PostgreSQL: Respawn Process
    GameClient->>GameServer: Respawn request
    GameServer->>Redis: Check game state for spawn locations
    
    Redis-->>GameServer: Available corner positions
    alt Corners available
        GameServer->>GameServer: Select random corner
        GameServer->>Redis: Update player position (spawn)
    else All corners occupied
        GameServer->>GameServer: Find nearest safe spawn point
        GameServer->>Redis: Update player position (alternative)
    end
    
    GameServer->>Redis: Set player health = 100
    Redis->>Redis: Publish player respawn event
    
    alt Retain power-ups (game rules)
        GameServer->>Redis: Restore previous abilities
        Redis->>Redis: Publish ability restoration
    else Power-ups lost (game rules)
        GameServer->>Redis: Reset to basic abilities
        Redis->>Redis: Publish ability reset
    end
    
    Redis->>OtherPlayers: Respawn notification via pub/sub
    GameServer->>PostgreSQL: Log respawn event
    Redis->>GameClient: Player respawned via pub/sub
    GameClient-->>Gamer: Resume active gameplay
```