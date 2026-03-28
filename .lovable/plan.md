

# Redesenhar Document Intelligence — Clareza e Usabilidade

## Problema Actual

A página é uma lista plana de documentos com KPIs genéricos. Não explica **o que o módulo faz**, não mostra **o pipeline visual** (Upload → OCR → Classificação → Extracção → Indexação), e a gestão de templates de extracção não existe na UI. Para um utilizador novo, é difícil perceber o valor.

## Solução

### 1. Header explicativo com pipeline visual
- Substituir o header simples por um **banner com os 4 passos do pipeline** ilustrados como uma barra horizontal de etapas (Upload → OCR → Classificação → Extracção → Indexação KB)
- Cada etapa com ícone, nome e breve descrição (tooltip ou texto pequeno)
- Mostra visualmente que o módulo é um pipeline automático, não apenas OCR

### 2. Layout com tabs funcionais
Organizar em **3 tabs**:
- **Documentos** — a lista actual melhorada (default)
- **Templates** — gestão de templates de extracção (criar/editar schemas por tipo de documento)
- **Estatísticas** — KPIs detalhados, distribuição por tipo, confiança média, tempo médio

### 3. Empty state informativo
Quando não há documentos, mostrar:
- Diagrama visual do pipeline com setas
- Lista de formatos suportados com ícones
- Exemplos de uso: "Facturas → extrai NIF, total, data automaticamente"
- CTA grande para carregar o primeiro documento

### 4. Document cards com pipeline stages
Cada card mostra uma **mini barra de progresso por etapa**:
```text
[✓ Upload] → [✓ OCR] → [⏳ Classificação] → [ Extracção] → [ Indexação]
```
- Etapas completas em verde, activa com spinner, pendentes em cinza
- Substitui o badge de status genérico por algo visual e intuitivo
- Confiança e tipo de documento mais proeminentes no card completo

### 5. Templates de extracção (nova tab)
- Lista de templates existentes (tabela `document_extraction_templates`)
- Criar template: nome, tipo de documento alvo, schema JSON dos campos a extrair
- Ao carregar documento, poder seleccionar template específico
- Permite ao utilizador definir que campos quer extrair de cada tipo

### 6. KPIs movidos para tab dedicada
- Métricas mais ricas: confiança média por etapa, tempo médio de processamento
- Distribuição por tipo de documento como gráfico de barras
- Timeline de volume diário

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/AIDocumentOCRPage.tsx` | Reescrever com tabs, pipeline header, empty state, cards melhorados |
| `src/hooks/useDocumentProcessing.ts` | Adicionar query para templates de extracção |
| `src/components/document-intelligence/PipelineStages.tsx` | **Novo** — componente visual das etapas |
| `src/components/document-intelligence/ExtractionTemplates.tsx` | **Novo** — gestão de templates |

## Ordem
1. Pipeline header + tabs layout
2. Empty state informativo
3. Cards com indicador de etapas
4. Tab de templates de extracção
5. Tab de estatísticas expandida

