/**
 * PowerUpManager Implementation
 * Handles power-up spawning, collection, effects, and player upgrades
 */

import type { EventBus } from '../../interfaces/core/EventBus';
import type { EntityId } from '../../types/common';

// Power-up types and effects
const POWER_UP_TYPES = {
  BOMB_UPGRADE: 'bomb_upgrade', // Increase max bombs
  BLAST_RADIUS: 'blast_radius', // Increase explosion radius
  SPEED_BOOST: 'speed_boost',   // Increase movement speed
  BOMB_KICK: 'bomb_kick',       // Ability to kick bombs
  BOMB_THROW: 'bomb_throw',     // Ability to throw bombs
  INVINCIBILITY: 'invincibility', // Temporary invincibility
  REMOTE_DETONATOR: 'remote_detonator' // Manual bomb detonation
} as const;

type PowerUpType = typeof POWER_UP_TYPES[keyof typeof POWER_UP_TYPES];

interface PowerUp {
  powerUpId: EntityId;
  type: PowerUpType;
  position: { x: number; y: number };
  gameId: EntityId;
  spawnedAt: Date;
  expiresAt?: Date;
  collected: boolean;
  collectedBy?: EntityId;
}

interface PlayerPowerUps {
  playerId: EntityId;
  maxBombs: number;
  blastRadius: number;
  speedMultiplier: number;
  canKickBombs: boolean;
  canThrowBombs: boolean;
  isInvincible: boolean;
  invincibilityUntil?: Date;
  hasRemoteDetonator: boolean;
}

class PowerUpManagerImpl {
  readonly eventBus: EventBus;
  private readonly _activePowerUps = new Map<EntityId, PowerUp>();
  private readonly _playerPowerUps = new Map<EntityId, PlayerPowerUps>();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    console.log('⭐ PowerUpManager created');
  }

  async initialize(): Promise<void> {
    console.log('⭐ PowerUpManager initialized');
  }

  async spawnPowerUp(gameId: EntityId, type: PowerUpType, position: { x: number; y: number }): Promise<EntityId> {
    const powerUpId = `powerup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const powerUp: PowerUp = {
      powerUpId,
      type,
      position,
      gameId,
      spawnedAt: new Date(),
      collected: false,
    };

    this._activePowerUps.set(powerUpId, powerUp);
    console.log(`⭐ Power-up spawned: ${type} at (${position.x}, ${position.y})`);
    
    return powerUpId;
  }

  async collectPowerUp(powerUpId: EntityId, playerId: EntityId): Promise<boolean> {
    const powerUp = this._activePowerUps.get(powerUpId);
    if (!powerUp || powerUp.collected) {
      return false;
    }

    powerUp.collected = true;
    powerUp.collectedBy = playerId;
    
    await this.applyPowerUpEffect(playerId, powerUp.type);
    this._activePowerUps.delete(powerUpId);
    
    console.log(`⭐ Power-up collected: ${powerUp.type} by ${playerId}`);
    return true;
  }

  async applyPowerUpEffect(playerId: EntityId, type: PowerUpType): Promise<void> {
    let playerPowerUps = this._playerPowerUps.get(playerId);
    if (!playerPowerUps) {
      playerPowerUps = {
        playerId,
        maxBombs: 1,
        blastRadius: 1,
        speedMultiplier: 1.0,
        canKickBombs: false,
        canThrowBombs: false,
        isInvincible: false,
        hasRemoteDetonator: false,
      };
      this._playerPowerUps.set(playerId, playerPowerUps);
    }

    switch (type) {
      case POWER_UP_TYPES.BOMB_UPGRADE:
        playerPowerUps.maxBombs = Math.min(playerPowerUps.maxBombs + 1, 10);
        break;
      case POWER_UP_TYPES.BLAST_RADIUS:
        playerPowerUps.blastRadius = Math.min(playerPowerUps.blastRadius + 1, 10);
        break;
      case POWER_UP_TYPES.SPEED_BOOST:
        playerPowerUps.speedMultiplier = Math.min(playerPowerUps.speedMultiplier + 0.2, 2.0);
        break;
      case POWER_UP_TYPES.BOMB_KICK:
        playerPowerUps.canKickBombs = true;
        break;
      case POWER_UP_TYPES.BOMB_THROW:
        playerPowerUps.canThrowBombs = true;
        break;
      case POWER_UP_TYPES.INVINCIBILITY:
        playerPowerUps.isInvincible = true;
        playerPowerUps.invincibilityUntil = new Date(Date.now() + 10000); // 10 seconds
        break;
      case POWER_UP_TYPES.REMOTE_DETONATOR:
        playerPowerUps.hasRemoteDetonator = true;
        break;
    }

    console.log(`⭐ Power-up effect applied: ${type} to ${playerId}`);
  }

  async getPlayerPowerUps(playerId: EntityId): Promise<PlayerPowerUps | null> {
    const powerUps = this._playerPowerUps.get(playerId);
    
    // Update invincibility status
    if (powerUps?.isInvincible && powerUps.invincibilityUntil && 
        new Date() > powerUps.invincibilityUntil) {
      powerUps.isInvincible = false;
      powerUps.invincibilityUntil = undefined;
    }
    
    return powerUps || null;
  }

  async getPowerUpsInGame(gameId: EntityId): Promise<PowerUp[]> {
    return Array.from(this._activePowerUps.values())
      .filter(powerUp => powerUp.gameId === gameId && !powerUp.collected);
  }

  async cleanup(gameId: EntityId): Promise<void> {
    console.log(`⭐ Cleaning up power-ups for game: ${gameId}`);
    
    for (const [powerUpId, powerUp] of this._activePowerUps.entries()) {
      if (powerUp.gameId === gameId) {
        this._activePowerUps.delete(powerUpId);
      }
    }
  }
}

export function createPowerUpManager(eventBus: EventBus): PowerUpManagerImpl {
  return new PowerUpManagerImpl(eventBus);
}