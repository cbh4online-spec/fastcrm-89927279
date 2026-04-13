
1. Diagnóstico

- Já consegui isolar a causa principal: não é “só” um problema da API.
- Prova concreta: os logs da edge function `ghl-list-social-channels` mostram que o endpoint genérico do GHL responde `200` e já devolve pelo menos uma página Facebook:
  - `platform: "facebook"`
  - `type: "page"`
  - `name: "Jorge Cardoso Digital"`
- Mesmo assim, a função termina com:
  - `Returning 1 channels: ["whatsapp:+351925990747"]`
- Isto indica um bug no nosso parser, não no componente React.
- Causa raiz provável: o parser atual não percorre estruturas aninhadas como `results.accounts`, por isso ignora os canais sociais devolvidos pelo GHL e só sobra o fallback de WhatsApp.
- Confirmado também:
  - `Strategy1` e `Strategy2` dão `404`
  - `Strategy6` (conversations) só encontra `TYPE_PHONE`
- Conclusão:
  - Facebook já está a vir da API e está a ser descartado pelo nosso código.
  - Instagram ainda não está provado: pode estar no payload e estar a ser descartado também, ou pode não estar a ser devolvido pelo GHL para esta location/token.

2. Decisões de produto/UX

- Manter a UI atual da lista com:
  - pesquisa
  - checkboxes
  - toggle ativo/inativo
  - botão “Guardar Seleção”
- O objetivo é que a lista mostre todos os canais descobertos pelo GHL, mesmo sem conversas recentes.
- Se depois do patch o GHL continuar sem devolver Instagram/Facebook adicionais, deixamos isso explícito via diagnóstico/logs em vez de parecer um bug invisível.

3. Estrutura técnica

- `supabase/functions/ghl-list-social-channels/index.ts`
  - tornar a extração recursiva para suportar payloads aninhados:
    - `results.accounts`
    - `results.pages`
    - `data.results.accounts`
    - outras variantes equivalentes
  - normalizar melhor:
    - tipo (`platform`, `type`, `provider`, etc.)
    - id (`id`, `profileId`, `oauthId`, `pageId`, `accountId`)
    - nome (`name`, `username`, `pageName`, `accountName`)
  - usar o endpoint genérico `/social-media-posting/{locationId}/accounts` como fonte principal
  - manter conversations apenas como fallback
  - adicionar logs estruturados por estratégia:
    - quantos registos brutos vieram
    - quantos foram normalizados
    - que tipos foram detetados

- `src/components/settings/sections/WorkspaceGHLSettings.tsx`
  - manter o render atual, porque o problema principal não está aqui
  - alinhar pequenas inconsistências de contagem/labels entre `facebook` e `messenger`, para não mostrar zeros errados quando os canais aparecerem

- Governação dos canais selecionados
  - rever:
    - `supabase/functions/ghl-webhook-message/index.ts`
    - `supabase/functions/ghl-sync-conversations/index.ts`
    - `supabase/functions/ghl-send-message/index.ts`
  - hoje estas funções filtram só por `channel_type`
  - para a seleção por página/perfil funcionar de forma real, precisam de passar a considerar também o identificador do canal (`ghl_account_id`) quando esse id existir no payload
  - fallback seguro:
    - se o GHL não enviar identificador suficiente, mantém-se compatibilidade por `channel_type`

4. Plano de implementação

- Passo 1: corrigir o parser da edge function para ler corretamente payloads aninhados do GHL.
- Passo 2: reforçar os logs da discovery para separar claramente:
  - problema de parsing
  - problema de endpoint
  - ausência real de dados no GHL
- Passo 3: retestar “Atualizar canais GHL” com a tua location real.
- Passo 4: ajustar a UI apenas no que for necessário para refletir corretamente os canais devolvidos.
- Passo 5: fechar o ciclo funcional, aplicando a seleção guardada também no inbound/outbound/sync por canal específico.
- Passo 6: validar se Instagram continua ausente por limitação do GHL/token ou se passa a aparecer após o patch.

5. Critérios de aceitação

- Ao clicar em “Atualizar canais do GHL”, a lista passa a mostrar todos os canais que o endpoint genérico do GHL devolver.
- Se o GHL devolver Facebook e Instagram, esses canais aparecem com:
  - ícone correto
  - checkbox
  - toggle ativo/inativo
  - persistência no backend
- Se um canal específico estiver desativado, deixa de ser usado no fluxo desse workspace.
- Se algum canal continuar em falta, fica comprovado por logs que o GHL não o devolve, em vez de ficar ambíguo.

6. Riscos e pontos por validar

- O GHL pode usar ids diferentes entre:
  - discovery de contas
  - mensagens/webhooks
- Se isso acontecer, posso precisar de estender a persistência para guardar aliases/identificadores adicionais do canal.
- Os endpoints específicos de Facebook/Instagram já mostraram `404`, por isso o endpoint genérico passa a ser o caminho principal.
- Para Instagram, ainda falta a validação final pós-patch para distinguir:
  - parser defeituoso
  - limitação real da API/token/location

7. Resultado esperado após aprovação

- Corrijo primeiro o bug real já comprovado no nosso código.
- Depois valido tecnicamente, com logs reais, se ainda existe algum limite do GHL para Instagram.
- Ou seja: avanço para uma resolução sénior, baseada em evidência, e não numa suposição.
