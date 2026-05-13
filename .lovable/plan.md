## Diagnóstico

Existe já um sistema de templates LeadChef em `src/utils/leadchef/templates.ts` (seed por workspace) e um renderer com variáveis dinâmicas em `src/utils/leadchef/templateRenderer.ts` que suporta `{{firstName}}`, `{{appointmentDate}}` e `{{appointmentTime}}` — formatadas em pt-PT (ex.: `29/12/2025`, `17:30`) a partir de `appointmentAt`.

As categorias `demo_confirmation` e `demo_reminder` já existem. Basta adicionar dois novos registos default e fazer seed nos workspaces existentes, à semelhança do que foi feito para os templates de listas de compras.

## Plano de execução

1. **`src/utils/leadchef/templates.ts`** — adicionar dois templates default:
   - **Confirmação momento Bimby** (`category: demo_confirmation`, `channel: whatsapp`, `is_default: true`)
     ```
     Olá {{firstName}}, fica marcado o vosso momento Bimby para o dia {{appointmentDate}} às {{appointmentTime}}.

     Confirma, por favor, se está tudo de acordo com o combinado. Até já! 🙌
     ```
   - **Lembrete momento Bimby** (`category: demo_reminder`, `channel: whatsapp`, `is_default: true`)
     ```
     Olá {{firstName}}, passo só para lembrar do nosso momento Bimby marcado para {{appointmentDate}} às {{appointmentTime}}.

     Mantém-se? Qualquer ajuste é só dizer. Até já! 👩‍🍳
     ```

2. **Migração SQL** — inserir os dois novos templates em `leadchef_message_templates` para todos os workspaces que já têm templates LeadChef instalados (mesmo padrão `INSERT … SELECT DISTINCT workspace_id … WHERE NOT EXISTS` usado nas migrações anteriores), com `is_default=true`, `is_active=true` e `variables` calculadas (`['firstName','appointmentDate','appointmentTime']`).

## Critérios de aceitação

- Os dois templates aparecem em `/dashboard/leadchef/templates` em todos os workspaces existentes, dentro das categorias “Confirmação de demonstração” e “Lembrete de demonstração”.
- Ao enviar a partir de um compromisso da agenda, `{{appointmentDate}}` e `{{appointmentTime}}` são automaticamente substituídos pela data/hora do compromisso (formato pt-PT, ex.: `29/12/2025` e `17:30`), garantindo coerência com a agenda.
- `{{firstName}}` é resolvido a partir do nome do lead.
- Novos workspaces criados a partir daqui recebem os templates pelo seed em `templates.ts`.

## Riscos / pontos por validar

- A frase é fluída tanto para “momento Bimby” em singular como “vosso momento Bimby”; mantemos “vosso” conforme o exemplo enviado.
- O `appointmentDate` é renderizado como `dd/mm/aaaa`. Se preferires formato extenso (“segunda-feira, 29 de dezembro”), terá de ser adicionada uma nova variável (ex.: `appointmentDateLong`) — fora do âmbito desta tarefa, posso fazer num passo seguinte se quiseres.
