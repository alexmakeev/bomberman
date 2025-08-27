# UC-A002: Manage Game Rooms - Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant GameServer
    participant GameRoom
    participant Player
    participant AuditLog

    Admin->>AdminDashboard: Identify problematic room
    Admin->>AdminDashboard: Select room management
    AdminDashboard->>Admin: Show management options
    Admin->>AdminDashboard: Choose action (terminate/kick/warn)
    
    AdminDashboard->>GameServer: Send admin action
    GameServer->>AuditLog: Log admin action
    
    alt Terminate room
        GameServer->>GameRoom: Terminate room
        GameRoom->>Player: Send termination notice
        GameRoom->>GameRoom: Close room
    else Kick player
        GameServer->>GameRoom: Remove specific player
        GameRoom->>Player: Send kick notification
    else Send warning
        GameServer->>GameRoom: Send warning message
        GameRoom->>Player: Display warning
    end
    
    GameServer-->>AdminDashboard: Action completed
    AdminDashboard-->>Admin: Show success confirmation

    alt Room already terminated
        GameServer-->>AdminDashboard: Error - room not found
        AdminDashboard-->>Admin: Show error message
    end

    alt Player offline
        GameRoom->>GameServer: Queue notification
        GameServer->>GameServer: Store for next connection
    end
```