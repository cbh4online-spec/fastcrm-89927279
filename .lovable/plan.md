

# Exportar Feature Registry - Nivel Tecnico e Comercial

## Objectivo

Adicionar botoes de exportacao ao Feature Registry com dois formatos distintos:
- **Tecnico**: Para developers/equipa interna -- inclui hooks, edge functions, tabelas, rotas
- **Comercial**: Para demos/clientes/vendas -- linguagem acessivel, sem detalhes tecnicos, foco em beneficios

## Formatos de Export

### 1. Export Tecnico (JSON + PDF)

**JSON** com estrutura completa:
```text
{
  "exportDate": "2026-02-23",
  "stats": { totalModules: 45, totalFeatures: 300, ... },
  "modules": [
    {
      "name": "Leads",
      "category": "CRM",
      "pages": [...],
      "hooks": [...],
      "edgeFunctions": [...],
      "tables": [...],
      "features": [...],
      "dependencies": [...]
    }
  ]
}
```

**PDF** com layout tecnico:
- Capa com titulo e data
- Indice por categoria
- Para cada modulo: paginas, hooks, edge functions, tabelas, features com estado

### 2. Export Comercial (PDF)

**PDF** com linguagem comercial:
- Capa profissional com branding FastCRM
- Sumario executivo (totais de modulos, features IA, etc.)
- Para cada categoria: lista de modulos com descricao e features em linguagem de beneficio
- Sem hooks, tabelas, edge functions -- so funcionalidades e plano minimo
- Badge "IA" nas features com inteligencia artificial
- Tabela resumo de planos vs funcionalidades

## Implementacao

### Ficheiro 1: `src/utils/featureRegistryExport.ts` (NOVO)

Funcoes de exportacao:

- `exportTechnicalJSON()` -- gera e faz download de JSON completo
- `exportTechnicalPDF()` -- gera PDF tecnico com jsPDF (ja instalado)
- `exportCommercialPDF()` -- gera PDF comercial com jsPDF, linguagem acessivel, sem detalhes tecnicos
- Helpers para formatacao de tabelas em PDF, headers por categoria, badges de plano

### Ficheiro 2: `src/components/super-admin/FeatureRegistrySection.tsx` (EDITAR)

- Adicionar dropdown "Exportar" com 3 opcoes:
  - "Tecnico (JSON)" -- download imediato
  - "Tecnico (PDF)" -- gera e download PDF
  - "Comercial (PDF)" -- gera e download PDF comercial
- Dropdown posicionado ao lado da barra de pesquisa
- Usa `DropdownMenu` do shadcn

## Detalhes do PDF Comercial

Estrutura do documento:
1. **Capa**: "FastCRM - Catalogo de Funcionalidades" + data + stats resumidos
2. **Por categoria**: Titulo da categoria + lista de modulos
3. **Por modulo**: Nome, descricao, plano minimo, lista de features (nome + descricao)
4. **Resumo final**: Tabela com totais por categoria

Linguagem: sem termos tecnicos, foco em "o que o utilizador pode fazer"

## Detalhes do PDF Tecnico

Estrutura:
1. **Capa**: "FastCRM - Technical Architecture" + data + stats
2. **Por categoria**: Todos os modulos com detalhes completos
3. **Por modulo**: Pages, hooks, edge functions, tables, features, dependencies
4. **Appendix**: Lista completa de edge functions e tabelas

## Ficheiros a criar/modificar

| Ficheiro | Accao |
|---|---|
| `src/utils/featureRegistryExport.ts` | **Novo** - Logica de exportacao (JSON + 2 PDFs) |
| `src/components/super-admin/FeatureRegistrySection.tsx` | Adicionar dropdown de exportacao |

