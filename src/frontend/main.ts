/**
 * Bomberman Multiplayer Frontend Application
 * Vue 3 + TypeScript entry point for real-time multiplayer game
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// Global styles
import './styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

app.mount('#app');