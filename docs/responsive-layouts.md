# Mobile-First Responsive Layouts

Comprehensive responsive design system for the cooperative multiplayer Bomberman game, prioritizing mobile experience with adaptive desktop layouts.

## Design Philosophy

### Mobile-First Approach
1. **Primary Target**: Mobile portrait orientation (most restrictive)
2. **Progressive Enhancement**: Add features for larger screens
3. **Touch Optimization**: All interactions designed for touch first
4. **Performance Focus**: Minimal resource usage on mobile devices

### Screen Hierarchy
```
Mobile Portrait (320px - 768px)   <- Primary design target
    ↓ Enhanced with
Mobile Landscape (568px - 1024px)
    ↓ Enhanced with  
Tablet Portrait (768px - 1024px)
    ↓ Enhanced with
Tablet Landscape (1024px - 1366px)
    ↓ Enhanced with
Desktop (1200px+)                 <- Maximum enhancement
```

## CSS Architecture

### 1. Custom Properties System

```css
/* styles/responsive-variables.css */
:root {
  /* === BREAKPOINTS === */
  --bp-mobile-s: 320px;      /* Small mobile */
  --bp-mobile-m: 375px;      /* Medium mobile */
  --bp-mobile-l: 425px;      /* Large mobile */
  --bp-tablet-s: 768px;      /* Small tablet */
  --bp-tablet-l: 1024px;     /* Large tablet */
  --bp-desktop-s: 1200px;    /* Small desktop */
  --bp-desktop-l: 1440px;    /* Large desktop */
  --bp-desktop-xl: 1920px;   /* Extra large desktop */

  /* === SAFE AREAS === */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);

  /* === SPACING === */
  --space-xs: 0.25rem;       /* 4px */
  --space-sm: 0.5rem;        /* 8px */
  --space-md: 1rem;          /* 16px */
  --space-lg: 1.5rem;        /* 24px */
  --space-xl: 2rem;          /* 32px */
  --space-xxl: 3rem;         /* 48px */

  /* === GAME CANVAS === */
  --canvas-size-mobile: min(90vw, calc(100vh - 200px));
  --canvas-size-tablet: min(70vw, calc(100vh - 160px));
  --canvas-size-desktop: min(60vh, 60vw);
  --canvas-border-radius: 8px;

  /* === HUD COMPONENTS === */
  --hud-height-mobile: 60px;
  --hud-height-tablet: 80px;
  --hud-height-desktop: 100px;
  --hud-padding: var(--space-md);
  --hud-background: rgba(0, 0, 0, 0.8);
  --hud-border: 1px solid rgba(255, 255, 255, 0.2);

  /* === MINIMAP === */
  --minimap-size-mobile: 100px;
  --minimap-size-tablet: 120px;
  --minimap-size-desktop: 150px;
  --minimap-border: 2px solid #fff;

  /* === TOUCH CONTROLS === */
  --touch-control-size: 80px;
  --touch-control-margin: var(--space-lg);
  --touch-opacity: 0.6;
  --touch-active-opacity: 0.9;

  /* === TYPOGRAPHY === */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-md: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-xxl: 1.5rem;    /* 24px */

  /* === COLORS === */
  --color-primary: #ff6b35;
  --color-secondary: #004e89;
  --color-success: #2d5016;
  --color-warning: #ffbe0b;
  --color-danger: #fb8500;
  --color-info: #8ecae6;

  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2d2d30;
  --color-text-primary: #ffffff;
  --color-text-secondary: #cccccc;

  /* === ANIMATIONS === */
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.3s ease-out;
  --transition-slow: 0.5s ease-out;
  --animation-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Dark theme adjustments */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #000000;
    --color-bg-secondary: #1a1a1a;
    --hud-background: rgba(0, 0, 0, 0.9);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0s;
    --transition-normal: 0s;
    --transition-slow: 0s;
  }
}

/* High contrast support */
@media (prefers-contrast: high) {
  :root {
    --hud-background: rgba(0, 0, 0, 1);
    --hud-border: 2px solid #ffffff;
    --minimap-border: 3px solid #ffffff;
  }
}
```

