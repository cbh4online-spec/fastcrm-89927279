/**
 * Generate a unique request correlation ID (UUID v4).
 * Used to trace a user action across UI → edge function → DB.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
