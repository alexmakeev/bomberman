/**
 * Input Manager Tests
 * Tests the unified input system for touch, keyboard, and gamepad controls
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UnifiedInputManager } from '../../../src/utils/inputManager'
import type { InputState, MovementAction, BombAction } from '../../../src/types/input'

// Mock DOM elements and events
const mockCanvas = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn().mockReturnValue({
    left: 100, top: 50, width: 800, height: 600
  })
}

// Mock navigator for haptic feedback
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  configurable: true
})

// Mock window properties
Object.defineProperty(window, 'ontouchstart', {
  value: true,
  configurable: true
})

Object.defineProperty(navigator, 'maxTouchPoints', {
  value: 5,
  configurable: true
})

describe('UnifiedInputManager', () => {
  let inputManager: UnifiedInputManager
  let mockElement: any

  beforeEach(() => {
    inputManager = new UnifiedInputManager()
    mockElement = mockCanvas
    vi.clearAllMocks()
  })

  afterEach(() => {
    inputManager.destroy()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await inputManager.initialize()
      
      expect(inputManager.getCurrentInputState()).toBeDefined()
    })

    it('should detect touch capabilities', async () => {
      await inputManager.initialize()
      
      // Should emit input mode event for touch
      const inputModeSpy = vi.fn()
      inputManager.on('input-mode-changed', inputModeSpy)
      
      // Re-trigger detection
      inputManager.detectInputCapabilities()
      
      expect(inputModeSpy).toHaveBeenCalledWith('touch')
    })

    it('should detect keyboard capabilities', async () => {
      // Mock no touch support
      Object.defineProperty(window, 'ontouchstart', { value: undefined })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 })
      Object.defineProperty(window.screen, 'width', { value: 1920 })
      
      await inputManager.initialize()
      
      const inputModeSpy = vi.fn()
      inputManager.on('input-mode-changed', inputModeSpy)
      
      inputManager.detectInputCapabilities()
      
      expect(inputModeSpy).toHaveBeenCalledWith('keyboard')
    })
  })

  describe('Touch Input Handling', () => {
    beforeEach(async () => {
      await inputManager.initialize()
      inputManager.registerTouchHandlers(mockElement)
    })

    it('should register touch event listeners', () => {
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        { passive: false }
      )
      expect(mockElement.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        { passive: false }
      )
    })

    it('should handle single touch movement', () => {
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      // Simulate touch start
      const touch = {
        identifier: 1,
        clientX: 200,
        clientY: 150
      }
      const touchStartEvent = {
        touches: [touch],
        changedTouches: [touch],
        preventDefault: vi.fn()
      }
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      
      touchHandler(touchStartEvent)
      
      // Simulate touch move (significant movement)
      const touchMoveEvent = {
        touches: [{
          identifier: 1,
          clientX: 250, // Moved 50px right
          clientY: 150
        }],
        preventDefault: vi.fn()
      }
      
      const moveHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchmove')[1]
      
      moveHandler(touchMoveEvent)
      
      expect(movementSpy).toHaveBeenCalledWith({
        direction: 'right',
        intensity: expect.any(Number),
        timestamp: expect.any(Number)
      })
    })

    it('should handle second touch for bomb placement', () => {
      const bombSpy = vi.fn()
      inputManager.on('player-bomb', bombSpy)
      
      // First touch (movement)
      const firstTouchEvent = {
        touches: [{
          identifier: 1,
          clientX: 200,
          clientY: 150
        }],
        preventDefault: vi.fn()
      }
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      
      touchHandler(firstTouchEvent)
      
      // Second touch (bomb)
      const secondTouchEvent = {
        touches: [
          {
            identifier: 1,
            clientX: 200,
            clientY: 150
          },
          {
            identifier: 2,
            clientX: 300,
            clientY: 200
          }
        ],
        preventDefault: vi.fn()
      }
      
      touchHandler(secondTouchEvent)
      
      expect(bombSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })

    it('should calculate movement direction correctly', () => {
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      const directions = [
        { deltaX: 50, deltaY: 0, expected: 'right' },
        { deltaX: -50, deltaY: 0, expected: 'left' },
        { deltaX: 0, deltaY: 50, expected: 'down' },
        { deltaX: 0, deltaY: -50, expected: 'up' },
        { deltaX: 35, deltaY: 35, expected: 'down' }, // 45° angle
        { deltaX: -35, deltaY: -35, expected: 'up' }  // 225° angle
      ]
      
      directions.forEach(({ deltaX, deltaY, expected }, index) => {
        const touchStartEvent = {
          touches: [{
            identifier: index + 1,
            clientX: 200,
            clientY: 150
          }],
          preventDefault: vi.fn()
        }
        
        const touchMoveEvent = {
          touches: [{
            identifier: index + 1,
            clientX: 200 + deltaX,
            clientY: 150 + deltaY
          }],
          preventDefault: vi.fn()
        }
        
        const touchHandler = mockElement.addEventListener.mock.calls
          .find(call => call[0] === 'touchstart')[1]
        const moveHandler = mockElement.addEventListener.mock.calls
          .find(call => call[0] === 'touchmove')[1]
        
        touchHandler(touchStartEvent)
        moveHandler(touchMoveEvent)
        
        expect(movementSpy).toHaveBeenCalledWith({
          direction: expected,
          intensity: expect.any(Number),
          timestamp: expect.any(Number)
        })
      })
    })

    it('should apply movement threshold', () => {
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      // Small movement (below threshold)
      const touchStartEvent = {
        touches: [{
          identifier: 1,
          clientX: 200,
          clientY: 150
        }],
        preventDefault: vi.fn()
      }
      
      const smallMoveEvent = {
        touches: [{
          identifier: 1,
          clientX: 205, // Only 5px movement
          clientY: 152
        }],
        preventDefault: vi.fn()
      }
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const moveHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchmove')[1]
      
      touchHandler(touchStartEvent)
      moveHandler(smallMoveEvent)
      
      // Should not trigger movement for small deltas
      expect(movementSpy).not.toHaveBeenCalled()
    })

    it('should handle touch end event', () => {
      const stopSpy = vi.fn()
      inputManager.on('player-stop', stopSpy)
      
      // Start touch
      const touchStartEvent = {
        touches: [{
          identifier: 1,
          clientX: 200,
          clientY: 150
        }],
        preventDefault: vi.fn()
      }
      
      // End touch
      const touchEndEvent = {
        changedTouches: [{
          identifier: 1,
          clientX: 200,
          clientY: 150
        }],
        touches: [],
        preventDefault: vi.fn()
      }
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const endHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchend')[1]
      
      touchHandler(touchStartEvent)
      endHandler(touchEndEvent)
      
      expect(stopSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })
  })

  describe('Keyboard Input Handling', () => {
    beforeEach(async () => {
      await inputManager.initialize()
      inputManager.registerKeyboardHandlers()
    })

    it('should register keyboard event listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      
      inputManager.registerKeyboardHandlers()
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function)
      )
    })

    it('should handle arrow key movement', () => {
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      const keydownEvent = {
        code: 'ArrowUp',
        preventDefault: vi.fn()
      }
      
      // Simulate keydown
      document.dispatchEvent(new KeyboardEvent('keydown', keydownEvent))
      
      expect(movementSpy).toHaveBeenCalledWith({
        direction: 'up',
        intensity: 1,
        timestamp: expect.any(Number)
      })
    })

    it('should handle WASD movement', () => {
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      const wasdKeys = [
        { code: 'KeyW', direction: 'up' },
        { code: 'KeyA', direction: 'left' },
        { code: 'KeyS', direction: 'down' },
        { code: 'KeyD', direction: 'right' }
      ]
      
      wasdKeys.forEach(({ code, direction }) => {
        const keyEvent = {
          code,
          preventDefault: vi.fn()
        }
        
        document.dispatchEvent(new KeyboardEvent('keydown', keyEvent))
        
        expect(movementSpy).toHaveBeenCalledWith({
          direction,
          intensity: 1,
          timestamp: expect.any(Number)
        })
      })
    })

    it('should handle spacebar for bomb placement', () => {
      const bombSpy = vi.fn()
      inputManager.on('player-bomb', bombSpy)
      
      const spaceEvent = {
        code: 'Space',
        preventDefault: vi.fn()
      }
      
      document.dispatchEvent(new KeyboardEvent('keydown', spaceEvent))
      
      expect(bombSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })

    it('should handle key repeat', () => {
      vi.useFakeTimers()
      
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      // Press and hold key
      const keydownEvent = {
        code: 'ArrowRight',
        preventDefault: vi.fn()
      }
      
      document.dispatchEvent(new KeyboardEvent('keydown', keydownEvent))
      
      expect(movementSpy).toHaveBeenCalledTimes(1)
      
      // Fast forward past repeat delay
      vi.advanceTimersByTime(200) // Initial delay
      
      // Should start repeating
      vi.advanceTimersByTime(100) // Repeat rate
      expect(movementSpy).toHaveBeenCalledTimes(2)
      
      vi.useRealTimers()
    })

    it('should stop movement on key release', () => {
      const stopSpy = vi.fn()
      inputManager.on('player-stop', stopSpy)
      
      // Press key
      const keydownEvent = {
        code: 'ArrowLeft',
        preventDefault: vi.fn()
      }
      
      document.dispatchEvent(new KeyboardEvent('keydown', keydownEvent))
      
      // Release key
      const keyupEvent = {
        code: 'ArrowLeft',
        preventDefault: vi.fn()
      }
      
      document.dispatchEvent(new KeyboardEvent('keyup', keyupEvent))
      
      expect(stopSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Number)
      })
    })

    it('should prevent default on handled keys', () => {
      const preventDefaultSpy = vi.fn()
      
      const keyEvent = {
        code: 'ArrowUp',
        preventDefault: preventDefaultSpy
      }
      
      document.dispatchEvent(new KeyboardEvent('keydown', keyEvent))
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Input Validation', () => {
    beforeEach(async () => {
      await inputManager.initialize()
    })

    it('should validate movement actions', () => {
      const validator = inputManager.getValidator()
      
      const validAction = {
        type: 'movement',
        direction: 'up',
        intensity: 0.8,
        timestamp: Date.now()
      }
      
      const result = validator.validateAction(validAction)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid movement directions', () => {
      const validator = inputManager.getValidator()
      
      const invalidAction = {
        type: 'movement',
        direction: 'diagonal', // Invalid
        intensity: 1.0,
        timestamp: Date.now()
      }
      
      const result = validator.validateAction(invalidAction)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid direction')
    })

    it('should enforce rate limiting', () => {
      const validator = inputManager.getValidator()
      
      // Send many bomb actions quickly
      for (let i = 0; i < 5; i++) {
        const bombAction = {
          type: 'bomb',
          timestamp: Date.now()
        }
        
        const result = validator.validateAction(bombAction)
        
        if (i < 2) {
          expect(result.valid).toBe(true)
        } else {
          expect(result.valid).toBe(false)
          expect(result.reason).toBe('Rate limit exceeded')
        }
      }
    })

    it('should validate intensity range', () => {
      const validator = inputManager.getValidator()
      
      const invalidIntensities = [-0.5, 1.5, NaN, null]
      
      invalidIntensities.forEach(intensity => {
        const action = {
          type: 'movement',
          direction: 'up',
          intensity,
          timestamp: Date.now()
        }
        
        const result = validator.validateAction(action as any)
        expect(result.valid).toBe(false)
        expect(result.reason).toBe('Invalid intensity')
      })
    })
  })

  describe('Performance Optimization', () => {
    beforeEach(async () => {
      await inputManager.initialize()
    })

    it('should throttle touch move events', () => {
      vi.useFakeTimers()
      
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      inputManager.registerTouchHandlers(mockElement)
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const moveHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchmove')[1]
      
      // Start touch
      touchHandler({
        touches: [{ identifier: 1, clientX: 200, clientY: 150 }],
        preventDefault: vi.fn()
      })
      
      // Rapid move events
      for (let i = 0; i < 10; i++) {
        moveHandler({
          touches: [{ identifier: 1, clientX: 200 + i * 5, clientY: 150 }],
          preventDefault: vi.fn()
        })
        
        vi.advanceTimersByTime(1) // 1ms between events
      }
      
      // Should not process all events
      expect(movementSpy).not.toHaveBeenCalledTimes(10)
      
      vi.useRealTimers()
    })

    it('should batch input actions', () => {
      const batchSpy = vi.fn()
      inputManager.on('action-batch', batchSpy)
      
      // Queue multiple actions
      inputManager.queueAction({
        type: 'movement',
        direction: 'up',
        intensity: 1.0,
        timestamp: Date.now()
      })
      
      inputManager.queueAction({
        type: 'bomb',
        timestamp: Date.now()
      })
      
      // Should batch actions together
      expect(batchSpy).toHaveBeenCalledWith([
        expect.objectContaining({ type: 'movement' }),
        expect.objectContaining({ type: 'bomb' })
      ])
    })

    it('should optimize repeated movement actions', () => {
      const actionQueue = inputManager.getActionQueue()
      
      // Add multiple movement actions
      inputManager.queueAction({
        type: 'movement',
        direction: 'right',
        intensity: 0.8,
        timestamp: Date.now() - 10
      })
      
      inputManager.queueAction({
        type: 'movement',
        direction: 'right',
        intensity: 1.0,
        timestamp: Date.now()
      })
      
      // Should replace duplicate movement actions
      expect(actionQueue.length).toBe(1)
      expect(actionQueue[0].intensity).toBe(1.0) // Latest value
    })
  })

  describe('Configuration', () => {
    beforeEach(async () => {
      await inputManager.initialize()
    })

    it('should set dead zone threshold', () => {
      inputManager.setDeadZone(20)
      
      const config = inputManager.getConfig()
      expect(config.deadZone).toBe(20)
    })

    it('should enable/disable haptic feedback', () => {
      inputManager.setHapticFeedback(true)
      
      const config = inputManager.getConfig()
      expect(config.hapticFeedback).toBe(true)
    })

    it('should configure key repeat settings', () => {
      inputManager.setKeyRepeatDelay(200)
      
      const config = inputManager.getConfig()
      expect(config.keyRepeatDelay).toBe(200)
    })

    it('should apply configuration changes immediately', () => {
      // Change dead zone
      inputManager.setDeadZone(30)
      
      const movementSpy = vi.fn()
      inputManager.on('player-move', movementSpy)
      
      inputManager.registerTouchHandlers(mockElement)
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      const moveHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchmove')[1]
      
      // Movement within new dead zone
      touchHandler({
        touches: [{ identifier: 1, clientX: 200, clientY: 150 }],
        preventDefault: vi.fn()
      })
      
      moveHandler({
        touches: [{ identifier: 1, clientX: 220, clientY: 150 }], // 20px move
        preventDefault: vi.fn()
      })
      
      // Should not trigger movement (below 30px threshold)
      expect(movementSpy).not.toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    beforeEach(async () => {
      await inputManager.initialize()
    })

    it('should track current input state', () => {
      const state = inputManager.getCurrentInputState()
      
      expect(state).toEqual({
        touches: [],
        keys: expect.any(Map),
        movement: {
          direction: null,
          intensity: 0,
          isActive: false,
          lastUpdate: expect.any(Number)
        },
        bombAction: {
          canPlace: true,
          cooldownRemaining: 0
        }
      })
    })

    it('should detect if player is moving', () => {
      expect(inputManager.isMoving()).toBe(false)
      
      // Simulate movement
      inputManager.emit('player-move', {
        direction: 'up',
        intensity: 1.0,
        timestamp: Date.now()
      })
      
      expect(inputManager.isMoving()).toBe(true)
    })

    it('should get current movement direction', () => {
      expect(inputManager.getMovementDirection()).toBe(null)
      
      // Start movement
      inputManager.emit('player-move', {
        direction: 'right',
        intensity: 0.8,
        timestamp: Date.now()
      })
      
      expect(inputManager.getMovementDirection()).toBe('right')
    })

    it('should track touch states', () => {
      inputManager.registerTouchHandlers(mockElement)
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      
      touchHandler({
        touches: [
          { identifier: 1, clientX: 200, clientY: 150 },
          { identifier: 2, clientX: 300, clientY: 200 }
        ],
        preventDefault: vi.fn()
      })
      
      const state = inputManager.getCurrentInputState()
      expect(state.touches).toHaveLength(2)
      expect(state.touches[0].id).toBe(1)
      expect(state.touches[1].id).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock failure
      vi.spyOn(inputManager, 'detectInputCapabilities')
        .mockImplementation(() => { throw new Error('Detection failed') })
      
      await inputManager.initialize()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to detect input capabilities:',
        expect.any(Error)
      )
    })

    it('should handle invalid touch events', () => {
      inputManager.registerTouchHandlers(mockElement)
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      
      // Invalid touch event
      expect(() => {
        touchHandler({
          touches: null,
          preventDefault: vi.fn()
        })
      }).not.toThrow()
    })

    it('should handle missing preventDefault', () => {
      inputManager.registerTouchHandlers(mockElement)
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      
      // Event without preventDefault
      expect(() => {
        touchHandler({
          touches: [{ identifier: 1, clientX: 200, clientY: 150 }]
          // No preventDefault method
        })
      }).not.toThrow()
    })

    it('should handle getBoundingClientRect failure', () => {
      mockElement.getBoundingClientRect.mockImplementation(() => {
        throw new Error('Layout error')
      })
      
      inputManager.registerTouchHandlers(mockElement)
      
      const touchHandler = mockElement.addEventListener.mock.calls
        .find(call => call[0] === 'touchstart')[1]
      
      expect(() => {
        touchHandler({
          touches: [{ identifier: 1, clientX: 200, clientY: 150 }],
          preventDefault: vi.fn()
        })
      }).not.toThrow()
    })
  })

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      inputManager.registerKeyboardHandlers()
      inputManager.destroy()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      )
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function)
      )
    })

    it('should clear timers on destroy', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      
      // Set up some timers
      inputManager.setKeyRepeatDelay(100)
      
      inputManager.destroy()
      
      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should clear action queue on destroy', () => {
      inputManager.queueAction({
        type: 'movement',
        direction: 'up',
        intensity: 1.0,
        timestamp: Date.now()
      })
      
      expect(inputManager.getActionQueue().length).toBeGreaterThan(0)
      
      inputManager.destroy()
      
      expect(inputManager.getActionQueue().length).toBe(0)
    })
  })
})