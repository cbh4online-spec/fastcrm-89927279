## Diagnóstico

A tabela enviada (Tabela de Comissões Agentes) tem 3 blocos:

1. **Tabela de comissões por nº de vendas/mês**
   - Comissão Base = `135€ × Nº vendas` (verificado em 1, 2, 5, 10, 15, 50).
   - Bónus por escalão (não linear): 0, 120, 275, 380, 530, 630, 730, 860, 960, 1.100, 1.200, 1.300, 1.400, 1.500, 1.650 e (50→) 5.500€.
   - Total = Base + Bónus (1 venda → 135€ … 15 vendas → 3.675€ … 50 vendas → 12.250€).
2. **Notas**: valores sujeitos a impostos; **21€ fixos por cada visita pós‑venda** dentro de 90 dias.
3. **Prémio de recrutamento**: 100€ embaixador no programa "Ganhar" (à entrada) + 100€ embaixador com máquina própria (à 2.ª venda do embaixador).

O LeadChef já tem `useLeadChefMonthlyProgress` que devolve `salesWon` por agente/mês — perfeito para alimentar o simulador.

## Decisões de produto / UX

- Página dedicada **"Ganhos"** em `/dashboard/leadchef/ganhos`, acessível a qualquer agente LeadChef.
- Topo: **3 KPI cards** com o mês corrente do agente autenticado:
  - Vendas no mês (`salesWon`).
  - Comissão estimada (Base + Bónus do escalão atingido).
  - Próximo escalão (Δ vendas + Δ €) — motivador.
- Barra de progresso até ao próximo escalão.
- Bloco **Simulador**: input numérico "Se eu fechar X vendas" → mostra Base, Bónus, Total e ganho extra vs nível atual.
- **Tabela oficial 1–15 + 50** com destaque na linha do escalão atingido. Linhas pares com fundo `muted` (igual ao papel original).
- Bloco **Extras**: card "Visita pós‑venda 21€ × N (≤ 90 dias)" com input para simular nº de visitas; card "Prémio Recrutamento" (100€ + 100€) com checklist explicativo.
- Rodapé com **Notas** legais (valores sujeitos a impostos em vigor).
- Botão "Imprimir / PDF" usando `window.print()` com `@media print` minimal.
- Entrada na sidebar **Comercial → LeadChef → Ganhos** (ícone `Wallet` ou `BadgeEuro`), via `routeManifest.ts` (SSoT — Core memory).

## Estrutura técnica

Novos ficheiros:

```
src/utils/leadchef/commissions.ts          // tabela + helpers puros
src/hooks/leadchef/useAgentCommission.ts   // calcula KPI baseado em salesWon
src/pages/leadchef/LeadChefGanhosPage.tsx  // página
src/components/leadchef/ganhos/
  ├─ GanhosKpis.tsx
  ├─ GanhosSimulator.tsx
  ├─ ComissoesTable.tsx
  └─ ExtrasCard.tsx
```

`commissions.ts` (constantes + funções puras, fácil de testar):

```ts
export const BASE_PER_SALE = 135;
export const POST_SALE_VISIT_FEE = 21;
export const POST_SALE_VISIT_WINDOW_DAYS = 90;
export const RECRUITMENT_BONUS_ENTRY = 100;
export const RECRUITMENT_BONUS_2ND_SALE = 100;

// Bónus acumulado por nº de vendas (escalões 1..15)
export const BONUS_TIERS: Record<number, number> = {
  1: 0, 2: 120, 3: 275, 4: 380, 5: 530, 6: 630, 7: 730,
  8: 860, 9: 960, 10: 1100, 11: 1200, 12: 1300, 13: 1400,
  14: 1500, 15: 1650, 50: 5500,
};

export function calcCommission(sales: number) { /* base + bónus + total + nextTier */ }
```

Alterações:

- `src/routes/LeadChefRoutes.tsx`: adiciona `/dashboard/leadchef/ganhos` (lazy).
- `src/config/routeManifest.ts`: adiciona entrada filha do módulo LeadChef.
- Sidebar LeadChef: nova entrada "Ganhos" no agrupamento existente.

Sem migrações de BD — toda a lógica é cliente, alimentada por `useLeadChefMonthlyProgress` (já existente, escopado a `workspace_id` + `user_id` por RLS).

## Plano de implementação

1. Criar `utils/leadchef/commissions.ts` com constantes + `calcCommission()` (testes unitários simples se útil).
2. Criar `useAgentCommission(month?)` que combina `useLeadChefMonthlyProgress().salesWon` com `calcCommission`.
3. Criar `LeadChefGanhosPage` com layout responsivo (KPIs em grid 1/2/3 cols, tabela full‑width).
4. Subcomponentes `GanhosKpis`, `GanhosSimulator`, `ComissoesTable`, `ExtrasCard` — tokens semânticos (`--primary`, `--muted`, `--accent`), nada hard‑coded.
5. Registar rota em `LeadChefRoutes.tsx` + entrada em `routeManifest.ts` (sem tocar em `nav.*.ts` legacy).
6. Validar empty/loading/error states; verificar mobile (≤ 640 px → tabela com scroll horizontal e KPIs empilhados).

## Critérios de aceitação

- Em `/dashboard/leadchef/ganhos`, com `salesWon = 7`, KPI mostra "7 vendas · 1.675€ · próximo escalão +1 venda → +265€".
- Inserir 12 no simulador devolve 1.620€ + 1.300€ = 2.920€ (bate certo com a tabela).
- Tabela completa visível com a linha 7 destacada.
- Bloco "Visita pós‑venda" com input N → `N × 21€`.
- Entrada "Ganhos" aparece na sidebar do LeadChef.
- Sem erros de consola, mobile OK, tokens semânticos, sem cores hard‑coded.

## Riscos / por validar

- A regra "Bónus por escalão" foi inferida da tabela; o salto 15→50 é linear médio. Se houver fórmula oficial entre 16 e 49, podemos adicionar interpolação ou pedir tabela completa.
- "Vendas" = `salesWon` = leads em stage `won` com `won_at` no mês. Confirmar se conta uma venda Bimby por lead ou por máquina vendida.
- `routeManifest.ts` exige consistência com permissões — usar mesma policy do resto do LeadChef (visível a qualquer membro do workspace LeadChef).
