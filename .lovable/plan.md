

# PDF Detalhado do Modulo B2B

## Problema

O registo actual do Portal B2B no Feature Registry tem apenas 2 modulos com 5 features no total, mas o codebase real mostra um sistema muito mais rico com 20+ paginas, 12 hooks dedicados, assistente de diagnostico IA, pesquisa semantica, aprovacoes, contratos, faturas, favoritos, gestao de equipas e tickets de suporte.

## O que sera feito

### 1. Expandir os dados B2B no Feature Registry

Actualizar `src/types/featureRegistry.ts` para reflectir a realidade completa do modulo B2B, passando de 2 modulos para 6 sub-modulos:

| Sub-modulo | Paginas | Hooks | Features |
|---|---|---|---|
| Portal B2B (Core) | 3 | useClientAuth, useClientPermissions | Gestao clientes, convites, activacao, roles |
| Catalogo & Encomendas | 5 | useClientOrders, useClientProducts, useClientFavorites, useCart | Catalogo, carrinho, checkout, favoritos, re-encomenda 1 clique, prestacoes |
| Aprovacoes & Workflow | 2 | useClientApprovals | Fluxo aprovacao, limites gastos, centro aprovacao |
| Financeiro | 3 | useClientInvoices, useClientContracts | Faturas, contratos, SLAs, historico financeiro |
| Suporte & Tickets | 2 | useClientTickets | Tickets, mensagens, estados, prioridades |
| Intelligence Hub | 2 | useDiagnosticAssistant, useProductSemanticSearch, useProtocols | Copilot B2B, pesquisa semantica, diagnostico IA, recomendacoes, protocolos |

### 2. Criar funcao de export PDF dedicado ao B2B

Adicionar em `src/utils/featureRegistryExport.ts` uma nova funcao `exportB2BModulePDF()` que gera um PDF completo e detalhado focado exclusivamente no modulo B2B:

**Estrutura do PDF:**

1. **Capa** -- Fundo teal (#0d9488), titulo "FastCRM - Portal B2B", subtitulo "Documentacao Completa do Modulo", data e stats resumidos (total sub-modulos, features, paginas, hooks, edge functions)

2. **Visao Geral** -- Descricao do que e o Portal B2B, arquitectura de alto nivel (Admin CRM + Portal Cliente), roles disponiveis (client_admin, client_manager, client_viewer)

3. **Por cada sub-modulo:**
   - Header colorido com nome do sub-modulo
   - Descricao detalhada
   - Lista de paginas com rotas
   - Lista de features com estado e badge IA
   - Hooks utilizados
   - Edge functions associadas
   - Tabelas da base de dados

4. **Fluxo de Onboarding** -- Descricao passo-a-passo do processo de convite e activacao de conta

5. **Mapa de Permissoes** -- Tabela com roles vs funcionalidades (quem pode fazer o que)

6. **Resumo Tecnico** -- Tabela final com todos os hooks, edge functions e tabelas do modulo

7. **Footer** -- "FastCRM - Portal B2B" + numero de pagina em todas as paginas

### 3. Adicionar botao na UI

Editar `src/components/super-admin/FeatureRegistrySection.tsx`:
- Adicionar nova opcao "Modulo B2B (PDF)" no dropdown de exportacao
- Importar e chamar `exportB2BModulePDF()`

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| `src/types/featureRegistry.ts` | Expandir dados dos modulos Portal B2B (linhas 697-738) |
| `src/utils/featureRegistryExport.ts` | Adicionar funcao `exportB2BModulePDF()` |
| `src/components/super-admin/FeatureRegistrySection.tsx` | Adicionar opcao no dropdown de export |

## Detalhes Tecnicos

A funcao `exportB2BModulePDF()` reutilizara os helpers existentes (`drawColoredHeader`, `drawStatBox`, `checkPage`, `drawAITag`, `drawPlanBadge`, `addFooters`) e adicionara helpers especificos:
- `drawPermissionsTable()` -- tabela de roles vs permissoes com zebra striping
- `drawOnboardingFlow()` -- fluxo visual passo-a-passo
- Cor principal: teal `[13, 148, 136]` consistente com a categoria Portal B2B
