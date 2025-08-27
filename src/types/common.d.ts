/**
 * Common types and utilities used across the Bomberman game system.
 * These are shared between client, server, and all modules.
 */

/**
 * 2D position in tile-based coordinate system
 */
export interface Position {
  /** X coordinate (tile-based) */
  x: number;
  /** Y coordinate (tile-based) */
  y: number;
}

/**
 * 2D vector for direction and movement calculations
 */
export interface Vector2D {
  /** X component */
  x: number;
  /** Y component */
  y: number;
}

/**
 * Screen resolution dimensions
 */
export interface Resolution {
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
  /** Device pixel ratio */
  pixelRatio: number;
}

/**
 * Bounding box for area calculations
 */
export interface BoundingBox {
  /** Left boundary */
  left: number;
  /** Top boundary */
  top: number;
  /** Right boundary */
  right: number;
  /** Bottom boundary */
  bottom: number;
}

/**
 * Date range for filtering and queries
 */
export interface DateRange {
  /** Range start date */
  startDate: Date;
  /** Range end date */
  endDate: Date;
  /** Timezone for date interpretation */
  timezone: string;
}

/**
 * Cardinal directions for movement and facing
 */
export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

/**
 * Generic result wrapper for operations that may fail
 */
export interface Result<T, E = Error> {
  /** Operation succeeded */
  success: boolean;
  /** Result data (if successful) */
  data?: T;
  /** Error information (if failed) */
  error?: E;
}

/**
 * Generic optional wrapper
 */
export type Optional<T> = T | null | undefined;

/**
 * Generic validation result
 */
export interface ValidationResult {
  /** Validation passed */
  valid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
}

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
  /** Results per page */
  limit: number;
  /** Results to skip */
  offset: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  /** Result items */
  items: T[];
  /** Total available items */
  totalCount: number;
  /** Current page offset */
  offset: number;
  /** Items per page */
  limit: number;
  /** Whether more results are available */
  hasMore: boolean;
}

/**
 * Color representation
 */
export interface Color {
  /** Red component (0-255) */
  r: number;
  /** Green component (0-255) */
  g: number;
  /** Blue component (0-255) */
  b: number;
  /** Alpha/transparency (0-1) */
  a?: number;
}

/**
 * Animation state for entities
 */
export interface AnimationState {
  /** Animation name/type */
  name: string;
  /** Current frame */
  frame: number;
  /** Animation progress (0-1) */
  progress: number;
  /** Animation speed multiplier */
  speed: number;
  /** Whether animation loops */
  loop: boolean;
  /** Whether animation is playing */
  playing: boolean;
}

/**
 * Generic event with timestamp and data
 */
export interface GameEvent {
  /** Unique event identifier */
  id: string;
  /** Event type/category */
  type: string;
  /** Event timestamp */
  timestamp: Date;
  /** Associated player (if applicable) */
  playerId?: string;
  /** Event location (if applicable) */
  position?: Position;
  /** Event-specific data */
  data: any;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Frames per second */
  fps: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Network latency in milliseconds */
  latency: number;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Generic error with context
 */
export interface GameError extends Error {
  /** Error code */
  code: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Additional context */
  context?: any;
  /** Timestamp when error occurred */
  timestamp: Date;
}

/**
 * Configuration validation rule
 */
export interface ConfigValidationRule {
  /** Value required */
  required: boolean;
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Minimum numeric value */
  minValue?: number;
  /** Maximum numeric value */
  maxValue?: number;
  /** Regex pattern */
  pattern?: string;
  /** Allowed values */
  enum?: string[];
  /** Custom validation function name */
  custom?: string;
}

/**
 * Generic entity identifier type
 */
export type EntityId = string;

/**
 * Generic timestamp type
 */
export type Timestamp = Date;

/**
 * Generic callback function type
 */
export type Callback<T = void> = (result: T) => void;

/**
 * Generic event handler type
 */
export type EventHandler<T = any> = (event: T) => void;

/**
 * Generic promise resolver
 */
export type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;

/**
 * Generic promise rejecter
 */
export type PromiseRejecter = (reason?: any) => void;

/**
 * Utility type for making properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};