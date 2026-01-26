/**
 * Trigger.dev Project Configuration
 * 
 * This file configures the Trigger.dev project for FastCRM.
 * It defines retry policies, concurrency limits, and runtime settings.
 */

import type { TriggerConfig } from '@trigger.dev/sdk/v3';

export const config: TriggerConfig = {
  project: 'fastcrm',
  logLevel: 'info',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      randomize: true,
    },
  },
  // Machine configuration for job execution
  machine: 'small-1x',
};

export default config;
