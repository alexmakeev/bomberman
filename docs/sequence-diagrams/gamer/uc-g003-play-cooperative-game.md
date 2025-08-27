# UC-G003: Play Cooperative Game - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameServer
    participant GameEngine
    participant Teammates
    participant Monsters

    Note over Gamer,Monsters: Game Start
    GameServer->>GameEngine: Initialize game state
    GameEngine->>GameClient: Spawn player at corner
    GameClient-->>Gamer: Show game view

    loop Game Loop
        Gamer->>GameClient: Movement input (arrow keys/touch)
        GameClient->>GameServer: Send player action
        GameServer->>GameEngine: Process movement
        GameEngine->>GameEngine: Update game state
        GameEngine->>GameServer: Broadcast state update
        GameServer->>GameClient: Game state
        GameServer->>Teammates: Game state
        GameClient-->>Gamer: Update display
        
        opt Place bomb
            Gamer->>GameClient: Bomb input
            GameClient->>GameServer: Place bomb action
            GameServer->>GameEngine: Create bomb
            GameEngine->>GameEngine: Start bomb timer
            
            Note over GameEngine: Bomb explodes
            GameEngine->>GameEngine: Destroy walls, damage entities
            GameEngine->>Monsters: Apply damage
            
            alt Friendly fire
                GameEngine->>Teammates: Damage teammate
                GameEngine->>GameClient: Show teamwork warning
                GameClient-->>Gamer: Display warning message
            end
        end
        
        opt Collect power-up
            GameEngine->>GameClient: Power-up available
            Gamer->>GameClient: Move to power-up
            GameClient->>GameServer: Collect power-up
            GameServer->>GameEngine: Apply power-up
            GameEngine->>GameClient: Update player abilities
            GameClient-->>Gamer: Show ability increase
        end
        
        alt Player eliminated
            Monsters->>GameEngine: Damage player
            GameEngine->>GameEngine: Player health = 0
            GameEngine->>GameClient: Player eliminated
            GameClient-->>Gamer: Show elimination screen
            GameClient->>GameClient: Start 10-second countdown
            
            Note over GameClient: Respawn countdown
            GameClient-->>Gamer: Show countdown timer
            GameClient->>GameServer: Request respawn
            GameServer->>GameEngine: Respawn player at corner
            GameEngine->>GameClient: Player respawned
            GameClient-->>Gamer: Resume gameplay
        end
    end

    alt Victory - Boss defeated
        GameEngine->>Monsters: Boss health = 0
        GameEngine->>GameServer: Game victory
        GameServer->>GameClient: Victory notification
        GameServer->>Teammates: Victory notification
        GameClient-->>Gamer: Show victory screen
    else Victory - Exit reached
        GameEngine->>GameEngine: All players at exit
        GameEngine->>GameServer: Level complete
        GameServer->>GameClient: Level completion
        GameClient-->>Gamer: Show completion screen
    else Gates destroyed
        GameEngine->>GameEngine: All gates destroyed
        GameEngine->>Monsters: Spawn monster waves
        Note over GameEngine: Objectives change to survival
    end
```