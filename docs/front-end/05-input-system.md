# Touch Controls & Unified Input System

> **Navigation**: [← Responsive Design](04-responsive-design.md) → **Input System** → [🏠 Frontend Docs](README.md)

Mobile-first input system unifying touch gestures and keyboard controls for cross-platform Bomberman gameplay.

## Input Requirements

### Mobile Touch Controls
- **Movement**: First finger touch and drag anywhere on screen
- **Bomb Placement**: Second finger tap anywhere while first finger is active
- **Visual Feedback**: Touch indicators and haptic responses
- **Performance**: 60fps touch tracking with minimal latency

### Desktop Keyboard Controls
- **Movement**: Arrow keys (↑↓←→)
- **Bomb Placement**: Spacebar
- **Alternative**: WASD + Enter for bomb
- **Visual Feedback**: Key press indicators

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Input System Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  Touch Events    │    Keyboard Events    │   Gamepad Events │
│  ─────────────   │   ───────────────────  │  ─────────────── │
│  touchstart      │   keydown/keyup       │   button press   │
│  touchmove       │   repeat handling     │   analog stick   │
│  touchend        │                       │                  │
└─────────────┬───────────────┬─────────────────────┬─────────┘
              │               │                     │
              ▼               ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Input Unification Layer                   │
├─────────────────────────────────────────────────────────────┤
│  • Gesture Recognition     • Key Mapping                    │
│  • Touch State Tracking    • Repeat Prevention              │
│  • Multi-finger Detection  • Dead Zone Handling            │
│  • Movement Calculation    • Input Validation               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Game Action Layer                       │
├─────────────────────────────────────────────────────────────┤
│  • PlayerMoveAction         • PlayerBombAction              │
│  • DirectionNormalization   • Bomb Placement Validation     │
│  • Anti-spam Protection     • Action Queue Management       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Network Layer                          │
├─────────────────────────────────────────────────────────────┤
│  • WebSocket Transmission   • Action Batching               │
│  • Network Optimization     • Latency Compensation          │
│  • Offline Queue            • Server Validation             │
└─────────────────────────────────────────────────────────────┘
```

## Core Input Manager

### InputManager Interface
```typescript
interface InputManager {
  // Lifecycle
  initialize(): Promise<void>
  destroy(): void
  
  // Input Registration
  registerTouchHandlers(element: HTMLElement): void
  registerKeyboardHandlers(): void
  
  // State Management
  getCurrentInputState(): InputState
  isMoving(): boolean
  getMovementDirection(): Direction | null
  
  // Event Handling
  on(event: InputEvent, callback: InputCallback): void
  off(event: InputEvent, callback: InputCallback): void
  
  // Configuration
  setDeadZone(pixels: number): void
  setHapticFeedback(enabled: boolean): void
  setKeyRepeatDelay(ms: number): void
}

interface InputState {
  touches: TouchState[]
  keys: KeyboardState
  movement: MovementState
  bombAction: BombActionState
}

interface TouchState {
  id: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  isMovement: boolean
  timestamp: number
}

interface MovementState {
  direction: Direction | null
  intensity: number // 0-1 for analog movement
  isActive: boolean
  lastUpdate: number
}
```

## Touch Gesture System

### First Finger Movement Detection
```typescript
class TouchMovementHandler {
  private primaryTouch: TouchState | null = null
  private movementThreshold = 10 // pixels
  private deadZone = 5 // pixels for direction changes
  
