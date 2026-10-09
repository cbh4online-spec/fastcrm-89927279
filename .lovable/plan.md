# Auditoria técnica FastCRM — diagnóstico (sem alterações)

Nada foi alterado. Este documento separa o **confirmado** (lido nesta sessão) do que **exige investigação**.

## 1. Mapa da arquitetura (confirmado)

```text
Browser (React 18 + Vite 5 + Tailwind 3 + shadcn/Radix, PWA com service worker)
  ├─ src/routes/*Routes.tsx  (~30 grupos de rotas: CRM, Vendas, Loja, Parceiros, RH, IA...)
  ├─ routeManifest.ts = fonte única de menus; MenuVisibilityGuard + capabilities.ts (RBAC)
  ├─ TanStack Query, i18n (pt/en/es/fr), Sentry + PostHog (opcionais)
  ▼
Lovable Cloud
  ├─ Base de dados Postgres: ~1290 tabelas, ~550 funções, RLS por workspace
  ├─ 675 funções de servidor (Deno) + _shared (security, capabilities, pricing...)
  ├─ 1068 migrações SQL + 53 migrações Drizzle (dois mecanismos em paralelo)
  └─ Armazenamento, Auth (email/Google)
Serviço separado: /trigger (Trigger.dev) para tarefas assíncronas
```

## 2. Inventário de módulos (confirmado pela estrutura de rotas)
CRM (leads, contactos, empresas, oportunidades), Vendas/Pipeline, Prospeção (Instagram, profissionais, Google Local, Outreach/cadências), Comunicação (WhatsApp Z-API/Zapy, email Resend, SMS Twilio, Telegram, Meta), Loja B2C/C2C/Marketplace e feeds Meta/Google, Parceiros B2B, Faturação/SAF-T/InvoiceXpress, Renovações/Stripe, Cobranças, RH, Helpdesk/Tickets, Relatórios/Desempenho, IA (agentes, Copilot, AI Commerce), Builder de sites, Afiliados/Embaixadores, Aluguer de equipamento, Intermediação de crédito.

## 3. Dependências principais
React 18, Vite 5, TS 5, supabase-js 2.90, TanStack Query 5, Stripe JS 9, Tiptap 3, Nivo 0.99, FullCalendar 6, LiveKit, ElevenLabs, Monaco, react-pdf, Sentry 10. Mais de 120 dependências diretas.

## 4. Matriz de riscos

| Gravidade | Risco | Evidência | Estado |
|---|---|---|---|
| Alta | Escala do código: 675 funções de servidor, ~1290 tabelas, difícil de manter e testar | contagens | Confirmado |
| Alta | Migrações aplicadas fora de ordem (caso prospecting_search_operations nunca aplicada) | sessão anterior | Confirmado; pode haver outras |
| Alta | Dois mecanismos de migração (SQL + Drizzle) | pastas | Confirmado |
| Média | 58 funções sem verificação automática de sessão (verify_jwt=false) | config.toml | Confirmado; falta validar cada uma |
| Média | Funções SECURITY DEFINER sem search_path fixo | scanner de segurança | Confirmado (várias) |
| Média | 3499 usos de `as any` — tipos gerados silenciados | pesquisa | Confirmado |
| Média | 25 ficheiros com dangerouslySetInnerHTML | pesquisa | Falta verificar sanitização |
| Média | Ficheiros gigantes (>60 KB): AutomationRuleBuilder, CreateProductDialog, GoogleLocalProspecting, GestoresPage | pesquisa | Confirmado |
| Média | Funções que devolvem 500 em vez de 401 (extension-check, module-checkout) | sessão anterior | Confirmado |
| Média | Webhook da loja: perda de pagamento em duplicado durante falha, stock sem retry | testes anteriores | Confirmado, não corrigido |
| Baixa | Pesquisa global só nos registos carregados | sessão anterior | Confirmado |
| A investigar | Tabelas com RLS desligado ou sem GRANT; políticas USING(true) | — | Requer consultas |
| A investigar | Código morto (routes.legacy.ts, nav.adaptive.ts) | nomes | Requer leitura |
| A investigar | Cobertura de testes: 86 ficheiros para todo o sistema | contagem | Baixa face à dimensão |

## 5. Recomendações priorizadas
1. Fechar segurança: rever as 58 funções públicas, fixar search_path, confirmar RLS/GRANT em todas as tabelas.
2. Consistência da base: comparar migrações do código com a base real e escolher um único mecanismo.
3. Corrigir riscos de pagamento da loja já identificados.
4. Testes nos fluxos críticos (checkout, faturação, permissões, WhatsApp opt-out).
5. Reduzir dívida: dividir ficheiros grandes, eliminar `as any` por módulo, remover código legado.
6. Desempenho: paginação no servidor nas listas grandes, rever tamanho dos pacotes.

## 6. Plano por fases (cada fase só com aprovação)
- **Fase 0 – Investigação (só leitura):** consultas RLS/GRANT, linter, lista de funções públicas, comparação migrações/base, auditoria de dangerouslySetInnerHTML. Entrega: relatório detalhado.
- **Fase 1 – Segurança crítica:** correções de RLS/search_path e validação nas funções públicas.
- **Fase 2 – Pagamentos e dados:** webhook da loja, códigos 401, idempotência.
- **Fase 3 – Testes:** cobertura dos fluxos críticos.
- **Fase 4 – Dívida técnica:** remover legado, dividir ficheiros, tipos.
- **Fase 5 – Escalabilidade:** paginação no servidor, divisão de pacotes, observabilidade.

## Critérios de aceitação
Cada fase termina com build e testes a passar, sem novos erros de consola e verificada com diferentes papéis.

## Riscos por validar
Estado real de RLS por tabela, uso efetivo das 675 funções, migrações em falta, custos de integrações externas.
