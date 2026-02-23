

# Registo Completo de Funcionalidades do FastCRM

## Objectivo

Criar uma seccao no Super Admin que documenta **todas as funcionalidades** do FastCRM de forma estruturada e navegavel -- desde modulos core ate funcionalidades extra, incluindo paginas, hooks, edge functions e tabelas associadas a cada modulo.

## Problema Actual

A seccao "Auditoria Funcional" existente mostra apenas contadores (rotas, tabelas, triggers) e uma lista basica de modulos com 3 componentes cada. Falta:
- Detalhes das funcionalidades dentro de cada modulo
- Mapeamento de paginas, hooks, edge functions e tabelas por modulo
- Estado funcional real de cada feature
- Arvore de navegacao completa do sistema
- Documentacao das capacidades de IA por modulo

## Arquitectura da Solucao

### Nova seccao "Feature Registry" no Super Admin

Um painel completo com 3 niveis de profundidade:

```text
Nivel 1: Categorias (Core, Vendas, IA, Marketing, etc.)
  |
  Nivel 2: Modulos (CRM, Inbox, Loja Online, etc.)
    |
    Nivel 3: Funcionalidades (Criar Lead, Importar CSV, Enriquecer com IA, etc.)
```

## Estrutura de Dados

### Registo completo de cada modulo (definido em codigo, sem tabela nova)

Cada modulo tera:
- **Nome e descricao**
- **Categoria** (Core, Vendas, IA, Marketing, Marketplace, Ferramentas, Admin)
- **Paginas** associadas (com rota)
- **Hooks** utilizados
- **Edge Functions** associadas
- **Tabelas** da base de dados
- **Funcionalidades** detalhadas (lista de features com estado)
- **Dependencias** de outros modulos
- **Plano minimo** necessario (free, basic, pro, agency)

### Catalogo Completo (baseado na exploracao do codebase)

O registo cobrira estes modulos organizados por categoria:

**CORE (8 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Dashboard | 1 | ai-dashboard-insights | KPIs, widgets, layout personalizavel |
| Mural Interno (Feed) | 1 | - | Posts, reaccoes, comunicacao interna |
| Produtividade | 1 | productivity-coach | Tarefas, prioridades diarias, coach IA |
| Calendario | 3 | create-video-meeting, booking-router | Eventos, disponibilidade, reunioes video |
| Importacoes | 1 | - | CSV import, mapeamento de campos, historico |
| Formularios | 2 | generate-form-schema, generate-smart-form, process-form-submission | Form builder, submissoes, formularios publicos |
| Campos Personalizados | 1 | ai-field-suggestions | Custom fields, managed fields, sugestoes IA |
| Configuracoes | 4 | - | Equipa, permissoes, facturacao, integrracoes |

**CRM (6 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Leads | 2 | ai-analyze-lead, create-demo-lead, create-public-lead, compute-lead-behavior-signals | CRUD, scoring, tags automaticas, timeline, duplicados |
| Lead Enricher | 1 | enrich-instagram-profile, google-places-enrich | Enriquecimento IA, pesquisa Google, Instagram |
| Contactos | 2 | contact-enrich, contact-insights | CRUD, merge duplicados, historico email, pricing |
| Empresas | 2 | company-enrich, company-insights, enrich-company-data, lookup-company-nif | CRUD, NIF lookup, enriquecimento, duplicados |
| Oportunidades | 3 | compute-deal-score, ai-opportunity-coach | Pipeline Kanban, deal scoring, coach IA |
| FastMatch | 1 | - | Conexoes estrategicas, perfis, interesses |

**COMUNICACAO (3 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Inbox | 1 | ai-inbox-reply, ai-inbox-actions, classify-conversation, conversation-intelligence | Inbox unificado, classificacao IA, respostas IA |
| Email | - | email-send, email-fetch, email-connect, email-disconnect, email-webhook | Conexao IMAP, envio, templates, webhooks |
| Templates | 1 | generate-template, ai-template-copilot, template-compose-message | Criar, gerar com IA, variacoes, estatisticas |

**VENDAS (5 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Propostas | 3 | generate-proposal-copy, ai-proposal-assistant, proposal-checkout, proposal-webhook, elevenlabs-proposal-token | Criar, checkout, narrar com IA, PDF |
| Faturas | 2 | saft-export | CRUD, items, exportar SAF-T |
| Produtos | 2 | ai-product-assistant, product-embedding, product-semantic-search, product-publish | Catalogo, variantes, imagens, ficha publica, IA |
| Notas de Encomenda | 2 | order-note-submit, order-note-notify | Criar, aprovar, converter para fatura |
| Pacotes & Bundles | 1 | bundle-checkout | Bundles, checkout, alertas |

**MARKETING (5 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Email Marketing | 1 | marketing-send-campaign, marketing-campaign-insights | Campanhas, segmentos, analytics |
| Funis | 1 | funnel-ai-insights, funnel-ai-strategist | Multi-step, testes A/B, variacoes |
| Landing Pages | 2 | landing-page-copy | Paginas publicas, copy com IA |
| Bio OS | 1 | bio-ai-builder, bio-generate-image, bio-seo-copy, bio-smart-link, bio-whatsapp-copy | Paginas bio, blocos, IA, short links |
| Prospeccao | 2 | google-local-search, professional-prospecting-search, professional-prospecting-analyze, firecrawl-search | Google Maps, web search, analise |

**LOJA ONLINE (2 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| E-Commerce | 7 | create-store-checkout, store-webhook, store-ai-advisor, store-capture-lead, detect-abandoned-carts, store-visual-search | Produtos, categorias, cupoes, encomendas, analytics, config |
| Marketplace C2C | 6 | create-c2c-checkout, create-c2c-boost-checkout, c2c-webhook, ai-c2c-listing-assistant | Anuncios, vendedores, boost, mensagens, sponsors |

**PORTAL B2B (2 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Portal B2B | 3 | create-client-auth-user, send-client-invitation, activate-client-invite | Clientes, notas encomenda, autenticacao |
| Client Users | 1 | - | Gestao de utilizadores do portal |

**COMUNIDADE (2 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| FastClub | 2 | fastclub-application-processor, send-community-invite, generate-community-banner | Portal, candidaturas, capital circle |
| Comunidade | 3 | community-ai-category, community-ai-suggest-title | Canais, forum, eventos, membros |

**IA (8 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| AI Copilot | - | ai-copilot | Assistencia contextual em qualquer pagina |
| AI Employees | 3 | ai-employee-executor | Operadores digitais autonomos |
| AI Assistentes | 1 | - | Personas, vibe profiles, fluxos |
| Motor Conversacional | 1 | classify-conversation, conversation-intelligence, conversation-summary | Regras, objectivos, classificacao |
| Knowledge Base | 1 | knowledge-query, knowledge-embedding, knowledge-semantic-search, knowledge-document-process | RAG, semantic search, documentos |
| AI Sugestoes | 1 | ai-field-suggestions, ai-auto-tags, ai-automation-suggestions | Tags, campos, automacoes |
| AI Agents | - | ai-agent-orchestrator, ai-agent-processor, ai-agent-scheduler, ai-agent-lifecycle, ai-agent-client, ai-agent-opportunity | Pipeline de agentes autonomos |
| Document Intelligence | - | knowledge-document-process, knowledge-document-trigger | OCR, classificacao, extraccao |

**ESTRATEGIA (2 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Brief Executivo | 1 | strategic-intelligence-brief, compute-strategic-decisions | Relatorio semanal IA, decisoes |
| Relatorios | 5 | compute-revenue-forecast, ai-kpi-analysis | Overview, KPIs, metas, previsoes, consumo |

**VERTICAL (2 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Student Journey | 4 | sj-copilot, sj-course-recommendations, sj-daily-automation | Alunos, cursos, turmas, copilot |
| Intermediacao Credito | 1 | ai-credit-analysis | Propostas credito, simulador, analise IA |

**ADMIN (3 modulos)**
| Modulo | Paginas | Edge Functions | Funcionalidades-chave |
|---|---|---|---|
| Super Admin | 1 | admin-user-management, admin-module-margin | Workspaces, users, planos, billing, logs |
| Automacoes | 1 | ai-generate-automation, workflow-processor, workflow-trigger, trigger-dispatch, flow-engine | Builder, regras, execucoes, logs |
| Integrracoes | 1 | ghl-sync-contacts, ghl-sync-conversations, instagram-oauth-callback, whatsapp-webhook | GHL, Instagram, WhatsApp, Stripe |

## Implementacao

### Ficheiro 1: `src/types/featureRegistry.ts` (NOVO)
Definicao de tipos e catalogo completo de todos os modulos com:
- Interface `FeatureModule` com campos: id, name, category, description, pages, hooks, edgeFunctions, tables, features (lista detalhada), dependencies, minPlan, status
- Interface `Feature` com: name, description, status (active/beta/planned), aiPowered
- Constante `FEATURE_REGISTRY` com todos os ~45 modulos organizados por categoria
- Constante `MODULE_CATEGORIES` com as 11 categorias

### Ficheiro 2: `src/hooks/useFeatureRegistry.ts` (NOVO)
Hook que:
- Carrega o registo estatico de `FEATURE_REGISTRY`
- Cruza com `marketplace_modules` para saber quais estao instalados
- Calcula totais por categoria (modulos, features, edge functions)
- Filtra por categoria, estado, pesquisa

### Ficheiro 3: `src/components/super-admin/FeatureRegistrySection.tsx` (NOVO)
Componente principal com:
- **Barra de estatisticas**: Total de modulos, features, edge functions, paginas
- **Filtros**: Por categoria (tabs), estado (badge), pesquisa por nome
- **Grid de modulos**: Cards com nome, descricao, badge de categoria, estado (Activo/Beta/Planeado), badge de plano minimo
- **Painel de detalhe** (dialog ou sheet): Ao clicar num modulo, mostra todas as features, paginas com rotas, hooks, edge functions associadas, tabelas, e dependencias
- **Indicador de IA**: Badge especial para features com IA
- **Export**: Botao para exportar registo completo em JSON/PDF

### Ficheiro 4: `src/components/super-admin/SuperAdminSidebar.tsx` (EDITAR)
- Adicionar item "Feature Registry" na seccao "Sistema" com icone `BookOpen`

### Ficheiro 5: `src/components/super-admin/index.ts` (EDITAR)
- Exportar `FeatureRegistrySection`

### Ficheiro 6: `src/pages/SuperAdmin.tsx` (EDITAR)
- Adicionar case "feature-registry" a renderizar `FeatureRegistrySection`

## Detalhes Tecnicos

### Estrutura do tipo `FeatureModule`:
```text
{
  id: "crm-leads",
  name: "Leads",
  category: "CRM",
  description: "Gestao completa de potenciais clientes",
  minPlan: "free",
  status: "active",
  moduleSlug: "leads" | null,  // null = core, string = marketplace
  pages: [
    { name: "Lista de Leads", route: "/dashboard/leads" },
    { name: "Detalhe do Lead", route: "/dashboard/leads/:id" }
  ],
  hooks: ["useLeads", "useSmartLeads", "useLeadEnrichment", "useAutoTags"],
  edgeFunctions: ["ai-analyze-lead", "create-demo-lead", "create-public-lead"],
  tables: ["leads", "lead_activities", "lead_tags"],
  features: [
    { name: "Criar Lead", description: "Adicionar leads manualmente ou via formulario", status: "active", aiPowered: false },
    { name: "Importar CSV", description: "Importacao em massa via ficheiro", status: "active", aiPowered: false },
    { name: "Lead Scoring IA", description: "Pontuacao automatica com analise de perfil", status: "active", aiPowered: true },
    { name: "Auto Tags", description: "Etiquetas automaticas baseadas em comportamento", status: "active", aiPowered: true },
    { name: "Deteccao de Duplicados", description: "Identificar e fundir leads duplicados", status: "active", aiPowered: false },
    { name: "Timeline de Actividades", description: "Historico completo de interaccoes", status: "active", aiPowered: false },
    { name: "Bulk Outreach", description: "Envio em massa de mensagens personalizadas", status: "active", aiPowered: true },
  ],
  dependencies: []
}
```

### UI do Painel de Detalhe

O dialog de detalhe de cada modulo tera tabs:
1. **Features** - Lista de funcionalidades com estado e badge IA
2. **Tecnico** - Paginas, hooks, edge functions, tabelas
3. **Dependencias** - Modulos dos quais depende e que dele dependem

### Contadores no topo

Cards com:
- Total de Modulos (~45)
- Total de Features (~300+)
- Features com IA (~80+)
- Edge Functions (~200)
- Paginas (~100)

## Resultado Esperado

- Documentacao viva e sempre actualizada de todo o sistema
- Visao clara do que cada modulo faz, com que recursos
- Facil identificacao de features com IA
- Util para onboarding de novos developers e demos a clientes
- Base para future gating de features por plano
