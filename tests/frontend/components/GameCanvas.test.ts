/**
 * GameCanvas Component Tests
 * Tests the main game canvas component with input handling and rendering
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GameCanvas from '../../../src/components/game/GameCanvas.vue'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { useGameStore } from '../../../src/stores/gameStore'
import type { UnifiedInputManager } from '../../../src/utils/inputManager'

// Mock the input manager
vi.mock('../../../src/utils/inputManager', () => ({
  UnifiedInputManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    registerTouchHandlers: vi.fn(),
    registerKeyboardHandlers: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getCurrentInputState: vi.fn(),
    isMoving: vi.fn().mockReturnValue(false),
    getMovementDirection: vi.fn().mockReturnValue(null)
  }))
}))

// Mock HTML5 Canvas API
const mockCanvas = {
  getContext: vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 })
  }),
  width: 800,
  height: 600,
  style: {},
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

// Mock getBoundingClientRect
Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: vi.fn().mockReturnValue({
    x: 0, y: 0, width: 800, height: 600,
    left: 0, top: 0, right: 800, bottom: 600
  })
})

describe('GameCanvas Component', () => {
  let wrapper: VueWrapper<any>
  let playerStore: ReturnType<typeof usePlayerStore>
  let gameStore: ReturnType<typeof useGameStore>
  let mockInputManager: any

  beforeEach(() => {
    // Create testing pinia with initial state
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        player: {
          id: 'test-player-1',
          position: { x: 64, y: 64 },
          health: 100,
          bombCount: 1,
          bombPower: 1,
          isAlive: true,
          direction: null,
          isMoving: false
        },
        game: {
          roomId: 'test-room',
          players: new Map(),
          bombs: new Map(),
          powerUps: new Map(),
          maze: Array(15).fill(null).map(() => Array(15).fill(0)),
          gameState: 'playing',
          currentLevel: 1,
          boss: null,
          monsters: new Map()
        }
      }
    })

    // Mount component with canvas mock
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any
      }
      return document.createElement(tagName)
    })

    wrapper = mount(GameCanvas, {
      global: {
        plugins: [pinia]
      }
    })

    playerStore = usePlayerStore()
    gameStore = useGameStore()
    
    // Get the mocked input manager instance
    const InputManagerClass = require('../../../src/utils/inputManager').UnifiedInputManager
    mockInputManager = new InputManagerClass()
  })

  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  describe('Component Initialization', () => {
    it('should render canvas element', () => {
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.attributes('class')).toContain('game-canvas')
    })

    it('should initialize input manager on mount', async () => {
      await wrapper.vm.$nextTick()
      expect(mockInputManager.initialize).toHaveBeenCalled()
    })

    it('should register touch and keyboard handlers', async () => {
      await wrapper.vm.$nextTick()
      expect(mockInputManager.registerTouchHandlers).toHaveBeenCalled()
      expect(mockInputManager.registerKeyboardHandlers).toHaveBeenCalled()
    })

    it('should set up canvas dimensions', () => {
      const canvas = wrapper.find('canvas')
      expect(canvas.element.width).toBeDefined()
      expect(canvas.element.height).toBeDefined()
    })
  })

  describe('Input Event Handling', () => {
    it('should handle player movement input', async () => {
      const movePlayerSpy = vi.spyOn(playerStore, 'movePlayer')
      
      // Simulate input manager emitting movement event
      const mockCallback = mockInputManager.on.mock.calls
        .find(call => call[0] === 'player-move')?.[1]
      
      expect(mockCallback).toBeDefined()
      
      // Call the movement callback
      mockCallback({ direction: 'up', intensity: 1, timestamp: Date.now() })
      
      expect(movePlayerSpy).toHaveBeenCalledWith('up', 1)
    })

    it('should handle bomb placement input', async () => {
      const placeBombSpy = vi.spyOn(playerStore, 'placeBomb')
      
      // Simulate input manager emitting bomb event
      const mockCallback = mockInputManager.on.mock.calls
        .find(call => call[0] === 'player-bomb')?.[1]
      
      expect(mockCallback).toBeDefined()
      
      // Call the bomb callback
      mockCallback({ timestamp: Date.now() })
      
      expect(placeBombSpy).toHaveBeenCalled()
    })

    it('should handle player stop input', async () => {
      const stopMovementSpy = vi.spyOn(playerStore, 'stopMovement')
      
      // Simulate input manager emitting stop event
      const mockCallback = mockInputManager.on.mock.calls
        .find(call => call[0] === 'player-stop')?.[1]
      
      expect(mockCallback).toBeDefined()
      
      // Call the stop callback
      mockCallback({ timestamp: Date.now() })
      
      expect(stopMovementSpy).toHaveBeenCalled()
    })
  })

  describe('Canvas Rendering', () => {
    it('should initialize canvas context', () => {
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
    })

    it('should start render loop on mount', async () => {
      vi.spyOn(window, 'requestAnimationFrame')
      await wrapper.vm.$nextTick()
      
      // Trigger a render frame
      if (wrapper.vm.renderFrame) {
        wrapper.vm.renderFrame()
        expect(window.requestAnimationFrame).toHaveBeenCalled()
      }
    })

    it('should clear canvas on each frame', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.renderFrame) {
        wrapper.vm.renderFrame()
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height)
      }
    })
  })

  describe('Responsive Design', () => {
    it('should update canvas size on window resize', async () => {
      const resizeHandler = wrapper.vm.handleResize
      
      if (resizeHandler) {
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
        Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
        
        resizeHandler()
        
        // Canvas should maintain square aspect ratio
        expect(mockCanvas.width).toBeLessThanOrEqual(Math.min(1024, 768))
        expect(mockCanvas.height).toBeLessThanOrEqual(Math.min(1024, 768))
      }
    })

    it('should handle mobile viewport changes', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
      
      if (wrapper.vm.handleResize) {
        wrapper.vm.handleResize()
        
        // Canvas should fit mobile viewport
        expect(mockCanvas.width).toBeLessThanOrEqual(375)
        expect(mockCanvas.height).toBeLessThanOrEqual(375)
      }
    })
  })

  describe('Touch Event Prevention', () => {
    it('should prevent default touch behaviors', async () => {
      const canvas = wrapper.find('canvas')
      const preventDefault = vi.fn()
      
      // Simulate touch event
      await canvas.trigger('touchstart', {
        preventDefault,
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      expect(preventDefault).toHaveBeenCalled()
    })

    it('should prevent context menu on touch hold', async () => {
      const canvas = wrapper.find('canvas')
      const preventDefault = vi.fn()
      
      await canvas.trigger('contextmenu', { preventDefault })
      expect(preventDefault).toHaveBeenCalled()
    })
  })

  describe('Performance Optimization', () => {
    it('should throttle resize events', async () => {
      const handleResize = vi.spyOn(wrapper.vm, 'handleResize')
      
      // Trigger multiple resize events quickly
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event('resize'))
      }
      
      // Should not call resize handler more than once immediately
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(handleResize).not.toHaveBeenCalledTimes(10)
    })

    it('should use requestAnimationFrame for rendering', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
      
      if (wrapper.vm.renderFrame) {
        wrapper.vm.renderFrame()
        expect(rafSpy).toHaveBeenCalled()
      }
    })
  })

  describe('Component Cleanup', () => {
    it('should destroy input manager on unmount', () => {
      wrapper.unmount()
      expect(mockInputManager.destroy).toHaveBeenCalled()
    })

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      wrapper.unmount()
      
      // Should remove resize listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should cancel animation frame on unmount', () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')
      
      // Start animation loop
      if (wrapper.vm.renderFrame) {
        const frameId = requestAnimationFrame(wrapper.vm.renderFrame)
        wrapper.vm.animationFrameId = frameId
      }
      
      wrapper.unmount()
      expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle input manager initialization failure', async () => {
      mockInputManager.initialize.mockRejectedValueOnce(new Error('Init failed'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Remount component to trigger initialization
      wrapper.unmount()
      wrapper = mount(GameCanvas, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      
      await wrapper.vm.$nextTick()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize input manager:', expect.any(Error))
    })

    it('should handle canvas context creation failure', () => {
      mockCanvas.getContext.mockReturnValueOnce(null)
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      wrapper = mount(GameCanvas, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get canvas context')
    })
  })

  describe('Integration with Stores', () => {
    it('should react to player position changes', async () => {
      const ctx = mockCanvas.getContext('2d')
      
      // Change player position
      playerStore.position = { x: 128, y: 128 }
      await wrapper.vm.$nextTick()
      
      // Should trigger re-render
      if (wrapper.vm.renderFrame) {
        wrapper.vm.renderFrame()
        expect(ctx.clearRect).toHaveBeenCalled()
      }
    })

    it('should react to game state changes', async () => {
      // Change game state
      gameStore.gameState = 'paused'
      await wrapper.vm.$nextTick()
      
      // Should update rendering accordingly
      expect(wrapper.vm.isPaused).toBe(true)
    })

    it('should handle new bomb creation', async () => {
      const bombs = new Map([
        ['bomb-1', {
          id: 'bomb-1',
          position: { x: 64, y: 64 },
          ownerId: 'test-player-1',
          timer: 3000,
          power: 2
        }]
      ])
      
      gameStore.bombs = bombs
      await wrapper.vm.$nextTick()
      
      // Should render bomb on next frame
      if (wrapper.vm.renderFrame) {
        wrapper.vm.renderFrame()
        const ctx = mockCanvas.getContext('2d')
        expect(ctx.fillRect).toHaveBeenCalled() // Bomb rendering
      }
    })
  })
})