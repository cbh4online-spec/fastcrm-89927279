# Listagens CRM: cores de leitura + cards de KPI

## Diagnóstico

Na listagem de Empresas todas as colunas são apresentadas com o mesmo peso e a mesma cor: faturação, pago, pendente e vencido aparecem em texto neutro, pelo que uma dívida de 8 056 € parece igual a 0 €. Não existe qualquer bloco de KPIs acima da tabela — o gestor tem de somar mentalmente 117 empresas para perceber o estado da carteira.

O mesmo se aplica a Contactos e Leads, que partilham o layout IX e o cabeçalho de colunas acabado de adicionar.

## O que vai ser feito

### 1. Faixa de KPIs no topo das listagens

Uma linha de cards planos (estilo IX: label maiúsculo pequeno, valor grande, ícone em tile neutro) por cima da tabela, calculada sobre o **conjunto filtrado atual** (respeita pesquisa, filtro de arquivo e estado), com indicação clara de que reflete os filtros.

Empresas:
- Faturação total (s/IVA)
- Recebido
- Pendente
- Vencido (com destaque de risco quando > 0)
- Ticket médio
- Clientes ativos (com faturação nos últimos 12 meses)

Contactos:
- Total de contactos, novos nos últimos 30 dias, com email válido, com telefone, bloqueados/arquivados.

Leads:
- Total, novos 30 dias, qualificados, valor potencial do pipeline, taxa de conversão.

Os cards são clicáveis quando fazem sentido como filtro rápido (ex.: "Vencido" filtra empresas com dívida vencida).

### 2. Código de cor consistente nas colunas

Semáforo financeiro aplicado às células, usando apenas tokens semânticos (sem cores fixas):
- Vencido > 0 → vermelho (destructive); zero → cinza esbatido
- Pendente > 0 → âmbar (warning); zero → cinza esbatido
- Pago / faturação positiva → verde (success) suave
- Valores a zero passam a ficar esbatidos, para o olho saltar direto ao que interessa

Estado de pagamento passa a badge colorido (Pago · Pendente · Vencido · Sem faturas). Categoria ABC, Score PARE e ICP Fit ganham escala de cor por patamar. Colunas de vendas por ano ganham micro-indicador de variação face ao ano anterior (seta + cor).

Linhas: zebra subtil, hover mais evidente, e faixa lateral discreta a vermelho nas empresas com valor vencido. Registos bloqueados/arquivados ficam com opacidade reduzida.

### 3. Tokens de estado

Adicionar tokens `success` / `warning` (e respetivos `-foreground` e variantes suaves) ao design system, se ainda não existirem, para que o semáforo funcione em modo claro e escuro sem cores hardcoded.

## Detalhes técnicos

- Novo componente partilhado `src/components/documents/listing/ListKPIStrip.tsx` (cards planos, estado de carregamento, opcionalmente clicáveis).
- Novo helper `src/components/documents/listing/moneyTone.ts` com as regras de cor por tipo de valor, reutilizado nas três listagens.
- Cálculo dos KPIs em `useMemo` sobre o array `filtered` já existente em `CompaniesListIX` / `ContactsListIX` / `LeadsListIX`, cruzando com `useCompaniesFinancials` — sem novas queries nem alterações de RPC.
- `ListColumnsHeader` ganha alinhamento à direita para colunas numéricas, para casar com as células.
- Tokens em `src/index.css` + `tailwind.config.ts`, apenas se em falta.
- Sem alterações de base de dados, RLS ou lógica de negócio.

## Critérios de aceitação

- KPIs no topo das três listagens, coerentes com os filtros ativos e com os totais já existentes nas fichas.
- Vencido, pendente e pago distinguíveis num relance; valores a zero não competem por atenção.
- Contraste válido em modo claro e escuro; nada de cores fixas fora dos tokens.
- Cabeçalho de colunas, seletor de colunas, ordenação e paginação continuam a funcionar tal como hoje.
- Sem erros de consola e sem quebra de layout em ecrãs estreitos (a faixa de KPIs faz scroll horizontal em mobile).

## Pontos por validar

- "Clientes ativos" fica definido como empresa com faturação nos últimos 12 meses — confirmar se prefere outro critério.
- Se preferir os KPIs só em Empresas nesta fase, aplico apenas aí e deixo Contactos/Leads para depois.
