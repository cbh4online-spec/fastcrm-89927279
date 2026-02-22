
# Outreach em Massa - Automatizar Sequencia AIDA para Varios Perfis

## Problema

Actualmente, para cada perfil o utilizador tem de: clicar "Gerar Mensagem" -> esperar a IA gerar -> copiar -> abrir Instagram -> enviar. Com 26 perfis isto demora imenso tempo.

## Solucao

Adicionar um botao "Iniciar Sequencia" na barra de accoes em massa (bulk action bar). Ao clicar:

1. O sistema gera automaticamente a Msg 1 (Abertura) para todos os perfis seleccionados em paralelo, usando a edge function existente `generate-prospecting-message`
2. Agenda automaticamente Msg 2 (Dia +3) e Msg 3 (Dia +7) na fila `prospecting_outreach_queue`
3. Apresenta as mensagens geradas num painel de "fila de envio" onde o utilizador pode:
   - Ver a mensagem gerada para cada perfil
   - Clicar "Enviar" (copia + abre Instagram) um por um rapidamente
   - Ou clicar "Enviar Todos" que copia e abre os perfis sequencialmente

## Alteracoes

### 1. Nova Edge Function `batch-generate-prospecting-messages`

Edge function que recebe um array de perfis e gera as 3 mensagens AIDA para cada um em paralelo. Retorna todas as mensagens de uma vez.

- Input: `{ profiles: Array<ProfileData>, tone, workspaceContext, serviceContext }`
- Output: `{ results: Array<{ profileId, messages: [msg1, msg2, msg3] }> }`
- Usa `Promise.allSettled` internamente para gerar em paralelo (batches de 5 para nao sobrecarregar)

### 2. Bulk Outreach Handler em `ProspectingResults.tsx`

Nova funcao `handleBulkOutreach` que:
- Chama a edge function batch para gerar as mensagens da Msg 1
- Guarda os resultados no state local
- Abre um dialog/painel com a fila de envio
- Para cada perfil: insere Msg 2 e Msg 3 na `prospecting_outreach_queue`

### 3. Novo componente `BulkOutreachDialog.tsx`

Dialog que mostra:
- Progresso da geracao ("A gerar mensagens... 5/12")
- Lista de perfis com mensagem gerada, cada um com botao "Copiar + Abrir Instagram"
- Botao "Proximo" que automaticamente copia a proxima mensagem e abre o perfil
- Contador "3/12 enviados"
- Ao enviar cada um, actualiza o `outreach_step` e agenda follow-ups

Layout do dialog:

```text
+------------------------------------------+
| Outreach em Massa          12 perfis      |
|                                           |
| Progresso: [=========>        ] 8/12      |
|                                           |
| [x] Ricardo Salvador - Fisioterapeuta     |
|     "Ola Ricardo, vi que es..."           |
|     [Copiar + Abrir Instagram]  Enviado!  |
|                                           |
| [ ] Ines Viais - Fisioterapeuta           |
|     "Ola Ines, reparei que..."            |
|     [Copiar + Abrir Instagram]            |
|                                           |
| ...                                       |
|                                           |
| [Proximo perfil] [Fechar]                 |
+------------------------------------------+
```

### 4. Botao na Bulk Action Bar

Adicionar botao "Iniciar Sequencia" com icone `Send` na barra que aparece quando perfis estao seleccionados. Filtra apenas perfis com `outreach_step === 0` ou `null`.

## Ficheiros a criar/modificar

- **`supabase/functions/batch-generate-prospecting-messages/index.ts`** (novo) - geracao em batch
- **`src/components/professional-prospecting/BulkOutreachDialog.tsx`** (novo) - dialog de envio em massa
- **`src/components/professional-prospecting/ProspectingResults.tsx`** (modificar) - adicionar botao bulk + handler + estado do dialog

## Fluxo

```text
Utilizador selecciona 12 perfis
       |
       v
Clica "Iniciar Sequencia"
       |
       v
Edge function gera Msg 1 para cada (em paralelo, batches de 5)
       |
       v
Dialog mostra lista com mensagens geradas
       |
       v
Utilizador clica "Proximo" -> copia msg, abre Instagram
       |
       v
Repete para cada perfil (1 clique por perfil)
       |
       v
Sistema agenda automaticamente Msg 2 e Msg 3 para cada
```

## Detalhes tecnicos

### Edge Function `batch-generate-prospecting-messages`

- Recebe ate 20 perfis de cada vez
- Chama `generate-prospecting-message` internamente via fetch para cada perfil
- Usa batches de 5 em paralelo para nao exceder rate limits
- Retorna resultados parciais (fulfilled/rejected) para que falhas individuais nao bloqueiem o resto
- Gera apenas Msg 1; Msg 2 e Msg 3 sao geradas quando o item da fila fica "ready"

### BulkOutreachDialog

- Recebe o array de mensagens geradas
- Estado interno controla qual perfil esta activo
- Botao "Proximo" avanca sequencialmente: copia mensagem do perfil actual, abre URL, marca como enviado, move para o proximo
- Ao marcar como enviado: update `outreach_step = 1` + insert na `prospecting_outreach_queue`
- Progress bar mostra quantos foram enviados
