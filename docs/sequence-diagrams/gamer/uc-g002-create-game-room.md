# UC-G002: Create Game Room - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant GameClient
    participant GameServer
    participant RoomManager
    participant GameRoom

    Gamer->>GameClient: Select "Create Room"
    GameClient-->>Gamer: Show room creation form
    Gamer->>GameClient: Enter name & room settings
    
    GameClient->>GameServer: Create room request
    GameServer->>RoomManager: Generate unique room ID
    RoomManager->>RoomManager: Create room URL
    RoomManager->>GameRoom: Initialize new room
    
    alt Room creation successful
        GameRoom->>GameRoom: Set player as host
        GameRoom-->>RoomManager: Room created
        RoomManager-->>GameServer: Room details
        GameServer-->>GameClient: Room created with URL
        GameClient-->>Gamer: Show shareable room URL
        
        GameClient-->>Gamer: Display room lobby as host
        
        opt Share room URL
            Gamer->>GameClient: Request to share URL
            GameClient->>GameClient: Access sharing APIs
            
            alt Sharing available
                GameClient-->>Gamer: Open share dialog
            else Sharing not available
                GameClient-->>Gamer: Display URL for manual copy
            end
        end
    else Room creation failed
        RoomManager-->>GameServer: Creation error
        GameServer-->>GameClient: Error response
        GameClient-->>Gamer: Show error, suggest retry
    end

    alt Connection lost during creation
        GameServer-->>GameClient: Connection timeout
        GameClient->>GameServer: Attempt host reconnection
        GameServer->>RoomManager: Verify host status
        RoomManager-->>GameServer: Host reconnection success
        GameServer-->>GameClient: Reconnected as host
    end
```