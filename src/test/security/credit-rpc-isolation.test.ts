import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Smoke test: garante que nenhum ficheiro em `src/` (excluindo os tipos gerados
 * e a pasta de testes) chama RPCs sensíveis ou lê tabelas de pricing/wallet
 * diretamente do Supabase.
 *
 * Toda a lógica de consumo, refund e leitura de pricing tem de viver em
 * supabase/functions/* (Control Plane) e ser invocada via
 * supabase.functions.invoke().
 *
 * Esta barreira complementa a regra ESLint custom em eslint.config.js.
 */

const FORBIDDEN_RPCS = [
  "consume_funnel_credits",
  "refund_funnel_credits",
  "admin_assign_credits",
];

const FORBIDDEN_TABLES = ["credit_pricing_rules"];

const ALLOW_LIST = new Set<string>([
  // ficheiros gerados pelo Supabase
  "src/integrations/supabase/types.ts",
  // os próprios testes mencionam os nomes em asserts
  "src/test/security/credit-rpc-isolation.test.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("Credit RPC isolation (frontend hardening)", () => {
  const files = walk("src").filter(
    (f) => !ALLOW_LIST.has(f.replace(/\\/g, "/"))
  );

  for (const rpc of FORBIDDEN_RPCS) {
    it(`não chama \`${rpc}\` a partir do frontend`, () => {
      const offenders: string[] = [];
      const pattern = new RegExp(`\\.rpc\\(\\s*["'\`]${rpc}["'\`]`);
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        if (pattern.test(src)) offenders.push(f);
      }
      expect(
        offenders,
        `Frontend não pode invocar \`${rpc}\` diretamente. ` +
          `Move a chamada para uma edge function. Ficheiros ofensores:\n` +
          offenders.map((o) => `  - ${o}`).join("\n")
      ).toEqual([]);
    });
  }

  for (const tbl of FORBIDDEN_TABLES) {
    it(`não lê a tabela \`${tbl}\` a partir do frontend`, () => {
      const offenders: string[] = [];
      const pattern = new RegExp(`\\.from\\(\\s*["'\`]${tbl}["'\`]`);
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        if (pattern.test(src)) offenders.push(f);
      }
      expect(
        offenders,
        `Frontend não pode ler \`${tbl}\` diretamente. ` +
          `Pricing tem de ser resolvido por uma edge function dedicada. Ficheiros ofensores:\n` +
          offenders.map((o) => `  - ${o}`).join("\n")
      ).toEqual([]);
    });
  }
});
