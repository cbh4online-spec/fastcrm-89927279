# Sincronização de conversas GHL — tornar o "parcial" visível e retomável

## Diagnóstico (o que está confirmado no código)

O toast "Sincronização parcial: 95 conversas, 534 mensagens, 1 erros" vem de `src/hooks/useGHLConversationSync.ts`: mostra apenas a **contagem** de erros, nunca o texto do erro. Por isso não é possível saber o que falhou.

Na edge function `ghl-sync-conversations` existem exactamente 4 origens possíveis para 1 erro:
1. Timeout de execução (50s) — `Sincronização parcial: timeout após N páginas.`
2. `API Key inválida ou expirada.` (401)
3. `Acesso negado. Verifique permissões da API.` (403)
4. `Failed to create lead for contact <id>` — um contacto do GHL que não foi possível criar como lead.

Com 95 conversas e 534 mensagens sincronizadas com sucesso, o candidato mais provável é (1) timeout ou (4) um contacto isolado — mas **isto não está confirmado**, porque os logs da função já rodaram (só resta o `shutdown`). Confirmar a causa é o primeiro passo do plano, não uma suposição.

Nota: ao contrário da sync de contactos, a sync de conversas **não guarda cursor** — se parar a meio por timeout, a execução seguinte recomeça do início e volta a parar no mesmo sítio, deixando conversas antigas por importar indefinidamente.

## Plano

### 1. Confirmar a causa real (primeiro)
Correr uma sincronização e ler os logs da função para identificar qual das 4 mensagens ocorreu. O resto do plano é válido em qualquer dos casos, mas a prioridade da fase 3 depende disto.

### 2. Mostrar o erro ao utilizador (sempre útil)
- No hook, incluir a primeira mensagem de erro no toast (como já faz a sync de contactos) e guardar a lista completa em `lastResult`.
- No painel de sincronização, apresentar os erros numa lista expansível ("Ver detalhes"), com o `contactId` clicável quando aplicável.

### 3. Tornar a sincronização retomável
- Persistir o cursor (`lastSortDate` / último `conversationId` processado) numa linha de estado por workspace, escrita a cada página.
- Ao arrancar, retomar do cursor guardado em vez de recomeçar do início; limpar o cursor quando a passagem termina sem interrupção.
- Quando parar por timeout, devolver `partial: true` e o hook continua automaticamente (encadeando chamadas) até concluir ou atingir um limite de tentativas, com a barra de progresso a acumular.

### 4. Tolerância a falhas por contacto
- Um `Failed to create lead` deixa de contar como erro fatal de sync: passa a "conversa ignorada" com o motivo real devolvido pela API do GHL (404, contacto apagado, sem permissões), registado no log e agrupado no resumo.
- Retry único com backoff para falhas transitórias (429/5xx) ao ir buscar o contacto.

## Detalhes técnicos
- `supabase/functions/ghl-sync-conversations/index.ts`: cursor persistido, `partial` no evento `complete`, categorização dos erros (`fatal` vs `skipped`), retry em `fetchGHLContact`.
- Nova tabela/linha de estado de sync por workspace (ou reutilização da tabela de estado já usada pela sync de contactos, a confirmar na implementação), com RLS por `workspace_id` e escrita via service_role.
- `src/hooks/useGHLConversationSync.ts`: loop de continuação, agregação de resultados entre chamadas, toast com detalhe.
- UI do painel de integrações GHL: lista de erros/ignorados.

## Critérios de aceitação
- O toast indica o motivo concreto, não só "1 erros".
- Uma sync interrompida por timeout retoma e conclui sem intervenção manual.
- Contactos inválidos não bloqueiam nem marcam a sync inteira como falhada.
- Correr a sync duas vezes seguidas não duplica conversas nem mensagens.

## Riscos / por validar
- Qual dos 4 erros ocorreu (fase 1) — determina se a fase 3 ou a 4 é a correcção principal.
- Rate limits do GHL ao encadear várias execuções seguidas.
