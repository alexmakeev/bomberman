/**
 * BossAI Implementation
 * Advanced AI for boss enemies with special attacks and phases
 * See docs/schema/monster.md for boss specifications
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';
import type { UniversalEvent } from '../../types/events.d.ts';

type BossType = 'FLAME_MASTER' | 'ICE_QUEEN' | 'SHADOW_LORD' | 'EARTH_TITAN';
type BossState = 'SPAWNING' | 'IDLE' | 'MOVING' | 'ATTACKING' | 'STUNNED' | 'DEAD';
type AttackPattern = 'NORMAL' | 'AGGRESSIVE' | 'ENRAGED';

interface Position {
  x: number;
  y: number;
}

interface BossStats {
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  attackRange: number;
  armor: number;
}

interface BossPhaseData {
  attackPattern: AttackPattern;
  attackSpeed: number;
  hasSpecialAbilities: boolean;
  movementPattern: string;
}

interface Boss {
  id: EntityId;
  gameId: EntityId;
  type: BossType;
  position: Position;
  health: number;
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  attackRange: number;
  armor: number;
  currentPhase: number;
  state: BossState;
  phaseData: BossPhaseData;
  attackCooldowns: Map<string, number>;
  lastAttackTime: number;
  targetPlayerId?: EntityId;
  spawnedAt: number;
}

interface AttackInfo {
  type: string;
  damage: number;
  range: number;
  area?: { center: Position; radius: number };
  targets?: EntityId[];
  position?: Position;
  cooldown?: number;
}

interface AttackResult {
  success: boolean;
  damage: number;
  hitTargets: EntityId[];
  effects?: any[];
}

interface MoveResult {
  moved: boolean;
  newPosition: Position;
  blockedBy?: string;
}

interface DamageResult {
  died: boolean;
  remainingHealth: number;
  phaseChanged?: boolean;
  newPhase?: number;
  rewards?: {
    powerUps: string[];
    score: number;
  };
}

interface GameState {
  maze: {
    width: number;
    height: number;
    walls: Position[];
    destructibleWalls: Position[];
  };
  players: Map<EntityId, { position: Position; health: number }>;
  bombs?: Map<EntityId, any>;
}

/**
 * Complete BossAI implementation with phases, attacks, and intelligent behavior
 */
class BossAIImpl {
  readonly eventBus: EventBus;
  private bosses = new Map<EntityId, Boss>();
  private gameIds = new Set<EntityId>();
  private isShutdown = false;
  private updateInterval?: NodeJS.Timeout;

