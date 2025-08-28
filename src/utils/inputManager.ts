/**
 * Unified Input Manager - Cross-platform input handling for touch, keyboard, and gamepad
 * Mobile-first input system with performance optimization and accessibility
 * 
 * @see docs/front-end/05-input-system.md - Input system architecture
 * @see tests/frontend/utils/inputManager.test.ts - Comprehensive tests
 */

import type {
  BombAction,
  GameAction,
  HapticFeedback,
  InputAnalytics,
  InputCallback,
  InputConfig,
  InputEventType,
  InputManager,
  InputPerformanceMetrics,
  InputState,
  KeyState,
  MovementAction,
  TouchState,
  ValidationResult,
  VisualFeedback,
} from '../types/input';
import type { Direction } from '../types/game';

export class UnifiedInputManager extends EventTarget implements InputManager {
  private readonly config: InputConfig;
  private readonly inputState: InputState;
  private actionQueue: GameAction[] = [];
  private readonly callbacks = new Map<InputEventType, Set<InputCallback>>();
  
  // Performance tracking
  private readonly performanceMetrics: InputPerformanceMetrics;
  private readonly analytics: InputAnalytics;
  
  // Touch handling
  private readonly touchStates = new Map<number, TouchState>();
  private primaryTouchId: number | null = null;
  private movementThreshold = 10;
  
  // Keyboard handling
  private readonly keyStates = new Map<string, KeyState>();
  private readonly keyMappings = {
    movement: {
      'ArrowUp': 'up' as Direction,
      'ArrowDown': 'down' as Direction,
      'ArrowLeft': 'left' as Direction,
      'ArrowRight': 'right' as Direction,
      'KeyW': 'up' as Direction,
      'KeyS': 'down' as Direction,
      'KeyA': 'left' as Direction,
      'KeyD': 'right' as Direction,
    },
    actions: {
      'Space': 'bomb',
      'Enter': 'bomb',
    },
  };
  
  // Performance optimization
  private readonly actionCounts = new Map<string, Map<number, number>>();
  private readonly lastActionTime = 0;
  private inputBuffer: GameAction[] = [];
  private flushTimer: number | null = null;
  
  // Visual feedback
  private readonly touchIndicators = new Map<number, HTMLElement>();
  private feedbackContainer: HTMLElement | null = null;

  constructor() {
    super();
    
    // Initialize default configuration
    this.config = {
      touchSensitivity: 1.0,
      deadZone: 10,
      hapticFeedback: true,
      keyRepeatDelay: 150,
      keyRepeatRate: 50,
      showTouchIndicators: true,
      bombCooldown: 500,
      movementSmoothing: 0.1,
      inputMethod: 'touch',
    };
    
    // Initialize input state
    this.inputState = {
      touches: [],
      keys: new Map(),
      movement: {
        direction: null,
        intensity: 0,
        isActive: false,
        lastUpdate: 0,
      },
      bombAction: {
        canPlace: true,
        cooldownRemaining: 0,
        lastPlaceTime: 0,
      },
    };
    
    // Initialize performance metrics
    this.performanceMetrics = {
      averageLatency: 0,
      touchEventCount: 0,
      keyEventCount: 0,
      droppedEvents: 0,
      processingTime: 0,
      queueSize: 0,
    };
    
    this.analytics = {
      sessionDuration: 0,
      totalActions: 0,
      actionsByType: new Map(),
      averageActionsPerMinute: 0,
      inputMethodUsage: new Map(),
      errorRate: 0,
    };
  }

  // Lifecycle Methods
  async initialize(): Promise<void> {
    try {
      this.detectInputCapabilities();
      this.setupPerformanceOptimization();
      this.createFeedbackContainer();
      this.startAnalytics();
      
      console.log('UnifiedInputManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize input manager:', error);
      throw error;
    }
  }

  destroy(): void {
    // Clean up event listeners
    this.callbacks.clear();
    
    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Clean up touch indicators
    this.clearAllTouchIndicators();
    
    // Remove feedback container
    if (this.feedbackContainer) {
      this.feedbackContainer.remove();
    }
    
    // Clear action queue
    this.actionQueue = [];
    this.inputBuffer = [];
    
    console.log('UnifiedInputManager destroyed');
  }

