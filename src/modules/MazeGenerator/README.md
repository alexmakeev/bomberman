# MazeGenerator Module

## Overview
The MazeGenerator module creates procedural maze layouts for Bomberman multiplayer games. It generates balanced, strategic mazes with destructible walls, power-up placement, hidden gates, and optimized spawn positions for competitive cooperative gameplay.

## Role in Project
This module provides the foundation for all Bomberman gameplay by creating:
- **Maze Layouts**: Procedural generation of classic Bomberman grid patterns
- **Wall Distribution**: Strategic placement of permanent and destructible walls
- **Spawn Positioning**: Balanced corner positions for up to 4 players
- **Power-up Placement**: Hidden power-ups under destructible walls
- **Gate Generation**: Exit points concealed throughout the maze
- **Maze Validation**: Ensures accessibility and gameplay balance

## Key Features
- **Classic Grid Pattern**: Traditional Bomberman maze structure with alternating walls
- **Procedural Generation**: Reproducible mazes using seeded randomization
- **Balanced Spawn Points**: Corner positions with guaranteed safe areas
- **Strategic Destructible Walls**: 75% probability for optimal bomb target density
- **Hidden Elements**: Power-ups and gates concealed under destructible walls
- **Customizable Parameters**: Adjustable maze size, wall density, power-up rates
- **Accessibility Validation**: Ensures all areas are reachable by players

## Maze Structure
- **Default Size**: 15x11 grid (classic Bomberman dimensions)
- **Border Walls**: Permanent walls around entire perimeter
- **Internal Walls**: Permanent walls at every other intersection (2,2), (4,4), etc.
- **Destructible Walls**: 75% probability in empty cells
- **Spawn Areas**: 2x2 cleared zones at corners for player safety
- **Gates**: 2 hidden exit points under destructible walls
- **Power-ups**: 15% spawn rate under destructible walls

## Generation Algorithm
```
1. Create base empty grid
2. Place permanent border and internal walls
3. Fill empty spaces with destructible walls (75% probability)
4. Create 4 corner spawn positions
5. Clear 2x2 safe areas around spawns
6. Place 2 gates under random destructible walls  
7. Distribute power-ups under destructible walls (15% rate)
8. Validate maze accessibility and balance
```

## Architecture Integration
```
Game Start ──→ MazeGenerator ──→ Maze Structure
     ↓               ↓                 ↓
Seed Input ──→ Wall Placement ──→ Spawn Creation
     ↓               ↓                 ↓
Validation ──→ Power-up Distribution ──→ Game State
```

## Cell Types
- **empty**: Open walkable space
- **wall**: Permanent indestructible barriers
- **destructible**: Walls that can be destroyed by bombs
- **spawn**: Player starting positions (cleared areas)
- **gate**: Exit points hidden under destructible walls

## Interface Implementation
Core maze generation functionality:
- `generateMaze(gameId, options?)` - Create new procedural maze
- `modifyMaze(gameId, modifications)` - Apply runtime maze changes
- `destroyWall(gameId, position)` - Handle wall destruction and reveals
- `validateMazeStructure(maze)` - Ensure maze meets gameplay requirements

## Dependencies
- **EventBus**: Core event system for maze change notifications
- **Common Types**: `src/types/common.d.ts` - Entity IDs and positions
- **Seeded Random**: Reproducible generation for consistent multiplayer

## Usage Examples
```typescript
// Generate new maze for game
const maze = await mazeGenerator.generateMaze(gameId, {
  width: 15,
  height: 11,
  destructibleProbability: 0.8,
  powerUpSpawnRate: 0.2,
  playerCount: 4,
  seed: 'game_seed_123'
});

// Destroy wall and check for reveals
const result = await mazeGenerator.destroyWall(gameId, { x: 5, y: 7 });
if (result.powerUpRevealed) {
  console.log(`Power-up revealed: ${result.powerUpRevealed}`);
}
if (result.gateRevealed) {
  console.log('Gate revealed! Players can now exit.');
}

// Validate maze structure
const validation = await mazeGenerator.validateMazeStructure(maze);
if (!validation.valid) {
  console.log('Maze issues:', validation.issues);
}
```

## Power-up Distribution
Power-ups are strategically placed under destructible walls:
- **bomb_upgrade**: Increase max simultaneous bombs
- **blast_radius**: Expand explosion range  
- **speed_boost**: Faster player movement
- **bomb_kick**: Kick bombs to move them
- **bomb_throw**: Throw bombs over walls

## Spawn Point Strategy
Corner spawn positions provide balanced competitive starts:
- **Top-left**: (1,1) with 2x2 cleared area
- **Top-right**: (width-2,1) with safe zone
- **Bottom-left**: (1,height-2) with clearance
- **Bottom-right**: (width-2,height-2) safe spawn

## Performance Specifications
- Maze generation: <100ms for 15x11 grid
- Wall destruction: <5ms per wall with reveal checking
- Memory usage: <500KB per maze structure
- Validation: <20ms for complete maze analysis
- Seed consistency: 100% reproducible across clients

## Cooperative Gameplay Features
- **Gate Mechanics**: Multiple exit strategies encourage exploration
- **Destructible Density**: Balanced for teamwork without overcrowding
- **Power-up Balance**: Sufficient upgrades for all team members
- **Safe Spawns**: No immediate threat from monsters or traps
- **Strategic Depth**: Multiple paths and tactical positioning options

## Related Documentation
- Maze Algorithms: `docs/maze-generation-algorithms.md`
- Game Balance: `docs/cooperative-gameplay-balance.md`
- Wall Mechanics: `docs/wall-destruction-mechanics.md`
- Power-up System: `docs/powerup-placement-strategy.md`