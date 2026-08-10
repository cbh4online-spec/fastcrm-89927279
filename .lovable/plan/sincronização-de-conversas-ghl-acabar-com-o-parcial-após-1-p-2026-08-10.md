# Sincronização de conversas GHL — acabar com o "parcial após 1 páginas"

## Diagnóstico (confirmado no código)

Em `supabase/functions/ghl-sync-conversations/index.ts`:

- O limite de tempo (`maxExecutionTime = 50000`) só é verificado **entre páginas** (linha 737), nunca durante o processamento das conversas de uma página.
- Cada página traz `limit: 50` conversas e, para **cada** conversa, faz chamadas sequenciais ao GHL: contacto (`fetchGHLContact`), detalhe da conversa (`fetchGHLConversationDetail`) e mensagens. São ~150 pedidos sequenciais por página.
- Resultado: a primeira página consome quase todo o orçamento de 50s; ao voltar ao topo do ciclo o tempo já expirou e a execução termina sempre com "tempo máximo atingido após 1 páginas".
- O cursor só é gravado **no fim** de cada página, por isso cada execução avança no máximo uma página. Com o hook a encadear 5 continuações, só ~5 páginas são processadas por sincronização.

Os "+3 outros avisos" são as mensagens agregadas das continuações seguintes (mesmo motivo).

## Plano

### 1. Verificar o tempo dentro da página, com cursor intermédio
Passar a testar o orçamento de tempo também no ciclo por conversa. Quando expirar, gravar o cursor da **última conversa processada** (e não da página inteira), marcar `partial: true` e sair. Assim nenhum trabalho é repetido nem perdido.

### 2. Reduzir o tamanho da página
Baixar `limit` de 50 para 20 conversas, para que uma página caiba folgadamente na janela de execução e o cursor avance com mais frequência.

### 3. Paralelizar o trabalho por conversa
Processar as conversas da página em lotes pequenos (concorrência 4–5) em vez de uma a uma, mantendo a ordem do cursor: contacto, detalhe e mensagens de conversas diferentes passam a correr em paralelo. Reduz o tempo por página em ~4x sem agravar o risco de 429 (o retry com backoff já existente mantém-se).

### 4. Ajustar o encadeamento no frontend
Em `src/hooks/useGHLConversationSync.ts`, subir o limite de continuações automáticas de 5 para 20 e parar cedo quando uma passagem não produzir progresso (0 conversas novas ou actualizadas), evitando ciclos inúteis.

### 5. Mensagem ao utilizador mais clara
Quando `partial` é apenas "ainda há mais para processar", deixar de aparecer como aviso/erro: mostrar estado de progresso ("a continuar…") e reservar a lista de avisos para erros reais (401/403/429/rede/conversas ignoradas).

## Detalhes técnicos
- `supabase/functions/ghl-sync-conversations/index.ts`: verificação de tempo no ciclo interno, `saveCursor` por conversa, `limit=20`, processamento em lotes com `Promise.all`, orçamento reduzido para ~45s para garantir margem de gravação do cursor.
- `src/hooks/useGHLConversationSync.ts`: `MAX_CONTINUATIONS = 20`, paragem por ausência de progresso, agregação de resultados inalterada.
- `src/components/settings/sections/WorkspaceGHLSettings.tsx`: separar "continuação em curso" de "avisos".

## Critérios de aceitação
- Uma sincronização completa a janela `days_back` sem intervenção manual.
- Deixa de aparecer "tempo máximo atingido após 1 páginas" como resultado final.
- Correr duas vezes seguidas não duplica conversas nem mensagens (cursor + dedupe existentes).
- Erros reais (API key, permissões, contactos 404) continuam visíveis com o motivo concreto.

## Riscos / por validar
- Rate limits do GHL com concorrência 4–5; se surgirem 429 frequentes, baixar para 3.
- Ordenação devolvida pelo GHL tem de ser estável para o cursor intermédio ser seguro; validar no primeiro teste com os logs da função.
