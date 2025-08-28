/**
 * Input System Types
 * TypeScript definitions for touch controls and unified input handling
 * 
 * @see docs/front-end/05-input-system.md - Input system architecture
 */

import type { Direction, Position } from './game'

// Core Input Types
export type InputMethod = 'touch' | 'keyboard' | 'gamepad' | 'mouse'
export type InputEventType = 'player-move' | 'player-stop' | 'player-bomb' | 'input-mode-changed' | 'action-batch'

// Input Actions
export interface MovementAction {
  direction: Direction
  intensity: number
  timestamp: number
}

export interface BombAction {
  timestamp: number
}

export interface StopAction {
  timestamp: number
}

export interface GameAction {
  type: 'movement' | 'bomb' | 'stop'
  direction?: Direction
  intensity?: number
  timestamp: number
}

// Input State Management
export interface InputState {
  touches: TouchState[]
  keys: Map<string, KeyState>
  movement: MovementState
  bombAction: BombActionState
  gamepad?: GamepadState
}

export interface TouchState {
  id: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  isMovement: boolean
  timestamp: number
  element?: HTMLElement
}

export interface KeyState {
  isPressed: boolean
  timestamp: number
  repeatTimer: NodeJS.Timer | null
  repeatCount: number
}

export interface MovementState {
  direction: Direction | null
  intensity: number
  isActive: boolean
  lastUpdate: number
  smoothing?: number
}

export interface BombActionState {
  canPlace: boolean
  cooldownRemaining: number
  lastPlaceTime: number
}

export interface GamepadState {
  connected: boolean
  id: string
  buttons: Map<number, GamepadButtonState>
  axes: number[]
  timestamp: number
}

export interface GamepadButtonState {
  pressed: boolean
  touched: boolean
  value: number
}

// Input Configuration
export interface InputConfig {
  touchSensitivity: number      // 0.1 - 2.0
  deadZone: number             // 5 - 50 pixels
  hapticFeedback: boolean      // true/false
  keyRepeatDelay: number       // 50 - 300ms
  keyRepeatRate: number        // 16 - 100ms
  showTouchIndicators: boolean // true/false
  bombCooldown: number         // 100 - 1000ms
  movementSmoothing: number    // 0 - 1
  inputMethod: InputMethod     // preferred input method
}

// Touch Gesture Recognition
export interface TouchGesture {
  type: 'tap' | 'hold' | 'drag' | 'swipe'
  position: Position
  startPosition: Position
  duration: number
  distance: number
  velocity: number
  direction?: Direction
}

export interface SwipeGesture extends TouchGesture {
  type: 'swipe'
  direction: Direction
  velocity: number
}

// Input Validation
export interface InputValidator {
  validateAction(action: GameAction): ValidationResult
  isRateLimited(actionType: string): boolean
  getActionCount(actionType: string, timeWindow: number): number
}

export interface ValidationResult {
  valid: boolean
  reason?: string
  suggestedAction?: GameAction
}

// Performance and Analytics
export interface InputPerformanceMetrics {
  averageLatency: number
  touchEventCount: number
  keyEventCount: number
  droppedEvents: number
  processingTime: number
  queueSize: number
}

export interface InputAnalytics {
  sessionDuration: number
  totalActions: number
  actionsByType: Map<string, number>
  averageActionsPerMinute: number
  inputMethodUsage: Map<InputMethod, number>
  errorRate: number
}

// Input Manager Interface
export interface InputManager {
  // Lifecycle
  initialize(): Promise<void>
  destroy(): void
  
  // Handler Registration
  registerTouchHandlers(element: HTMLElement): void
  registerKeyboardHandlers(): void
  registerGamepadHandlers(): void
  
  // State Management
  getCurrentInputState(): InputState
  isMoving(): boolean
  getMovementDirection(): Direction | null
  
  // Event Handling
  on(event: InputEventType, callback: InputCallback): void
  off(event: InputEventType, callback: InputCallback): void
  emit(event: InputEventType, data: any): void
  
  // Configuration
  setConfig(config: Partial<InputConfig>): void
  getConfig(): InputConfig
  setDeadZone(pixels: number): void
  setHapticFeedback(enabled: boolean): void
  setKeyRepeatDelay(ms: number): void
  
  // Action Management
  queueAction(action: GameAction): void
  getActionQueue(): GameAction[]
  flushActionQueue(): void
  
  // Performance
  getPerformanceMetrics(): InputPerformanceMetrics
  getAnalytics(): InputAnalytics
  
  // Validation
  getValidator(): InputValidator
}

// Event Callbacks
export type InputCallback = (data: any) => void
export type TouchEventCallback = (event: TouchEvent) => void
export type KeyboardEventCallback = (event: KeyboardEvent) => void
export type GamepadEventCallback = (event: GamepadEvent) => void

// Browser Events
export interface TouchEventData {
  touches: Touch[]
  changedTouches: Touch[]
  targetTouches: Touch[]
  preventDefault: () => void
  timestamp: number
}

export interface KeyboardEventData {
  code: string
  key: string
  altKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  metaKey: boolean
  repeat: boolean
  preventDefault: () => void
  timestamp: number
}

export interface GamepadEvent {
  gamepad: Gamepad
  timestamp: number
}

// Input Feedback
export interface HapticFeedback {
  vibrate(pattern: number | number[]): void
  canVibrate(): boolean
}

export interface VisualFeedback {
  showTouchIndicator(touchId: number, x: number, y: number, type: 'movement' | 'action'): void
  updateTouchIndicator(touchId: number, x: number, y: number): void
  hideTouchIndicator(touchId: number): void
  showInputHint(message: string, duration: number): void
}

// Accessibility
export interface AccessibilityOptions {
  reduceMotion: boolean
  highContrast: boolean
  largeText: boolean
  screenReaderMode: boolean
  keyboardNavigation: boolean
  focusIndicators: boolean
}

// Input Context
export interface InputContext {
  gameState: 'menu' | 'game' | 'paused' | 'settings'
  allowInput: boolean
  inputMethod: InputMethod
  accessibility: AccessibilityOptions
  performance: 'low' | 'medium' | 'high'
}