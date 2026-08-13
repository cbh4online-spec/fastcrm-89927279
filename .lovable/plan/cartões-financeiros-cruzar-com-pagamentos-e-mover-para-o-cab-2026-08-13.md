# Cartões financeiros: cruzar com pagamentos e mover para o cabeçalho

## Diagnóstico (confirmado)

Na Adicionavita Lda os cartões mostram **Total 2.656,00 € / Pago 0,00 € / Pendente 2.656,00 €**, mas a empresa tem 7 pagamentos registados (2.159,34 €) e as 5 faturas estão como `partially_paid` com `amount_paid` preenchido.

Causa: o navegador **não consegue ler a tabela de pagamentos**. Testado ao vivo na antevisão — o pedido às faturas devolve dados (200 com 5 linhas), o pedido aos pagamentos devolve `[]`.

Motivo técnico: a regra de acesso das faturas usa a função `is_workspace_member()` (que inclui o bypass de super admin), enquanto a regra dos pagamentos compara diretamente com a tabela de membros. O utilizador atual vê faturas por ser super admin, mas não é membro direto — logo os pagamentos ficam invisíveis e o "Pago" cai para zero.

Além disso, o cálculo dos cartões só soma a tabela de pagamentos e ignora o `amount_paid` da fatura (valor que vem do SAF-T), pelo que qualquer falha de leitura aparece como 0 em vez do valor real.

## O que vai ser feito

### 1. Corrigir o acesso aos pagamentos
Migração que substitui as políticas de `invoice_payments` (ver/inserir/editar/apagar) para usarem `is_workspace_member(auth.uid(), workspace_id)`, alinhando-as com as das faturas. Sem alargar acesso a quem não pertence ao workspace.

### 2. Tornar os cartões consistentes com o histórico
Em `useFinancialKPIs`:
- Pago por fatura = maior valor entre a soma dos pagamentos registados e o `amount_paid` da própria fatura (nunca superior ao total).
- Vencido passa a ser calculado por data de vencimento em atraso (não só pelo estado `overdue`), tal como no relatório financeiro.
- Pendente = total − pago, das faturas não vencidas.

Resultado esperado nesta empresa: Total 2.656,00 € · Pago 2.159,34 € · Pendente/Vencido 496,66 €.

### 3. Cartões no cabeçalho do cliente
- Nova variante compacta da faixa de KPIs (`FinancialKPIStrip` com `variant="header"`): uma linha com 4 valores, sem cartões grandes.
- Passa a aparecer no cabeçalho da ficha (por baixo do nome/badges) em Empresas e em Contactos/ENI, visível em todos os separadores.
- Removida a faixa duplicada de dentro do separador **Financeiro**.
- Responsivo: 4 colunas em desktop, 2 em tablet, scroll horizontal em mobile.

## Detalhes técnicos

- `supabase/migrations/*`: DROP/CREATE das 4 políticas de `invoice_payments`.
- `src/hooks/useFinancialKPIs.ts`: novo cálculo (pagamentos ∪ `amount_paid`, vencido por `due_date`).
- `src/components/shared/FinancialKPIStrip.tsx`: prop `variant: 'cards' | 'header'`.
- `src/components/companies/CompanyDetailWithSidebar.tsx` e `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`: mover a faixa para o cabeçalho.

## Critérios de aceitação

- Pago nos cartões = soma do histórico de pagamentos mostrado no separador Financeiro.
- Total = Pago + Pendente + Vencido (tolerância de arredondamento de cêntimo).
- Cartões visíveis no cabeçalho em qualquer separador da ficha, sem duplicação.
- Utilizador não-membro continua sem ver pagamentos de outros workspaces.

## Riscos

- Faturas com `amount_paid` desatualizado face aos recibos SAF-T continuam a divergir do extrato; a regra "maior dos dois" evita mostrar 0, mas convém validar uma amostra depois da correção.