  handleTouchStart(event: TouchEvent): void {
    if (this.primaryTouch === null) {
      const touch = event.touches[0]
      this.primaryTouch = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        isMovement: false,
        timestamp: Date.now()
      }
    }
  }
  
  handleTouchMove(event: TouchEvent): void {
    if (!this.primaryTouch) return
    
    const touch = Array.from(event.touches)
      .find(t => t.identifier === this.primaryTouch!.id)
    
    if (touch) {
      const deltaX = touch.clientX - this.primaryTouch.startX
      const deltaY = touch.clientY - this.primaryTouch.startY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > this.movementThreshold) {
        this.primaryTouch.isMovement = true
        this.primaryTouch.currentX = touch.clientX
        this.primaryTouch.currentY = touch.clientY
        this.primaryTouch.deltaX = deltaX
        this.primaryTouch.deltaY = deltaY
        
        this.emitMovementUpdate()
      }
    }
  }
  
  private emitMovementUpdate(): void {
    if (!this.primaryTouch || !this.primaryTouch.isMovement) return
    
    const direction = this.calculateDirection(
      this.primaryTouch.deltaX,
      this.primaryTouch.deltaY
    )
    
    const intensity = Math.min(1, Math.sqrt(
      this.primaryTouch.deltaX ** 2 + this.primaryTouch.deltaY ** 2
    ) / 100) // Max distance for full intensity: 100px
    
    this.emit('movement', { direction, intensity })
  }
  
  private calculateDirection(deltaX: number, deltaY: number): Direction {
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    
    // Convert angle to 4-directional movement
    if (angle >= -45 && angle < 45) return 'right'
    if (angle >= 45 && angle < 135) return 'down'
    if (angle >= 135 || angle < -135) return 'left'
    return 'up'
  }
}
```

### Second Finger Bomb Placement
```typescript
class TouchBombHandler {
  private bombCooldown = 500 // ms between bombs
  private lastBombTime = 0
  
  handleSecondTouch(event: TouchEvent): void {
    const now = Date.now()
    if (now - this.lastBombTime < this.bombCooldown) return
    
    // Only trigger if primary touch is active (movement finger)
    if (this.inputManager.hasPrimaryTouch()) {
      this.lastBombTime = now
      this.emit('bomb-place')
      this.triggerHapticFeedback()
    }
  }
  
  private triggerHapticFeedback(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration
    }
  }
}
```

## Keyboard Input System

### Key Mapping and Repeat Handling
```typescript
class KeyboardInputHandler {
  private keyStates = new Map<string, KeyState>()
  private keyRepeatDelay = 150 // ms
  private keyRepeatRate = 50 // ms
  
  private keyMappings = {
    movement: {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'KeyW': 'up',
      'KeyS': 'down',
      'KeyA': 'left',
      'KeyD': 'right'
    },
    actions: {
      'Space': 'bomb',
      'Enter': 'bomb'
    }
  }
  
  handleKeyDown(event: KeyboardEvent): void {
    const key = event.code
    const currentState = this.keyStates.get(key)
    
    if (!currentState || !currentState.isPressed) {
      this.keyStates.set(key, {
        isPressed: true,
        timestamp: Date.now(),
        repeatTimer: null
      })
      
      this.processKeyAction(key, true)
      this.setupKeyRepeat(key)
    }
    
    event.preventDefault()
  }
  
  handleKeyUp(event: KeyboardEvent): void {
    const key = event.code
    const state = this.keyStates.get(key)
    
    if (state) {
      if (state.repeatTimer) {
        clearInterval(state.repeatTimer)
      }
      
      this.keyStates.set(key, {
        isPressed: false,
        timestamp: Date.now(),
        repeatTimer: null
      })
      
      this.processKeyAction(key, false)
    }
  }
  
  private setupKeyRepeat(key: string): void {
    const state = this.keyStates.get(key)
    if (!state || !this.isMovementKey(key)) return
    
    // Initial delay before repeat
    setTimeout(() => {
      if (this.keyStates.get(key)?.isPressed) {
        state.repeatTimer = setInterval(() => {
          if (this.keyStates.get(key)?.isPressed) {
            this.processKeyAction(key, true)
          } else {
            clearInterval(state.repeatTimer!)
          }
        }, this.keyRepeatRate)
      }
    }, this.keyRepeatDelay)
  }
  
  private processKeyAction(key: string, isPressed: boolean): void {
    // Movement keys
    if (this.keyMappings.movement[key]) {
      const direction = this.keyMappings.movement[key]
      this.emit('movement', { 
        direction: isPressed ? direction : null,
        intensity: isPressed ? 1 : 0
      })
    }
    
    // Action keys (only on press, not release)
    if (isPressed && this.keyMappings.actions[key]) {
      const action = this.keyMappings.actions[key]
      if (action === 'bomb') {
        this.emit('bomb-place')
      }
    }
  }
}