### 2. Layout Grid Systems

```css
/* styles/layout-grids.css */

/* === MOBILE PORTRAIT GRID === */
.game-layout-mobile-portrait {
  display: grid;
  grid-template-areas:
    "info minimap"
    "canvas canvas"
    "additional additional";
  grid-template-rows: 
    var(--hud-height-mobile)
    1fr
    auto;
  grid-template-columns: 1fr auto;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height */
  gap: var(--space-sm);
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  background: var(--color-bg-primary);
}

.info-panel { grid-area: info; }
.minimap-container { grid-area: minimap; }
.canvas-container { grid-area: canvas; }
.additional-info { grid-area: additional; }

/* === MOBILE LANDSCAPE GRID === */
@media screen and (orientation: landscape) and (max-width: 1024px) {
  .game-layout-mobile-landscape {
    display: grid;
    grid-template-areas:
      "info canvas minimap"
      "additional canvas spacer";
    grid-template-rows: 1fr auto;
    grid-template-columns: 
      minmax(150px, 200px)
      1fr
      minmax(120px, 150px);
    gap: var(--space-md);
  }
}

/* === TABLET PORTRAIT GRID === */
@media screen and (min-width: 768px) and (orientation: portrait) {
  .game-layout-tablet-portrait {
    display: grid;
    grid-template-areas:
      "info minimap"
      "canvas canvas"
      "additional additional";
    grid-template-rows:
      var(--hud-height-tablet)
      1fr
      auto;
    gap: var(--space-md);
    padding: var(--space-lg);
  }
  
  .info-panel {
    padding: var(--space-md);
  }
  
  .minimap-container {
    width: var(--minimap-size-tablet);
    height: var(--minimap-size-tablet);
  }
}

/* === DESKTOP GRID === */
@media screen and (min-width: 1200px) {
  .game-layout-desktop {
    display: grid;
    grid-template-areas:
      "left-info canvas minimap"
      "additional canvas spacer";
    grid-template-rows: 1fr auto;
    grid-template-columns:
      minmax(250px, 300px)
      1fr
      minmax(180px, 220px);
    gap: var(--space-lg);
    padding: var(--space-xl);
    max-width: 1800px;
    margin: 0 auto;
  }
  
  .info-panel {
    grid-area: left-info;
    padding: var(--space-lg);
    background: var(--color-bg-secondary);
    border-radius: 8px;
    border: var(--hud-border);
  }
}
```

### 3. Component Responsive Styles

