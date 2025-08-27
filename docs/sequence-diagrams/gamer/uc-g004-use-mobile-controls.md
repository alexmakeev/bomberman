# UC-G004: Use Mobile Controls - Sequence Diagram

```mermaid
sequenceDiagram
    participant Gamer
    participant MobileDevice
    participant GameClient
    participant TouchHandler
    participant GameServer
    participant Redis

    Note over Gamer,Redis: Mobile Detection
    GameClient->>MobileDevice: Detect device type
    MobileDevice-->>GameClient: Mobile device confirmed
    GameClient->>GameClient: Enable mobile UI mode
    GameClient-->>Gamer: Show virtual controls

    Note over Gamer,Redis: Touch Input Handling
    loop Game Input Loop
        Gamer->>MobileDevice: Touch virtual joystick
        MobileDevice->>TouchHandler: Raw touch events
        TouchHandler->>TouchHandler: Calculate touch position
        
        alt Valid touch in joystick area
            TouchHandler->>TouchHandler: Convert to movement vector
            TouchHandler->>GameClient: Movement input
            GameClient->>GameServer: Player movement action
            GameServer->>Redis: Update player position
            Redis->>Redis: Publish position change
            
            alt Haptic feedback available
                TouchHandler->>MobileDevice: Trigger haptic feedback
                MobileDevice-->>Gamer: Vibration feedback
            else No haptic support
                TouchHandler->>GameClient: Visual feedback only
                GameClient-->>Gamer: Visual touch response
            end
        else Accidental touch outside deadzone
            TouchHandler->>TouchHandler: Ignore touch (deadzone)
        end

        opt Bomb placement
            Gamer->>MobileDevice: Tap bomb button
            MobileDevice->>TouchHandler: Bomb button touch
            TouchHandler->>TouchHandler: Check cooldown
            
            alt Cooldown expired
                TouchHandler->>GameClient: Place bomb action
                GameClient->>GameServer: Bomb placement request
                GameServer->>Redis: Create bomb in game state
                Redis->>Redis: Publish bomb placed event
                TouchHandler->>TouchHandler: Start cooldown timer
            else Rapid tapping (cooldown active)
                TouchHandler->>TouchHandler: Prevent bomb spam
            end
        end
    end

    Note over Gamer,Redis: UI Scaling & Real-time Updates
    GameClient->>MobileDevice: Get screen dimensions
    MobileDevice-->>GameClient: Screen size info
    
    alt Large screen
        GameClient->>GameClient: Standard UI layout
    else Small screen
        GameClient->>GameClient: Prioritize game area
        GameClient->>GameClient: Minimize UI elements
    end
    
    Note over Redis: Real-time state synchronization
    Redis->>GameClient: Game state updates via pub/sub
    GameClient-->>Gamer: Scaled interface with live updates
```