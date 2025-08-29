import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: './src',
  base: '/',
  
  // Development server configuration
  server: {
    port: 3000,
    host: true, // Allow access from mobile devices on same network
    open: false,
    cors: true,
    hmr: false, // Disable HMR for lighter dev server
  },

  // Build configuration
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
    sourcemap: true,
    
    // Mobile optimization
    rollupOptions: {
      input: resolve(__dirname, 'src/frontend/index.html'),
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia'],
          'utils': ['../utils/index']
        }
      }
    },
    
    // Ensure compatibility with mobile browsers
    target: ['es2020', 'chrome80', 'safari13'],
    
    // Optimize for mobile
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/frontend'),
      '@/stores': resolve(__dirname, 'src/stores'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/components': resolve(__dirname, 'src/frontend/components')
    }
  },

  // CSS configuration for mobile-first
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `
          // Mobile-first breakpoints
          $mobile: 480px;
          $tablet: 768px;
          $desktop: 1024px;
          $large: 1280px;
        `
      }
    }
  },

  // Enable PWA features in development
  define: {
    __VUE_OPTIONS_API__: false, // Disable Options API for better tree shaking
    __VUE_PROD_DEVTOOLS__: false
  },

  // Optimize dependencies for mobile
  optimizeDeps: {
    include: ['vue', 'pinia'],
    exclude: ['@vueuse/core'] // Will be added later if needed
  },

  // Preview configuration (for production preview)
  preview: {
    port: 3000,
    host: true,
    cors: true
  }
})