```css
/* styles/components-responsive.css */

/* === GAME CANVAS === */
.game-canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: var(--canvas-size-mobile);
}

.game-canvas {
  width: var(--canvas-size-mobile);
  height: var(--canvas-size-mobile);
  border: 2px solid var(--color-primary);
  border-radius: var(--canvas-border-radius);
  background: #000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  
  /* Pixel art rendering */
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

@media screen and (min-width: 768px) {
  .game-canvas {
    width: var(--canvas-size-tablet);
    height: var(--canvas-size-tablet);
  }
}

@media screen and (min-width: 1200px) {
  .game-canvas {
    width: var(--canvas-size-desktop);
    height: var(--canvas-size-desktop);
  }
}

/* === HUD COMPONENTS === */
.hud-component {
  background: var(--hud-background);
  border: var(--hud-border);
  border-radius: 6px;
  padding: var(--space-sm);
  backdrop-filter: blur(10px);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

@media screen and (min-width: 768px) {
  .hud-component {
    padding: var(--space-md);
    font-size: var(--font-size-md);
  }
}

@media screen and (min-width: 1200px) {
  .hud-component {
    padding: var(--space-lg);
    font-size: var(--font-size-lg);
  }
}

/* === INFO PANELS === */
.info-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}

@media screen and (min-width: 768px) {
  .info-item {
    padding: var(--space-sm);
    font-size: var(--font-size-sm);
  }
}

.info-item-label {
  color: var(--color-text-secondary);
}

.info-item-value {
  color: var(--color-text-primary);
  font-weight: bold;
}

/* === MINIMAP === */
.minimap {
  width: var(--minimap-size-mobile);
  height: var(--minimap-size-mobile);
  border: var(--minimap-border);
  border-radius: 4px;
  background: #000;
  position: relative;
  overflow: hidden;
  
  /* Pixel art rendering */
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

@media screen and (min-width: 768px) {
  .minimap {
    width: var(--minimap-size-tablet);
    height: var(--minimap-size-tablet);
  }
}

@media screen and (min-width: 1200px) {
  .minimap {
    width: var(--minimap-size-desktop);
    height: var(--minimap-size-desktop);
  }
}

.minimap-controls {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
}

.minimap-button {
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.minimap-button:hover,
.minimap-button:focus {
  background: rgba(255, 255, 255, 0.2);
}

/* === TOUCH CONTROLS === */
.touch-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.touch-control {
  position: absolute;
  pointer-events: all;
  opacity: var(--touch-opacity);
  transition: opacity var(--transition-fast);
}

.touch-control.active {
  opacity: var(--touch-active-opacity);
}

.virtual-joystick {
  bottom: var(--touch-control-margin);
  left: var(--touch-control-margin);
  width: var(--touch-control-size);
  height: var(--touch-control-size);
}

.virtual-joystick-base {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
}

.virtual-joystick-stick {
  position: absolute;
  width: 40%;
  height: 40%;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: transform var(--transition-fast);
}

.bomb-button {
  bottom: var(--touch-control-margin);
  right: var(--touch-control-margin);
  width: calc(var(--touch-control-size) * 0.8);
  height: calc(var(--touch-control-size) * 0.8);
  background: var(--color-danger);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--font-size-lg);
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.bomb-button:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

/* Hide touch controls on non-touch devices */
@media (hover: hover) and (pointer: fine) {
  .touch-controls {
    display: none;
  }
}

/* === NOTIFICATIONS === */
.notification-container {
  position: fixed;
  top: var(--safe-top);
  right: var(--safe-right);
  width: 320px;
  max-width: calc(100vw - 32px);
  z-index: 1000;
  padding: var(--space-md);
  pointer-events: none;
}

.notification {
  background: var(--hud-background);
  border: var(--hud-border);
  border-left: 4px solid var(--color-info);
  border-radius: 6px;
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: all;
  animation: slideInRight var(--transition-normal) var(--animation-bounce);
}

.notification.success {
  border-left-color: var(--color-success);
}

.notification.warning {
  border-left-color: var(--color-warning);
}

.notification.error {
  border-left-color: var(--color-danger);
}

.notification-title {
  font-size: var(--font-size-md);
  font-weight: bold;
  margin-bottom: var(--space-xs);
  color: var(--color-text-primary);
}

.notification-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* === MODAL LAYOUTS === */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--space-md);
}

.modal {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  padding: var(--space-xl);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
  animation: scaleIn var(--transition-normal) var(--animation-bounce);
}

@media screen and (max-width: 480px) {
  .modal {
    padding: var(--space-lg);
    margin: var(--space-md);
    max-height: 90vh;
  }
}

/* === ANIMATIONS === */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* === ACCESSIBILITY === */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.focus-visible:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* High contrast mode */
@media (forced-colors: active) {
  .game-canvas,
  .minimap {
    forced-color-adjust: none;
  }
  
  .hud-component,
  .notification {
    background: Canvas;
    border: 1px solid CanvasText;
    color: CanvasText;
  }
}

/* Print styles */
@media print {
  .touch-controls,
  .notification-container {
    display: none !important;
  }
  
  .game-layout-mobile-portrait,
  .game-layout-tablet-portrait,
  .game-layout-desktop {
    display: block;
  }
  
  .game-canvas {
    width: 100%;
    height: auto;
    max-width: 400px;
    border: 2px solid black;
  }
}
```

### 4. Utility Classes

