# UC-G008: Collect Power-ups - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameEngine
    participant PowerUpSystem
    participant OtherPlayer

    Note over Gamer,OtherPlayer: Power-up Discovery
    Gamer->>GameClient: Place bomb near wall
    GameClient->>GameEngine: Bomb explosion
    GameEngine->>GameEngine: Destroy wall
    GameEngine->>PowerUpSystem: Check for hidden power-up
    
    alt Power-up revealed
        PowerUpSystem->>PowerUpSystem: Spawn power-up at location
        PowerUpSystem-->>GameEngine: Power-up created
        GameEngine-->>GameClient: Power-up visible
        GameClient-->>Gamer: Show power-up on ground
        
        Note over Gamer,OtherPlayer: Collection Race
        Gamer->>GameClient: Move toward power-up
        OtherPlayer->>GameEngine: Also moves toward power-up
        
        alt Gamer reaches first
            GameClient->>GameEngine: Player collision with power-up
            GameEngine->>PowerUpSystem: Collect power-up
            PowerUpSystem->>PowerUpSystem: Apply enhancement
            
            alt Bomb capacity increase
                PowerUpSystem->>PowerUpSystem: Increase max bombs
                PowerUpSystem-->>GameEngine: Player can place more bombs
            else Blast range increase
                PowerUpSystem->>PowerUpSystem: Increase explosion radius
                PowerUpSystem-->>GameEngine: Bombs have larger range
            end
            
            GameEngine->>PowerUpSystem: Remove power-up from world
            PowerUpSystem-->>GameEngine: Power-up consumed
            GameEngine-->>GameClient: Update player stats
            GameClient-->>Gamer: Show visual indicator of enhancement
            
            alt Maximum power reached
                PowerUpSystem-->>GameClient: Max power notification
                GameClient-->>Gamer: Show "Max power" message
            end
        else Other player collects first
            OtherPlayer->>GameEngine: Collect power-up
            GameEngine->>PowerUpSystem: Power-up taken
            PowerUpSystem-->>GameEngine: Power-up no longer available
            GameEngine-->>GameClient: Power-up disappeared
            GameClient-->>Gamer: Power-up no longer visible
        end
    else No power-up found
        PowerUpSystem-->>GameEngine: No power-up at location
        GameEngine-->>GameClient: Wall destroyed, no bonus
        Note over Gamer: Continue with current abilities
    end

    alt Power-up lost on death
        Note over Gamer: Player dies and respawns
        GameEngine->>PowerUpSystem: Player eliminated
        PowerUpSystem->>PowerUpSystem: Reduce player abilities
        PowerUpSystem-->>GameEngine: Reset to reduced stats
        GameEngine-->>GameClient: Update player with fewer abilities
        GameClient-->>Gamer: Respawn with reduced power
    end
```