interface KeyState {
  isPressed: boolean
  timestamp: number
  repeatTimer: NodeJS.Timer | null
}
```

## Input Unification Layer

### Cross-Platform Input Manager
```typescript
export class UnifiedInputManager extends EventEmitter implements InputManager {
  private touchHandler: TouchMovementHandler
  private bombHandler: TouchBombHandler
  private keyboardHandler: KeyboardInputHandler
  private gamepadHandler: GamepadInputHandler
  
  private currentInputState: InputState = {
    touches: [],
    keys: new Map(),
    movement: { direction: null, intensity: 0, isActive: false, lastUpdate: 0 },
    bombAction: { canPlace: true, cooldownRemaining: 0 }
  }
  
  async initialize(): Promise<void> {
    this.touchHandler = new TouchMovementHandler()
    this.bombHandler = new TouchBombHandler()
    this.keyboardHandler = new KeyboardInputHandler()
    
    // Unify all input sources
    this.touchHandler.on('movement', this.handleMovementInput.bind(this))
    this.keyboardHandler.on('movement', this.handleMovementInput.bind(this))
    
    this.bombHandler.on('bomb-place', this.handleBombInput.bind(this))
    this.keyboardHandler.on('bomb-place', this.handleBombInput.bind(this))
    
    // Auto-detect input method
    this.detectInputCapabilities()
  }
  
  private handleMovementInput(input: MovementInput): void {
    this.currentInputState.movement = {
      direction: input.direction,
      intensity: input.intensity,
      isActive: input.direction !== null,
      lastUpdate: Date.now()
    }
    
    // Emit unified game action
    if (input.direction) {
      this.emit('player-move', {
        direction: input.direction,
        intensity: input.intensity,
        timestamp: Date.now()
      })
    } else {
      this.emit('player-stop', {
        timestamp: Date.now()
      })
    }
  }
  
  private handleBombInput(): void {
    if (this.currentInputState.bombAction.canPlace) {
      this.currentInputState.bombAction.canPlace = false
      this.currentInputState.bombAction.cooldownRemaining = 500
      
      this.emit('player-bomb', {
        timestamp: Date.now()
      })
      
      // Reset cooldown
      setTimeout(() => {
        this.currentInputState.bombAction.canPlace = true
        this.currentInputState.bombAction.cooldownRemaining = 0
      }, 500)
    }
  }
  
  registerTouchHandlers(element: HTMLElement): void {
    element.addEventListener('touchstart', this.touchHandler.handleTouchStart.bind(this.touchHandler), { passive: false })
    element.addEventListener('touchmove', this.touchHandler.handleTouchMove.bind(this.touchHandler), { passive: false })
    element.addEventListener('touchend', this.touchHandler.handleTouchEnd.bind(this.touchHandler), { passive: false })
    
    // Prevent default touch behaviors
    element.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false })
  }
  
  registerKeyboardHandlers(): void {
    document.addEventListener('keydown', this.keyboardHandler.handleKeyDown.bind(this.keyboardHandler))
    document.addEventListener('keyup', this.keyboardHandler.handleKeyUp.bind(this.keyboardHandler))
  }
  
  private detectInputCapabilities(): void {
    // Detect touch support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // Detect physical keyboard
    const hasKeyboard = !hasTouch || window.screen.width > 768
    
    // Configure input modes
    if (hasTouch) {
      this.emit('input-mode-changed', 'touch')
    }
    if (hasKeyboard) {
      this.emit('input-mode-changed', 'keyboard')
    }
  }
}
```

## Performance Optimizations

### Input Throttling and Batching
```typescript
class InputPerformanceManager {
  private inputQueue: GameAction[] = []
  private batchInterval = 16 // ~60fps
  private maxQueueSize = 10
  
  constructor(private networkManager: NetworkManager) {
    setInterval(() => this.flushInputQueue(), this.batchInterval)
  }
  
