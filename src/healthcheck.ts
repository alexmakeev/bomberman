/**
 * Health check script for Docker container
 */

import { healthCheck } from './server';

async function main(): Promise<void> {
  try {
    const isHealthy = await healthCheck();
    
    if (isHealthy) {
      console.log('✅ Health check passed');
      process.exit(0);
    } else {
      console.log('❌ Health check failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    process.exit(1);
  }
}

main();