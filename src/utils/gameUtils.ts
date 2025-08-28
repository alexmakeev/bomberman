/**
 * Game Utility Functions
 * Core game mechanics and calculations for cooperative multiplayer Bomberman
 * 
 * @see docs/front-end/01-architecture-overview.md - Utility layer architecture
 */

import type { Bomb, Boss, Direction, Explosion, Maze, MazeCell, Monster, Player, Position, PowerUp } from '../types/game';

// Position and Movement Utilities
export function isValidPosition(position: Position, maze: Maze): boolean {
  if (!maze || maze.length === 0) {return false;}
  
  const { x, y } = position;
  return x >= 0 && x < maze[0].length && y >= 0 && y < maze.length;
}

export function getPositionInDirection(position: Position, direction: Direction, distance: number = 1): Position {
  const { x, y } = position;
  
  switch (direction) {
    case 'up': return { x, y: y - distance };
    case 'down': return { x, y: y + distance };
    case 'left': return { x: x - distance, y };
    case 'right': return { x: x + distance, y };
    default: return { x, y };
  }
}

export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getManhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

export function getDirectionBetweenPositions(from: Position, to: Position): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else if (dy !== 0) {
    return dy > 0 ? 'down' : 'up';
  }
  
  return null;
}

export function normalizePosition(position: Position): Position {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

// Maze and Cell Utilities
export function getCellType(position: Position, maze: Maze): MazeCell {
  if (!isValidPosition(position, maze)) {return 1;} // Wall for out-of-bounds
  return maze[position.y][position.x];
}

export function setCellType(position: Position, maze: Maze, cellType: MazeCell): void {
  if (isValidPosition(position, maze)) {
    maze[position.y][position.x] = cellType;
  }
}

export function isWalkable(position: Position, maze: Maze): boolean {
  const cellType = getCellType(position, maze);
  return cellType === 0; // Empty cell
}

export function isDestructible(position: Position, maze: Maze): boolean {
  const cellType = getCellType(position, maze);
  return cellType === 2; // Destructible wall
}

export function getWalkableNeighbors(position: Position, maze: Maze): Position[] {
  const neighbors: Position[] = [];
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  
  for (const direction of directions) {
    const neighbor = getPositionInDirection(position, direction);
    if (isWalkable(neighbor, maze)) {
      neighbors.push(neighbor);
    }
  }
  
  return neighbors;
}

export function getRandomWalkablePosition(maze: Maze): Position | null {
  const walkablePositions: Position[] = [];
  
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[0].length; x++) {
      if (maze[y][x] === 0) {
        walkablePositions.push({ x, y });
      }
    }
  }
  
  if (walkablePositions.length === 0) {return null;}
  
  const randomIndex = Math.floor(Math.random() * walkablePositions.length);
  return walkablePositions[randomIndex];
}

// Collision Detection
export function checkCollision(pos1: Position, pos2: Position, threshold: number = 0.8): boolean {
  return getDistance(pos1, pos2) < threshold;
}

export function checkPlayerCollision(player1: Player, player2: Player): boolean {
  return checkCollision(player1.position, player2.position, 0.6);
}

export function checkBombCollision(player: Player, bomb: Bomb): boolean {
  return checkCollision(player.position, bomb.position, 0.5);
}

export function checkPowerUpCollision(player: Player, powerUp: PowerUp): boolean {
  return checkCollision(player.position, powerUp.position, 0.7);
}

export function checkMonsterCollision(player: Player, monster: Monster): boolean {
  return checkCollision(player.position, monster.position, 0.8);
}

export function checkBossCollision(player: Player, boss: Boss): boolean {
  return checkCollision(player.position, boss.position, 1.2);
}

// Explosion Calculations
export function calculateExplosionCells(bomb: Bomb, maze: Maze): Position[] {
  const cells: Position[] = [bomb.position];
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  
  for (const direction of directions) {
    for (let distance = 1; distance <= bomb.power; distance++) {
      const cellPosition = getPositionInDirection(bomb.position, direction, distance);
      
      if (!isValidPosition(cellPosition, maze)) {break;}
      
      const cellType = getCellType(cellPosition, maze);
      cells.push(cellPosition);
      
      // Stop at walls (destructible or not)
      if (cellType !== 0) {break;}
    }
  }
  
  return cells;
}

export function isPositionInExplosion(position: Position, explosion: Explosion): boolean {
  return explosion.cells.some(cell => 
    cell.x === position.x && cell.y === position.y,
  );
}

export function getExplosionDamageAtPosition(position: Position, explosion: Explosion): number {
  if (!isPositionInExplosion(position, explosion)) {return 0;}
  
  // Damage decreases with distance from center
  const distance = getDistance(position, explosion.center);
  const maxDistance = Math.max(...explosion.cells.map(cell => getDistance(cell, explosion.center)));
  
  if (maxDistance === 0) {return explosion.damage;}
  
  const damageMultiplier = 1 - (distance / maxDistance) * 0.5;
  return Math.floor(explosion.damage * damageMultiplier);
}

