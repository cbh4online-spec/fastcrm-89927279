import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Smoke test (baseline) — Hardening de créditos no frontend.
 *
 * Toda a lógica de débito, refund e leitura de pricing tem de viver em
 * supabase/functions/* (Control Plane) e ser invocada via
 * supabase.functions.invoke().
 *
 * Esta sprint é só de auditoria. Documentamos as violações conhecidas como
 * BASELINE — o teste falha se o conjunto de ficheiros ofensores **crescer**
 * (regressão) ou se algum ficheiro listado deixar de violar a regra (passou
 * a estar limpo: tem de ser removido daqui).
 *
 * Plano de migração: docs/security/credits-frontend-hardening.md
 */

const FORBIDDEN_RPCS = [
  "consume_funnel_credits",
  "refund_funnel_credits",
  "admin_assign_credits",
];

const FORBIDDEN_TABLES = ["credit_pricing_rules"];

// Ficheiros gerados / próprios testes — nunca contam como ofensores
const ALLOW_LIST = new Set<string>([
  "src/integrations/supabase/types.ts",
  "src/test/security/credit-rpc-isolation.test.ts",
]);

// Baseline — violações conhecidas e aceites temporariamente.
// Cada item TEM de ter um plano em docs/security/credits-frontend-hardening.md.
// Ao migrar uma feature, REMOVE a entrada correspondente daqui.
const BASELINE: Record<string, string[]> = {
  consume_funnel_credits: [
    "src/hooks/useCreditWallet.ts", // wrapper genérico legacy — @deprecated, remover na Fase 4
    "src/hooks/useAskFastCRM.ts", // ai_copilot_chat — migrar para edge `ask-fastcrm`
    "src/hooks/useLandingPageCopy.ts", // funnel_ai_copy — migrar para edge `generate-landing-copy`
    "src/hooks/useLeadEnrichment.ts", // lead_enrich_* — migrar para edge `enrich-lead`
  ],
  refund_funnel_credits: [],
  admin_assign_credits: [],
  credit_pricing_rules: [
    "src/hooks/useCreditWallet.ts", // substituir por edge `pricing-actions` (Fase 2)
  ],
};

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full.replace(/\\/g, "/"));
    }
  }
  return acc;
}

function findOffenders(pattern: RegExp, files: string[]): string[] {
  const offenders: string[] = [];
  for (const f of files) {
    if (ALLOW_LIST.has(f)) continue;
    const src = readFileSync(f, "utf8");
    if (pattern.test(src)) offenders.push(f);
  }
  return offenders.sort();
}

describe("Credit RPC isolation (frontend hardening — baseline test)", () => {
  const files = walk("src");

  for (const rpc of FORBIDDEN_RPCS) {
    it(`baseline de chamadas a \`${rpc}\` no frontend`, () => {
      const pattern = new RegExp(`\\.rpc\\(\\s*["'\`]${rpc}["'\`]`);
      const found = findOffenders(pattern, files);
      const expected = (BASELINE[rpc] ?? []).slice().sort();

      // Regressão: novos ficheiros violam a regra
      const newOffenders = found.filter((f) => !expected.includes(f));
      expect(
        newOffenders,
        `❌ Regressão de segurança: novos ficheiros chamam \`${rpc}\` no frontend.\n` +
          `Move-os para uma edge function antes de fazer commit:\n` +
          newOffenders.map((o) => `  - ${o}`).join("\n")
      ).toEqual([]);

      // Progresso: ficheiros listados que já estão limpos têm de sair daqui
      const stale = expected.filter((f) => !found.includes(f));
      expect(
        stale,
        `✅ Boa notícia: estes ficheiros já não violam a regra. ` +
          `Remove-os do BASELINE em src/test/security/credit-rpc-isolation.test.ts:\n` +
          stale.map((o) => `  - ${o}`).join("\n")
      ).toEqual([]);
    });
  }

  for (const tbl of FORBIDDEN_TABLES) {
    it(`baseline de leituras a \`${tbl}\` no frontend`, () => {
      const pattern = new RegExp(`\\.from\\(\\s*["'\`]${tbl}["'\`]`);
      const found = findOffenders(pattern, files);
      const expected = (BASELINE[tbl] ?? []).slice().sort();

      const newOffenders = found.filter((f) => !expected.includes(f));
      expect(
        newOffenders,
        `❌ Regressão: novos ficheiros lêem \`${tbl}\` no frontend.\n` +
          `Pricing tem de vir de uma edge function. Ficheiros:\n` +
          newOffenders.map((o) => `  - ${o}`).join("\n")
      ).toEqual([]);

      const stale = expected.filter((f) => !found.includes(f));
      expect(
        stale,
        `✅ Remove do BASELINE:\n` + stale.map((o) => `  - ${o}`).join("\n")
      ).toEqual([]);
    });
  }
});
