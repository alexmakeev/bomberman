/**
 * UI Store - Pinia Store for UI State Management
 * Handles user interface settings, modals, and responsive behavior
 * 
 * @see docs/front-end/03-state-management.md - Store architecture
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { UISettings } from '../types/game';

export const useUIStore = defineStore('ui', () => {
  // State - UI Configuration
  const showSettings = ref<boolean>(false);
  const showPauseMenu = ref<boolean>(false);
  const showLeaderboard = ref<boolean>(true);
  const showMinimap = ref<boolean>(true);
  const showFPS = ref<boolean>(false);
  const showDebugInfo = ref<boolean>(false);
  const showTouchControls = ref<boolean>(true);
  const showNotifications = ref<boolean>(true);

  // State - Device and Input
  const isMobile = ref<boolean>(false);
  const isTablet = ref<boolean>(false);
  const isDesktop = ref<boolean>(false);
  const touchControlsEnabled = ref<boolean>(false);
  const gamepadConnected = ref<boolean>(false);
  const screenOrientation = ref<string>('portrait');

  // State - Layout and Responsive
  const viewportWidth = ref<number>(window.innerWidth);
  const viewportHeight = ref<number>(window.innerHeight);
  const canvasSize = ref<{ width: number; height: number }>({ width: 800, height: 600 });
  const uiScale = ref<number>(1);

  // State - Theme and Accessibility
  const theme = ref<'light' | 'dark' | 'auto'>('auto');
  const reduceMotion = ref<boolean>(false);
  const highContrast = ref<boolean>(false);
  const fontSize = ref<'small' | 'medium' | 'large'>('medium');

  // Computed Properties
  const effectiveTheme = computed(() => {
    if (theme.value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme.value;
  });

  const deviceType = computed(() => {
    if (isMobile.value) {return 'mobile';}
    if (isTablet.value) {return 'tablet';}
    return 'desktop';
  });

  const isLandscape = computed(() => 
    viewportWidth.value > viewportHeight.value,
  );

  const isPortrait = computed(() => 
    viewportHeight.value > viewportWidth.value,
  );

  const canvasAspectRatio = computed(() => 
    canvasSize.value.width / canvasSize.value.height,
  );

  const optimalCanvasSize = computed(() => {
    // TODO: Calculate optimal canvas size based on viewport
    console.warn('optimalCanvasSize calculation not implemented');
    return { width: 800, height: 600 };
  });

  // Actions - Modal and Menu Management
  function toggleSettings(): void {
    showSettings.value = !showSettings.value;
  }

  function openSettings(): void {
    showSettings.value = true;
  }

  function closeSettings(): void {
    showSettings.value = false;
  }

  function togglePauseMenu(): void {
    showPauseMenu.value = !showPauseMenu.value;
  }

  function openPauseMenu(): void {
    showPauseMenu.value = true;
  }

  function closePauseMenu(): void {
    showPauseMenu.value = false;
  }

  function toggleLeaderboard(): void {
    showLeaderboard.value = !showLeaderboard.value;
  }

  // Actions - Device Detection
  function detectDevice(): void {
    // TODO: Implement device detection
    // Check screen size, touch capability, user agent
    console.warn('detectDevice not implemented');
  }

  function updateViewportSize(): void {
    viewportWidth.value = window.innerWidth;
    viewportHeight.value = window.innerHeight;
    
    // Recalculate canvas size and UI scale
    updateCanvasSize();
    updateUIScale();
  }

  function updateCanvasSize(): void {
    // TODO: Implement canvas size calculation
    // Maintain aspect ratio while fitting in viewport
    console.warn('updateCanvasSize not implemented');
  }

  function updateUIScale(): void {
    // TODO: Implement UI scale calculation
    // Scale UI elements based on device and viewport
    console.warn('updateUIScale not implemented');
  }

  function handleOrientationChange(): void {
    // TODO: Implement orientation change handling
    // Update layout and canvas size for new orientation
    console.warn('handleOrientationChange not implemented');
  }

  // Actions - Input Method Management
  function enableTouchControls(): void {
    touchControlsEnabled.value = true;
    showTouchControls.value = true;
  }

  function disableTouchControls(): void {
    touchControlsEnabled.value = false;
    showTouchControls.value = false;
  }

  function onGamepadConnected(gamepadId: string): void {
    gamepadConnected.value = true;
    console.log('Gamepad connected:', gamepadId);
  }

  function onGamepadDisconnected(gamepadId: string): void {
    gamepadConnected.value = false;
    console.log('Gamepad disconnected:', gamepadId);
  }

  // Actions - Accessibility and Theme
  function setTheme(newTheme: 'light' | 'dark' | 'auto'): void {
    theme.value = newTheme;
    localStorage.setItem('bomberman-theme', newTheme);
  }

  function toggleHighContrast(): void {
    highContrast.value = !highContrast.value;
    localStorage.setItem('bomberman-high-contrast', highContrast.value.toString());
  }

  function setFontSize(size: 'small' | 'medium' | 'large'): void {
    fontSize.value = size;
    localStorage.setItem('bomberman-font-size', size);
  }

  function setReduceMotion(enabled: boolean): void {
    reduceMotion.value = enabled;
    localStorage.setItem('bomberman-reduce-motion', enabled.toString());
  }

  // Actions - Display Toggles
  function toggleMinimap(): void {
    showMinimap.value = !showMinimap.value;
  }

  function toggleFPS(): void {
    showFPS.value = !showFPS.value;
  }

  function toggleDebugInfo(): void {
    showDebugInfo.value = !showDebugInfo.value;
  }

  function toggleNotifications(): void {
    showNotifications.value = !showNotifications.value;
  }

  // Actions - Settings Persistence
  function loadSettings(): void {
    // TODO: Implement settings loading from localStorage
    // Load all UI preferences with fallbacks
    console.warn('loadSettings not implemented');
  }

  function saveSettings(): void {
    // TODO: Implement settings saving to localStorage
    // Save all current UI preferences
    console.warn('saveSettings not implemented');
  }

  function resetSettings(): void {
    // TODO: Implement settings reset to defaults
    // Clear localStorage and reset all values
    console.warn('resetSettings not implemented');
  }

  // Actions - Responsive Utilities
  function isBreakpoint(breakpoint: 'sm' | 'md' | 'lg' | 'xl'): boolean {
    const breakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    };
    return viewportWidth.value >= breakpoints[breakpoint];
  }

  function getResponsiveValue<T>(values: { sm?: T; md?: T; lg?: T; xl?: T; default: T }): T {
    if (isBreakpoint('xl') && values.xl) {return values.xl;}
    if (isBreakpoint('lg') && values.lg) {return values.lg;}
    if (isBreakpoint('md') && values.md) {return values.md;}
    if (isBreakpoint('sm') && values.sm) {return values.sm;}
    return values.default;
  }

  // Actions - Performance Optimization
  function optimizeForDevice(): void {
    // TODO: Implement device-specific optimizations
    // Adjust settings based on device capabilities
    console.warn('optimizeForDevice not implemented');
  }

  function handleLowMemory(): void {
    // TODO: Implement low memory handling
    // Reduce quality settings and clear caches
    console.warn('handleLowMemory not implemented');
  }

  // Return store interface
  return {
    // State - UI Configuration
    showSettings: readonly(showSettings),
    showPauseMenu: readonly(showPauseMenu),
    showLeaderboard: readonly(showLeaderboard),
    showMinimap: readonly(showMinimap),
    showFPS: readonly(showFPS),
    showDebugInfo: readonly(showDebugInfo),
    showTouchControls: readonly(showTouchControls),
    showNotifications: readonly(showNotifications),

    // State - Device and Input
    isMobile: readonly(isMobile),
    isTablet: readonly(isTablet),
    isDesktop: readonly(isDesktop),
    touchControlsEnabled: readonly(touchControlsEnabled),
    gamepadConnected: readonly(gamepadConnected),
    screenOrientation: readonly(screenOrientation),

    // State - Layout and Responsive
    viewportWidth: readonly(viewportWidth),
    viewportHeight: readonly(viewportHeight),
    canvasSize: readonly(canvasSize),
    uiScale: readonly(uiScale),

    // State - Theme and Accessibility
    theme: readonly(theme),
    reduceMotion: readonly(reduceMotion),
    highContrast: readonly(highContrast),
    fontSize: readonly(fontSize),

    // Computed
    effectiveTheme,
    deviceType,
    isLandscape,
    isPortrait,
    canvasAspectRatio,
    optimalCanvasSize,

    // Actions
    toggleSettings,
    openSettings,
    closeSettings,
    togglePauseMenu,
    openPauseMenu,
    closePauseMenu,
    toggleLeaderboard,
    detectDevice,
    updateViewportSize,
    updateCanvasSize,
    updateUIScale,
    handleOrientationChange,
    enableTouchControls,
    disableTouchControls,
    onGamepadConnected,
    onGamepadDisconnected,
    setTheme,
    toggleHighContrast,
    setFontSize,
    setReduceMotion,
    toggleMinimap,
    toggleFPS,
    toggleDebugInfo,
    toggleNotifications,
    loadSettings,
    saveSettings,
    resetSettings,
    isBreakpoint,
    getResponsiveValue,
    optimizeForDevice,
    handleLowMemory,
  };
});