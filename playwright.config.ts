import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Bomberman Frontend Testing
 * Uses Docker containers for browsers to avoid system pollution
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/front-end',
  
  // Timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000
  },

  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter settings
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],

  // Global test setup
  globalSetup: './tests/front-end/global-setup.ts',

  // Use devices and browser configurations
  projects: [
    // Basic UI Tests
    {
      name: 'Desktop Chrome - Basic UI',
      testMatch: '**/basic-ui.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
    },
    {
      name: 'Desktop Firefox - Basic UI',
      testMatch: '**/basic-ui.test.ts',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH || undefined,
        },
        permissions: [], // Firefox doesn't support clipboard permissions
      },
    },
    {
      name: 'Mobile Chrome - Basic UI',
      testMatch: '**/basic-ui.test.ts',
      use: { 
        ...devices['Pixel 5'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
    },
    {
      name: 'Mobile Safari - Basic UI',
      testMatch: '**/basic-ui.test.ts',
      use: { 
        ...devices['iPhone 12'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH || undefined,
        },
        permissions: [], // Safari doesn't support clipboard permissions
      },
    },
    
    // Game UI Tests
    {
      name: 'Desktop Chrome - Game UI',
      testMatch: '**/game-ui.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
    },
    
    // Integration Tests - Use Case Scenarios
    {
      name: 'Desktop Chrome - Integration Tests',
      testMatch: '**/integration/**/*.integration.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
      timeout: 60000, // Longer timeout for integration tests
    },
    
    // Cross-browser Integration Tests (Critical User Flows)
    {
      name: 'Desktop Firefox - Critical Flows',
      testMatch: '**/integration/uc-g001-join-game-room.integration.test.ts',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE_PATH || undefined,
        },
        permissions: [], // Firefox doesn't support clipboard permissions
      },
      timeout: 45000,
    },
    
    // Mobile Integration Tests
    {
      name: 'Mobile Chrome - Mobile Flows',
      testMatch: '**/integration/uc-g00{1,2,3}-*.integration.test.ts',
      use: { 
        ...devices['Pixel 5'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
      timeout: 45000,
    },
    
    // Admin Dashboard Tests
    {
      name: 'Desktop Chrome - Admin Tests',
      testMatch: '**/integration/uc-a*.integration.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
      timeout: 60000,
    },
    
    // System Integration Tests
    {
      name: 'Desktop Chrome - System Integration',
      testMatch: '**/integration/websocket-*.integration.test.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
        }
      },
      timeout: 90000, // Longest timeout for complex system tests
    },
  ],

  // Web server configuration for testing
  webServer: {
    command: 'npm run dev:client',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output directory
  outputDir: 'test-results/',
  
  // Use baseURL for easier navigation
  use: {
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure for integration tests
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    // Global timeout for actions (longer for integration tests)
    actionTimeout: 15000,
    
    // Navigation timeout (longer for complex flows)  
    navigationTimeout: 45000,
    
    // Additional settings for integration tests
    ignoreHTTPSErrors: true,
    
    // Viewport settings
    viewport: { width: 1280, height: 720 },
    
    // Context options for multi-user scenarios
    permissions: ['clipboard-read', 'clipboard-write'],
    
    // Extra HTTP headers for testing
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright',
    },
  },
});