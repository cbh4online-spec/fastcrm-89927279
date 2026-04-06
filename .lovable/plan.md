
1. Diagnóstico
- Os tickets estão a ser criados com sucesso e existem 3 registos no backend para o workspace atual.
- O problema está na listagem do helpdesk: a query de `useHelpdeskTickets` faz joins embutidos via `contacts:contact_id(...)`, `companies:company_id(...)` e `profiles:assigned_to(...)`.
- Essa query está a falhar com erro 400 no API layer porque o schema não tem relações/fks visíveis para esses joins:
```text
Could not find a relationship between 'support_tickets' and 'contact_id' in the schema cache
```
- Resultado: a query falha antes de devolver linhas, por isso a UI mostra “Sem tickets encontrados” apesar dos tickets existirem.

2. Decisões de produto/UX
- Prioridade máxima: fazer a listagem voltar a mostrar tickets imediatamente.
- A UI não deve depender de joins frágeis para exibir a lista principal.
- Sempre que a listagem falhar, deve existir estado de erro visível com ação de “Tentar novamente”, em vez de parecer lista vazia.
- A associação de cliente e agente deve continuar a aparecer, mas de forma resiliente.

3. Estrutura técnica
- Refatorar `useHelpdeskTickets` para:
  - buscar primeiro `support_tickets` sem relações embutidas;
  - carregar dados auxiliares em queries separadas para `contacts`, `companies` e `profiles`/membros;
  - fazer merge em memória (`contact_name`, `company_name`, `assigned_agent_name`).
- Corrigir o mapeamento do agente:
  - hoje `assigned_to` guarda `user_id`, mas o join tentava resolver por `profiles:assigned_to`, o que já é inconsistente com o padrão usado noutros pontos;
  - passar a resolver nomes de agentes por `profiles.user_id`.
- Expor erro real do hook:
  - devolver `error`, `isError`, `refetch` em `useHelpdeskTickets`.
- Atualizar `HelpdeskTicketsList.tsx` para:
  - mostrar estado de erro se a query falhar;
  - só mostrar “Sem tickets encontrados” quando a query tiver sucesso e vier vazia.
- Validar impacto em:
  - `HelpdeskTicketDetail.tsx`
  - `HelpdeskDashboard.tsx`
  - `TicketRelatedList.tsx`
  - `HelpdeskCharts.tsx`
  porque todos consomem o mesmo hook.

4. Plano de implementação
- Passo 1: substituir o `TICKET_SELECT` com joins por um select simples a `support_tickets`.
- Passo 2: recolher IDs únicos de `contact_id`, `company_id` e `assigned_to`.
- Passo 3: fazer fetch complementar das entidades relacionadas e construir maps por id/user_id.
- Passo 4: devolver `tickets` já enriquecidos sem depender de relações no PostgREST.
- Passo 5: adicionar tratamento explícito de erro na página de listagem.
- Passo 6: rever páginas/componentes dependentes para garantir que continuam a funcionar com o novo formato do hook.
- Passo 7: validar o fluxo completo:
  - criar ticket;
  - voltar à lista;
  - abrir detalhe;
  - verificar cliente/empresa/agente;
  - testar sem contacto, sem empresa e sem agente.

5. Critérios de aceitação
- Um ticket criado aparece imediatamente na lista.
- A lista deixa de fazer requests 400 para `support_tickets?...contacts:contact_id(...)`.
- Quando houver falha de dados, a página mostra erro e opção de retry.
- Cliente, empresa e agente continuam visíveis quando existirem dados.
- O detalhe do ticket continua a abrir normalmente.

6. Riscos e pontos por validar
- `profiles` pode usar `id` nalguns módulos e `user_id` noutros; no helpdesk preciso alinhar explicitamente com o valor real guardado em `assigned_to`.
- Se houver outros componentes a assumir o join antigo, podem precisar de pequeno ajuste.
- Se o objetivo futuro for voltar a usar joins nativos, será necessário criar/regularizar foreign keys reais na base de dados; para resolver já, a abordagem por queries separadas é a mais segura e rápida.
