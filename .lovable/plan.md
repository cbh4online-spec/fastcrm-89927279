
# Reestruturação da navegação global no estilo InvoiceXpress

## Diagnóstico

O InvoiceXpress usa uma sidebar muito enxuta (~8 itens: Visão Global, Faturas, Contactos, Itens, Agendamentos, Orçamentos, Guias, Relatórios), com secções "VENDAS" e "CONTA", tipografia forte, fundo branco e uma única cor de marca.

O FastCRM tem hoje 40+ módulos distribuídos por várias rotas (`SalesCRMRoutes`, `CRMRoutes`, `HRRoutes`, `ProcurementRoutes`, `HelpdeskRoutes`, `TicketsRoutes`, `ReportsRoutes`, `PerformanceRoutes`, `StoreRoutes`, `AIRoutes`, `MetaModuleRoutes`, etc.), controlados por `routeManifest.ts` (SSoT) e `moduleNavRegistry.ts`.

**Para adoptar o padrão IX sem perder nada e sem plágio**, a sidebar tem de ficar visualmente simples mas suportar toda a profundidade actual através de grupos colapsáveis + sub-navegação contextual.

## Decisões de produto/UX

1. **Sidebar principal com 8 grupos-topo** (inspirados no IX, adaptados ao domínio CRM completo):

   ```text
   TRABALHO
   ├─ Visão Global        (dashboard)
   ├─ Inbox               (comunicação unificada)
   ├─ Agenda              (agendamentos, calendário)

   VENDAS
   ├─ Pipeline            (leads, contactos, empresas, negócios, propostas)
   ├─ Faturação           (faturas, orçamentos, guias, encomendas, cobranças)
   ├─ Catálogo            (itens, produtos, stock, preços)

   OPERAÇÕES
   ├─ Módulos             (HR, Procurement, Helpdesk, Store, Rentals, C2C…)
   ├─ Relatórios          (analytics, performance, insights IA)

   CONTA
   ├─ Configurações
   ├─ Logout
   ```

2. **Cada grupo abre uma "second nav" contextual** (drawer lateral ou header de secção) que expõe todos os sub-módulos actuais — nenhum é removido. Ex.: ao clicar em Faturação, a área de conteúdo mostra as tabs Faturas · Orçamentos · Guias · Encomendas · Cobranças · Recibos.

3. **Estilo IX adaptado**:
   - Fundo `bg-card` branco, borda fina `border-border`, `rounded-2xl`.
   - Sidebar `w-56`, itens `text-sm`, ícone à esquerda 16 px, item activo com fundo `bg-primary/10` e barra lateral `bg-primary`.
   - Grupos "VENDAS", "CONTA" em uppercase `text-[11px] tracking-wider text-muted-foreground`.
   - **Cor primária = azul FastCRM** (mantida, não copia o verde IX → evita plágio directo).
   - Zero gradientes, zero ícones em quadrados coloridos (regra do skill `ix-page-redesign`).

4. **Dashboard `/dashboard` refeito** com as 5 secções IX (Faturação · Cobranças · Clientes · Itens · Impostos) usando componentes já existentes do skill IX (`IXCard`, `DeltaBadge`, gráficos actuais).

5. **Rota de acção rápida no header** (equivalente aos botões "Novo Orçamento / Nova Fatura / Novo Contacto…" do topo IX).

## Estrutura técnica

- **SSoT única**: novo `src/config/navigation/ixNavigation.ts` que mapeia os 8 grupos → sub-rotas existentes no `routeManifest.ts`. Não duplica rotas, apenas reagrupa.
- **Novo componente `AppSidebarIX`** substitui a sidebar actual (feature-flag `ui_mode = 'ix'` no workspace para permitir rollback).
- **Novo `SecondaryNav`** (tabs sublinhado `IXEntityTabs`) renderizado no topo do conteúdo consoante o grupo activo.
- Reutilizar `IXCard`, `IXEntityHeader`, `IXEntityTabs`, `DocumentListLayout` (já existem).
- Manter `useMenuPermissions`, `has_role`, `capabilities` — só se altera apresentação.
- Nenhuma alteração a RLS, hooks de dados, edge functions, mutations.

## Plano de implementação (faseado)

**Fase 1 — Sidebar + agrupamento (esta iteração)**
1. Criar `src/config/navigation/ixNavigation.ts` mapeando 40+ módulos nos 8 grupos.
2. Criar `src/components/layout/AppSidebarIX.tsx` (padrão shadcn Sidebar, colapsável, mini variant).
3. Criar `src/components/layout/SecondaryNav.tsx` (tabs contextuais por grupo).
4. Integrar em `AppLayout` atrás de flag `ui_mode='ix'` (default off até validação).

**Fase 2 — Dashboard IX**
5. Refazer `/dashboard` com as 5 secções (Faturação, Cobranças, Clientes, Itens, Impostos) usando `IXCard`.
6. Ligar aos hooks já existentes (`useInvoiceKPIs`, `useCollectionsAging`, `useClientDependency`, `useTopItems`, `useVatSummary`).

**Fase 3 — Header de acções rápidas**
7. Chips "Nova Fatura · Novo Contacto · Novo Item · Nova Proposta" no topo do dashboard.

**Fase 4 — Rollout**
8. Ativar `ui_mode='ix'` no workspace Pharliss.
9. Manter sidebar antiga acessível via `?nav=legacy` durante 1 sprint.

## Critérios de aceitação

- Todos os 40+ módulos actuais continuam acessíveis (verificado por `useMenuPermissions` + smoke test).
- Sidebar tem ≤10 itens visíveis no nível topo.
- Cor primária = azul FastCRM (nenhum `#00A44A` verde IX no código).
- Zero gradientes, zero ícones em quadrados coloridos.
- Consola limpa, sem regressões em `routeManifest.ts`.
- Rollback possível via `?nav=legacy`.

## Riscos e pontos por validar

- **Agrupamento subjectivo**: o mapeamento 40 módulos → 8 grupos pode não agradar. Sugiro validares o mapping da Fase 1 antes de eu partir para Fase 2.
- **Permissões por role**: alguns módulos aparecem só para super_admin; a nova sidebar respeita `useMenuPermissions` mas convém testar com 3 perfis (owner, member, super_admin).
- **"Sem plágio"**: mantemos estrutura conceptual (sidebar enxuta + dashboard secções), mas cor, tipografia, spacing e naming ficam FastCRM. Não copiamos ícones nem literais do IX.
- **Fase 1 sozinha já é ~800 linhas**; recomendo fazer 1 fase por iteração.

Confirma se avanço com a **Fase 1** (só sidebar + agrupamento, sem tocar no dashboard ainda) e se o agrupamento nos 8 grupos acima faz sentido — ou preferes outra divisão.
