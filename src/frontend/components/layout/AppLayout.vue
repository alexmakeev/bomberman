<template>
  <div class="app-layout">
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
console.log('🏗️ AppLayout.vue script setup executing...')
// Main application layout component
console.log('✅ AppLayout ready to render')
</script>

<style scoped>
.app-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>