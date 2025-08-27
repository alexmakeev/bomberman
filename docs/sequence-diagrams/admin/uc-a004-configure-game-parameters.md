# UC-A004: Configure Game Parameters - Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant ConfigService
    participant Database
    participant GameServer
    participant ActiveGame

    Admin->>AdminDashboard: Access configuration panel
    AdminDashboard->>ConfigService: Get current settings
    ConfigService->>Database: Query configuration
    Database-->>ConfigService: Current config values
    ConfigService-->>AdminDashboard: Configuration data
    AdminDashboard-->>Admin: Show current settings

    Admin->>AdminDashboard: Modify settings
    Note over Admin: respawn time, monster difficulty, room limits
    Admin->>AdminDashboard: Save changes
    
    AdminDashboard->>ConfigService: Validate new settings
    ConfigService->>ConfigService: Check parameter bounds
    
    alt Valid configuration
        ConfigService->>Database: Store new configuration
        Database-->>ConfigService: Save confirmation
        ConfigService->>GameServer: Apply new settings
        
        GameServer->>ActiveGame: Update game parameters
        Note over GameServer,ActiveGame: Active games receive updates
        
        ConfigService-->>AdminDashboard: Success confirmation
        AdminDashboard-->>Admin: Show "Settings saved"
        
        alt Games in progress
            GameServer->>GameServer: Queue changes for new games
            Note over GameServer: Changes apply to new games only
        end
    else Invalid configuration
        ConfigService-->>AdminDashboard: Validation errors
        AdminDashboard-->>Admin: Show error details
    end
```