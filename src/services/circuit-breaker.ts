/**
 * Circuit Breaker Service
 * States: CLOSED (normal) → OPEN (blocked) → HALF_OPEN (testing)
 */

import { CRITICAL_MODULES } from "@/config/critical-modules";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerEntry {
  moduleId: string;
  state: CircuitState;
  failureCount: number;
  failures: number[]; // timestamps
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  openedAt: number | null;
}

type StateChangeListener = (moduleId: string, from: CircuitState, to: CircuitState, reason: string) => void;

class CircuitBreakerService {
  private breakers = new Map<string, CircuitBreakerEntry>();
  private listeners: StateChangeListener[] = [];

  private getOrCreate(moduleId: string): CircuitBreakerEntry {
    if (!this.breakers.has(moduleId)) {
      this.breakers.set(moduleId, {
        moduleId,
        state: "CLOSED",
        failureCount: 0,
        failures: [],
        lastFailureAt: null,
        lastSuccessAt: null,
        openedAt: null,
      });
    }
    return this.breakers.get(moduleId)!;
  }

  private getConfig(moduleId: string) {
    return (
      CRITICAL_MODULES[moduleId]?.circuitBreaker ?? {
        failureThreshold: 5,
        resetTimeout: 30000,
        monitorWindow: 60000,
      }
    );
  }

  private transition(entry: CircuitBreakerEntry, to: CircuitState, reason: string) {
    const from = entry.state;
    if (from === to) return;
    entry.state = to;
    if (to === "OPEN") entry.openedAt = Date.now();
    this.listeners.forEach((fn) => fn(entry.moduleId, from, to, reason));
  }

  onStateChange(listener: StateChangeListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(moduleId: string): CircuitBreakerEntry {
    return { ...this.getOrCreate(moduleId) };
  }

  getAllStates(): CircuitBreakerEntry[] {
    return Array.from(this.breakers.values()).map((e) => ({ ...e }));
  }

  async execute<T>(moduleId: string, fn: () => Promise<T>): Promise<T> {
    const entry = this.getOrCreate(moduleId);
    const config = this.getConfig(moduleId);

    // If OPEN, check if timeout elapsed → move to HALF_OPEN
    if (entry.state === "OPEN") {
      const elapsed = Date.now() - (entry.openedAt ?? 0);
      if (elapsed >= config.resetTimeout) {
        this.transition(entry, "HALF_OPEN", "Reset timeout elapsed");
      } else {
        throw new CircuitOpenError(moduleId);
      }
    }

    try {
      const result = await fn();
      this.recordSuccess(entry);
      return result;
    } catch (error) {
      this.recordFailure(entry, config);
      throw error;
    }
  }

  private recordSuccess(entry: CircuitBreakerEntry) {
    entry.lastSuccessAt = Date.now();
    if (entry.state === "HALF_OPEN") {
      entry.failureCount = 0;
      entry.failures = [];
      this.transition(entry, "CLOSED", "Half-open test succeeded");
    }
  }

  private recordFailure(
    entry: CircuitBreakerEntry,
    config: { failureThreshold: number; monitorWindow: number }
  ) {
    const now = Date.now();
    entry.lastFailureAt = now;
    entry.failures.push(now);

    // Remove failures outside the monitor window
    entry.failures = entry.failures.filter(
      (t) => now - t < config.monitorWindow
    );
    entry.failureCount = entry.failures.length;

    if (entry.state === "HALF_OPEN") {
      this.transition(entry, "OPEN", "Half-open test failed");
    } else if (entry.failureCount >= config.failureThreshold) {
      this.transition(entry, "OPEN", `${entry.failureCount} failures in ${config.monitorWindow}ms`);
    }
  }

  reset(moduleId: string) {
    const entry = this.getOrCreate(moduleId);
    entry.failureCount = 0;
    entry.failures = [];
    this.transition(entry, "CLOSED", "Manual reset");
  }
}

export class CircuitOpenError extends Error {
  constructor(public moduleId: string) {
    super(`Circuit breaker OPEN for module: ${moduleId}`);
    this.name = "CircuitOpenError";
  }
}

// Singleton
export const circuitBreaker = new CircuitBreakerService();
