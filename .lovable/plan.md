

# Plano: Adicionar módulos e sub-páginas em falta ao menu

## Diagnóstico

Cruzando o `routeManifest.ts` (fonte do sidebar) com as rotas reais em `src/routes/`, identifiquei **~35 rotas** que existem no código mas não aparecem no menu porque:
1. **Não estão no manifest** (nunca foram adicionadas)
2. **Estão marcadas como `visibleInSidebar: false`** sem necessidade
3. **Faltam grupos de navegação** (ex: "Segurança" como grupo próprio, "Performance/Gamificação" como grupo próprio)

## Módulos/páginas em falta no sidebar

### 1. Performance & Gamificação (rotas existem, faltam no manifest)
- `/dashboard/performance/leaderboard` — Leaderboard
- `/dashboard/performance/challenges` — Desafios
- `/dashboard/performance/recognition` — Reconhecimentos
- `/dashboard/performance/tv-mode` — TV Mode
- `/dashboard/performance/settings` — Configurações

### 2. Segurança (existe como grupo, mas só tem 1 entrada hidden)
Precisa de grupo próprio com sub-páginas:
- `/dashboard/security` — Dashboard (tornar visível)
- `/dashboard/security/partner-requests` — Pedidos Parceiros
- `/dashboard/security/leads` — Leads
- `/dashboard/security/proposals` — Propostas
- `/dashboard/security/clients` — Clientes
- `/dashboard/security/sites` — Sites
- `/dashboard/security/systems` — Sistemas
- `/dashboard/security/equipment` — Equipamentos
- `/dashboard/security/contracts` — Contratos
- `/dashboard/security/documents` — Documentos
- `/dashboard/security/maintenance` — Manutenção
- `/dashboard/security/occurrences` — Ocorrências
- `/dashboard/security/renewals` — Renovações
- `/dashboard/security/management` — Gestão

### 3. Marketplace C2C (tem 1 entrada, faltam sub-páginas)
- `/dashboard/c2c/my-listings` — Meus Anúncios
- `/dashboard/c2c/seller-area` — Área Vendedor
- `/dashboard/c2c/messages` — Mensagens
- `/dashboard/c2c/analytics` — Analíticas
- `/dashboard/c2c/boost` — Boost
- `/dashboard/c2c/sponsors` — Sponsors
- `/dashboard/c2c/sellers` — Vendedores
- `/dashboard/c2c/affiliates` — Afiliados
- `/dashboard/c2c/orders` — Encomendas
- `/dashboard/c2c/moderation` — Moderação

### 4. Itens avulsos em falta ou hidden sem razão
- `/dashboard/automations` — Automações (rota existe, falta no manifest)
- `/dashboard/vision` — Método Vision (rota existe, falta no manifest)
- `/dashboard/whatsapp` — WhatsApp (redirect, falta no manifest)
- `/dashboard/credit` — Crédito (hidden, tornar visível)
- `/dashboard/community` — Comunidade (no moduleNavRegistry mas sem rota)

### 5. Novo grupo: "Segurança" no NAV_GROUPS
- Adicionar `"seguranca"` como NavGroup com ícone `Shield` e ordem entre operações e inteligência

## Ficheiros a alterar

1. **`src/config/routeManifest.ts`**
   - Adicionar NavGroup `"seguranca"` e `"performance"` ao `NAV_GROUPS`
   - Adicionar ~35 novas entradas ao `ROUTE_MANIFEST`
   - Tornar visíveis entradas que estavam hidden sem necessidade
   - Mapear novos grupos nos `MEGA_GROUPS`

2. **`src/config/moduleNavRegistry.ts`**
   - Alinhar slugs/hrefs com as novas entradas do manifest (corrigir `metodo-vision` href)

3. **`src/i18n/locales/en/nav.json`** e **`src/i18n/locales/pt/nav.json`**
   - Adicionar chaves de tradução para os novos itens

## Critérios de aceitação
- Todos os módulos documentados no DOCX aparecem navegáveis no sidebar
- Sub-páginas de Segurança, C2C, Performance visíveis no menu
- Automações, Método Vision e WhatsApp acessíveis pelo sidebar
- Nenhuma rota com página existente fica escondida sem justificação
- Build sem erros
- Testes `navigation-expanded.test.ts` passam