  queueAction(action: GameAction): void {
    // Replace duplicate movement actions
    if (action.type === 'movement') {
      const existingIndex = this.inputQueue.findIndex(a => a.type === 'movement')
      if (existingIndex !== -1) {
        this.inputQueue[existingIndex] = action
        return
      }
    }
    
    this.inputQueue.push(action)
    
    // Prevent queue overflow
    if (this.inputQueue.length > this.maxQueueSize) {
      this.inputQueue = this.inputQueue.slice(-this.maxQueueSize)
    }
  }
  
  private flushInputQueue(): void {
    if (this.inputQueue.length === 0) return
    
    // Batch and send all queued actions
    this.networkManager.sendActionBatch(this.inputQueue)
    this.inputQueue = []
  }
}
```

### Touch Optimization
```typescript
class TouchOptimizer {
  private touchMoveThrottler: Function
  private lastTouchProcessTime = 0
  private minProcessInterval = 16 // ~60fps max
  
  constructor() {
    this.touchMoveThrottler = this.throttle(this.processTouchMove.bind(this), this.minProcessInterval)
  }
  
  private throttle(func: Function, delay: number): Function {
    let timeoutId: NodeJS.Timeout | null = null
    let lastExecTime = 0
    
    return (...args: any[]) => {
      const currentTime = Date.now()
      
      if (currentTime - lastExecTime > delay) {
        func(...args)
        lastExecTime = currentTime
      } else {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          func(...args)
          lastExecTime = Date.now()
        }, delay - (currentTime - lastExecTime))
      }
    }
  }
  
  private processTouchMove(event: TouchEvent): void {
    // Optimized touch processing
    const now = performance.now()
    if (now - this.lastTouchProcessTime < this.minProcessInterval) return
    
    this.lastTouchProcessTime = now
    // Process touch movement
  }
}
```

## Input Validation & Anti-Cheat

### Client-Side Validation
```typescript
class InputValidator {
  private lastActionTime = 0
  private actionCounts = new Map<string, number>()
  private readonly maxActionsPerSecond = {
    movement: 60, // 60fps max
    bomb: 2,     // 2 bombs per second max
  }
  
  validateAction(action: GameAction): ValidationResult {
    const now = Date.now()
    const actionType = action.type
    
    // Rate limiting
    const secondWindow = Math.floor(now / 1000)
    const currentCount = this.actionCounts.get(`${actionType}-${secondWindow}`) || 0
    const maxAllowed = this.maxActionsPerSecond[actionType] || 10
    
    if (currentCount >= maxAllowed) {
      return { valid: false, reason: 'Rate limit exceeded' }
    }
    
    // Update count
    this.actionCounts.set(`${actionType}-${secondWindow}`, currentCount + 1)
    
    // Clean old counts
    this.cleanOldCounts(secondWindow)
    
    // Action-specific validation
    switch (actionType) {
      case 'movement':
        return this.validateMovement(action as MovementAction)
      case 'bomb':
        return this.validateBomb(action as BombAction)
      default:
        return { valid: true }
    }
  }
  
  private validateMovement(action: MovementAction): ValidationResult {
    // Validate direction
    if (!['up', 'down', 'left', 'right'].includes(action.direction)) {
      return { valid: false, reason: 'Invalid direction' }
    }
    
    // Validate intensity
    if (action.intensity < 0 || action.intensity > 1) {
      return { valid: false, reason: 'Invalid intensity' }
    }
    
    return { valid: true }
  }
  
  private validateBomb(action: BombAction): ValidationResult {
    const now = Date.now()
    const minInterval = 500 // 500ms between bombs
    
    if (now - this.lastActionTime < minInterval) {
      return { valid: false, reason: 'Bomb cooldown active' }
    }
    
    this.lastActionTime = now
    return { valid: true }
  }
}
```

## Visual Feedback System

### Touch Indicators
```typescript
class TouchFeedbackManager {
  private touchIndicators = new Map<number, HTMLElement>()
  
