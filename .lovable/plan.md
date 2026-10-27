# Cobranças: mostrar faturas e histórico nos processos importados

## Diagnóstico (confirmado nos dados)
- O processo "Esthetic Institute Wittig Celia Wittig" diz 1 fatura / 13.501,60 €, mas não tem nenhuma fatura ligada. A fatura existe: **FT V101.01/977**, 13.501,60 €, vence 15/10/2026, por pagar, na mesma empresa.
- O mesmo acontece em **215 dos 251** processos da PHARLISS: foram importados da lista de dívidas ARTSOFT, mas a ligação às faturas (vindas do SAF-T) nunca foi criada.
- O "Histórico" só mostra ações de cobrança; como nenhuma foi registada, aparece vazio — nem a importação aparece.
- "Dias em atraso: 0" está certo para esta fatura (ainda não venceu).

## O que vai mudar
1. **Ligar as faturas em falta** a cada processo: para cada empresa/contacto do processo, ligar as faturas e notas de débito em aberto (por pagar ou parcialmente pagas). Recalcular o total em dívida, nº de faturas e data mais antiga a partir dessas faturas. Processos sem nenhuma fatura em aberto ficam assinalados para revisão (não são fechados automaticamente).
2. **Página do processo**: se não houver ligações, mostrar as faturas em aberto da empresa com aviso «Faturas da empresa (não ligadas ao processo)» e botão «Ligar ao processo».
3. **Histórico**: passa a incluir a criação/importação do processo e os recebimentos das faturas ligadas (data, valor, documento), além das ações de cobrança.
4. **Importações futuras**: a importação ARTSOFT passa a procurar a fatura já existente da empresa (nº de documento ou valor + empresa) antes de criar o processo, para não voltar a ficar sem ligação.

## Detalhes técnicos
- Backfill por migração em `collection_case_invoices` (snapshot total/pago/vencimento), só `document_type in ('invoice','debit_note')`, `total - amount_paid > 0`, mesma `workspace_id`; atualizar `collection_cases.total_due/total_paid/invoices_count/oldest_due_date`. Relatório antes/depois por processo.
- `useCollectionCase.ts`: fallback por `company_id`/`contact_id`; histórico une `collection_actions`, evento de criação e `invoice_payments` das faturas ligadas.
- `collections-import-apply`: correspondência com faturas existentes antes de inserir.
- Teste: processo com fatura em aberto da empresa fica ligado; nota de crédito/recibo nunca é ligado.

## Riscos / por validar
- Se a dívida ARTSOFT não bater com as faturas em aberto no FastCRM, o total do processo muda — será listado para revisão.
