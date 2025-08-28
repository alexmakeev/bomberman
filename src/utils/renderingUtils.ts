/**
 * Rendering Utility Functions
 * Canvas rendering helpers for 8-bit pixel art style
 * 
 * @see docs/front-end/01-architecture-overview.md - Rendering layer
 * @see docs/front-end/04-responsive-design.md - Canvas scaling
 */

import type { Bomb, Boss, Monster, Player, Position, PowerUp, Rectangle, Size } from '../types/game';

// Canvas Setup and Management
export function setupCanvas(canvas: HTMLCanvasElement, container: HTMLElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  
  // Enable crisp pixel art rendering
  ctx.imageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  
  // Set pixel ratio for high DPI screens
  const pixelRatio = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  
  ctx.scale(pixelRatio, pixelRatio);
  
  return ctx;
}

export function resizeCanvas(canvas: HTMLCanvasElement, container: HTMLElement): void {
  const ctx = canvas.getContext('2d')!;
  const pixelRatio = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  
  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingEnabled = false;
}

// Coordinate System and Scaling
export interface ViewportTransform {
  offsetX: number
  offsetY: number
  scale: number
  cellSize: number
}

export function calculateViewportTransform(
  canvasSize: Size,
  mazeSize: Size,
  playerPosition: Position,
  viewDistance: number = 5,
): ViewportTransform {
  // Calculate cell size based on viewport
  const maxCellSize = Math.min(
    canvasSize.width / (viewDistance * 2 + 1),
    canvasSize.height / (viewDistance * 2 + 1),
  );
  
  // Ensure cell size is integer for crisp pixels
  const cellSize = Math.floor(maxCellSize);
  
  // Center the view on the player
  const offsetX = canvasSize.width / 2 - playerPosition.x * cellSize;
  const offsetY = canvasSize.height / 2 - playerPosition.y * cellSize;
  
  return {
    offsetX,
    offsetY,
    scale: 1,
    cellSize,
  };
}

export function worldToScreen(worldPos: Position, transform: ViewportTransform): Position {
  return {
    x: worldPos.x * transform.cellSize + transform.offsetX,
    y: worldPos.y * transform.cellSize + transform.offsetY,
  };
}

export function screenToWorld(screenPos: Position, transform: ViewportTransform): Position {
  return {
    x: (screenPos.x - transform.offsetX) / transform.cellSize,
    y: (screenPos.y - transform.offsetY) / transform.cellSize,
  };
}

// 8-bit Color Palette
export const COLORS = {
  // Primary game colors
  BACKGROUND: '#2C3E50',
  WALL: '#34495E',
  DESTRUCTIBLE: '#E67E22',
  EMPTY: '#ECF0F1',
  
  // Player colors
  PLAYER_RED: '#E74C3C',
  PLAYER_BLUE: '#3498DB',
  PLAYER_GREEN: '#2ECC71',
  PLAYER_YELLOW: '#F1C40F',
  PLAYER_PURPLE: '#9B59B6',
  PLAYER_ORANGE: '#FF8C00',
  
  // Game entities
  BOMB: '#1A1A1A',
  BOMB_FUSE: '#FF4444',
  EXPLOSION: '#FFA500',
  EXPLOSION_CENTER: '#FF6600',
  
  // Power-ups
  POWERUP_BOMB_COUNT: '#FF69B4',
  POWERUP_BOMB_POWER: '#FF4500',
  POWERUP_SPEED: '#00FF00',
  POWERUP_HEALTH: '#FF0000',
  
  // Monsters
  MONSTER_BASIC: '#8B4513',
  MONSTER_FAST: '#FF6347',
  MONSTER_TANK: '#696969',
  MONSTER_SMART: '#9400D3',
  
  // Bosses
  BOSS_FIRE: '#DC143C',
  BOSS_ICE: '#00BFFF',
  BOSS_EARTH: '#8B4513',
  BOSS_SHADOW: '#2F2F2F',
  
  // UI colors
  UI_PRIMARY: '#3498DB',
  UI_SECONDARY: '#95A5A6',
  UI_SUCCESS: '#2ECC71',
  UI_WARNING: '#F39C12',
  UI_DANGER: '#E74C3C',
  UI_INFO: '#17A2B8',
} as const;

export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Primitive Drawing Functions
export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  filled: boolean = true,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  
  if (filled) {
    ctx.fillRect(x, y, width, height);
  } else {
    ctx.strokeRect(x, y, width, height);
  }
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  filled: boolean = true,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