  showTouchIndicator(touchId: number, x: number, y: number, type: 'movement' | 'action'): void {
    const indicator = document.createElement('div')
    indicator.className = `touch-indicator touch-${type}`
    indicator.style.cssText = `
      position: fixed;
      left: ${x - 20}px;
      top: ${y - 20}px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.2s;
    `
    
    if (type === 'movement') {
      indicator.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'
      indicator.style.border = '2px solid rgba(0, 255, 0, 0.8)'
    } else {
      indicator.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'
      indicator.style.border = '2px solid rgba(255, 0, 0, 0.8)'
    }
    
    document.body.appendChild(indicator)
    this.touchIndicators.set(touchId, indicator)
    
    // Fade in
    requestAnimationFrame(() => {
      indicator.style.opacity = '1'
    })
  }
  
  updateTouchIndicator(touchId: number, x: number, y: number): void {
    const indicator = this.touchIndicators.get(touchId)
    if (indicator) {
      indicator.style.left = `${x - 20}px`
      indicator.style.top = `${y - 20}px`
    }
  }
  
  hideTouchIndicator(touchId: number): void {
    const indicator = this.touchIndicators.get(touchId)
    if (indicator) {
      indicator.style.opacity = '0'
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator)
        }
        this.touchIndicators.delete(touchId)
      }, 200)
    }
  }
}
```

## Integration with Game Systems

### Connection to Player Store
```typescript
// In GameCanvas.vue component
export default defineComponent({
  name: 'GameCanvas',
  setup() {
    const playerStore = usePlayerStore()
    const inputManager = new UnifiedInputManager()
    
    onMounted(async () => {
      await inputManager.initialize()
      
      // Connect input to player actions
      inputManager.on('player-move', (action: MovementAction) => {
        playerStore.movePlayer(action.direction, action.intensity)
      })
      
      inputManager.on('player-bomb', (action: BombAction) => {
        playerStore.placeBomb()
      })
      
      inputManager.on('player-stop', () => {
        playerStore.stopMovement()
      })
      
      // Register handlers
      const canvas = canvasRef.value
      if (canvas) {
        inputManager.registerTouchHandlers(canvas)
      }
      inputManager.registerKeyboardHandlers()
    })
    
    return { inputManager }
  }
})
```

## Configuration and Settings

### Input Configuration Store
```typescript
interface InputConfig {
  touchSensitivity: number      // 0.1 - 2.0
  deadZone: number             // 5 - 50 pixels
  hapticFeedback: boolean      // true/false
  keyRepeatDelay: number       // 50 - 300ms
  keyRepeatRate: number        // 16 - 100ms
  showTouchIndicators: boolean // true/false
  bombCooldown: number         // 100 - 1000ms
}

export const useInputConfigStore = defineStore('inputConfig', () => {
  const config = ref<InputConfig>({
    touchSensitivity: 1.0,
    deadZone: 10,
    hapticFeedback: true,
    keyRepeatDelay: 150,
    keyRepeatRate: 50,
    showTouchIndicators: true,
    bombCooldown: 500
  })
  
  const updateConfig = (newConfig: Partial<InputConfig>) => {
    Object.assign(config.value, newConfig)
    localStorage.setItem('bomberman-input-config', JSON.stringify(config.value))
  }
  
  const loadConfig = () => {
    const saved = localStorage.getItem('bomberman-input-config')
    if (saved) {
      try {
        Object.assign(config.value, JSON.parse(saved))
      } catch (e) {
        console.warn('Failed to load input config:', e)
      }
    }
  }
  
  return { config: readonly(config), updateConfig, loadConfig }
})
```

This comprehensive touch controls and input system provides:

1. **Unified Input Architecture**: Single system handling touch, keyboard, and gamepad inputs
2. **Mobile-First Design**: Optimized touch gestures with proper feedback
3. **Performance Optimization**: 60fps input handling with batching and throttling
4. **Cross-Platform Compatibility**: Seamless desktop and mobile experience
5. **Anti-Cheat Protection**: Client-side validation and rate limiting
6. **Visual Feedback**: Touch indicators and haptic responses
7. **Configurable Settings**: User-customizable input sensitivity and behaviors

The system is designed to integrate seamlessly with Vue 3 components and Pinia stores, following the mobile-first responsive architecture.

---

**Documentation Complete**: You've reached the end of the frontend architecture documentation. Return to [🏠 Frontend Docs](README.md) or begin implementation with the TDD approach.