  // Handler Registration
  registerTouchHandlers(element: HTMLElement): void {
    const options = { passive: false };
    
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), options);
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), options);
    element.addEventListener('touchend', this.handleTouchEnd.bind(this), options);
    element.addEventListener('touchcancel', this.handleTouchEnd.bind(this), options);
    
    // Prevent default behaviors
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    
    console.log('Touch handlers registered');
  }

  registerKeyboardHandlers(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    console.log('Keyboard handlers registered');
  }

  registerGamepadHandlers(): void {
    // TODO: Implement gamepad support
    console.warn('Gamepad handlers not implemented yet');
  }

  // State Management
  getCurrentInputState(): InputState {
    return { ...this.inputState };
  }

  isMoving(): boolean {
    return this.inputState.movement.isActive;
  }

  getMovementDirection(): Direction | null {
    return this.inputState.movement.direction;
  }

  // Event Handling
  on(event: InputEventType, callback: InputCallback): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  off(event: InputEventType, callback: InputCallback): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: InputEventType, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in input callback for ${event}:`, error);
        }
      });
    }
  }

  // Configuration
  setConfig(config: Partial<InputConfig>): void {
    Object.assign(this.config, config);
    this.applyConfiguration();
  }

  getConfig(): InputConfig {
    return { ...this.config };
  }

  setDeadZone(pixels: number): void {
    this.config.deadZone = Math.max(0, Math.min(100, pixels));
  }

  setHapticFeedback(enabled: boolean): void {
    this.config.hapticFeedback = enabled;
  }

  setKeyRepeatDelay(ms: number): void {
    this.config.keyRepeatDelay = Math.max(50, Math.min(500, ms));
  }

  // Touch Event Handlers
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this.performanceMetrics.touchEventCount++;
    
    const startTime = performance.now();
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchState: TouchState = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        isMovement: false,
        timestamp: Date.now(),
      };
      
      this.touchStates.set(touch.identifier, touchState);
      
      // Set primary touch for movement
      if (this.primaryTouchId === null) {
        this.primaryTouchId = touch.identifier;
        this.showTouchIndicator(touch.identifier, touch.clientX, touch.clientY, 'movement');
      } else if (this.touchStates.size === 2) {
        // Second touch triggers bomb action
        this.handleBombInput();
        this.showTouchIndicator(touch.identifier, touch.clientX, touch.clientY, 'action');
      }
    });
    
    this.updatePerformanceMetrics('touchstart', startTime);
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    const startTime = performance.now();
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchState = this.touchStates.get(touch.identifier);
      if (!touchState) {return;}
      
      touchState.currentX = touch.clientX;
      touchState.currentY = touch.clientY;
      touchState.deltaX = touch.clientX - touchState.startX;
      touchState.deltaY = touch.clientY - touchState.startY;
      
      const distance = Math.sqrt(touchState.deltaX ** 2 + touchState.deltaY ** 2);
      
      // Check if this is the primary touch and has moved beyond threshold
      if (touch.identifier === this.primaryTouchId && distance > this.movementThreshold) {
        touchState.isMovement = true;
        this.handleMovementInput(touchState);
      }
      
      // Update visual indicator
      if (this.config.showTouchIndicators) {
        this.updateTouchIndicator(touch.identifier, touch.clientX, touch.clientY);
      }
    });
    
    this.updatePerformanceMetrics('touchmove', startTime);
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    Array.from(event.changedTouches).forEach(touch => {
      const touchState = this.touchStates.get(touch.identifier);
      if (touchState && touch.identifier === this.primaryTouchId) {
        this.handleStopInput();
        this.primaryTouchId = null;
      }
      
      this.touchStates.delete(touch.identifier);
      this.hideTouchIndicator(touch.identifier);
    });
    
    // Set new primary touch if available
    if (this.primaryTouchId === null && this.touchStates.size > 0) {
      const [firstTouchId] = this.touchStates.keys();
      this.primaryTouchId = firstTouchId;
    }
  }

  // Keyboard Event Handlers
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.code;
    const currentState = this.keyStates.get(key);
    
    if (!currentState || !currentState.isPressed) {
      this.keyStates.set(key, {
        isPressed: true,
        timestamp: Date.now(),
        repeatTimer: null,
        repeatCount: 0,
      });
      
      this.processKeyAction(key, true);
      this.setupKeyRepeat(key);
      
      this.performanceMetrics.keyEventCount++;
    }
    
    // Prevent default for handled keys
    if (this.keyMappings.movement[key] || this.keyMappings.actions[key]) {
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    const state = this.keyStates.get(key);
    
    if (state) {
      if (state.repeatTimer) {
        clearInterval(state.repeatTimer);
      }
      
      this.keyStates.set(key, {
        ...state,
        isPressed: false,
        repeatTimer: null,
      });
      
      this.processKeyAction(key, false);
    }
  }

  private setupKeyRepeat(key: string): void {
    const state = this.keyStates.get(key);
    if (!state || !this.keyMappings.movement[key]) {return;}
    
    setTimeout(() => {
      if (this.keyStates.get(key)?.isPressed) {
        const timer = setInterval(() => {
          if (this.keyStates.get(key)?.isPressed) {
            this.processKeyAction(key, true);
          } else {
            clearInterval(timer);
          }
        }, this.config.keyRepeatRate);
        
        const currentState = this.keyStates.get(key);
        if (currentState) {
          currentState.repeatTimer = timer;
        }
      }
    }, this.config.keyRepeatDelay);
  }

  private processKeyAction(key: string, isPressed: boolean): void {
    // Handle movement keys
    if (this.keyMappings.movement[key]) {
      const direction = this.keyMappings.movement[key];
      
      if (isPressed) {
        this.handleMovementInput({ direction, intensity: 1.0 });
      } else {
        // Check if any other movement keys are still pressed
        const activeMovementKeys = Object.keys(this.keyMappings.movement)
          .filter(k => this.keyStates.get(k)?.isPressed);
        
        if (activeMovementKeys.length === 0) {
          this.handleStopInput();
        }
      }
    }
    
    // Handle action keys (only on press)
    if (isPressed && this.keyMappings.actions[key]) {
      const action = this.keyMappings.actions[key];
      if (action === 'bomb') {
        this.handleBombInput();
      }
    }
  }

  // Input Processing
  private handleMovementInput(input: TouchState | { direction: Direction; intensity: number }): void {
    let direction: Direction;
    let intensity: number;
    
    if ('direction' in input) {
      direction = input.direction;
      intensity = input.intensity;
    } else {
      direction = this.calculateDirection(input.deltaX, input.deltaY);
      intensity = Math.min(1, Math.sqrt(input.deltaX ** 2 + input.deltaY ** 2) / 100);
    }
    
    this.inputState.movement = {
      direction,
      intensity,
      isActive: true,
      lastUpdate: Date.now(),
    };
    
    const action: MovementAction = {
      direction,
      intensity,
      timestamp: Date.now(),
    };
    
    this.queueAction({
      type: 'movement',
      direction,
      intensity,
      timestamp: action.timestamp,
    });
    
    this.emit('player-move', action);
  }

  private handleBombInput(): void {
    if (!this.inputState.bombAction.canPlace) {return;}
    
    const now = Date.now();
    if (now - this.inputState.bombAction.lastPlaceTime < this.config.bombCooldown) {return;}
    
    this.inputState.bombAction = {
      canPlace: false,
      cooldownRemaining: this.config.bombCooldown,
      lastPlaceTime: now,
    };
    
    const action: BombAction = {
      timestamp: now,
    };
    
    this.queueAction({
      type: 'bomb',
      timestamp: action.timestamp,
    });
    
    this.emit('player-bomb', action);
    
    // Trigger haptic feedback
    if (this.config.hapticFeedback) {
      this.triggerHapticFeedback([50]);
    }
    
    // Reset cooldown
    setTimeout(() => {
      this.inputState.bombAction.canPlace = true;
      this.inputState.bombAction.cooldownRemaining = 0;
    }, this.config.bombCooldown);
  }

  private handleStopInput(): void {
    this.inputState.movement = {
      direction: null,
      intensity: 0,
      isActive: false,
      lastUpdate: Date.now(),
    };
    
    this.queueAction({
      type: 'stop',
      timestamp: Date.now(),
    });
    
    this.emit('player-stop', { timestamp: Date.now() });
  }

  // Utility Methods
  private calculateDirection(deltaX: number, deltaY: number): Direction {
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    if (angle >= -45 && angle < 45) {return 'right';}
    if (angle >= 45 && angle < 135) {return 'down';}
    if (angle >= 135 || angle < -135) {return 'left';}
    return 'up';
  }

  private detectInputCapabilities(): void {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasKeyboard = !hasTouch || window.screen.width > 768;
    
    if (hasTouch) {
      this.config.inputMethod = 'touch';
      this.emit('input-mode-changed', 'touch');
    } else if (hasKeyboard) {
      this.config.inputMethod = 'keyboard';
      this.emit('input-mode-changed', 'keyboard');
    }
  }

  // Action Management
  queueAction(action: GameAction): void {
    // Replace duplicate movement actions
    if (action.type === 'movement') {
      const existingIndex = this.actionQueue.findIndex(a => a.type === 'movement');
      if (existingIndex !== -1) {
        this.actionQueue[existingIndex] = action;
        return;
      }
    }
    
    this.actionQueue.push(action);
    
    // Prevent queue overflow
    if (this.actionQueue.length > 50) {
      this.actionQueue = this.actionQueue.slice(-25);
      this.performanceMetrics.droppedEvents++;
    }
    
    this.performanceMetrics.queueSize = this.actionQueue.length;
  }

  getActionQueue(): GameAction[] {
    return [...this.actionQueue];
  }

  flushActionQueue(): void {
    if (this.actionQueue.length === 0) {return;}
    
    this.emit('action-batch', [...this.actionQueue]);
    this.actionQueue = [];
    this.performanceMetrics.queueSize = 0;
  }

  // Performance and Analytics
  getPerformanceMetrics(): InputPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getAnalytics(): InputAnalytics {
    return { ...this.analytics };
  }

  getValidator(): any {
    return {
      validateAction: (action: GameAction): ValidationResult => {
        // Basic validation
        if (!action.type || !action.timestamp) {
          return { valid: false, reason: 'Invalid action format' };
        }
        
        // Rate limiting
        const now = Math.floor(Date.now() / 1000);
        const actionCount = this.getActionCountInWindow(action.type, now);
        const maxActions = action.type === 'movement' ? 60 : 2;
        
        if (actionCount >= maxActions) {
          return { valid: false, reason: 'Rate limit exceeded' };
        }
        
        return { valid: true };
      },
    };
  }

  // Visual Feedback
  private createFeedbackContainer(): void {
    this.feedbackContainer = document.createElement('div');
    this.feedbackContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(this.feedbackContainer);
  }

  private showTouchIndicator(touchId: number, x: number, y: number, type: 'movement' | 'action'): void {
    if (!this.config.showTouchIndicators || !this.feedbackContainer) {return;}
    
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: absolute;
      left: ${x - 20}px;
      top: ${y - 20}px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      pointer-events: none;
      transition: opacity 0.2s;
      ${type === 'movement' 
    ? 'background: rgba(0, 255, 0, 0.3); border: 2px solid rgba(0, 255, 0, 0.8);'
    : 'background: rgba(255, 0, 0, 0.3); border: 2px solid rgba(255, 0, 0, 0.8);'
}
    `;
    
    this.feedbackContainer.appendChild(indicator);
    this.touchIndicators.set(touchId, indicator);
    
    requestAnimationFrame(() => {
      indicator.style.opacity = '1';
    });
  }

  private updateTouchIndicator(touchId: number, x: number, y: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (indicator) {
      indicator.style.left = `${x - 20}px`;
      indicator.style.top = `${y - 20}px`;
    }
  }

  private hideTouchIndicator(touchId: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (indicator) {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
        this.touchIndicators.delete(touchId);
      }, 200);
    }
  }

  private clearAllTouchIndicators(): void {
    this.touchIndicators.forEach((indicator, touchId) => {
      this.hideTouchIndicator(touchId);
    });
  }

  // Haptic Feedback
  private triggerHapticFeedback(pattern: number | number[]): void {
    if (!this.config.hapticFeedback || !('vibrate' in navigator)) {return;}
    
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Private Helper Methods
  private applyConfiguration(): void {
    this.movementThreshold = this.config.deadZone;
  }

  private setupPerformanceOptimization(): void {
    // Batch action processing
    this.flushTimer = setInterval(() => {
      this.flushActionQueue();
    }, 16); // ~60fps
  }

  private startAnalytics(): void {
    this.analytics.sessionDuration = Date.now();
  }

  private updatePerformanceMetrics(eventType: string, startTime: number): void {
    const processingTime = performance.now() - startTime;
    this.performanceMetrics.processingTime = 
      (this.performanceMetrics.processingTime + processingTime) / 2;
  }

  private getActionCountInWindow(actionType: string, timeWindow: number): number {
    const windowCounts = this.actionCounts.get(actionType) || new Map();
    return windowCounts.get(timeWindow) || 0;
  }
}