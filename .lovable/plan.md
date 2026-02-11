

# Lead Enricher Pro - Funcionalidades Completas

## Estado Atual

A pagina Lead Enricher Pro usa dados de exemplo hardcoded (3 leads fictícios). Não se liga a base de dados real, não enriquece de verdade, e as tabs "Fila de Enriquecimento" e "Configurações" estão vazias. A base de dados tem 278 leads reais, com colunas de enriquecimento ja existentes (company_name, linkedin_url, website, inferred_profession, etc.).

## O Que Vai Ser Implementado

### 1. Dados Reais da Base de Dados

Substituir os dados de exemplo por leads reais do workspace, usando o hook `useLeads` existente. Cada lead mostrara os dados enriquecidos que ja tem (empresa, email, telefone, LinkedIn, website, localizacao, profissão inferida).

O status de enriquecimento sera calculado automaticamente:
- **Enriquecido**: tem empresa + pelo menos 2 outros campos preenchidos
- **Parcial**: tem pelo menos 1 campo preenchido
- **Pendente**: nenhum campo de enriquecimento preenchido

### 2. Enriquecimento Real com IA

O botao "Enriquecer" (individual) e "Enriquecer Todos" vao chamar a edge function `contact-enrich` existente, que:
- Extrai empresa a partir do dominio do email
- Detecta pais/idioma pelo telefone
- Faz scraping do website da empresa via Firecrawl
- Usa IA para inferir cargo/profissao

Apos o enriquecimento, os dados sao guardados diretamente na tabela `leads` (campos company_name, website, linkedin_url, city, inferred_profession, confidence_score).

### 3. Tab "Fila de Enriquecimento"

Mostrara os leads pendentes (sem dados enriquecidos) com opcao de:
- Adicionar leads manualmente a fila
- Processar a fila em lote (um a um com progresso visual)
- Barra de progresso durante o processamento

### 4. Tab "Configurações" Funcional

- **Fontes de Dados**: toggle para ativar/desativar fontes (Google, LinkedIn, website scraping) -- visual apenas por agora
- Os badges "Em breve" mantem-se para Enriquecimento Automatico e Validacao de Email

### 5. KPIs Reais

Os 4 cards de estatisticas serao calculados a partir dos dados reais:
- Total Leads: contagem real
- Enriquecidos: leads com dados completos
- Parciais: leads com dados incompletos
- Taxa Sucesso: percentagem calculada

## Seccao Tecnica

### Novo hook: `src/hooks/useLeadEnrichment.ts`

Hook que encapsula a logica de enriquecimento:
- `useEnrichLead()`: mutation que chama `contact-enrich` e atualiza o lead na DB
- `useEnrichLeadsBatch()`: mutation que processa multiplos leads sequencialmente com callback de progresso
- Funcao helper `getEnrichmentStatus(lead)` para calcular status

### Ficheiro: `src/pages/LeadEnricher.tsx`

Reescrita completa para:
- Usar `useLeads()` para dados reais
- Usar `useEnrichLead()` para enriquecimento individual
- Usar `useEnrichLeadsBatch()` para "Enriquecer Todos"
- Tab Leads: lista real com pesquisa e filtros
- Tab Fila: leads pendentes com processamento em lote e barra de progresso
- Tab Configuracoes: manter visual atual com badges funcionais

### Resumo de ficheiros

| Ficheiro | Acao |
|---|---|
| `src/hooks/useLeadEnrichment.ts` | Criar -- hook de enriquecimento com mutations |
| `src/pages/LeadEnricher.tsx` | Reescrever -- ligar a dados reais, enriquecimento funcional, tabs completas |

