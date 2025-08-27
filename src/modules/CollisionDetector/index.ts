/**
 * CollisionDetector Implementation
 * High-performance collision detection for players, bombs, walls, and power-ups
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';

// Constants for collision detection
const PLAYER_SIZE = 0.8; // Player collision box size (smaller than grid cell)
const BOMB_SIZE = 0.6;
const POWERUP_SIZE = 0.5;
// const GRID_CELL_SIZE = 1.0; // TODO: Use in future collision optimizations
// const MOVEMENT_EPSILON = 0.01; // TODO: Use for movement validation

/**
 * Position with floating point coordinates
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Collision box definition
 */
interface CollisionBox {
  x: number; // Center x
  y: number; // Center y
  width: number;
  height: number;
  entityId: EntityId;
  entityType: 'player' | 'bomb' | 'wall' | 'destructible' | 'powerup' | 'monster';
}

/**
 * Movement vector
 */
interface MovementVector {
  dx: number;
  dy: number;
}

/**
 * Collision detection result
 */
interface CollisionResult {
  hasCollision: boolean;
  collidedWith?: CollisionBox;
  adjustedPosition?: Position;
  collisionType?: 'wall' | 'entity' | 'boundary';
  canMove: boolean;
}

/**
 * Ray casting result for line-of-sight
 */
interface RaycastResult {
  hit: boolean;
  hitPosition?: Position;
  hitEntity?: CollisionBox;
  distance: number;
}

/**
 * CollisionDetector implementation
 */
