

# Exportação de Relatórios para Análise

## Situação Atual

O botão de download no `ReportsSales` existe mas não faz nada. Não há nenhuma utilidade de export no projeto — nem CSV, nem PDF, nem qualquer outro formato.

## Plano

### 1. Utilitário de Export — `src/utils/reportExport.ts`

Criar funções genéricas reutilizáveis:

- **`exportToCSV(filename, headers, rows)`** — Gera CSV com BOM UTF-8 para compatibilidade com Excel, cria Blob e dispara download automático
- **`exportSalesReportCSV(data)`** — Transforma os dados do `useSalesPerformance` em múltiplas secções CSV: KPIs, Lead Flow semanal, Receita mensal, Funil, Top Performers, Fontes, Stage Duration, Forecast
- **`exportSalesReportPDF(data)`** — Gera PDF executivo com jsPDF + jspdf-autotable: header com título/data, tabela de KPIs, tabelas de dados por secção

### 2. Menu de Export no `ReportsSales`

Substituir o botão Download simples por um **DropdownMenu** com 2 opções:
- **Exportar CSV** — ficheiro `.csv` com todos os dados tabulares para análise em Excel/Sheets
- **Exportar PDF** — relatório formatado para partilha/impressão

### 3. Export nos Dashboards Custom (`ReportDashboardView`)

Adicionar botão de export ao header do dashboard que exporta os widgets como CSV (uma secção por widget com os seus dados).

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/utils/reportExport.ts` | **Criar** — funções CSV + PDF |
| `src/pages/ReportsSales.tsx` | **Editar** — DropdownMenu no botão download |
| `src/pages/ReportDashboardView.tsx` | **Editar** — adicionar botão export |
| `package.json` | Adicionar `jspdf` + `jspdf-autotable` |

## Detalhe do CSV

```text
=== SALES PERFORMANCE REPORT ===
Date: 2026-03-28

--- KPIs ---
Metric,Value
Pipeline Total,€125.3K
Won Revenue,€45.2K
Win Rate,32.5%
...

--- Lead Flow (Weekly) ---
Week,Website,Referral,LinkedIn,...
03/02,5,2,3,...

--- Won Revenue by Month ---
Month,Value
Apr 25,€12.3K
...

--- Top Performers ---
Name,Won Value,Deals,Win Rate
João Silva,€25.0K,8,45.0%
...
```

