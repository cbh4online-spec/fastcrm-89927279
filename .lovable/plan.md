
1. Diagnóstico
- O erro actual já não aponta para React, rotas ou componentes da app.
- O problema está no arranque do dev server: a porta 8080 volta a ficar ocupada e, com `strictPort: true`, o Vite falha logo no start.
- Confirmei no código que:
  - `package.json` tem `dev: "vite"` e não faz limpeza preventiva da porta.
  - `vite.config.ts` mantém `strictPort: true`, o que é correcto para o preview.
  - o log mostra um Vite já “ready” em `localhost:8080` e, logo a seguir, novos arranques a falhar com `Port 8080 is already in use`.
- Resultado: o preview entra em ciclo de reconexão (`server connection lost`) e pode ficar em branco.

2. Do I know what the issue is?
- Sim.
- O problema exacto é: a correcção anterior protegeu o preview contra fallback para 8081, mas não tornou o arranque auto-recuperável. Sempre que fica um processo Vite órfão na 8080, o arranque seguinte falha.

3. Decisões de produto/UX
- Não mexer em páginas, rotas nem lógica de negócio.
- Corrigir ao nível do arranque do ambiente, porque é aí que está a causa raiz.
- Manter a exigência de correr na 8080 para não voltar ao problema de preview noutra porta.

4. Estrutura técnica
- Ficheiros a alterar:
  - `package.json`
  - `vite.config.ts`
- Estratégia:
  - tornar o script `dev` auto-curativo
  - manter `strictPort: true`
  - manter HMR com `protocol: "wss"` e `clientPort: 443`
  - só mexer em `host` se ainda houver instabilidade depois da limpeza automática

5. Plano de implementação
- Alterar `package.json` para que o script `dev`:
  - liberte preventivamente a porta 8080
  - ignore o caso em que não existe processo
  - arranque depois o `vite` normalmente
- Fazer esta limpeza inline no próprio `dev` script, em vez de depender de `predev`, para garantir compatibilidade com a forma como o ambiente injeta `--port "8080"`.
- Exemplo da abordagem pretendida:
  - `fuser -k 8080/tcp >/dev/null 2>&1 || true; vite`
- Manter `vite.config.ts` com:
  - `strictPort: true`
  - `hmr.protocol: "wss"`
  - `hmr.clientPort: 443`
- Se, após esta alteração, o preview continuar instável:
  - normalizar `server.host` de `"::"` para `true` ou `"0.0.0.0"`
- Não alterar `src/main.tsx` nem componentes React, porque não há evidência de bug funcional aí.

6. Detalhes técnicos
- O ambiente está a lançar o projecto com `vite --port "8080"`, por isso a 8080 continua a ser obrigatória.
- Isso significa que a solução robusta não é permitir fallback para 8081; é garantir que a 8080 fica livre antes de cada arranque.
- O `strictPort: true` deve ficar, porque protege o contrato do preview.
- A mudança crítica passa do `vite.config.ts` para o `package.json`.

7. Critérios de aceitação
- O arranque deixa de falhar com `Error: Port 8080 is already in use`.
- O dev server volta a subir de forma consistente na 8080.
- O preview abre `/` sem ecrã em branco.
- A consola deixa de repetir `[vite] server connection lost. Polling for restart...`.
- Reinícios sucessivos do ambiente deixam de exigir intervenção manual.

8. Riscos e pontos por validar
- A limpeza da porta é específica do ambiente Linux do sandbox, mas é adequada neste contexto.
- Se existir algum outro processo legítimo na 8080, ele será terminado; neste ambiente isso é aceitável porque essa porta está reservada ao preview.
- Se o erro persistir mesmo com limpeza automática, o próximo suspeito é `server.host`, não a app React.