export function drawPixelPerfectRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  // Ensure pixel-perfect positioning
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);
  const pixelWidth = Math.floor(width);
  const pixelHeight = Math.floor(height);
  
  drawRect(ctx, pixelX, pixelY, pixelWidth, pixelHeight, color);
}

// Game Entity Rendering
export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  transform: ViewportTransform,
  isLocalPlayer: boolean = false,
): void {
  const screenPos = worldToScreen(player.position, transform);
  const size = transform.cellSize * 0.8;
  const x = screenPos.x - size / 2;
  const y = screenPos.y - size / 2;
  
  // Get player color
  const colorMap = {
    red: COLORS.PLAYER_RED,
    blue: COLORS.PLAYER_BLUE,
    green: COLORS.PLAYER_GREEN,
    yellow: COLORS.PLAYER_YELLOW,
    purple: COLORS.PLAYER_PURPLE,
    orange: COLORS.PLAYER_ORANGE,
  };
  const playerColor = player.color ? colorMap[player.color] : COLORS.PLAYER_BLUE;
  
  // Draw player body
  drawPixelPerfectRect(ctx, x, y, size, size, playerColor);
  
  // Draw health indicator
  if (player.health < player.maxHealth) {
    const barWidth = size;
    const barHeight = 3;
    const barX = x;
    const barY = y - 8;
    
    // Background
    drawRect(ctx, barX, barY, barWidth, barHeight, COLORS.UI_SECONDARY);
    
    // Health bar
    const healthWidth = (player.health / player.maxHealth) * barWidth;
    const healthColor = player.health > player.maxHealth * 0.5 ? COLORS.UI_SUCCESS : 
      player.health > player.maxHealth * 0.25 ? COLORS.UI_WARNING : 
        COLORS.UI_DANGER;
    drawRect(ctx, barX, barY, healthWidth, barHeight, healthColor);
  }
  
  // Draw local player indicator
  if (isLocalPlayer) {
    drawCircle(ctx, screenPos.x, screenPos.y - size / 2 - 10, 3, COLORS.UI_INFO);
  }
  
  // Draw movement direction indicator
  if (player.isMoving && player.direction) {
    const arrowSize = 4;
    const arrowDistance = size / 2 + 8;
    let arrowX = screenPos.x;
    let arrowY = screenPos.y;
    
    switch (player.direction) {
      case 'up': arrowY -= arrowDistance; break;
      case 'down': arrowY += arrowDistance; break;
      case 'left': arrowX -= arrowDistance; break;
      case 'right': arrowX += arrowDistance; break;
    }
    
    drawCircle(ctx, arrowX, arrowY, arrowSize, playerColor);
  }
}

