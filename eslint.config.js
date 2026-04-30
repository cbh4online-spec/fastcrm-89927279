import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Regras críticas: RPCs sensíveis e tabelas de pricing/wallet não podem ser
// chamadas/lidas a partir de código que vive em src/ (frontend). Toda a lógica
// de débito, refund e leitura de pricing tem de viver em supabase/functions/*
// (Control Plane) e ser invocada via supabase.functions.invoke().
const FORBIDDEN_RPCS = [
  "consume_funnel_credits",
  "refund_funnel_credits",
  "admin_assign_credits",
];

const FORBIDDEN_TABLES = [
  "credit_pricing_rules", // pricing tem de ser resolvido server-side
];

const rpcSelector = `CallExpression[callee.property.name="rpc"][arguments.0.type="Literal"]:matches(${FORBIDDEN_RPCS
  .map((n) => `[arguments.0.value="${n}"]`)
  .join(",")})`;

const tableSelector = `CallExpression[callee.property.name="from"][arguments.0.type="Literal"]:matches(${FORBIDDEN_TABLES
  .map((n) => `[arguments.0.value="${n}"]`)
  .join(",")})`;

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**", "trigger/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Hardening: bloqueia consumo/leitura de créditos client-side
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // ficheiros gerados / tipos
      "src/integrations/supabase/types.ts",
      // testes podem referenciar os nomes em asserts
      "src/test/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: rpcSelector,
          message:
            "RPC sensível bloqueado no frontend. Mover o débito/refund de créditos para uma edge function (Control Plane) e invocar via supabase.functions.invoke().",
        },
        {
          selector: tableSelector,
          message:
            "Leitura direta de tabela de pricing/wallet bloqueada no frontend. Expor um endpoint dedicado (edge function) que devolva apenas os campos necessários.",
        },
      ],
    },
  },
);