  // Boss type configurations
  private readonly bossConfigs: Record<BossType, BossStats> = {
    FLAME_MASTER: {
      maxHealth: 500,
      damage: 50,
      moveSpeed: 1.5,
      attackRange: 3,
      armor: 20,
    },
    ICE_QUEEN: {
      maxHealth: 400,
      damage: 40,
      moveSpeed: 2.0,
      attackRange: 4,
      armor: 15,
    },
    SHADOW_LORD: {
      maxHealth: 600,
      damage: 60,
      moveSpeed: 1.2,
      attackRange: 5,
      armor: 30,
    },
    EARTH_TITAN: {
      maxHealth: 800,
      damage: 80,
      moveSpeed: 0.8,
      attackRange: 2,
      armor: 50,
    },
  };

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('🐉 BossAI created');
  }

  async initialize(): Promise<void> {
    // Start boss AI update loop
    this.updateInterval = setInterval(() => {
      this.updateAllBosses();
    }, 100); // Update every 100ms

    console.log('🐉 BossAI initialized');
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    this.bosses.clear();
    this.gameIds.clear();
    
    console.log('🐉 BossAI shutdown complete');
  }

  async spawnBoss(gameId: EntityId, position: Position, type: BossType): Promise<EntityId> {
    if (this.isShutdown) {
      throw new Error('BossAI is shut down');
    }

    const bossId = `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const config = this.bossConfigs[type];

    const boss: Boss = {
      id: bossId,
      gameId,
      type,
      position: { ...position },
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      damage: config.damage,
      moveSpeed: config.moveSpeed,
      attackRange: config.attackRange,
      armor: config.armor,
      currentPhase: 1,
      state: 'SPAWNING',
      phaseData: {
        attackPattern: 'NORMAL',
        attackSpeed: 1.0,
        hasSpecialAbilities: false,
        movementPattern: 'SEEK_PLAYER',
      },
      attackCooldowns: new Map(),
      lastAttackTime: 0,
      spawnedAt: Date.now(),
    };

    this.bosses.set(bossId, boss);
    this.gameIds.add(gameId);

    // Publish boss spawn event
    await this.eventBus.publish({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'GAME_STATE',
      type: 'boss_spawned',
      sourceId: 'boss_ai',
      targets: [{ type: 'game', id: gameId }],
      data: {
        bossId,
        type,
        position,
        phase: 1,
      },
      metadata: {
        priority: 'high',
        ttl: 30000,
        deliveryMode: 'at-least-once',
        compression: false,
        tags: [`boss:${bossId}`, `game:${gameId}`],
      },
      timestamp: Date.now(),
      version: '1.0.0',
    });

    // Set state to idle after short spawn period
    setTimeout(() => {
      if (this.bosses.has(bossId)) {
        boss.state = 'IDLE';
      }
    }, 2000);

    console.log(`🐉 Boss spawned: ${type} at (${position.x}, ${position.y}) in game ${gameId}`);
    return bossId;
  }

  async getBoss(bossId: EntityId): Promise<Boss> {
    const boss = this.bosses.get(bossId);
    if (!boss) {
      throw new Error(`Boss not found: ${bossId}`);
    }
    return { ...boss }; // Return copy to prevent external mutations
  }

  async selectTarget(bossId: EntityId, gameState: GameState): Promise<EntityId | null> {
    const boss = this.bosses.get(bossId);
    if (!boss || boss.state === 'DEAD') {
      return null;
    }

    let bestTarget: EntityId | null = null;
    let bestScore = -1;

    for (const [playerId, playerState] of gameState.players) {
      if (playerState.health <= 0) continue;

      const distance = this.calculateDistance(boss.position, playerState.position);
      
      // Scoring: prefer closer targets and lower health targets
      let score = 100 - distance; // Closer is better
      score += (100 - playerState.health) * 0.5; // Lower health is better
      
      // Bonus for current target (avoid switching too often)
      if (boss.targetPlayerId === playerId) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = playerId;
      }
    }

    boss.targetPlayerId = bestTarget || undefined;
    return bestTarget;
  }

  async selectAttack(bossId: EntityId, gameState: GameState, targetId: EntityId): Promise<AttackInfo> {
    const boss = this.bosses.get(bossId);
    const target = gameState.players.get(targetId);
    
    if (!boss || !target) {
      throw new Error('Boss or target not found');
    }

    const distance = this.calculateDistance(boss.position, target.position);
    const availableAttacks = this.getAvailableAttacks(boss, distance);
    
    // Check for area attack opportunities
    const nearbyPlayers = this.findPlayersInRange(gameState, boss.position, 3);
    
    if (nearbyPlayers.length >= 2 && boss.currentPhase >= 3) {
      // Prefer area attacks when multiple players are close
      const areaAttacks = availableAttacks.filter(attack => attack.area);
      if (areaAttacks.length > 0) {
        return areaAttacks[Math.floor(Math.random() * areaAttacks.length)];
      }
    }

    // Select attack based on distance and cooldowns
    const usableAttacks = availableAttacks.filter(attack => 
      this.canUseAttack(bossId, attack.type)
    );

    if (usableAttacks.length === 0) {
      // Fallback to basic attack
      return {
        type: 'MELEE_ATTACK',
        damage: boss.damage,
        range: 1,
        targets: [targetId],
        position: target.position,
      };
    }

    return usableAttacks[Math.floor(Math.random() * usableAttacks.length)];
  }

  async executeAttack(bossId: EntityId, attackInfo: AttackInfo): Promise<AttackResult> {
    const boss = this.bosses.get(bossId);
    if (!boss || boss.state === 'DEAD') {
      return { success: false, damage: 0, hitTargets: [] };
    }

    boss.state = 'ATTACKING';
    boss.lastAttackTime = Date.now();

    // Set cooldown for this attack type
    if (attackInfo.cooldown) {
      boss.attackCooldowns.set(attackInfo.type, Date.now() + attackInfo.cooldown);
    }

    // Calculate damage (can be modified by boss phase)
    const finalDamage = Math.floor(attackInfo.damage * boss.phaseData.attackSpeed);

    const result: AttackResult = {
      success: true,
      damage: finalDamage,
      hitTargets: attackInfo.targets || [],
      effects: [],
    };

    // Publish attack event
    await this.eventBus.publish({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'GAME_STATE',
      type: 'boss_attack',
      sourceId: 'boss_ai',
      targets: [{ type: 'game', id: boss.gameId }],
      data: {
        bossId,
        attackType: attackInfo.type,
        damage: finalDamage,
        targetPosition: attackInfo.position,
        hitTargets: result.hitTargets,
        area: attackInfo.area,
      },
      metadata: {
        priority: 'high',
        ttl: 10000,
        deliveryMode: 'at-least-once',
        compression: false,
        tags: [`boss:${bossId}`, `attack:${attackInfo.type}`],
      },
      timestamp: Date.now(),
      version: '1.0.0',
    });

    // Return to idle state after attack
    setTimeout(() => {
      if (boss.state === 'ATTACKING') {
        boss.state = 'IDLE';
      }
    }, 1000);

    return result;
  }

  canUseAttack(bossId: EntityId, attackType: string): boolean {
    const boss = this.bosses.get(bossId);
    if (!boss) return false;

    const cooldownEnd = boss.attackCooldowns.get(attackType);
    if (!cooldownEnd) return true;

    return Date.now() >= cooldownEnd;
  }

  async updateMovement(bossId: EntityId, gameState: GameState, targetId: EntityId, deltaTime: number): Promise<MoveResult> {
    const boss = this.bosses.get(bossId);
    const target = gameState.players.get(targetId);
    
    if (!boss || !target || boss.state === 'DEAD' || boss.state === 'ATTACKING') {
      return { moved: false, newPosition: boss?.position || { x: 0, y: 0 } };
    }

    const currentPos = boss.position;
    const targetPos = target.position;
    
    // Calculate direction vector
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 0.1) {
      return { moved: false, newPosition: currentPos };
    }

    // Normalize direction and apply movement speed
    const moveDistance = boss.moveSpeed * (deltaTime / 1000);
    const moveX = (dx / distance) * moveDistance;
    const moveY = (dy / distance) * moveDistance;

    let newPosition = {
      x: currentPos.x + moveX,
      y: currentPos.y + moveY,
    };

    // Check for collisions with walls
    if (this.isPositionBlocked(newPosition, gameState)) {
      // Try moving in individual axes
      const tryX = { x: currentPos.x + moveX, y: currentPos.y };
      const tryY = { x: currentPos.x, y: currentPos.y + moveY };
      
      if (!this.isPositionBlocked(tryX, gameState)) {
        newPosition = tryX;
      } else if (!this.isPositionBlocked(tryY, gameState)) {
        newPosition = tryY;
      } else {
        return { moved: false, newPosition: currentPos, blockedBy: 'wall' };
      }
    }

    // Update boss position
    boss.position = newPosition;
    boss.state = 'MOVING';

    return { moved: true, newPosition };
  }

  async takeDamage(bossId: EntityId, damage: number): Promise<DamageResult> {
    const boss = this.bosses.get(bossId);
    if (!boss || boss.state === 'DEAD') {
      return { died: false, remainingHealth: 0 };
    }

    // Apply armor reduction
    const actualDamage = Math.max(1, damage - boss.armor);
    boss.health = Math.max(0, boss.health - actualDamage);

    const result: DamageResult = {
      died: boss.health === 0,
      remainingHealth: boss.health,
    };

    // Check for phase transitions
    const healthPercentage = (boss.health / boss.maxHealth) * 100;
    let newPhase = boss.currentPhase;

    if (healthPercentage <= 33 && boss.currentPhase < 3) {
      newPhase = 3;
    } else if (healthPercentage <= 66 && boss.currentPhase < 2) {
      newPhase = 2;
    }

    if (newPhase !== boss.currentPhase) {
      result.phaseChanged = true;
      result.newPhase = newPhase;
      await this.transitionPhase(bossId, newPhase);
    }

    if (result.died) {
      boss.state = 'DEAD';
      result.rewards = {
        powerUps: ['BOMB_UP', 'FLAME_UP', 'SPEED_UP'],
        score: 1000 + (boss.currentPhase * 500),
      };

      // Publish boss death event
      await this.eventBus.publish({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: 'GAME_STATE',
        type: 'boss_defeated',
        sourceId: 'boss_ai',
        targets: [{ type: 'game', id: boss.gameId }],
        data: {
          bossId,
          type: boss.type,
          finalPhase: boss.currentPhase,
          position: boss.position,
        },
        metadata: {
          priority: 'high',
          ttl: 60000,
          deliveryMode: 'exactly-once',
          compression: false,
          tags: [`boss:${bossId}`, `victory`],
        },
        timestamp: Date.now(),
        version: '1.0.0',
      });
    }

    return result;
  }

  private async transitionPhase(bossId: EntityId, newPhase: number): Promise<void> {
    const boss = this.bosses.get(bossId);
    if (!boss) return;

    const oldPhase = boss.currentPhase;
    boss.currentPhase = newPhase;

    // Update phase data based on new phase
    switch (newPhase) {
      case 2:
        boss.phaseData = {
          attackPattern: 'AGGRESSIVE',
          attackSpeed: 1.5,
          hasSpecialAbilities: false,
          movementPattern: 'AGGRESSIVE_SEEK',
        };
        break;
      case 3:
        boss.phaseData = {
          attackPattern: 'ENRAGED',
          attackSpeed: 2.0,
          hasSpecialAbilities: true,
          movementPattern: 'ERRATIC',
        };
        break;
    }

    // Publish phase transition event
    await this.eventBus.publish({
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'GAME_STATE',
      type: 'boss_phase_changed',
      sourceId: 'boss_ai',
      targets: [{ type: 'game', id: boss.gameId }],
      data: {
        bossId,
        oldPhase,
        newPhase,
        healthPercentage: (boss.health / boss.maxHealth) * 100,
      },
      metadata: {
        priority: 'high',
        ttl: 30000,
        deliveryMode: 'at-least-once',
        compression: false,
        tags: [`boss:${bossId}`, `phase:${newPhase}`],
      },
      timestamp: Date.now(),
      version: '1.0.0',
    });

    console.log(`🐉 Boss ${bossId} transitioned from phase ${oldPhase} to phase ${newPhase}`);
  }

  private async updateAllBosses(): Promise<void> {
    if (this.isShutdown) return;

    for (const boss of this.bosses.values()) {
      if (boss.state === 'DEAD') continue;

      // Clean up expired attack cooldowns
      const now = Date.now();
      for (const [attackType, cooldownEnd] of boss.attackCooldowns) {
        if (now >= cooldownEnd) {
          boss.attackCooldowns.delete(attackType);
        }
      }
    }
  }

  private getAvailableAttacks(boss: Boss, targetDistance: number): AttackInfo[] {
    const attacks: AttackInfo[] = [];

    // Basic attacks available in all phases
    if (targetDistance <= 1) {
      attacks.push({
        type: 'MELEE_ATTACK',
        damage: boss.damage,
        range: 1,
      });
    }

    // Boss type specific attacks
    switch (boss.type) {
      case 'FLAME_MASTER':
        if (targetDistance <= 3) {
          attacks.push({
            type: 'FLAME_BREATH',
            damage: boss.damage * 0.8,
            range: 3,
            cooldown: 3000,
          });
        }
        
        if (boss.currentPhase >= 3) {
          attacks.push({
            type: 'METEOR_STORM',
            damage: boss.damage * 1.5,
            range: 5,
            area: { center: boss.position, radius: 2 },
            cooldown: 8000,
          });
          attacks.push({
            type: 'FIRE_WALL',
            damage: boss.damage * 0.6,
            range: 4,
            cooldown: 6000,
          });
        }
        break;

      case 'ICE_QUEEN':
        if (targetDistance <= 4) {
          attacks.push({
            type: 'ICE_SHARD',
            damage: boss.damage * 0.7,
            range: 4,
            cooldown: 2500,
          });
        }
        
        if (boss.currentPhase >= 3) {
          attacks.push({
            type: 'BLIZZARD',
            damage: boss.damage * 1.2,
            range: 6,
            area: { center: boss.position, radius: 3 },
            cooldown: 10000,
          });
        }
        break;
    }

    return attacks;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private findPlayersInRange(gameState: GameState, center: Position, range: number): EntityId[] {
    const playersInRange: EntityId[] = [];
    
    for (const [playerId, playerState] of gameState.players) {
      if (playerState.health <= 0) continue;
      
      const distance = this.calculateDistance(center, playerState.position);
      if (distance <= range) {
        playersInRange.push(playerId);
      }
    }
    
    return playersInRange;
  }

  private isPositionBlocked(position: Position, gameState: GameState): boolean {
    const { maze } = gameState;
    
    // Check bounds
    if (position.x < 0 || position.x >= maze.width || 
        position.y < 0 || position.y >= maze.height) {
      return true;
    }

    // Check walls
    for (const wall of maze.walls) {
      if (Math.floor(position.x) === wall.x && Math.floor(position.y) === wall.y) {
        return true;
      }
    }

    // Check destructible walls
    for (const wall of maze.destructibleWalls) {
      if (Math.floor(position.x) === wall.x && Math.floor(position.y) === wall.y) {
        return true;
      }
    }

    return false;
  }
}

export function createBossAI(eventBus: EventBus): BossAIImpl {
  return new BossAIImpl(eventBus);
}