export function renderBomb(
  ctx: CanvasRenderingContext2D,
  bomb: Bomb,
  transform: ViewportTransform,
  currentTime: number,
): void {
  const screenPos = worldToScreen(bomb.position, transform);
  const size = transform.cellSize * 0.6;
  const x = screenPos.x - size / 2;
  const y = screenPos.y - size / 2;
  
  // Draw bomb body
  drawPixelPerfectRect(ctx, x, y, size, size, COLORS.BOMB);
  
  // Draw pulsing fuse based on timer
  const timeLeft = bomb.timer - (currentTime - bomb.createdAt);
  const pulseFreq = Math.max(100, timeLeft / 10); // Faster pulsing as timer runs out
  const pulse = Math.sin(currentTime / pulseFreq) * 0.5 + 0.5;
  
  const fuseSize = 4 + pulse * 3;
  drawCircle(ctx, screenPos.x, screenPos.y - size / 2 - 5, fuseSize, COLORS.BOMB_FUSE);
  
  // Draw timer text
  const secondsLeft = Math.ceil(timeLeft / 1000);
  if (secondsLeft > 0) {
    ctx.fillStyle = COLORS.UI_INFO;
    ctx.font = `${Math.floor(transform.cellSize / 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(secondsLeft.toString(), screenPos.x, screenPos.y + size / 2 + 12);
  }
}

export function renderExplosion(
  ctx: CanvasRenderingContext2D,
  explosion: { center: Position; cells: Position[] },
  transform: ViewportTransform,
  intensity: number = 1,
): void {
  const alpha = intensity * 0.8;
  
  for (const cell of explosion.cells) {
    const screenPos = worldToScreen(cell, transform);
    const size = transform.cellSize;
    const x = screenPos.x - size / 2;
    const y = screenPos.y - size / 2;
    
    // Different color for explosion center
    const isCenter = cell.x === explosion.center.x && cell.y === explosion.center.y;
    const color = isCenter ? 
      hexToRgba(COLORS.EXPLOSION_CENTER, alpha) : 
      hexToRgba(COLORS.EXPLOSION, alpha * 0.7);
    
    drawPixelPerfectRect(ctx, x, y, size, size, color);
  }
}

export function renderPowerUp(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp,
  transform: ViewportTransform,
  currentTime: number,
): void {
  const screenPos = worldToScreen(powerUp.position, transform);
  const size = transform.cellSize * 0.5;
  const x = screenPos.x - size / 2;
  const y = screenPos.y - size / 2;
  
  // Get power-up color
  const colorMap = {
    bomb_count: COLORS.POWERUP_BOMB_COUNT,
    bomb_power: COLORS.POWERUP_BOMB_POWER,
    speed_boost: COLORS.POWERUP_SPEED,
    health: COLORS.POWERUP_HEALTH,
    max_health: COLORS.POWERUP_HEALTH,
  };
  const powerUpColor = colorMap[powerUp.type] || COLORS.UI_INFO;
  
  // Draw pulsing power-up
  const pulse = Math.sin(currentTime / 200) * 0.2 + 0.8;
  const pulseSize = size * pulse;
  const pulseX = screenPos.x - pulseSize / 2;
  const pulseY = screenPos.y - pulseSize / 2;
  
  drawPixelPerfectRect(ctx, pulseX, pulseY, pulseSize, pulseSize, powerUpColor);
  
  // Draw power-up type indicator (first letter)
  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.font = `bold ${Math.floor(transform.cellSize / 3)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(powerUp.type[0].toUpperCase(), screenPos.x, screenPos.y + 4);
}

export function renderMonster(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  transform: ViewportTransform,
): void {
  const screenPos = worldToScreen(monster.position, transform);
  const size = transform.cellSize * 0.7;
  const x = screenPos.x - size / 2;
  const y = screenPos.y - size / 2;
  
  // Get monster color
  const colorMap = {
    basic: COLORS.MONSTER_BASIC,
    fast: COLORS.MONSTER_FAST,
    tank: COLORS.MONSTER_TANK,
    smart: COLORS.MONSTER_SMART,
  };
  const monsterColor = colorMap[monster.type];
  
  // Draw monster body
  drawPixelPerfectRect(ctx, x, y, size, size, monsterColor);
  
  // Draw health bar
  if (monster.health < monster.maxHealth) {
    const barWidth = size;
    const barHeight = 2;
    const barX = x;
    const barY = y - 6;
    
    drawRect(ctx, barX, barY, barWidth, barHeight, COLORS.UI_SECONDARY);
    
    const healthWidth = (monster.health / monster.maxHealth) * barWidth;
    drawRect(ctx, barX, barY, healthWidth, barHeight, COLORS.UI_DANGER);
  }
  
  // Draw movement direction
  if (monster.isMoving) {
    const arrowSize = 2;
    const arrowDistance = size / 2 + 4;
    let arrowX = screenPos.x;
    let arrowY = screenPos.y;
    
    switch (monster.direction) {
      case 'up': arrowY -= arrowDistance; break;
      case 'down': arrowY += arrowDistance; break;
      case 'left': arrowX -= arrowDistance; break;
      case 'right': arrowX += arrowDistance; break;
    }
    
    drawCircle(ctx, arrowX, arrowY, arrowSize, monsterColor);
  }
}

export function renderBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  transform: ViewportTransform,
): void {
  const screenPos = worldToScreen(boss.position, transform);
  const size = transform.cellSize * 1.5;
  const x = screenPos.x - size / 2;
  const y = screenPos.y - size / 2;
  
  // Get boss color
  const colorMap = {
    fire: COLORS.BOSS_FIRE,
    ice: COLORS.BOSS_ICE,
    earth: COLORS.BOSS_EARTH,
    shadow: COLORS.BOSS_SHADOW,
  };
  const bossColor = colorMap[boss.type];
  
  // Draw boss body
  drawPixelPerfectRect(ctx, x, y, size, size, bossColor);
  
  // Draw phase indicator
  ctx.fillStyle = COLORS.UI_INFO;
  ctx.font = `bold ${Math.floor(transform.cellSize / 2)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(boss.phase.toString(), screenPos.x, screenPos.y + 4);
  
  // Draw health bar
  const barWidth = size;
  const barHeight = 6;
  const barX = x;
  const barY = y - 15;
  
  // Background
  drawRect(ctx, barX, barY, barWidth, barHeight, COLORS.UI_SECONDARY);
  
  // Health bar
  const healthWidth = (boss.health / boss.maxHealth) * barWidth;
  const healthColor = boss.health > boss.maxHealth * 0.5 ? COLORS.UI_SUCCESS : 
    boss.health > boss.maxHealth * 0.25 ? COLORS.UI_WARNING : 
      COLORS.UI_DANGER;
  drawRect(ctx, barX, barY, healthWidth, barHeight, healthColor);
}

// Maze Rendering
export function renderMaze(
  ctx: CanvasRenderingContext2D,
  maze: number[][],
  transform: ViewportTransform,
  visibleBounds?: Rectangle,
): void {
  const startY = visibleBounds ? Math.max(0, Math.floor(visibleBounds.y)) : 0;
  const endY = visibleBounds ? Math.min(maze.length, Math.ceil(visibleBounds.y + visibleBounds.height)) : maze.length;
  const startX = visibleBounds ? Math.max(0, Math.floor(visibleBounds.x)) : 0;
  const endX = visibleBounds ? Math.min(maze[0].length, Math.ceil(visibleBounds.x + visibleBounds.width)) : maze[0].length;
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const screenPos = worldToScreen({ x, y }, transform);
      const cellX = screenPos.x - transform.cellSize / 2;
      const cellY = screenPos.y - transform.cellSize / 2;
      
      let color: string;
      switch (maze[y][x]) {
        case 0: color = COLORS.EMPTY; break;      // Empty
        case 1: color = COLORS.WALL; break;       // Wall
        case 2: color = COLORS.DESTRUCTIBLE; break; // Destructible
        default: color = COLORS.BACKGROUND; break;
      }
      
      drawPixelPerfectRect(ctx, cellX, cellY, transform.cellSize, transform.cellSize, color);
    }
  }
}

// UI Rendering Helpers
export function renderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    color?: string
    fontSize?: number
    fontFamily?: string
    textAlign?: CanvasTextAlign
    textBaseline?: CanvasTextBaseline
    maxWidth?: number
  } = {},
): void {
  ctx.fillStyle = options.color || COLORS.UI_PRIMARY;
  ctx.font = `${options.fontSize || 16}px ${options.fontFamily || 'monospace'}`;
  ctx.textAlign = options.textAlign || 'left';
  ctx.textBaseline = options.textBaseline || 'top';
  
  if (options.maxWidth) {
    ctx.fillText(text, x, y, options.maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

export function renderProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number,
  colors: {
    background?: string
    fill?: string
    border?: string
  } = {},
): void {
  const bgColor = colors.background || COLORS.UI_SECONDARY;
  const fillColor = colors.fill || COLORS.UI_PRIMARY;
  const borderColor = colors.border || COLORS.UI_SECONDARY;
  
  // Background
  drawRect(ctx, x, y, width, height, bgColor);
  
  // Fill
  const fillWidth = width * Math.max(0, Math.min(1, progress));
  if (fillWidth > 0) {
    drawRect(ctx, x, y, fillWidth, height, fillColor);
  }
  
  // Border
  drawRect(ctx, x, y, width, height, borderColor, false);
}

// Animation and Effects
export function createParticleEffect(
  position: Position,
  color: string,
  count: number = 10,
  spread: number = 20,
): Array<{ pos: Position; vel: Position; life: number; color: string }> {
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * spread + 5;
    
    particles.push({
      pos: { x: position.x, y: position.y },
      vel: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      life: 1.0,
      color,
    });
  }
  
  return particles;
}

export function updateAndRenderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Array<{ pos: Position; vel: Position; life: number; color: string }>,
  deltaTime: number,
  transform: ViewportTransform,
): Array<{ pos: Position; vel: Position; life: number; color: string }> {
  const activeParticles = [];
  
  for (const particle of particles) {
    // Update particle
    particle.pos.x += particle.vel.x * deltaTime / 1000;
    particle.pos.y += particle.vel.y * deltaTime / 1000;
    particle.vel.x *= 0.95; // Friction
    particle.vel.y *= 0.95;
    particle.life -= deltaTime / 1000;
    
    // Render particle if still alive
    if (particle.life > 0) {
      const screenPos = worldToScreen(particle.pos, transform);
      const alpha = particle.life;
      const color = hexToRgba(particle.color, alpha);
      const size = 2 * particle.life;
      
      drawCircle(ctx, screenPos.x, screenPos.y, size, color);
      activeParticles.push(particle);
    }
  }
  
  return activeParticles;
}