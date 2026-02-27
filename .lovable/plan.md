

# Reestruturar Menus da Sidebar V1 para Corresponder ao Layout de Referencia

## Problema

A sidebar actual tem apenas 6 grupos simples (Geral, CRM, Portal B2B, Marketing, Ferramentas, Definicoes) enquanto as screenshots de referencia mostram ~15 grupos com dezenas de sub-itens. Muitos modulos existentes (com rotas e paginas funcionais) estao ausentes do menu estatico.

## Itens em Falta (por grupo)

| Grupo | Itens a adicionar | Rotas |
|---|---|---|
| **Principal** (renomear Geral) | Mural Interno, Coach IA | /dashboard/feed, /dashboard/ask |
| **Comunicacao** (novo) | WhatsApp, Email, Templates | /dashboard/inbox, /dashboard/email-campaigns, /dashboard/communication/templates |
| **Vendas** (novo) | Pipeline, Propostas, Faturas, Agendamento, Produtos | /dashboard/opportunities, /dashboard/proposals, /dashboard/invoices, /dashboard/scheduling, /dashboard/products |
| **Loja Online** (novo) | Produtos, Encomendas, Categorias | /dashboard/store-products, /dashboard/store-orders, /dashboard/store-categories |
| **Marketplace C2C** (novo) | Marketplace, Area do Vendedor, Meus Anuncios, Mensagens C2C, Analytics, Impulsionar, Sponsors, Vendedores | /dashboard/c2c, /dashboard/c2c/seller-area, /dashboard/c2c/my-listings, /dashboard/c2c/messages, /dashboard/c2c/analytics, /dashboard/c2c/boost, /dashboard/c2c/sponsors, /dashboard/c2c/sellers |
| **FastClub** (novo) | Abrir FastClub, Candidaturas | /club/fastclub, /dashboard/fastclub/candidaturas |
| **Marketing** (expandir) | Email Marketing, Google Local, Funis, Bio OS | /dashboard/email-campaigns, /dashboard/prospecting/google-local, /dashboard/funnels, /dashboard/bio |
| **Estrategia** (grupo proprio) | Brief Executivo | /dashboard/strategy |
| **Relatorios** (expandir) | Visao Geral, KPIs, Metas vs Resultados, Previsoes, Consumo | /dashboard/reports, /dashboard/kpis, /dashboard/reports/goals, /dashboard/reports/forecasts, /dashboard/reports/consumption |
| **Ferramentas** (expandir) | SEO & Growth, Importacoes, Integracoes, AI Employees, Motor Conversacional | /dashboard/seo, /dashboard/imports, (settings integrations), /dashboard/ai-employees, /dashboard/conversational-engine |
| **Student Journey** (novo) | Painel, Perfis, Cursos, Turmas | /dashboard/student-journey, /dashboard/student-journey/profiles, /dashboard/student-journey/courses, /dashboard/student-journey/cohorts |
| **Instagram Looter** (novo) | Busca Global, Hashtags, Localizacao, Explore, Colecoes, Leads, Configuracoes | /dashboard/instagram-looter, /dashboard/instagram-looter/hashtags, etc. |
| **Definicoes** (expandir) | Campos & Modulos, Pipelines, Utilizadores, Faturacao | /settings (sub-tabs) |

## Alteracoes

### 1. `src/config/nav.v1.ts`

Reescrever completamente o array `NAV_V1_ITEMS` com todos os grupos e itens listados acima, adicionando os icones necessarios. Reorganizar na ordem: Principal > Comunicacao > CRM > Vendas > Portal B2B > Loja Online > Marketplace C2C > FastClub > Marketing > Estrategia > Relatorios > Ferramentas > Student Journey > Instagram Looter > Definicoes.

### 2. `src/config/nav.v2.ts`

Adicionar items-chave em falta: Mural Interno, Propostas, Faturas, Loja Online, C2C, FastClub.

### Icones adicionais a importar

`Newspaper` (Mural), `Phone` (WhatsApp), `Mail` (Email), `FileText` (Templates), `Store` (Loja), `ShoppingCart` (C2C), `GraduationCap` (Student Journey), `Instagram` (Looter), `Globe` (Bio OS), `Search` (SEO), `Download` (Imports), `Plug` (Integracoes), `Bot` (AI Employees), `MessageSquare` (Motor Conversacional), `Trophy` (FastClub), `TrendingUp` (Pipeline/Vendas), `Receipt` (Faturas), `Presentation` (Propostas).

## Ficheiros a alterar

| Ficheiro | Accao |
|---|---|
| `src/config/nav.v1.ts` | Reescrever NAV_V1_ITEMS com todos os ~60 itens agrupados |
| `src/config/nav.v2.ts` | Adicionar itens-chave em falta |

