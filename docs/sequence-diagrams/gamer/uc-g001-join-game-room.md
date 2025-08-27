# UC-G001: Join Game Room - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameServer
    participant GameRoom
    participant OtherPlayers

    Gamer->>GameClient: Click room URL or enter room code
    GameClient->>GameServer: Request room validation
    GameServer->>GameRoom: Check room exists & has slots
    
    alt Room valid and available
        GameRoom-->>GameServer: Room available
        GameServer-->>GameClient: Room validation success
        GameClient-->>Gamer: Prompt for display name
        
        Gamer->>GameClient: Enter display name
        GameClient->>GameServer: Join room request
        GameServer->>GameRoom: Check name availability
        
        alt Name available
            GameRoom->>GameRoom: Add player to room
            GameRoom->>OtherPlayers: Notify new player joined
            GameRoom-->>GameServer: Player added
            GameServer-->>GameClient: Join success
            GameClient-->>Gamer: Show lobby with other players
        else Name taken
            GameRoom-->>GameServer: Name conflict
            GameServer-->>GameClient: Name unavailable
            GameClient-->>Gamer: Prompt for different name
        end
    else Room full
        GameRoom-->>GameServer: Room at capacity
        GameServer-->>GameClient: Room full error
        GameClient-->>Gamer: Show "Room is full" message
    else Room not found
        GameServer-->>GameClient: Room not found
        GameClient-->>Gamer: Show "Room not found" error
    end

    alt Network issues
        GameServer-->>GameClient: Connection timeout
        GameClient->>GameClient: Auto-retry connection
    end
```