# UC-G003: Play Cooperative Game - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant UnifiedGameServer
    participant EventBus
    participant GameEventHandler
    participant BombManager
    participant PlayerStateManager
    participant Redis
    participant PostgreSQL
    participant Teammates

    Note over Gamer,PostgreSQL: Game Start & Event-Driven Architecture
    UnifiedGameServer->>GameClient: Auto-subscribe to game channels
    GameClient->>UnifiedGameServer: Subscribe to game events
    UnifiedGameServer->>EventBus: Subscribe to game event categories
    UnifiedGameServer->>GameEventHandler: Initialize game handlers
    GameEventHandler->>Redis: Create game state in cache
    Redis->>Redis: Set TTL for game duration
    GameEventHandler->>EventBus: Publish game_started event
    EventBus->>UnifiedGameServer: Route game started event
    UnifiedGameServer->>GameClient: Forward via WebSocket
    GameClient-->>Gamer: Show game view

    loop Game Loop
        Gamer->>GameClient: Movement input (arrow keys/touch)
        GameClient->>UnifiedGameServer: Send player action via WebSocket
        UnifiedGameServer->>EventBus: Publish player action event
        EventBus->>GameEventHandler: Route to game handler
        GameEventHandler->>PlayerStateManager: Update player position
        PlayerStateManager->>Redis: Update game state
        PlayerStateManager->>EventBus: Publish player_moved event
        
        Note over EventBus,Teammates: EventBus to WebSocket Bridge
        EventBus->>UnifiedGameServer: Route player_moved event
        UnifiedGameServer->>GameClient: Forward event via WebSocket
        UnifiedGameServer->>Teammates: Forward event via WebSocket bridge
        GameClient-->>Gamer: Update display with real-time state
        
        opt Place bomb
            Gamer->>GameClient: Bomb input
            GameClient->>UnifiedGameServer: Place bomb action via WebSocket
            UnifiedGameServer->>EventBus: Publish bomb_place event
            EventBus->>BombManager: Route to bomb handler
            BombManager->>BombManager: Validate & create bomb
            BombManager->>Redis: Add bomb to game state
            BombManager->>EventBus: Publish bomb_placed event
            
            Note over EventBus,Teammates: Instant bomb placement notification
            EventBus->>UnifiedGameServer: Route bomb_placed event
            UnifiedGameServer->>GameClient: Forward bomb placement via WebSocket
            UnifiedGameServer->>Teammates: Notify teammates via WebSocket bridge
            
            Note over BombManager: Bomb explodes (timer-based)
            BombManager->>BombManager: Timer expires, trigger explosion
            BombManager->>Redis: Update explosion effects
            BombManager->>Redis: Remove destroyed walls
            BombManager->>EventBus: Publish bomb_exploded event
            
            EventBus->>UnifiedGameServer: Route explosion event
            UnifiedGameServer->>GameClient: Forward explosion via WebSocket
            UnifiedGameServer->>Teammates: Broadcast explosion via WebSocket bridge
            
            alt Friendly fire
                BombManager->>PlayerStateManager: Calculate teammate damage
                PlayerStateManager->>Redis: Update teammate health
                PlayerStateManager->>EventBus: Publish friendly_fire event
                EventBus->>UnifiedGameServer: Route friendly fire event
                UnifiedGameServer->>Teammates: Forward friendly fire warning via WebSocket
                UnifiedGameServer->>GameClient: Show teamwork warning via WebSocket
                GameClient-->>Gamer: Display warning message
            end
        end
        
        opt Collect power-up
            GameEngine->>Redis: Check power-up availability
            Redis-->>GameEngine: Power-up available
            Gamer->>GameClient: Move to power-up
            GameClient->>GameServer: Collect power-up via WebSocket
            GameServer->>GameEngine: Apply power-up effect
            GameEngine->>Redis: Update player abilities
            GameEngine->>Redis: Publish powerup_collected event
            
            Note over Redis,Teammates: Power-up collection broadcast
            Redis->>GameServer: powerup_collected event via pub/sub
            GameServer->>GameClient: Forward ability update via WebSocket
            GameServer->>Teammates: Notify teammates via WebSocket bridge
            GameClient-->>Gamer: Show ability increase
        end
        
        alt Player eliminated
            GameEngine->>Redis: Update player health = 0
            Redis->>Redis: Publish player death event
            GameEngine->>GameClient: Player eliminated
            GameClient-->>Gamer: Show elimination screen
            GameClient->>GameClient: Start 10-second countdown
            
            Note over GameClient: Respawn countdown
            GameClient-->>Gamer: Show countdown timer
            GameClient->>GameServer: Request respawn
            GameServer->>GameEngine: Respawn player at corner
            GameEngine->>Redis: Update player state (alive)
            Redis->>Redis: Publish respawn event
            GameClient-->>Gamer: Resume gameplay
        end
    end

    alt Victory - Boss defeated
        GameEngine->>Redis: Boss health = 0
        GameEngine->>GameServer: Game victory
        GameServer->>Redis: Publish victory event
        Redis->>GameClient: Victory via pub/sub
        Redis->>Teammates: Victory via pub/sub
        GameServer->>PostgreSQL: Save game statistics
        GameServer->>Redis: Cleanup game state (TTL expired)
        GameClient-->>Gamer: Show victory screen
    else Victory - Exit reached
        GameEngine->>Redis: All players at exit
        GameEngine->>GameServer: Level complete
        GameServer->>Redis: Publish completion event
        GameServer->>PostgreSQL: Save completion statistics
        GameServer->>Redis: Cleanup game state
        GameClient-->>Gamer: Show completion screen
    else Gates destroyed
        GameEngine->>Redis: All gates destroyed
        GameEngine->>Redis: Spawn monster waves
        Redis->>Redis: Publish objective change
        Note over GameEngine: Objectives change to survival
    end
```