// Visibility and FOV (Field of View)
export function isPositionVisible(
  viewerPosition: Position,
  targetPosition: Position,
  maze: Maze,
  viewDistance: number = 5,
): boolean {
  const distance = getDistance(viewerPosition, targetPosition);
  if (distance > viewDistance) {return false;}
  
  // Simple line-of-sight check
  const steps = Math.ceil(distance * 2);
  const stepX = (targetPosition.x - viewerPosition.x) / steps;
  const stepY = (targetPosition.y - viewerPosition.y) / steps;
  
  for (let i = 1; i < steps; i++) {
    const checkPosition = {
      x: Math.round(viewerPosition.x + stepX * i),
      y: Math.round(viewerPosition.y + stepY * i),
    };
    
    if (!isWalkable(checkPosition, maze)) {
      return false;
    }
  }
  
  return true;
}

export function getVisiblePositions(
  viewerPosition: Position,
  maze: Maze,
  viewDistance: number = 5,
): Position[] {
  const visible: Position[] = [];
  
  for (let y = viewerPosition.y - viewDistance; y <= viewerPosition.y + viewDistance; y++) {
    for (let x = viewerPosition.x - viewDistance; x <= viewerPosition.x + viewDistance; x++) {
      const position = { x, y };
      
      if (isValidPosition(position, maze) && 
          isPositionVisible(viewerPosition, position, maze, viewDistance)) {
        visible.push(position);
      }
    }
  }
  
  return visible;
}

// Power-up Utilities
export function applyPowerUp(player: Player, powerUpType: string): void {
  switch (powerUpType) {
    case 'bomb_count':
      player.maxBombs = Math.min(player.maxBombs + 1, 10);
      break;
    case 'bomb_power':
      player.bombPower = Math.min(player.bombPower + 1, 8);
      break;
    case 'speed_boost':
      player.speed = Math.min(player.speed * 1.2, 3);
      break;
    case 'health':
      player.health = Math.min(player.health + 25, player.maxHealth);
      break;
    case 'max_health':
      player.maxHealth += 25;
      player.health += 25;
      break;
  }
  
  if (!player.powerUps.includes(powerUpType as any)) {
    player.powerUps.push(powerUpType as any);
  }
}

// Score and Statistics
export function calculateScore(
  bombsPlaced: number,
  monstersKilled: number,
  blocksDestroyed: number,
  powerUpsCollected: number,
  timeAlive: number,
  assists: number,
): number {
  return (
    bombsPlaced * 10 +
    monstersKilled * 50 +
    blocksDestroyed * 5 +
    powerUpsCollected * 20 +
    Math.floor(timeAlive / 1000) * 1 +
    assists * 30
  );
}

// Pathfinding (A* algorithm)
export interface PathNode {
  position: Position
  gCost: number
  hCost: number
  fCost: number
  parent: PathNode | null
}

export function findPath(start: Position, goal: Position, maze: Maze): Position[] {
  const openSet: PathNode[] = [];
  const closedSet: PathNode[] = [];
  
  const startNode: PathNode = {
    position: start,
    gCost: 0,
    hCost: getManhattanDistance(start, goal),
    fCost: 0,
    parent: null,
  };
  startNode.fCost = startNode.gCost + startNode.hCost;
  
  openSet.push(startNode);
  
  while (openSet.length > 0) {
    // Find node with lowest fCost
    let currentNode = openSet[0];
    let currentIndex = 0;
    
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].fCost < currentNode.fCost) {
        currentNode = openSet[i];
        currentIndex = i;
      }
    }
    
    openSet.splice(currentIndex, 1);
    closedSet.push(currentNode);
    
    // Found goal
    if (currentNode.position.x === goal.x && currentNode.position.y === goal.y) {
      const path: Position[] = [];
      let node: PathNode | null = currentNode;
      
      while (node) {
        path.unshift(node.position);
        node = node.parent;
      }
      
      return path.slice(1); // Remove start position
    }
    
    // Check neighbors
    const neighbors = getWalkableNeighbors(currentNode.position, maze);
    
    for (const neighborPos of neighbors) {
      // Skip if in closed set
      if (closedSet.some(node => 
        node.position.x === neighborPos.x && node.position.y === neighborPos.y)) {
        continue;
      }
      
      const gCost = currentNode.gCost + 1;
      const hCost = getManhattanDistance(neighborPos, goal);
      const fCost = gCost + hCost;
      
      // Check if this path to neighbor is better
      const existingNode = openSet.find(node =>
        node.position.x === neighborPos.x && node.position.y === neighborPos.y);
      
      if (!existingNode) {
        const neighborNode: PathNode = {
          position: neighborPos,
          gCost,
          hCost,
          fCost,
          parent: currentNode,
        };
        openSet.push(neighborNode);
      } else if (gCost < existingNode.gCost) {
        existingNode.gCost = gCost;
        existingNode.fCost = fCost;
        existingNode.parent = currentNode;
      }
    }
  }
  
  return []; // No path found
}

// Random Utilities
export function getRandomDirection(): Direction {
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

export function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Animation and Interpolation
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function lerpPosition(start: Position, end: Position, factor: number): Position {
  return {
    x: lerp(start.x, end.x, factor),
    y: lerp(start.y, end.y, factor),
  };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Validation Utilities
export function isValidPlayerName(name: string): boolean {
  return name.length >= 2 && name.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(name);
}

export function isValidRoomId(roomId: string): boolean {
  return /^[a-zA-Z0-9]{6,12}$/.test(roomId);
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Performance Utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {clearTimeout(timeout);}
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}