```css
/* styles/utilities.css */

/* === FLEXBOX UTILITIES === */
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.justify-evenly { justify-content: space-evenly; }

.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }
.items-baseline { align-items: baseline; }

.flex-grow { flex-grow: 1; }
.flex-shrink-0 { flex-shrink: 0; }

/* === GRID UTILITIES === */
.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

.gap-xs { gap: var(--space-xs); }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }
.gap-lg { gap: var(--space-lg); }
.gap-xl { gap: var(--space-xl); }

/* === SPACING UTILITIES === */
.p-0 { padding: 0; }
.p-xs { padding: var(--space-xs); }
.p-sm { padding: var(--space-sm); }
.p-md { padding: var(--space-md); }
.p-lg { padding: var(--space-lg); }
.p-xl { padding: var(--space-xl); }

.m-0 { margin: 0; }
.m-xs { margin: var(--space-xs); }
.m-sm { margin: var(--space-sm); }
.m-md { margin: var(--space-md); }
.m-lg { margin: var(--space-lg); }
.m-xl { margin: var(--space-xl); }

.mx-auto { margin-left: auto; margin-right: auto; }

/* === POSITIONING === */
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }

.top-0 { top: 0; }
.right-0 { right: 0; }
.bottom-0 { bottom: 0; }
.left-0 { left: 0; }

.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

/* === SIZING === */
.w-full { width: 100%; }
.w-auto { width: auto; }
.w-fit { width: fit-content; }

.h-full { height: 100%; }
.h-auto { height: auto; }
.h-screen { height: 100vh; }
.h-dvh { height: 100dvh; }

.min-h-0 { min-height: 0; }
.min-h-full { min-height: 100%; }
.min-h-screen { min-height: 100vh; }

.max-w-xs { max-width: 20rem; }
.max-w-sm { max-width: 24rem; }
.max-w-md { max-width: 28rem; }
.max-w-lg { max-width: 32rem; }
.max-w-xl { max-width: 36rem; }

/* === VISIBILITY === */
.visible { visibility: visible; }
.invisible { visibility: hidden; }
.hidden { display: none; }

/* === OPACITY === */
.opacity-0 { opacity: 0; }
.opacity-25 { opacity: 0.25; }
.opacity-50 { opacity: 0.5; }
.opacity-75 { opacity: 0.75; }
.opacity-100 { opacity: 1; }

/* === BORDERS === */
.border { border: 1px solid var(--hud-border); }
.border-2 { border: 2px solid var(--hud-border); }
.border-none { border: none; }

.rounded { border-radius: 4px; }
.rounded-md { border-radius: 6px; }
.rounded-lg { border-radius: 8px; }
.rounded-full { border-radius: 50%; }

/* === SHADOWS === */
.shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.shadow { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.shadow-md { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
.shadow-lg { box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1); }
.shadow-xl { box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1); }

/* === TYPOGRAPHY === */
.text-xs { font-size: var(--font-size-xs); }
.text-sm { font-size: var(--font-size-sm); }
.text-md { font-size: var(--font-size-md); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }
.text-xxl { font-size: var(--font-size-xxl); }

.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

.text-primary { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-danger { color: var(--color-danger); }

/* === BACKGROUNDS === */
.bg-primary { background-color: var(--color-bg-primary); }
.bg-secondary { background-color: var(--color-bg-secondary); }
.bg-transparent { background-color: transparent; }

/* === TRANSITIONS === */
.transition { transition: all var(--transition-normal); }
.transition-fast { transition: all var(--transition-fast); }
.transition-slow { transition: all var(--transition-slow); }

/* === TRANSFORMS === */
.scale-95 { transform: scale(0.95); }
.scale-100 { transform: scale(1); }
.scale-105 { transform: scale(1.05); }

.rotate-45 { transform: rotate(45deg); }
.rotate-90 { transform: rotate(90deg); }
.rotate-180 { transform: rotate(180deg); }

/* === INTERACTIVE === */
.cursor-pointer { cursor: pointer; }
.cursor-not-allowed { cursor: not-allowed; }

.select-none { user-select: none; }
.select-text { user-select: text; }
.select-all { user-select: all; }

.pointer-events-none { pointer-events: none; }
.pointer-events-auto { pointer-events: auto; }

/* === RESPONSIVE UTILITIES === */
@media screen and (max-width: 767px) {
  .mobile\:hidden { display: none; }
  .mobile\:block { display: block; }
  .mobile\:flex { display: flex; }
  .mobile\:grid { display: grid; }
}

@media screen and (min-width: 768px) {
  .tablet\:hidden { display: none; }
  .tablet\:block { display: block; }
  .tablet\:flex { display: flex; }
  .tablet\:grid { display: grid; }
}

@media screen and (min-width: 1200px) {
  .desktop\:hidden { display: none; }
  .desktop\:block { display: block; }
  .desktop\:flex { display: flex; }
  .desktop\:grid { display: grid; }
}

/* === LANDSCAPE/PORTRAIT === */
@media screen and (orientation: portrait) {
  .portrait\:block { display: block; }
  .portrait\:hidden { display: none; }
  .landscape\:hidden { display: none; }
}

@media screen and (orientation: landscape) {
  .landscape\:block { display: block; }
  .landscape\:hidden { display: none; }
  .portrait\:hidden { display: none; }
}

/* === HOVER STATES === */
@media (hover: hover) {
  .hover\:opacity-75:hover { opacity: 0.75; }
  .hover\:scale-105:hover { transform: scale(1.05); }
  .hover\:bg-secondary:hover { background-color: var(--color-bg-secondary); }
}

/* === FOCUS STATES === */
.focus\:outline-none:focus { outline: none; }
.focus\:ring:focus { box-shadow: 0 0 0 2px var(--color-primary); }
```

