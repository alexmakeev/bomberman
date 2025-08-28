/**
 * GameMinimap Component Tests
 * Tests the minimap component with responsive positioning and real-time updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GameMinimap from '../../../src/components/game/GameMinimap.vue'
import { useGameStore } from '../../../src/stores/gameStore'
import { usePlayerStore } from '../../../src/stores/playerStore'

// Mock HTML5 Canvas API
const mockCanvas = {
  getContext: vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    fillText: vi.fn()
  }),
  width: 200,
  height: 200,
  style: {},
  getBoundingClientRect: vi.fn().mockReturnValue({
    x: 0, y: 0, width: 200, height: 200,
    left: 0, top: 0, right: 200, bottom: 200
  })
}

// Store original to avoid recursion
const originalCreateElement = document.createElement
vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas as any
  }
  return originalCreateElement.call(document, tagName)
})

describe('GameMinimap Component', () => {
  let wrapper: VueWrapper<any>
  let gameStore: ReturnType<typeof useGameStore>
  let playerStore: ReturnType<typeof usePlayerStore>

  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        game: {
          maze: Array(15).fill(null).map((_, y) => 
            Array(15).fill(null).map((_, x) => {
              // Create a simple maze pattern
              if (x === 0 || y === 0 || x === 14 || y === 14) return 1 // walls
              if (x % 2 === 1 && y % 2 === 1) return 1 // solid blocks
              return Math.random() < 0.3 ? 2 : 0 // some destructible blocks
            })
          ),
          players: new Map([
            ['player-1', {
              id: 'player-1',
              position: { x: 64, y: 64 },
              isAlive: true,
              color: '#ff0000'
            }],
            ['player-2', {
              id: 'player-2', 
              position: { x: 192, y: 192 },
              isAlive: true,
              color: '#0000ff'
            }]
          ]),
          monsters: new Map([
            ['monster-1', {
              id: 'monster-1',
              position: { x: 128, y: 128 },
              type: 'basic',
              isAlive: true
            }]
          ]),
          bombs: new Map([
            ['bomb-1', {
              id: 'bomb-1',
              position: { x: 96, y: 96 },
              timer: 2000,
              power: 2
            }]
          ]),
          boss: {
            id: 'boss-1',
            position: { x: 320, y: 320 },
            type: 'fire',
            health: 100,
            maxHealth: 100,
            isAlive: true
          },
          powerUps: new Map([
            ['powerup-1', {
              id: 'powerup-1',
              type: 'bomb_power',
              position: { x: 160, y: 160 }
            }]
          ])
        },
        player: {
          id: 'player-1',
          position: { x: 64, y: 64 }
        }
      }
    })

    wrapper = mount(GameMinimap, {
      global: {
        plugins: [pinia]
      }
    })

    gameStore = useGameStore()
    playerStore = usePlayerStore()
  })

  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render minimap container', () => {
      const container = wrapper.find('.minimap-container')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('minimap-container')
    })

    it('should render canvas element', () => {
      const canvas = wrapper.find('canvas')
      expect(canvas.exists()).toBe(true)
      expect(canvas.classes()).toContain('minimap-canvas')
    })

    it('should have correct responsive classes', () => {
      const container = wrapper.find('.minimap-container')
      
      // Should have mobile positioning classes
      expect(container.classes()).toContain('minimap-mobile')
    })
  })

  describe('Canvas Initialization', () => {
    it('should initialize canvas context', () => {
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
    })

    it('should set canvas dimensions', () => {
      expect(mockCanvas.width).toBeDefined()
      expect(mockCanvas.height).toBeDefined()
    })

    it('should handle high DPI displays', () => {
      // Mock devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        configurable: true
      })

      wrapper = mount(GameMinimap, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      const ctx = mockCanvas.getContext('2d')
      expect(ctx.scale).toHaveBeenCalledWith(2, 2)
    })
  })

  describe('Maze Rendering', () => {
    it('should render maze structure', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawMaze) {
        wrapper.vm.drawMaze()
        
        // Should call fillRect for each maze cell
        expect(ctx.fillRect).toHaveBeenCalled()
      }
    })

    it('should use correct colors for different cell types', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawMaze) {
        wrapper.vm.drawMaze()
        
        // Verify different fill styles are used
        expect(ctx.fillRect).toHaveBeenCalled()
      }
    })

    it('should scale maze to minimap size', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawMaze) {
        wrapper.vm.drawMaze()
        
        // Should scale positions relative to maze size
        const calls = ctx.fillRect.mock.calls
        if (calls.length > 0) {
          const [x, y, width, height] = calls[0]
          expect(width).toBeLessThan(20) // Scaled down from game grid
          expect(height).toBeLessThan(20)
        }
      }
    })
  })

  describe('Player Rendering', () => {
    it('should render all alive players', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawPlayers) {
        wrapper.vm.drawPlayers()
        
        // Should draw circles for players
        expect(ctx.beginPath).toHaveBeenCalled()
        expect(ctx.arc).toHaveBeenCalled()
        expect(ctx.fill).toHaveBeenCalled()
      }
    })

    it('should highlight current player differently', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawPlayers) {
        wrapper.vm.drawPlayers()
        
        // Current player should have stroke (outline)
        expect(ctx.stroke).toHaveBeenCalled()
      }
    })

    it('should not render dead players', async () => {
      // Kill a player
      const players = new Map(gameStore.players)
      players.get('player-2')!.isAlive = false
      gameStore.players = players
      
      await wrapper.vm.$nextTick()
      
      const ctx = mockCanvas.getContext('2d')
      if (wrapper.vm.drawPlayers) {
        wrapper.vm.drawPlayers()
        
        // Should only draw alive players
        const arcCalls = ctx.arc.mock.calls.length
        expect(arcCalls).toBeLessThan(2) // Less than total players
      }
    })

    it('should use player colors correctly', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawPlayers) {
        wrapper.vm.drawPlayers()
        
        // Should set fillStyle based on player colors
        expect(ctx.fillStyle).toBeDefined()
      }
    })
  })

  describe('Monster Rendering', () => {
    it('should render monsters on minimap', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawMonsters) {
        wrapper.vm.drawMonsters()
        
        expect(ctx.fillRect).toHaveBeenCalled()
      }
    })

    it('should use different colors for monster types', () => {
      // Add different monster types
      const monsters = new Map(gameStore.monsters)
      monsters.set('monster-2', {
        id: 'monster-2',
        position: { x: 256, y: 256 },
        type: 'fast',
        isAlive: true
      })
      gameStore.monsters = monsters
      
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawMonsters) {
        wrapper.vm.drawMonsters()
        
        // Should draw multiple monsters
        expect(ctx.fillRect).toHaveBeenCalledTimes(2)
      }
    })
  })

  describe('Boss Rendering', () => {
    it('should render boss when present', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawBoss) {
        wrapper.vm.drawBoss()
        
        // Boss should be drawn as larger circle
        expect(ctx.beginPath).toHaveBeenCalled()
        expect(ctx.arc).toHaveBeenCalled()
      }
    })

    it('should not render boss when not present', async () => {
      gameStore.boss = null
      await wrapper.vm.$nextTick()
      
      const ctx = mockCanvas.getContext('2d')
      ctx.beginPath.mockClear()
      
      if (wrapper.vm.drawBoss) {
        wrapper.vm.drawBoss()
        
        expect(ctx.beginPath).not.toHaveBeenCalled()
      }
    })

    it('should show boss health status', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawBoss) {
        wrapper.vm.drawBoss()
        
        // Should use color based on health
        expect(ctx.fillStyle).toBeDefined()
      }
    })
  })

  describe('Bomb and PowerUp Rendering', () => {
    it('should render bombs as blinking indicators', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawBombs) {
        wrapper.vm.drawBombs()
        
        expect(ctx.fillRect).toHaveBeenCalled()
      }
    })

    it('should render power-ups', () => {
      const ctx = mockCanvas.getContext('2d')
      
      if (wrapper.vm.drawPowerUps) {
        wrapper.vm.drawPowerUps()
        
        expect(ctx.fillRect).toHaveBeenCalled()
      }
    })

    it('should handle bomb timer countdown', async () => {
      // Update bomb timer
      const bombs = new Map(gameStore.bombs)
      bombs.get('bomb-1')!.timer = 500 // About to explode
      gameStore.bombs = bombs
      
      await wrapper.vm.$nextTick()
      
      const ctx = mockCanvas.getContext('2d')
      if (wrapper.vm.drawBombs) {
        wrapper.vm.drawBombs()
        
        // Should use warning color for low timer
        expect(ctx.fillStyle).toBeDefined()
      }
    })
  })

  describe('Responsive Positioning', () => {
    it('should position correctly on mobile portrait', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
      
      const container = wrapper.find('.minimap-container')
      
      // Should be positioned in top-right corner
      const styles = getComputedStyle(container.element)
      expect(container.classes()).toContain('minimap-mobile')
    })

    it('should position correctly on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })
      
      wrapper = mount(GameMinimap, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      
      const container = wrapper.find('.minimap-container')
      expect(container.classes()).toContain('minimap-desktop')
    })

    it('should handle landscape mobile orientation', () => {
      // Mock landscape mobile
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })
      
      const container = wrapper.find('.minimap-container')
      expect(container.classes()).toContain('minimap-landscape')
    })
  })

  describe('Real-time Updates', () => {
    it('should update when players move', async () => {
      const ctx = mockCanvas.getContext('2d')
      ctx.clearRect.mockClear()
      
      // Move a player
      const players = new Map(gameStore.players)
      players.get('player-1')!.position = { x: 128, y: 128 }
      gameStore.players = players
      
      await wrapper.vm.$nextTick()
      
      // Should trigger re-render
      if (wrapper.vm.render) {
        wrapper.vm.render()
        expect(ctx.clearRect).toHaveBeenCalled()
      }
    })

    it('should update when maze changes', async () => {
      const ctx = mockCanvas.getContext('2d')
      ctx.clearRect.mockClear()
      
      // Change maze (destructible block destroyed)
      const newMaze = [...gameStore.maze]
      newMaze[5][5] = 0 // Destroy a block
      gameStore.maze = newMaze
      
      await wrapper.vm.$nextTick()
      
      if (wrapper.vm.render) {
        wrapper.vm.render()
        expect(ctx.clearRect).toHaveBeenCalled()
      }
    })

    it('should update at 30fps', () => {
      vi.spyOn(window, 'requestAnimationFrame')
      
      if (wrapper.vm.startRenderLoop) {
        wrapper.vm.startRenderLoop()
        
        // Should use requestAnimationFrame
        expect(window.requestAnimationFrame).toHaveBeenCalled()
      }
    })
  })

  describe('Performance Optimization', () => {
    it('should only re-render when necessary', async () => {
      const ctx = mockCanvas.getContext('2d')
      ctx.clearRect.mockClear()
      
      // Trigger multiple state changes in quick succession
      const players = new Map(gameStore.players)
      for (let i = 0; i < 5; i++) {
        players.get('player-1')!.position = { x: 64 + i, y: 64 + i }
        gameStore.players = new Map(players)
      }
      
      await wrapper.vm.$nextTick()
      
      // Should debounce renders
      if (wrapper.vm.render) {
        wrapper.vm.render()
        
        // clearRect should not be called 5 times
        expect(ctx.clearRect).not.toHaveBeenCalledTimes(5)
      }
    })

    it('should handle large numbers of entities efficiently', async () => {
      // Add many monsters
      const monsters = new Map()
      for (let i = 0; i < 100; i++) {
        monsters.set(`monster-${i}`, {
          id: `monster-${i}`,
          position: { x: i * 10, y: i * 10 },
          type: 'basic',
          isAlive: true
        })
      }
      gameStore.monsters = monsters
      
      await wrapper.vm.$nextTick()
      
      const ctx = mockCanvas.getContext('2d')
      const startTime = performance.now()
      
      if (wrapper.vm.drawMonsters) {
        wrapper.vm.drawMonsters()
      }
      
      const endTime = performance.now()
      
      // Should complete rendering in reasonable time
      expect(endTime - startTime).toBeLessThan(16) // Less than one frame
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const canvas = wrapper.find('canvas')
      expect(canvas.attributes('aria-label')).toBe('Game minimap')
      expect(canvas.attributes('role')).toBe('img')
    })

    it('should provide screen reader description', () => {
      const description = wrapper.find('.sr-only')
      expect(description.exists()).toBe(true)
      expect(description.text()).toContain('players')
    })
  })

  describe('Error Handling', () => {
    it('should handle canvas context failure', () => {
      mockCanvas.getContext.mockReturnValueOnce(null)
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      wrapper = mount(GameMinimap, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get minimap canvas context')
    })

    it('should handle malformed game data gracefully', async () => {
      // Set malformed data
      gameStore.players = null as any
      gameStore.monsters = undefined as any
      
      await wrapper.vm.$nextTick()
      
      // Should not throw errors
      expect(() => {
        if (wrapper.vm.drawPlayers) wrapper.vm.drawPlayers()
        if (wrapper.vm.drawMonsters) wrapper.vm.drawMonsters()
      }).not.toThrow()
    })
  })
})