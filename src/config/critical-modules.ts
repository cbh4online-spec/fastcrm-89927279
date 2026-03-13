export interface ModuleConfig {
  displayName: string;
  dependents: string[];
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
    monitorWindow: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
}

export const CRITICAL_MODULES: Record<string, ModuleConfig> = {
  "crm-contacts": {
    displayName: "Contactos",
    dependents: [
      "crm-opportunities",
      "crm-fastmatch",
      "sales-proposals",
      "sales-invoices",
      "sales-order-notes",
      "mkt-email",
      "fin-credit",
      "mkt-funnels",
    ],
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitorWindow: 60000,
    },
    cache: { ttl: 300000, maxSize: 1000 },
  },
  "crm-leads": {
    displayName: "Leads",
    dependents: ["crm-opportunities", "crm-sequences", "crm-lead-enricher"],
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitorWindow: 60000,
    },
    cache: { ttl: 120000, maxSize: 500 },
  },
  "sales-products": {
    displayName: "Produtos",
    dependents: [
      "sales-order-notes",
      "sales-bundles",
      "b2b-catalog-orders",
      "shop-storefront",
    ],
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitorWindow: 60000,
    },
    cache: { ttl: 600000, maxSize: 2000 },
  },
  "b2b-core": {
    displayName: "Portal B2B Core",
    dependents: [
      "b2b-catalog-orders",
      "b2b-approvals",
      "b2b-financial",
      "b2b-support",
      "b2b-intelligence",
      "b2b-plans-replenishment",
    ],
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 45000,
      monitorWindow: 60000,
    },
    cache: { ttl: 900000, maxSize: 500 },
  },
} as const;

export type ModuleId = keyof typeof CRITICAL_MODULES;

// Build reverse dependency map
export function getDependencyGraph(): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const [moduleId, config] of Object.entries(CRITICAL_MODULES)) {
    graph[moduleId] = config.dependents;
  }
  return graph;
}