## Component Implementation Examples

### 1. Responsive Game Layout Component

```vue
<!-- components/layout/ResponsiveGameLayout.vue -->
<template>
  <div 
    :class="layoutClasses"
    :style="layoutStyles"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Game Info Panel -->
    <div class="info-panel hud-component">
      <slot name="info-panel">
        <PlayerStats />
        <GameTimer />
        <ObjectiveTracker />
      </slot>
    </div>

    <!-- Main Game Canvas -->
    <div class="canvas-container">
      <GameCanvas 
        :width="canvasSize.width"
        :height="canvasSize.height"
        :game-state="gameState"
        :player-perspective="currentPlayerId"
      />
      
      <!-- Touch Controls Overlay (Mobile only) -->
      <TouchControls 
        v-if="showTouchControls"
        :canvas-element="canvasElement"
        :player-position="playerPosition"
        @move="handlePlayerMove"
        @bomb="handleBombPlace"
      />
    </div>

    <!-- Minimap -->
    <div class="minimap-container">
      <Minimap 
        :size="minimapSize"
        :game-state="gameState"
        :show-fog-of-war="true"
        @navigate="handleMinimapNavigation"
      />
    </div>

    <!-- Additional Information Panel -->
    <div class="additional-info hud-component">
      <slot name="additional-info">
        <TeamStatus />
        <ConnectionInfo />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useUIStateStore } from '@/stores/ui/layout';
import { useGameStateStore } from '@/stores/game/gameState';
import { usePlayerStore } from '@/stores/player/playerState';
import GameCanvas from '@/components/game/GameCanvas.vue';
import TouchControls from '@/components/game/TouchControls.vue';
import Minimap from '@/components/game/Minimap.vue';

const uiStore = useUIStateStore();
const gameStore = useGameStateStore();
const playerStore = usePlayerStore();

const canvasElement = ref<HTMLCanvasElement | null>(null);

// Computed properties for reactive layout
const layoutClasses = computed(() => [
  `game-layout-${uiStore.screenType}`,
  {
    'has-safe-area': uiStore.safeArea.top > 0 || uiStore.safeArea.bottom > 0,
    'reduced-motion': uiStore.gameSettings.reducedMotion,
    'high-contrast': uiStore.gameSettings.highContrast
  }
]);

const layoutStyles = computed(() => ({
  '--current-canvas-size': `${uiStore.canvasSize.width}px`,
  '--current-minimap-size': `${uiStore.minimapSize}px`,
  '--current-hud-opacity': uiStore.hudOpacity,
  '--safe-area-top': `${uiStore.safeArea.top}px`,
  '--safe-area-bottom': `${uiStore.safeArea.bottom}px`,
  '--safe-area-left': `${uiStore.safeArea.left}px`,
  '--safe-area-right': `${uiStore.safeArea.right}px`,
}));

const showTouchControls = computed(() => {
  return uiStore.touchControlsVisible && gameStore.gameStatus === 'playing';
});

// Touch event handling for mobile
const handleTouchStart = (event: TouchEvent) => {
  if (uiStore.isMobile) {
    // Prevent default scrolling behavior
    event.preventDefault();
  }
};

const handleTouchMove = (event: TouchEvent) => {
  if (uiStore.isMobile) {
    event.preventDefault();
  }
};

const handleTouchEnd = (event: TouchEvent) => {
  if (uiStore.isMobile) {
    event.preventDefault();
  }
};

// Game interaction handlers
const handlePlayerMove = (direction: Direction) => {
  gameStore.processPlayerInput('move', direction);
};

const handleBombPlace = () => {
  gameStore.processPlayerInput('bomb', playerStore.position);
};

const handleMinimapNavigation = (worldPosition: Position) => {
  // Optional: Allow navigation by clicking minimap
  console.log('Navigate to:', worldPosition);
};

// Responsive behavior
onMounted(() => {
  uiStore.initializeLayout();
});
</script>

<style scoped>
.game-layout-mobile-portrait {
  @apply grid h-dvh bg-primary;
  grid-template-areas:
    "info minimap"
    "canvas canvas"
    "additional additional";
  grid-template-rows: 
    var(--hud-height-mobile)
    1fr
    auto;
  grid-template-columns: 1fr auto;
  gap: var(--space-sm);
  padding: var(--safe-area-top) var(--safe-area-right) var(--safe-area-bottom) var(--safe-area-left);
}

.game-layout-desktop {
  @apply grid h-screen bg-primary;
  grid-template-areas:
    "left-info canvas minimap"
    "additional canvas spacer";
  grid-template-rows: 1fr auto;
  grid-template-columns:
    minmax(250px, 300px)
    1fr
    minmax(180px, 220px);
  gap: var(--space-lg);
  padding: var(--space-xl);
  max-width: 1800px;
  margin: 0 auto;
}

.canvas-container {
  @apply relative flex items-center justify-center w-full h-full;
  grid-area: canvas;
  min-height: var(--current-canvas-size);
}

.info-panel { grid-area: info; }
.minimap-container { grid-area: minimap; }
.additional-info { grid-area: additional; }

/* Responsive adjustments */
@media screen and (orientation: landscape) and (max-width: 1024px) {
  .game-layout-mobile-landscape {
    grid-template-areas:
      "info canvas minimap"
      "additional canvas spacer";
    grid-template-rows: 1fr auto;
    grid-template-columns: 
      minmax(150px, 200px)
      1fr
      minmax(120px, 150px);
  }
}

/* Accessibility improvements */
.has-safe-area {
  padding-top: calc(var(--safe-area-top) + var(--space-sm));
  padding-bottom: calc(var(--safe-area-bottom) + var(--space-sm));
}

.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

.high-contrast {
  --hud-background: rgba(0, 0, 0, 1);
  --hud-border: 2px solid #ffffff;
}
</style>
```

This comprehensive responsive layout system provides:

1. **Mobile-First Design** with progressive enhancement
2. **CSS Custom Properties** for dynamic theming and responsive values
3. **Grid-Based Layouts** that adapt to different screen sizes and orientations  
4. **Touch Optimization** with appropriate touch targets and feedback
5. **Accessibility Support** with high contrast, reduced motion, and safe areas
6. **Performance Optimization** with efficient CSS and minimal layout recalculation
7. **Cross-Platform Compatibility** supporting all device types and orientations

The system ensures excellent user experience across all devices while maintaining the cooperative gameplay focus and 8-bit aesthetic.