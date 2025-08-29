/**
 * Bomberman Multiplayer Frontend Application
 * Vue 3 + TypeScript entry point for real-time multiplayer game
 * Mobile-first responsive design with touch controls
 */

console.log('🎯 Starting Bomberman main.ts execution...');

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
console.log('✅ Vue core imports loaded');

import App from './App.vue';
console.log('✅ App component loaded');

// Import utilities for mobile optimization
import { isLocalStorageAvailable, migrateStorageData, resumeAudioContext } from '../utils';
import { initializeApp as initializeGameServices } from '../utils/appInitialization';
console.log('✅ Utility imports loaded');

// Global styles
import './styles/main.css';
console.log('✅ Global styles loaded');

// Router configuration
console.log('🛣️ Creating Vue router...');
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: (): Promise<typeof import('*.vue')> => import('./views/HomeView.vue'),
    },
    {
      path: '/game/:roomId?',
      name: 'Game',
      component: (): Promise<typeof import('*.vue')> => import('./views/GameView.vue'),
      props: true,
    },
    {
      path: '/settings',
      name: 'Settings', 
      component: (): Promise<typeof import('*.vue')> => import('./views/SettingsView.vue'),
    },
    {
      path: '/admin',
      name: 'Admin',
      component: (): Promise<typeof import('*.vue')> => import('./views/AdminView.vue'),
    },
  ],
});
console.log('✅ Router created with 4 routes');

// Create Vue app
console.log('🎮 Creating Vue app instance...');
const app = createApp(App);
console.log('✅ Vue app created');

console.log('🏪 Creating Pinia store...');
const pinia = createPinia();
console.log('✅ Pinia store created');

// Install plugins
console.log('🔌 Installing Pinia plugin...');
app.use(pinia);
console.log('✅ Pinia installed');

console.log('🔌 Installing Router plugin...');
app.use(router);
console.log('✅ Router installed');

// Mobile-first initialization
async function initializeApp(): Promise<void> {
  console.log('🚀 Starting Bomberman app initialization...');
  
  try {
    console.log('📦 Checking localStorage availability...');
    // Initialize storage and migrate data if needed
    if (isLocalStorageAvailable()) {
      console.log('✅ localStorage available, migrating data...');
      migrateStorageData();
      console.log('✅ Data migration completed');
    } else {
      console.warn('⚠️ localStorage not available');
    }
    
    console.log('🎵 Setting up audio initialization handlers...');
    // Initialize audio context on first user interaction
    let audioInitialized = false;
    const initAudio = async (): Promise<void> => {
      if (!audioInitialized) {
        console.log('🎵 Initializing audio context...');
        try {
          await resumeAudioContext();
          audioInitialized = true;
          document.removeEventListener('touchstart', initAudio);
          document.removeEventListener('click', initAudio);
          console.log('✅ Audio context initialized successfully');
        } catch (error) {
          console.warn('❌ Failed to initialize audio:', error);
        }
      }
    };
    
    // Listen for first user interaction to initialize audio
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
    console.log('✅ Audio event listeners attached');
    
    console.log('🗻 Mounting Vue app to #app element...');
    // Mount the app
    app.mount('#app');
    console.log('✅ Vue app mounted successfully');
    
    console.log('🔌 Initializing game services (WebSocket, stores, etc.)...');
    // Initialize game services (WebSocket, stores, etc.)
    await initializeGameServices();
    console.log('✅ Game services initialized');
    
    console.log('🎮 Bomberman app initialized for mobile-first gameplay');
    
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize app:', error);
    console.error('❌ Error stack:', error.stack);
  }
}

// Initialize when DOM is ready
console.log('📄 Document ready state:', document.readyState);
if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded event fired, initializing app...');
    initializeApp();
  });
} else {
  console.log('✅ Document already ready, initializing app immediately...');
  initializeApp();
}