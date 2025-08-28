/**
 * Global Test Setup
 * Configures mocks and environment for both frontend and backend tests
 */

import { vi } from 'vitest'

// Global mocks for browser APIs that are commonly needed
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock WebSocket for Node.js environment
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})) as any

// Mock navigator for haptic feedback and other browser APIs
Object.defineProperty(global, 'navigator', {
  value: {
    vibrate: vi.fn(),
    userAgent: 'test-agent',
    language: 'en',
    languages: ['en'],
    onLine: true,
    platform: 'test',
    cookieEnabled: true,
    maxTouchPoints: 0, // Default to no touch support - desktop environment
    pointerEnabled: false,
    msPointerEnabled: false,
    msMaxTouchPoints: 0,
  },
  configurable: true,
  writable: true,
})

// Mock window APIs that might be needed
Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    matchMedia: vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    getComputedStyle: vi.fn(() => ({
      getPropertyValue: vi.fn(),
    })),
    requestAnimationFrame: vi.fn((callback) => setTimeout(callback, 16)),
    cancelAnimationFrame: vi.fn(),
    performance: {
      now: vi.fn(() => Date.now()),
    },
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    location: {
      href: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    screen: {
      width: 1024, // Desktop width > 768 for keyboard detection
      height: 768,
      availWidth: 1024,
      availHeight: 768,
      colorDepth: 24,
      pixelDepth: 24,
    },
    // Touch detection properties
    ontouchstart: undefined, // No touch support by default
  },
  configurable: true,
  writable: true,
})

// Mock document for DOM operations
Object.defineProperty(global, 'document', {
  value: {
    ...global.document,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    getElementById: vi.fn(),
    createComment: vi.fn(() => ({
      nodeType: 8,
      textContent: '',
      parentNode: null,
      nextSibling: null,
      previousSibling: null,
    })),
    createTextNode: vi.fn(() => ({
      nodeType: 3,
      textContent: '',
      parentNode: null,
      nextSibling: null,
      previousSibling: null,
    })),
    createElement: vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      remove: vi.fn(),
      style: {},
      getBoundingClientRect: vi.fn(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
      })),
    })),
    documentElement: {
      style: {
        setProperty: vi.fn(),
        getPropertyValue: vi.fn(),
      },
    },
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      style: {},
    },
    readyState: 'complete',
  },
  configurable: true,
  writable: true,
})

// Mock canvas context for rendering tests
const mockCanvasContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  canvas: {
    width: 800,
    height: 600,
    getBoundingClientRect: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      right: 800,
      bottom: 600,
      left: 0,
    })),
  },
  imageSmoothingEnabled: true,
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: '12px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
}

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return mockCanvasContext
  }
  return null
}) as any

// Mock Audio API
global.Audio = vi.fn(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 10,
  volume: 1,
  muted: false,
  paused: true,
  ended: false,
  readyState: 4,
})) as any

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  destination: {},
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
})) as any

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
})

// Mock URL and URLSearchParams
global.URL = vi.fn() as any
global.URLSearchParams = vi.fn() as any

// Mock Vue 3 Composition API functions that are used in tests
global.readonly = vi.fn((obj) => obj)
global.reactive = vi.fn((obj) => obj)
global.ref = vi.fn((value) => ({ value }))
global.computed = vi.fn((getter) => ({ value: getter() }))
global.watch = vi.fn()
global.watchEffect = vi.fn()
global.onMounted = vi.fn()
global.onUnmounted = vi.fn()
global.nextTick = vi.fn(() => Promise.resolve())

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as any

// Export test utilities that components might need
export const mockCanvas = mockCanvasContext
export const mockLocalStorage = localStorageMock

// Common test utilities
export function mockTouch(x: number, y: number, identifier: number = 0) {
  return {
    identifier,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    screenX: x,
    screenY: y,
    target: document.createElement('canvas'),
  }
}

export function mockTouchEvent(type: string, touches: any[] = [], changedTouches: any[] = []) {
  // Ensure changedTouches has the same structure as touches if empty
  const finalChangedTouches = changedTouches.length > 0 ? changedTouches : touches
  
  return {
    type,
    touches: {
      length: touches.length,
      [Symbol.iterator]: function* () {
        yield* touches
      },
      ...touches
    },
    changedTouches: {
      length: finalChangedTouches.length,
      [Symbol.iterator]: function* () {
        yield* finalChangedTouches
      },
      ...finalChangedTouches
    },
    targetTouches: touches,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: document.createElement('canvas'),
  }
}

export function mockMouseEvent(type: string, x: number, y: number) {
  return {
    type,
    clientX: x,
    clientY: y,
    pageX: x,
    pageY: y,
    screenX: x,
    screenY: y,
    button: 0,
    buttons: 1,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: document.createElement('canvas'),
  }
}

export function mockKeyboardEvent(type: string, code: string, key: string) {
  return {
    type,
    code,
    key,
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }
}