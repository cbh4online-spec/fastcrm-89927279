
1. Diagnóstico
- O problema principal não parece ser React, router ou uma exceção runtime da app.
- O sinal mais forte está no arranque do dev server: o log mostra `Port 8080 is in use, trying another one...` e depois o Vite sobe em `http://localhost:8081/`.
- Ao mesmo tempo, os erros de consola mostram o preview a tentar falar com `localhost:8080` por HTTP/WebSocket. Isto cria um desencontro entre a porta esperada pelo preview e a porta real do Vite.
- Resultado provável: o preview fica sem conseguir carregar corretamente nenhuma página.

2. O que confirmei no código
- `vite.config.ts` está fixado em `port: 8080`, mas sem `strictPort: true`.
- Quando a 8080 está ocupada, o Vite muda automaticamente para 8081.
- `server.hmr` só tem `overlay: false`; não há configuração explícita para ambiente com proxy/preview.
- `App.tsx`, `main.tsx` e as rotas principais parecem estruturalmente válidas.
- Não encontrei runtime errors da app que expliquem um ecrã branco total.

3. Decisão técnica
- Tratar isto como problema de configuração do ambiente de preview/dev, não como bug funcional das páginas.
- A correção deve impedir “fallback” silencioso de porta e alinhar o HMR com o host do preview.

4. Plano de implementação
- Atualizar `vite.config.ts` para endurecer a configuração do servidor:
  - adicionar `strictPort: true`
  - configurar `hmr.clientPort` para o porto esperado pelo preview
  - configurar `hmr.protocol` para `wss` no contexto do preview
- Opcionalmente ajustar `host` para uma configuração mais compatível com o proxy do preview, se necessário após a primeira correção.
- Evitar que o Vite mude automaticamente para 8081, porque isso quebra o contrato com o preview.
- Rever se existe algum processo ou configuração no projeto que esteja a causar ocupação recorrente da 8080; se não houver causa no código, a proteção com `strictPort` já evita o estado “app invisível mas servidor vivo noutra porta”.

5. Critérios de aceitação
- O preview volta a abrir `/`, `/dashboard` e a rota atual sem ecrã vazio.
- Deixam de aparecer erros repetidos de websocket do Vite.
- O carregamento inicial funciona sem depender de refreshes múltiplos.
- A navegação entre páginas volta a ser visível no preview.

6. Riscos e pontos a validar
- Se houver um processo externo a ocupar 8080, com `strictPort: true` o servidor vai falhar explicitamente em vez de mudar para 8081. Isso é melhor para diagnóstico, mas pode exigir reinício limpo do sandbox.
- Pode ser necessário um segundo ajuste fino no `hmr` se o proxy do preview exigir host/porta/protocolo mais específicos.
- Depois da correção, convém validar o preview em rota raiz e numa rota interna autenticada.

7. Ficheiro a alterar
- `vite.config.ts`

8. Resumo prático
- O preview não abre porque o servidor de desenvolvimento saiu de 8080 para 8081, mas o ambiente do preview continua a tentar usar 8080.
- A correção deve bloquear essa troca automática e ajustar o HMR para o ambiente de preview.
