

# FastMatch — Módulo Completo e Funcional

## Problema Atual
O FastMatch existe mas está básico: a discovery page é simples, não há gestão de interesses recebidos, as conexões têm pouca informação, não há analytics e o fluxo é pouco atraente. O matching por IA (edge function) já funciona mas a experiência de utilização precisa de ser elevada.

**Nota importante**: A discovery filtra apenas perfis do mesmo workspace (`eq("workspace_id", currentWorkspace.id)`). Isto pode ser intencional ou um bug — precisamos confirmar se o matching deve ser cross-workspace.

---

## Plano de Implementação

### 1. Redesign da Discovery Page (FastMatchDiscoveryPage.tsx)

**Hero Header premium** com gradiente, ícone grande, e 3 KPIs inline:
- Matches este mês (da quota)
- Conexões ativas (total)
- Score médio de compatibilidade

**4 tabs** em vez de 2:
- **Descobrir** — Grid de perfis com sorting (Score ↓, Recentes, Indústria)
- **Interesses** — Recebidos (aceitar/rejeitar) + Enviados (status)
- **Conexões** — Cards melhorados com detalhe expandível
- **Analytics** — Stats e atividade recente

**Empty state** melhorado com ilustração, copy motivadora e botão CTA para criar perfil.

### 2. Profile Cards Redesenhados (MatchProfileCard.tsx)

- Avatar/ícone com cor por indústria
- Badge de compatibilidade com cor dinâmica (verde >75%, amarelo >50%)
- Tags de serviços oferecidos visíveis (max 3 + counter)
- Animação hover mais rica (scale + shadow)
- Botão de interesse com micro-feedback visual

### 3. Tab de Interesses Pendentes (novo)

**Recebidos**: Cards com info do perfil + botões Aceitar/Recusar. Aceitar consome quota e desbloqueia conexão automaticamente.

**Enviados**: Lista com status (Pendente/Mútuo/Expirado) e timestamp.

### 4. Conexões Melhoradas (ConnectionCard.tsx)

- Secção expandível com todos os dados do perfil (bio, serviços, ticket, website, LinkedIn)
- Quick actions: Ver no CRM, Ver Contacto, Ver Empresa (já existem), + Avaliar
- Timeline mini da conexão (desbloqueada em X, avaliada em Y)

### 5. Analytics Tab (novo componente)

- **KPIs**: Total matches, taxa de match mútuo, conexões ativas, média de score
- **Gráfico**: Atividade semanal (interesses enviados vs recebidos)
- **Lista**: Atividade recente (últimos 10 eventos)

---

## Ficheiros Afetados

| Ficheiro | Ação |
|---|---|
| `src/pages/fastmatch/FastMatchDiscoveryPage.tsx` | Rewrite major — hero, 4 tabs, sorting |
| `src/components/fastmatch/MatchProfileCard.tsx` | Redesign visual |
| `src/components/fastmatch/ConnectionCard.tsx` | Adicionar detalhe expandível |
| `src/components/fastmatch/FastMatchAnalytics.tsx` | **Novo** — tab analytics |
| `src/components/fastmatch/PendingInterestsTab.tsx` | **Novo** — gestão de interesses |
| `src/components/fastmatch/QuotaIndicator.tsx` | Upgrade visual |
| `src/hooks/useFastMatchInterests.ts` | Adicionar accept/reject mutations |

---

## Questão para Decisão

O discovery atual só mostra perfis do **mesmo workspace**. Para o matching fazer sentido, deveria ser **cross-workspace** (todos os perfis ativos da plataforma)? Isto requer ajustar a query e as RLS policies.

