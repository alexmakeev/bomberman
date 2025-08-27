# Gamer Use Cases

## Actor: Game Player

### UC-G001: Join Game Room
**Primary Actor:** Gamer  
**Goal:** Join an existing game room to play with friends  
**Preconditions:** Player has room URL or room code  

**Main Success Scenario:**
1. Player receives room URL from friend or enters room code
2. Player clicks/enters the room link
3. System validates room exists and has available slots
4. Player enters display name
5. System adds player to room and displays lobby
6. Other players in room are notified of new player

**Extensions:**
- 3a. Room is full: System shows "Room is full" error message
- 3b. Room doesn't exist: System shows "Room not found" error
- 4a. Name already taken: System prompts for different name
- 6a. Network issues: System retries connection automatically

### UC-G002: Create Game Room
**Primary Actor:** Gamer  
**Goal:** Create a new game room to host friends  
**Preconditions:** None  

**Main Success Scenario:**
1. Player selects "Create Room" option
2. Player enters display name and optional room settings
3. System generates unique room ID and URL
4. System creates room and places player as host
5. Player receives shareable room URL
6. Player can invite friends via URL sharing

**Extensions:**
- 3a. Room creation fails: System shows error and suggests retry
- 4a. Connection lost: System attempts to reconnect player as host
- 6a. Sharing not available: System displays URL for manual copy

### UC-G003: Play Cooperative Game
**Primary Actor:** Gamer  
**Goal:** Play Bomberman cooperatively with teammates  
**Preconditions:** Player is in an active game room with other players  

**Main Success Scenario:**
1. Game starts when all players are ready
2. Player spawns at random corner of maze
3. Player moves using arrow keys/touch controls
4. Player places bombs to destroy walls and defeat monsters
5. Player collects power-ups to increase bomb capacity/range
6. Player works with teammates to complete objectives
7. Game ends when boss is defeated or exit gate is reached

**Extensions:**
- 2a. Network lag: System interpolates movement for smooth gameplay
- 4a. Friendly fire: System shows warning about teamwork
- 6a. Player eliminated: System starts 10-second respawn countdown
- 7a. All gates destroyed: Monster waves spawn, objectives change

### UC-G004: Use Mobile Controls
**Primary Actor:** Gamer (on mobile device)  
**Goal:** Play game using touch controls on mobile device  
**Preconditions:** Player is using mobile browser  

**Main Success Scenario:**
1. System detects mobile device and displays touch controls
2. Player uses virtual joystick for movement
3. Player taps bomb button to place bombs
4. Touch controls respond with haptic feedback
5. UI scales appropriately for screen size

**Extensions:**
- 2a. Accidental touches: System implements touch deadzone
- 3a. Rapid tapping: System prevents bomb spam with cooldown
- 4a. No haptic support: System uses visual feedback only
- 5a. Small screen: System prioritizes game area over UI elements

### UC-G005: Install as PWA
**Primary Actor:** Gamer  
**Goal:** Install game as Progressive Web App for offline access  
**Preconditions:** Browser supports PWA installation  

**Main Success Scenario:**
1. System displays PWA install prompt after gameplay session
2. Player chooses to install the app
3. Browser installs PWA to device home screen
4. Player can launch game directly from home screen
5. Game works offline for single-player practice mode

**Extensions:**
- 1a. Install prompt dismissed: System shows install option in menu
- 2a. Installation fails: System provides manual install instructions
- 5a. No offline mode: System shows "connection required" message

### UC-G006: Respawn After Elimination
**Primary Actor:** Gamer  
**Goal:** Return to game after being eliminated  
**Preconditions:** Player has been eliminated by bomb or monster  

**Main Success Scenario:**
1. Player is eliminated and sees elimination screen
2. System starts 10-second countdown timer
3. Player watches ongoing game from eliminated view
4. After countdown, player respawns at random corner
5. Player continues playing with same power-ups

**Extensions:**
- 3a. Game ends during countdown: Player joins next round
- 4a. All corners occupied: System finds nearest safe spawn point
- 5a. Power-ups lost due to game rules: Player starts with basic abilities

### UC-G007: Use Minimap Navigation
**Primary Actor:** Gamer  
**Goal:** Navigate maze using minimap information  
**Preconditions:** Player is in active game  

**Main Success Scenario:**
1. Player views minimap in corner of screen
2. Minimap shows player positions, walls, and monsters
3. Player uses minimap to coordinate with teammates
4. Player navigates toward objectives shown on minimap
5. Minimap updates in real-time as maze changes

**Extensions:**
- 2a. Limited visibility: Minimap shows fog of war for distant areas
- 3a. No voice chat: Players use movement patterns for communication
- 4a. Objectives hidden: Player must explore to reveal exit gates
- 5a. Network lag: Minimap updates with slight delay

### UC-G008: Collect Power-ups
**Primary Actor:** Gamer  
**Goal:** Enhance abilities by collecting power-ups  
**Preconditions:** Player is in active game and power-ups are available  

**Main Success Scenario:**
1. Player destroys walls to reveal hidden power-ups
2. Player walks over power-up to collect it
3. System applies power-up effect immediately
4. Player's bomb capacity or range increases
5. Visual indicator shows current power-up level

**Extensions:**
- 1a. No power-ups found: Player continues with current abilities
- 2a. Another player collects first: Power-up disappears
- 3a. Maximum power reached: System shows "max power" message
- 4a. Power-up lost on death: Player respawns with reduced abilities

### UC-G009: Defeat Boss Enemy
**Primary Actor:** Gamer (with team)  
**Goal:** Cooperatively defeat the boss to win the game  
**Preconditions:** Players have reached boss area  

**Main Success Scenario:**
1. Team encounters boss enemy in maze
2. Players coordinate bomb placement to damage boss
3. Boss has multiple health phases with different attack patterns
4. Team avoids boss attacks while maintaining pressure
5. Boss is defeated and game victory is achieved
6. Victory screen shows team statistics

**Extensions:**
- 2a. Poor coordination: Boss defeats individual players
- 3a. Boss enters rage mode: Attack patterns become more aggressive
- 4a. Team eliminated: Game ends in defeat
- 5a. Boss escapes: New boss spawns after time delay

### UC-G010: Find Exit Gates
**Primary Actor:** Gamer (with team)  
**Goal:** Locate and reach exit gates to complete level  
**Preconditions:** Exit gates exist somewhere in the maze  

**Main Success Scenario:**
1. Team systematically destroys walls to find hidden gates
2. Player discovers exit gate under destructible wall
3. Team clears path to exit gate
4. All players reach exit gate area
5. Level completion is achieved

**Extensions:**
- 1a. Gate accidentally destroyed: Monster wave spawns
- 2a. Multiple gates found: Team chooses optimal exit
- 3a. Monsters block path: Team must clear enemies first
- 4a. Not all players present: Game waits for team assembly
- 5a. Timer expires: Level becomes survival mode