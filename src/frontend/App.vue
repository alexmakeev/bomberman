<template>
  <div class="bomberman-app">
    <AppLayout>
      <router-view v-slot="{ Component, route }">
        <transition :name="getTransitionName(route)" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </AppLayout>
  </div>
</template>

<script setup lang="ts">
console.log('🎨 App.vue script setup executing...')

import { onMounted, onUnmounted } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
console.log('✅ Vue composition imports loaded')

import AppLayout from './components/layout/AppLayout.vue'
console.log('✅ AppLayout component imported')

// Handle viewport changes for mobile optimization
let resizeTimeout: NodeJS.Timeout | null = null

function handleResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  
  resizeTimeout = setTimeout(() => {
    // Update CSS custom properties for responsive design
    const vh = window.innerHeight * 0.01
    const vw = window.innerWidth * 0.01
    
    document.documentElement.style.setProperty('--vh', `${vh}px`)
    document.documentElement.style.setProperty('--vw', `${vw}px`)
    
    // Dispatch resize event for components that need to recalculate
    window.dispatchEvent(new Event('viewport-change'))
  }, 100)
}

function getTransitionName(route: RouteLocationNormalized): string {
  // Different transitions for different route types
  if (route.name === 'Game') return 'game-transition'
  if (route.name === 'Settings') return 'slide-up'
  return 'fade'
}

onMounted(() => {
  console.log('🎨 App.vue onMounted hook executing...')
  
  // Initial viewport calculation
  console.log('📐 Calculating initial viewport dimensions...')
  handleResize()
  
  // Listen for viewport changes
  console.log('👂 Adding viewport event listeners...')
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100)
  })
  
  // Prevent zoom on iOS Safari
  console.log('🔒 Adding touch move prevention for iOS...')
  document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) e.preventDefault()
  }, { passive: false })
  
  console.log('✅ App.vue fully mounted and configured')
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimeout) clearTimeout(resizeTimeout)
})
</script>

<style>
.bomberman-app {
  width: 100vw;
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
  overflow: hidden;
  font-family: 'Courier New', monospace;
  background: #1a1a1a;
  color: #ffffff;
  position: relative;
}

/* Route transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
}

.slide-up-leave-to {
  transform: translateY(-100%);
}

.game-transition-enter-active,
.game-transition-leave-active {
  transition: all 0.5s ease;
}

.game-transition-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.game-transition-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

/* Global mobile-first styles */
* {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Disable text selection on mobile for game elements */
.game-area,
.game-controls,
.minimap {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Mobile-specific adjustments */
@media (max-width: 768px) {
  .bomberman-app {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .bomberman-app {
    font-size: 12px;
  }
}
</style>