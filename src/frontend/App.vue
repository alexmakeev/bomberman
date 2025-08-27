<template>
  <div id="app" class="bomberman-app">
    <AppLayout>
      <router-view />
    </AppLayout>
  </div>
</template>

<script setup lang="ts">
import AppLayout from './components/layout/AppLayout.vue';
</script>

<style scoped>
.bomberman-app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Courier New', monospace;
  background: #1a1a1a;
  color: #ffffff;
}
</style>