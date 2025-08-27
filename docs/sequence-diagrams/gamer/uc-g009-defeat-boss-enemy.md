# UC-G009: Defeat Boss Enemy - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameEngine
    participant BossAI
    participant Teammates

    Note over Gamer,Teammates: Boss Encounter
    GameEngine->>GameClient: Boss spawns in maze
    GameEngine->>Teammates: Boss appears for all players
    GameClient-->>Gamer: Boss enemy visible
    GameClient-->>Gamer: Show boss health bar

    loop Boss Battle
        Note over Gamer,Teammates: Team Coordination
        Gamer->>GameClient: Coordinate bomb placement
        Teammates->>GameEngine: Position strategically
        
        Gamer->>GameClient: Place bomb near boss
        GameClient->>GameEngine: Bomb created
        GameEngine->>GameEngine: Bomb explosion
        GameEngine->>BossAI: Apply damage to boss
        
        BossAI->>BossAI: Check health status
        alt Boss damaged but alive
            BossAI->>BossAI: Update attack pattern
            BossAI->>GameEngine: Execute boss attack
            
            alt Normal phase
                GameEngine->>GameClient: Boss normal attack
                GameClient-->>Gamer: Dodge boss attack
            else Rage phase (low health)
                BossAI->>BossAI: Enter rage mode
                GameEngine->>GameClient: Boss aggressive attacks
                GameClient-->>Gamer: More intense attack patterns
            end
            
            GameEngine-->>GameClient: Update boss health display
            GameClient-->>Gamer: Show reduced boss health
        end

        alt Poor team coordination
            BossAI->>GameEngine: Boss attacks isolated player
            GameEngine->>GameClient: Player takes damage
            GameClient-->>Gamer: Player eliminated
            Note over Gamer: Respawn and rejoin battle
        end

        opt Multiple health phases
            BossAI->>BossAI: Health threshold reached
            BossAI->>BossAI: Change to next phase
            BossAI->>GameEngine: New attack patterns
            GameEngine-->>GameClient: Boss behavior changes
            GameClient-->>Gamer: Adapt to new patterns
        end
    end

    alt Victory - Boss defeated
        BossAI->>BossAI: Health reaches zero
        BossAI->>GameEngine: Boss defeated
        GameEngine->>GameEngine: Calculate team statistics
        GameEngine-->>GameClient: Victory achieved
        GameEngine-->>Teammates: Victory notification
        GameClient-->>Gamer: Show victory screen with stats
        
        Note over Gamer,Teammates: Damage dealt, survival time, teamwork score
    else Defeat - Team eliminated
        GameEngine->>GameEngine: All players eliminated
        GameEngine-->>GameClient: Game over
        GameClient-->>Gamer: Show defeat screen
        
        opt Boss escapes
            BossAI->>GameEngine: Boss retreats after timeout
            GameEngine->>BossAI: Spawn new boss after delay
            Note over GameEngine: New boss spawns after time delay
        end
    end
```