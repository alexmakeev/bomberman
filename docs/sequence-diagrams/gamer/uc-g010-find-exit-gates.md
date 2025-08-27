# UC-G010: Find Exit Gates - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameEngine
    participant GateSystem
    participant MonsterSystem
    participant Teammates

    Note over Gamer,Teammates: Systematic Wall Destruction
    loop Gate Discovery
        Gamer->>GameClient: Target destructible walls
        GameClient->>GameEngine: Place bombs strategically
        GameEngine->>GameEngine: Explode walls
        GameEngine->>GateSystem: Check for hidden gates
        
        alt Gate found
            GateSystem->>GateSystem: Reveal exit gate
            GateSystem-->>GameEngine: Gate now visible
            GameEngine-->>GameClient: Show discovered gate
            GameClient-->>Gamer: Display exit gate location
            
            alt Accidental gate destruction
                GameEngine->>GateSystem: Bomb damages gate
                GateSystem->>GateSystem: Gate destroyed
                GateSystem->>MonsterSystem: Trigger monster wave
                MonsterSystem->>MonsterSystem: Spawn monster wave
                MonsterSystem-->>GameEngine: Monsters released
                GameEngine-->>GameClient: Monster wave warning
                GameClient-->>Gamer: Show monster threat
                
                Note over GateSystem: Gate remains destroyed (unusable)
            end
        else No gate found
            GateSystem-->>GameEngine: No gate at location
            Note over Gamer: Continue systematic search
        end
    end

    alt Multiple gates discovered
        Gamer->>Teammates: Coordinate gate selection
        Teammates->>GameEngine: Team evaluates gate positions
        GameEngine->>GateSystem: Assess gate accessibility
        GateSystem-->>Teammates: Gate status and safety
        Note over Teammates: Team chooses optimal exit
    end

    Note over Gamer,Teammates: Path Clearing
    GameEngine->>MonsterSystem: Monsters blocking path
    Gamer->>GameClient: Clear monsters with bombs
    Teammates->>GameEngine: Support monster clearing
    GameClient->>GameEngine: Coordinate team attacks
    GameEngine->>MonsterSystem: Eliminate blocking monsters
    MonsterSystem-->>GameEngine: Path cleared

    Note over Gamer,Teammates: Gate Approach
    GameEngine->>GateSystem: Check if all monsters defeated
    alt Monsters still alive and gates destroyed
        GateSystem-->>GameEngine: Gates remain unusable
        Note over GameEngine: Must defeat all monsters first
        MonsterSystem->>GameEngine: Continue monster waves
    else All monsters defeated
        GateSystem->>GateSystem: Gates become usable
        GateSystem-->>GameEngine: Safe to proceed to gate
    end

    Gamer->>GameClient: Move toward exit gate
    Teammates->>GameEngine: Team assembles at gate
    
    alt All players at gate
        GameEngine->>GateSystem: Check team assembly
        GateSystem->>GateSystem: All players present
        GateSystem-->>GameEngine: Level completion triggered
        GameEngine-->>GameClient: Level completed
        GameEngine-->>Teammates: Victory notification
        GameClient-->>Gamer: Show completion screen
    else Timer expires (if applicable)
        GameEngine->>GameEngine: Time limit reached
        GameEngine->>MonsterSystem: Switch to survival mode
        MonsterSystem-->>GameEngine: Continuous monster spawning
        Note over GameEngine: Level becomes survival challenge
    else Not all players present
        GameEngine->>GameEngine: Wait for team assembly
        GameClient-->>Gamer: Wait for teammates
    end
```