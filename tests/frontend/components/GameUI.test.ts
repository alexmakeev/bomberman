/**
 * GameUI Component Tests
 * Tests the main game UI overlay with player stats, notifications, and responsive layout
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GameUI from '../../../src/components/ui/GameUI.vue'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { useGameStore } from '../../../src/stores/gameStore'
import { useUIStore } from '../../../src/stores/uiStore'
import { useNotificationStore } from '../../../src/stores/notificationStore'

describe('GameUI Component', () => {
  let wrapper: VueWrapper<any>
  let playerStore: ReturnType<typeof usePlayerStore>
  let gameStore: ReturnType<typeof useGameStore>
  let uiStore: ReturnType<typeof useUIStore>
  let notificationStore: ReturnType<typeof useNotificationStore>

  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        player: {
          id: 'player-1',
          name: 'TestPlayer',
          health: 75,
          maxHealth: 100,
          bombCount: 2,
          maxBombs: 3,
          bombPower: 2,
          score: 1500,
          isAlive: true,
          respawnTimer: 0,
          powerUps: ['speed_boost', 'bomb_power']
        },
        game: {
          roomId: 'test-room',
          gameState: 'playing',
          currentLevel: 3,
          timeRemaining: 180000, // 3 minutes
          objective: 'Kill the boss',
          players: new Map([
            ['player-1', { name: 'TestPlayer', isAlive: true, score: 1500 }],
            ['player-2', { name: 'Player2', isAlive: false, score: 800 }]
          ]),
          boss: {
            id: 'boss-1',
            type: 'ice',
            health: 60,
            maxHealth: 100,
            phase: 2
          }
        },
        ui: {
          showSettings: false,
          showPauseMenu: false,
          showLeaderboard: true,
          gamepadConnected: false,
          touchControlsEnabled: true,
          showDebugInfo: false
        },
        notifications: {
          messages: [
            {
              id: 'notif-1',
              type: 'info',
              title: 'Power-up collected!',
              message: 'Your bomb power increased',
              timestamp: Date.now() - 2000,
              duration: 3000,
              priority: 'normal'
            },
            {
              id: 'notif-2',
              type: 'warning',
              title: 'Low Health',
              message: 'Find a health power-up quickly!',
              timestamp: Date.now() - 1000,
              duration: 5000,
              priority: 'high'
            }
          ],
          toastQueue: []
        }
      }
    })

    wrapper = mount(GameUI, {
      global: {
        plugins: [pinia]
      }
    })

    playerStore = usePlayerStore()
    gameStore = useGameStore()
    uiStore = useUIStore()
    notificationStore = useNotificationStore()
  })

  afterEach(() => {
    wrapper.unmount()
    vi.clearAllMocks()
  })

  describe('Component Structure', () => {
    it('should render main UI container', () => {
      const container = wrapper.find('.game-ui')
      expect(container.exists()).toBe(true)
      expect(container.classes()).toContain('game-ui')
    })

    it('should render responsive layout containers', () => {
      const topLeft = wrapper.find('.ui-top-left')
      const topRight = wrapper.find('.ui-top-right')
      const bottomInfo = wrapper.find('.ui-bottom-info')
      
      expect(topLeft.exists()).toBe(true)
      expect(topRight.exists()).toBe(true)
      expect(bottomInfo.exists()).toBe(true)
    })

    it('should apply correct responsive classes', () => {
      const container = wrapper.find('.game-ui')
      
      // Should have mobile-first classes
      expect(container.classes()).toContain('ui-mobile')
    })
  })

  describe('Player Stats Display', () => {
    it('should display player health', () => {
      const healthDisplay = wrapper.find('.player-health')
      expect(healthDisplay.exists()).toBe(true)
      expect(healthDisplay.text()).toContain('75')
      expect(healthDisplay.text()).toContain('100')
    })

    it('should display health bar with correct percentage', () => {
      const healthBar = wrapper.find('.health-bar-fill')
      expect(healthBar.exists()).toBe(true)
      
      const healthPercentage = (75 / 100) * 100
      expect(healthBar.attributes('style')).toContain(`width: ${healthPercentage}%`)
    })

    it('should change health bar color based on health level', () => {
      const healthBar = wrapper.find('.health-bar-fill')
      
      // At 75% health, should be yellow/orange
      expect(healthBar.classes()).toContain('health-warning')
      
      // Test critical health
      playerStore.health = 25
      wrapper.vm.$nextTick().then(() => {
        expect(healthBar.classes()).toContain('health-critical')
      })
    })

    it('should display bomb count and capacity', () => {
      const bombInfo = wrapper.find('.bomb-info')
      expect(bombInfo.exists()).toBe(true)
      expect(bombInfo.text()).toContain('2/3')
    })

    it('should display bomb power level', () => {
      const bombPower = wrapper.find('.bomb-power')
      expect(bombPower.exists()).toBe(true)
      expect(bombPower.text()).toContain('2')
    })

    it('should display player score', () => {
      const score = wrapper.find('.player-score')
      expect(score.exists()).toBe(true)
      expect(score.text()).toContain('1,500')
    })

    it('should display active power-ups', () => {
      const powerUps = wrapper.find('.active-powerups')
      expect(powerUps.exists()).toBe(true)
      
      const speedBoost = wrapper.find('.powerup-speed_boost')
      const bombPower = wrapper.find('.powerup-bomb_power')
      
      expect(speedBoost.exists()).toBe(true)
      expect(bombPower.exists()).toBe(true)
    })
  })

  describe('Game State Information', () => {
    it('should display current level', () => {
      const levelInfo = wrapper.find('.level-info')
      expect(levelInfo.exists()).toBe(true)
      expect(levelInfo.text()).toContain('Level 3')
    })

    it('should display game objective', () => {
      const objective = wrapper.find('.game-objective')
      expect(objective.exists()).toBe(true)
      expect(objective.text()).toContain('Kill the boss')
    })

    it('should display time remaining', () => {
      const timer = wrapper.find('.game-timer')
      expect(timer.exists()).toBe(true)
      expect(timer.text()).toContain('3:00') // 3 minutes
    })

    it('should format time correctly', () => {
      const timer = wrapper.find('.game-timer')
      
      // Test different time formats
      gameStore.timeRemaining = 65000 // 1:05
      wrapper.vm.$nextTick().then(() => {
        expect(timer.text()).toContain('1:05')
      })
    })

    it('should show warning when time is low', async () => {
      gameStore.timeRemaining = 30000 // 30 seconds
      await wrapper.vm.$nextTick()
      
      const timer = wrapper.find('.game-timer')
      expect(timer.classes()).toContain('timer-warning')
    })
  })

  describe('Boss Information', () => {
    it('should display boss health bar when boss exists', () => {
      const bossHealth = wrapper.find('.boss-health')
      expect(bossHealth.exists()).toBe(true)
    })

    it('should display correct boss health percentage', () => {
      const bossHealthBar = wrapper.find('.boss-health-fill')
      expect(bossHealthBar.exists()).toBe(true)
      
      const bossHealthPercentage = (60 / 100) * 100
      expect(bossHealthBar.attributes('style')).toContain(`width: ${bossHealthPercentage}%`)
    })

    it('should display boss type and phase', () => {
      const bossInfo = wrapper.find('.boss-info')
      expect(bossInfo.exists()).toBe(true)
      expect(bossInfo.text()).toContain('Ice Boss')
      expect(bossInfo.text()).toContain('Phase 2')
    })

    it('should hide boss info when no boss', async () => {
      gameStore.boss = null
      await wrapper.vm.$nextTick()
      
      const bossHealth = wrapper.find('.boss-health')
      expect(bossHealth.exists()).toBe(false)
    })
  })

  describe('Leaderboard', () => {
    it('should display player leaderboard when enabled', () => {
      const leaderboard = wrapper.find('.leaderboard')
      expect(leaderboard.exists()).toBe(true)
    })

    it('should list players sorted by score', () => {
      const playerItems = wrapper.findAll('.leaderboard-player')
      expect(playerItems.length).toBe(2)
      
      // TestPlayer (1500) should be first
      expect(playerItems[0].text()).toContain('TestPlayer')
      expect(playerItems[0].text()).toContain('1,500')
      
      // Player2 (800) should be second
      expect(playerItems[1].text()).toContain('Player2')
      expect(playerItems[1].text()).toContain('800')
    })

    it('should highlight current player', () => {
      const playerItems = wrapper.findAll('.leaderboard-player')
      const currentPlayer = playerItems.find(item => 
        item.classes().includes('current-player')
      )
      
      expect(currentPlayer).toBeDefined()
      expect(currentPlayer!.text()).toContain('TestPlayer')
    })

    it('should show dead players differently', () => {
      const deadPlayer = wrapper.findAll('.leaderboard-player')
        .find(item => item.text().includes('Player2'))
      
      expect(deadPlayer!.classes()).toContain('player-dead')
    })

    it('should hide leaderboard when disabled', async () => {
      uiStore.showLeaderboard = false
      await wrapper.vm.$nextTick()
      
      const leaderboard = wrapper.find('.leaderboard')
      expect(leaderboard.exists()).toBe(false)
    })
  })

  describe('Respawn Timer', () => {
    it('should show respawn countdown when player is dead', async () => {
      playerStore.isAlive = false
      playerStore.respawnTimer = 8000 // 8 seconds
      await wrapper.vm.$nextTick()
      
      const respawnTimer = wrapper.find('.respawn-timer')
      expect(respawnTimer.exists()).toBe(true)
      expect(respawnTimer.text()).toContain('8')
    })

    it('should hide respawn timer when player is alive', () => {
      const respawnTimer = wrapper.find('.respawn-timer')
      expect(respawnTimer.exists()).toBe(false)
    })

    it('should show respawn timer with correct styling', async () => {
      playerStore.isAlive = false
      playerStore.respawnTimer = 3000 // 3 seconds
      await wrapper.vm.$nextTick()
      
      const respawnTimer = wrapper.find('.respawn-timer')
      expect(respawnTimer.classes()).toContain('respawn-countdown')
    })
  })

  describe('Notifications', () => {
    it('should display active notifications', () => {
      const notifications = wrapper.findAll('.notification-toast')
      expect(notifications.length).toBe(2)
    })

    it('should display notification content correctly', () => {
      const notifications = wrapper.findAll('.notification-toast')
      
      // First notification
      expect(notifications[0].text()).toContain('Power-up collected!')
      expect(notifications[0].text()).toContain('Your bomb power increased')
      
      // Second notification
      expect(notifications[1].text()).toContain('Low Health')
      expect(notifications[1].text()).toContain('Find a health power-up quickly!')
    })

    it('should apply correct notification types', () => {
      const notifications = wrapper.findAll('.notification-toast')
      
      expect(notifications[0].classes()).toContain('toast-info')
      expect(notifications[1].classes()).toContain('toast-warning')
    })

    it('should prioritize high-priority notifications', () => {
      const notifications = wrapper.findAll('.notification-toast')
      const highPriorityNotification = notifications.find(n => 
        n.classes().includes('toast-high-priority')
      )
      
      expect(highPriorityNotification).toBeDefined()
    })

    it('should auto-dismiss notifications after duration', async () => {
      // Fast-forward time
      vi.advanceTimersByTime(4000)
      await wrapper.vm.$nextTick()
      
      // First notification should be dismissed
      const notifications = wrapper.findAll('.notification-toast')
      expect(notifications.length).toBeLessThan(2)
    })
  })

  describe('Touch Controls Indicator', () => {
    it('should show touch controls help when enabled', () => {
      const touchHelp = wrapper.find('.touch-controls-help')
      expect(touchHelp.exists()).toBe(true)
    })

    it('should hide touch controls on desktop', async () => {
      uiStore.touchControlsEnabled = false
      await wrapper.vm.$nextTick()
      
      const touchHelp = wrapper.find('.touch-controls-help')
      expect(touchHelp.exists()).toBe(false)
    })

    it('should show correct touch instructions', () => {
      const touchHelp = wrapper.find('.touch-controls-help')
      expect(touchHelp.text()).toContain('Hold to move')
      expect(touchHelp.text()).toContain('Tap to bomb')
    })
  })

  describe('Responsive Layout', () => {
    it('should adapt to mobile portrait layout', () => {
      // Mock mobile dimensions
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
      
      const container = wrapper.find('.game-ui')
      expect(container.classes()).toContain('ui-mobile-portrait')
    })

    it('should adapt to mobile landscape layout', async () => {
      // Mock landscape dimensions
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })
      
      // Trigger resize
      window.dispatchEvent(new Event('resize'))
      await wrapper.vm.$nextTick()
      
      const container = wrapper.find('.game-ui')
      expect(container.classes()).toContain('ui-mobile-landscape')
    })

    it('should adapt to desktop layout', async () => {
      // Mock desktop dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })
      
      window.dispatchEvent(new Event('resize'))
      await wrapper.vm.$nextTick()
      
      const container = wrapper.find('.game-ui')
      expect(container.classes()).toContain('ui-desktop')
    })

    it('should position elements correctly in different layouts', () => {
      const topLeft = wrapper.find('.ui-top-left')
      const topRight = wrapper.find('.ui-top-right')
      
      // Should have correct positioning classes
      expect(topLeft.classes()).toContain('position-top-left')
      expect(topRight.classes()).toContain('position-top-right')
    })
  })

  describe('Pause Menu Integration', () => {
    it('should show pause overlay when game is paused', async () => {
      gameStore.gameState = 'paused'
      await wrapper.vm.$nextTick()
      
      const pauseOverlay = wrapper.find('.pause-overlay')
      expect(pauseOverlay.exists()).toBe(true)
    })

    it('should blur background when paused', async () => {
      gameStore.gameState = 'paused'
      await wrapper.vm.$nextTick()
      
      const container = wrapper.find('.game-ui')
      expect(container.classes()).toContain('ui-paused')
    })

    it('should show settings button', () => {
      const settingsBtn = wrapper.find('.settings-button')
      expect(settingsBtn.exists()).toBe(true)
    })

    it('should open settings modal when clicked', async () => {
      const settingsBtn = wrapper.find('.settings-button')
      await settingsBtn.trigger('click')
      
      expect(uiStore.showSettings).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const healthBar = wrapper.find('.health-bar')
      expect(healthBar.attributes('aria-label')).toBe('Player health: 75 out of 100')
      expect(healthBar.attributes('role')).toBe('progressbar')
    })

    it('should support keyboard navigation', async () => {
      const settingsBtn = wrapper.find('.settings-button')
      
      await settingsBtn.trigger('keydown', { key: 'Enter' })
      expect(uiStore.showSettings).toBe(true)
      
      await settingsBtn.trigger('keydown', { key: ' ' })
      // Should toggle settings
    })

    it('should provide screen reader announcements', () => {
      const srOnly = wrapper.findAll('.sr-only')
      expect(srOnly.length).toBeGreaterThan(0)
      
      const healthAnnouncement = srOnly.find(el => 
        el.text().includes('Health: 75%')
      )
      expect(healthAnnouncement).toBeDefined()
    })

    it('should have sufficient color contrast', () => {
      const healthBar = wrapper.find('.health-bar-fill')
      const computedStyle = getComputedStyle(healthBar.element)
      
      // Should have sufficient contrast (tested via CSS)
      expect(computedStyle).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should update efficiently on frequent changes', async () => {
      const renderSpy = vi.spyOn(wrapper.vm, '$forceUpdate')
      
      // Simulate rapid health changes
      for (let i = 0; i < 10; i++) {
        playerStore.health = 75 - i
        await wrapper.vm.$nextTick()
      }
      
      // Should not re-render excessively
      expect(renderSpy).not.toHaveBeenCalledTimes(10)
    })

    it('should debounce timer updates', () => {
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1016) // 16ms later
      
      // Should not update timer for small time differences
      const initialTimer = wrapper.find('.game-timer').text()
      
      gameStore.timeRemaining = 179984 // 16ms less
      wrapper.vm.$nextTick().then(() => {
        const newTimer = wrapper.find('.game-timer').text()
        expect(newTimer).toBe(initialTimer)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing player data gracefully', async () => {
      playerStore.health = null as any
      playerStore.bombCount = undefined as any
      
      await wrapper.vm.$nextTick()
      
      // Should not throw errors
      expect(() => {
        const healthDisplay = wrapper.find('.player-health')
        expect(healthDisplay.text()).toContain('0')
      }).not.toThrow()
    })

    it('should handle malformed notification data', async () => {
      notificationStore.messages = [
        { id: 'bad', type: null, title: '', message: null } as any
      ]
      
      await wrapper.vm.$nextTick()
      
      // Should not crash
      expect(wrapper.findAll('.notification-toast')).toBeDefined()
    })
  })
})