# BombManager Module

## Overview
The BombManager module handles all bomb-related mechanics in the Bomberman multiplayer game. It manages bomb placement, timing, explosions, damage calculation, and chain reactions with precise timing and collision detection.

## Role in Project
This module is responsible for the core bombing mechanics that define Bomberman gameplay:
- **Bomb Placement**: Validates and creates bombs at player positions
- **Timer Management**: Tracks bomb countdown and triggers explosions
- **Explosion Calculation**: Determines blast patterns and affected areas
- **Damage Processing**: Calculates damage to players, walls, and objects
- **Chain Reactions**: Handles bombs triggering other bombs
- **Resource Limits**: Enforces per-player bomb limits and cooldowns

## Key Features
- **Real-time Bomb Tracking**: Active monitoring of all placed bombs
- **Precise Timing**: 3-second countdown with millisecond accuracy
- **Cross-pattern Explosions**: Traditional Bomberman blast shape
- **Wall Destruction**: Destructible wall removal and maze modification
- **Player Damage**: Health reduction and elimination mechanics
- **Chain Reactions**: Bombs triggering nearby bombs for combo effects
- **Resource Management**: Per-player bomb limits and placement validation

## Bomb Mechanics
- **Default Timer**: 3000ms (3 seconds) countdown
- **Blast Radius**: Configurable cross-pattern explosion
- **Maximum Bombs**: 1 per player (upgradeable with power-ups)
- **Explosion Duration**: 500ms visual effect duration
- **Damage**: 100% damage to players in blast radius
- **Chain Trigger**: Explosions can detonate nearby bombs

## Architecture Integration
```
Player Input ──→ BombManager ──→ Explosion Calculation
      ↓               ↓                    ↓
Placement Check ──→ Timer Start ──→ Damage Processing
      ↓               ↓                    ↓
EventBus Notify ──→ Chain Reaction ──→ Game State Update
```

## Interface Implementation
Core bomb management functionality with the following methods:
- `placeBomb(gameId, playerId, position)` - Validate and place new bomb
- `explodeBomb(bombId)` - Trigger bomb explosion and calculate effects
- `defuseBomb(bombId)` - Remove bomb before explosion (special mechanic)
- `getBombsInGame(gameId)` - Get all active bombs in a game
- `getExplosionsInGame(gameId)` - Get all active explosions

## Dependencies
- **EventBus**: Core event system for bomb notifications
- **Common Types**: `src/types/common.d.ts` - Entity IDs and basic types
- **Game State**: Integration with maze and player position data

## Usage Examples
```typescript
// Place a bomb
const result = await bombManager.placeBomb(gameId, playerId, { x: 5, y: 7 });
if (result.success) {
  console.log(`Bomb placed: ${result.bombId}`);
}

// Get active bombs in game
const bombs = await bombManager.getBombsInGame(gameId);

// Manual bomb detonation (for special power-ups)
const explosion = await bombManager.explodeBomb(bombId);
if (explosion) {
  console.log(`${explosion.affectedCells.length} cells affected`);
}

// Check player bomb capacity
const bombCount = await bombManager.getPlayerBombCount(playerId);
```

## Explosion Pattern
Classic Bomberman cross-pattern explosion:
```
    X
    X
X X B X X  <- Blast radius 2
    X
    X
```
- **B**: Bomb center position
- **X**: Affected cells (damage/destruction)
- **Radius**: Configurable based on player power-ups

## Performance Specifications
- Bomb placement: <5ms validation and creation
- Explosion calculation: <20ms for standard radius
- Timer accuracy: ±10ms precision for 3-second countdown
- Memory usage: <1MB per 100 active bombs
- Concurrent bombs: Support for 100+ bombs across all games

## Security Features
- Position validation against maze boundaries
- Anti-cheat bomb limit enforcement
- Timer manipulation prevention
- Explosion pattern validation
- Resource exhaustion protection

## Error Handling
- **Invalid Position**: Out of bounds or occupied cell
- **Bomb Limit**: Player has reached maximum bombs
- **Game Not Found**: Invalid game ID reference
- **Timer Conflicts**: Handling rapid bomb placement
- **Memory Cleanup**: Automatic cleanup on game end

## Game Balance
- **Base Timer**: 3 seconds provides strategic planning time
- **Blast Radius**: Default radius 1, expandable with power-ups
- **Bomb Limit**: Default 1 bomb, increasable with upgrades
- **Chain Delay**: 100ms delay between chain reaction triggers
- **Damage**: One-hit elimination for competitive gameplay

## Related Documentation
- Game Mechanics: `docs/game-mechanics.md`
- Bomb Physics: `docs/bomb-explosion-physics.md`
- Power-up System: `docs/powerup-effects.md`
- Chain Reactions: `docs/chain-reaction-mechanics.md`