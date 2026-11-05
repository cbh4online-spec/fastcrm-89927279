# Fase 3: Ações e Dossier Executivo (Crescimento)

## Objetivo
Transformar o diagnóstico das Fases 1 e 2 em trabalho concreto para a equipa e num relatório em PDF para a direção. Tudo usa os números já calculados no servidor; nada é enviado automaticamente.

## O que muda para o utilizador

### 1. Novo separador «Ações»
Fica ao lado de «Indicadores e funil» e de «Diagnóstico executivo». Tem três listas priorizadas:

- **Prioridade 1 — Cobrar saldos em atraso:** clientes com saldo vencido há mais de 60 dias, ordenados pelo valor. Cada linha mostra o saldo, o número de faturas e o maior atraso.
- **Prioridade 2 — Reativar clientes parados:** clientes habituais parados há mais do dobro do seu ritmo normal de compra, ordenados pelo valor anual em risco.
- **Prioridade 3 — Aumentar o valor das compras:** clientes que compram com frequência mas cujas faturas ficam abaixo de 150 € em média. É uma oportunidade para propor packs ou quantidades maiores.

Cada linha tem estas ações:
- **Abrir ficha** do cliente.
- **WhatsApp assistido:** abre a conversa com uma mensagem sugerida (lembrete de pagamento, reativação ou proposta). Respeita os bloqueios de opt-out e consentimento já existentes e não envia nada sozinho.
- **Criar tarefa:** cria um follow-up para o utilizador atual, ligado ao cliente, com prazo de 3 dias e o motivo no texto. Se já existir uma tarefa pendente igual para esse cliente, a tarefa não é duplicada.
- **Selecionar várias linhas → «Criar tarefas»:** cria tarefas em lote, até 50 de cada vez.

No topo de cada lista aparece um resumo, por exemplo: «23 clientes · 187 mil € a cobrar».

### 2. Botão «Exportar dossier (PDF)»
Fica no topo do «Diagnóstico executivo» e usa o período escolhido. O PDF segue a estrutura do relatório de exemplo:
1. Capa: organização, período e data de geração.
2. Resumo executivo: os avisos «Crítico/Atenção» em frases curtas.
3. Concentração de clientes: indicadores e tabela do top 10.
4. Cobrança e antiguidade dos saldos, com os maiores devedores.
5. Clientes parados e valor anual em risco.
6. Valor das faturas por escalão.
7. Plano de ação: as três listas, com até 10 clientes cada.
8. Nota final com a metodologia: datas em hora de Lisboa, pró-formas excluídas e cálculo do atraso sem data de vencimento.

## Fora de âmbito (pode vir mais tarde)
- Envio automático de mensagens ou de emails.
- Envio periódico do dossier por email.
- Sugestão automática de produtos para os packs.

## Detalhes técnicos
- **Nova função de leitura no servidor, `bgi_action_lists(_workspace_id, _start, _end)`:**
  - Usa as mesmas verificações de acesso (membro + módulo `growth-intelligence`).
  - Devolve as 3 listas, com até 100 linhas cada, e acrescenta o telefone principal de cada cliente: da empresa ou do contacto, com recurso ao primeiro contacto da empresa.
  - As regras de elegibilidade ficam em SQL. Os limites de risco (60 dias, 2× o intervalo habitual, 150 €) ficam também em `executiveDiagnostics.ts`, com testes.
- **Tarefas:** inseridas em `tasks` com `related_type` igual a company ou contact. Os campos seguem o padrão de `ContactMobileQuickActions`. A deduplicação faz-se por (cliente + título + estado pendente), lendo antes de inserir. Depois invalida `["tasks"]`.
- **WhatsApp:** usa `openWhatsAppChat` e `availability.ts` / `useWhatsAppStopSignals`, que bloqueiam enquanto carregam. As mensagens-modelo ficam em `src/lib/bgi/actionMessages.ts`, em PT-PT, com o nome do cliente e o valor.
- **PDF:** novo `src/utils/exportGrowthDossierPdf.ts`, com jsPDF + autotable, como o exportador do Sales Coach. Usa os dados já carregados pelos hooks; não faz chamadas novas além de `bgi_action_lists`.
- **Componentes:** `BgiActionLists.tsx` (separador) e o botão de exportação em `BgiExecutiveDiagnostics.tsx`. Os cartões seguem o padrão IXCard.
- Uma regra nova em AGENTS.md sobre as listas de ação e o dossier.

## Critérios de aceitação
- Na PHARLISS, as três listas aparecem com totais coerentes com o Diagnóstico.
- Criar tarefa duas vezes para o mesmo cliente e motivo não duplica a tarefa.
- O WhatsApp fica desativado para clientes com opt-out ou sem telefone.
- O PDF descarrega com todas as secções e os mesmos números do ecrã.
- Os testes das regras passam e a consola fica sem erros novos.

## Riscos e pontos por validar
- Muitos clientes antigos podem não ter telefone. Nesses casos o WhatsApp fica desativado e a tarefa continua disponível.
- O atraso é contado a partir da data da fatura quando falta a data de vencimento, o que pode exagerar os atrasos. Este ponto fica explicado no PDF.