class CollisionDetectorImpl {
  readonly eventBus: EventBus;
  private readonly _staticColliders = new Map<string, CollisionBox>(); // Walls, destructibles
  private readonly _dynamicColliders = new Map<EntityId, CollisionBox>(); // Players, bombs, monsters

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('🎯 CollisionDetector created');
  }

  async initialize(): Promise<void> {
    console.log('🎯 CollisionDetector initialized');
    // TODO: Setup spatial partitioning for performance optimization
  }

  async checkPlayerMovement(
    playerId: EntityId,
    currentPosition: Position,
    movement: MovementVector,
    mazeData: any,
  ): Promise<CollisionResult> {
    const newPosition = {
      x: currentPosition.x + movement.dx,
      y: currentPosition.y + movement.dy,
    };

    console.log(`🎯 Checking movement for ${playerId}: (${currentPosition.x}, ${currentPosition.y}) -> (${newPosition.x}, ${newPosition.y})`);

    // Check boundary collisions
    if (this.isOutOfBounds(newPosition, mazeData.width, mazeData.height)) {
      return {
        hasCollision: true,
        collisionType: 'boundary',
        canMove: false,
        adjustedPosition: currentPosition,
      };
    }

    // Check wall collisions
    const wallCollision = this.checkWallCollision(newPosition, mazeData);
    if (wallCollision.hasCollision) {
      return wallCollision;
    }

    // Check entity collisions (other players, bombs)
    const entityCollision = this.checkEntityCollision(playerId, newPosition, 'player');
    if (entityCollision.hasCollision) {
      return entityCollision;
    }

    return {
      hasCollision: false,
      canMove: true,
      adjustedPosition: newPosition,
    };
  }

  async checkBombPlacement(
    playerId: EntityId,
    position: Position,
    mazeData: any,
  ): Promise<CollisionResult> {
    console.log(`🎯 Checking bomb placement at (${position.x}, ${position.y})`);

    // Convert to grid coordinates
    const gridX = Math.floor(position.x);
    const gridY = Math.floor(position.y);

    // Check if grid cell is occupied by wall
    if (this.isWallAtGrid(gridX, gridY, mazeData)) {
      return {
        hasCollision: true,
        collisionType: 'wall',
        canMove: false,
      };
    }

    // Check if there's already a bomb at this position
    const bombCollision = this.checkEntityCollisionAtGrid(gridX, gridY, 'bomb');
    if (bombCollision.hasCollision) {
      return bombCollision;
    }

    return {
      hasCollision: false,
      canMove: true,
      adjustedPosition: { x: gridX + 0.5, y: gridY + 0.5 }, // Center of grid cell
    };
  }

  async checkExplosionHit(
    explosionCells: Array<{ x: number; y: number }>,
    _gameId: EntityId,
  ): Promise<Array<{ entityId: EntityId; entityType: string; position: Position }>> {
    console.log(`🎯 Checking explosion hits for ${explosionCells.length} cells`);

    const hitEntities: Array<{ entityId: EntityId; entityType: string; position: Position }> = [];

    // Check each explosion cell against all dynamic entities
    for (const cell of explosionCells) {
      for (const [entityId, collider] of this._dynamicColliders) {
        if (this.isEntityInExplosionCell(collider, cell)) {
          hitEntities.push({
            entityId,
            entityType: collider.entityType,
            position: { x: collider.x, y: collider.y },
          });
        }
      }
    }

    return hitEntities;
  }

  async checkPowerUpCollection(
    playerId: EntityId,
    playerPosition: Position,
  ): Promise<Array<{ powerUpId: EntityId; powerUpType: string; position: Position }>> {
    console.log(`🎯 Checking power-up collection for ${playerId}`);

    const collectedPowerUps: Array<{ powerUpId: EntityId; powerUpType: string; position: Position }> = [];

    // Check collision with all power-up entities
    for (const [entityId, collider] of this._dynamicColliders) {
      if (collider.entityType === 'powerup' && this.checkBoxCollision(
        this.createPlayerBox(playerPosition, playerId),
        collider,
      )) {
        collectedPowerUps.push({
          powerUpId: entityId,
          powerUpType: 'unknown', // TODO: Get from power-up data
          position: { x: collider.x, y: collider.y },
        });
      }
    }

    return collectedPowerUps;
  }

  async raycast(
    from: Position,
    to: Position,
    ignoredEntities?: EntityId[],
  ): Promise<RaycastResult> {
    const distance = this.calculateDistance(from, to);
    const direction = {
      x: (to.x - from.x) / distance,
      y: (to.y - from.y) / distance,
    };

    const stepSize = 0.1;
    let currentDistance = 0;

    while (currentDistance < distance) {
      const checkPosition = {
        x: from.x + direction.x * currentDistance,
        y: from.y + direction.y * currentDistance,
      };

      // Check against static colliders (walls)
      const staticHit = this.checkStaticCollisionAtPosition(checkPosition);
      if (staticHit) {
        return {
          hit: true,
          hitPosition: checkPosition,
          distance: currentDistance,
        };
      }

      // Check against dynamic colliders
      for (const [entityId, collider] of this._dynamicColliders) {
        if (ignoredEntities?.includes(entityId)) {continue;}

        if (this.isPointInBox(checkPosition, collider)) {
          return {
            hit: true,
            hitPosition: checkPosition,
            hitEntity: collider,
            distance: currentDistance,
          };
        }
      }

      currentDistance += stepSize;
    }

    return {
      hit: false,
      distance,
    };
  }

  async registerStaticCollider(key: string, collider: CollisionBox): Promise<void> {
    this._staticColliders.set(key, collider);
  }

  async registerDynamicCollider(entityId: EntityId, collider: CollisionBox): Promise<void> {
    this._dynamicColliders.set(entityId, collider);
  }

  async unregisterDynamicCollider(entityId: EntityId): Promise<void> {
    this._dynamicColliders.delete(entityId);
  }

  async updateColliderPosition(entityId: EntityId, position: Position): Promise<void> {
    const collider = this._dynamicColliders.get(entityId);
    if (collider) {
      collider.x = position.x;
      collider.y = position.y;
    }
  }

  private checkWallCollision(position: Position, mazeData: any): CollisionResult {
    // Check the four corners of the player's collision box
    const halfSize = PLAYER_SIZE / 2;
    const corners = [
      { x: position.x - halfSize, y: position.y - halfSize },
      { x: position.x + halfSize, y: position.y - halfSize },
      { x: position.x - halfSize, y: position.y + halfSize },
      { x: position.x + halfSize, y: position.y + halfSize },
    ];

    for (const corner of corners) {
      const gridX = Math.floor(corner.x);
      const gridY = Math.floor(corner.y);

      if (this.isWallAtGrid(gridX, gridY, mazeData)) {
        return {
          hasCollision: true,
          collisionType: 'wall',
          canMove: false,
        };
      }
    }

    return { hasCollision: false, canMove: true };
  }

  private checkEntityCollision(excludeId: EntityId, position: Position, entityType: string): CollisionResult {
    const testBox = this.createEntityBox(position, excludeId, entityType);

    for (const [entityId, collider] of this._dynamicColliders) {
      if (entityId === excludeId) {continue;}

      if (this.checkBoxCollision(testBox, collider)) {
        return {
          hasCollision: true,
          collidedWith: collider,
          collisionType: 'entity',
          canMove: false,
        };
      }
    }

    return { hasCollision: false, canMove: true };
  }

  private checkEntityCollisionAtGrid(gridX: number, gridY: number, entityType: string): CollisionResult {
    for (const [, collider] of this._dynamicColliders) {
      if (collider.entityType === entityType) {
        const colliderGridX = Math.floor(collider.x);
        const colliderGridY = Math.floor(collider.y);

        if (colliderGridX === gridX && colliderGridY === gridY) {
          return {
            hasCollision: true,
            collidedWith: collider,
            collisionType: 'entity',
            canMove: false,
          };
        }
      }
    }

    return { hasCollision: false, canMove: true };
  }

  private isWallAtGrid(gridX: number, gridY: number, mazeData: any): boolean {
    // TODO: Check against actual maze data
    if (gridX < 0 || gridY < 0 || gridX >= mazeData.width || gridY >= mazeData.height) {
      return true; // Treat out of bounds as walls
    }

    // Simplified check - assume walls exist at even coordinates
    return (gridX % 2 === 0 && gridY % 2 === 0) || gridX === 0 || gridY === 0 || 
           gridX === mazeData.width - 1 || gridY === mazeData.height - 1;
  }

  private isOutOfBounds(position: Position, mazeWidth: number, mazeHeight: number): boolean {
    const halfSize = PLAYER_SIZE / 2;
    return position.x - halfSize < 0 || position.x + halfSize >= mazeWidth ||
           position.y - halfSize < 0 || position.y + halfSize >= mazeHeight;
  }

  private isEntityInExplosionCell(collider: CollisionBox, cell: { x: number; y: number }): boolean {
    const entityGridX = Math.floor(collider.x);
    const entityGridY = Math.floor(collider.y);
    return entityGridX === cell.x && entityGridY === cell.y;
  }

  private checkBoxCollision(box1: CollisionBox, box2: CollisionBox): boolean {
    const halfWidth1 = box1.width / 2;
    const halfHeight1 = box1.height / 2;
    const halfWidth2 = box2.width / 2;
    const halfHeight2 = box2.height / 2;

    return Math.abs(box1.x - box2.x) < (halfWidth1 + halfWidth2) &&
           Math.abs(box1.y - box2.y) < (halfHeight1 + halfHeight2);
  }

  private isPointInBox(point: Position, box: CollisionBox): boolean {
    const halfWidth = box.width / 2;
    const halfHeight = box.height / 2;

    return point.x >= box.x - halfWidth && point.x <= box.x + halfWidth &&
           point.y >= box.y - halfHeight && point.y <= box.y + halfHeight;
  }

  private checkStaticCollisionAtPosition(position: Position): boolean {
    for (const [, collider] of this._staticColliders) {
      if (this.isPointInBox(position, collider)) {
        return true;
      }
    }
    return false;
  }

  private createPlayerBox(position: Position, playerId: EntityId): CollisionBox {
    return {
      x: position.x,
      y: position.y,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      entityId: playerId,
      entityType: 'player',
    };
  }

  private createEntityBox(position: Position, entityId: EntityId, entityType: string): CollisionBox {
    let size = PLAYER_SIZE;
    if (entityType === 'bomb') {size = BOMB_SIZE;}
    if (entityType === 'powerup') {size = POWERUP_SIZE;}

    return {
      x: position.x,
      y: position.y,
      width: size,
      height: size,
      entityId,
      entityType: entityType as any,
    };
  }

  private calculateDistance(from: Position, to: Position): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Factory function to create CollisionDetector instance
 */
export function createCollisionDetector(eventBus: EventBus): CollisionDetectorImpl {
  return new CollisionDetectorImpl(eventBus);
}