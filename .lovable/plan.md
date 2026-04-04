
1. Diagnóstico
- O problema actual não está nas páginas React, nas rotas nem na lógica de negócio.
- O problema está no arranque do dev server: a porta 8080 já está ocupada quando o servidor gerido tenta arrancar.
- Evidência:
  - `vite.config.ts` já está com `port: 8080` e `strictPort: true`.
  - O log em `/tmp/dev-server-logs/dev-server.log` mostra várias tentativas do processo gerido a arrancar com `vite --port "8080"` e a falhar com `Error: Port 8080 is already in use`.
  - Antes dessas falhas, o mesmo log já mostra um Vite “ready” em `http://localhost:8080/`, o que indica um processo órfão/paralelo já preso à porta.
  - A consola do browser mostra `[vite] server connection lost. Polling for restart...`, consistente com preview a apontar para um servidor que cai/reinicia ou fica desalinhado com o processo gerido.

2. Do I know what the issue is?
- Sim.
- O problema exacto é: existe um processo Vite extra/orfão a ocupar a porta 8080, e o dev server gerido pelo ambiente deixa de conseguir arrancar. Como `strictPort: true` está activo, ele falha explicitamente em vez de mudar para 8081. Isso é correcto do ponto de vista técnico, mas deixa o preview sem servidor estável.

3. Ficheiros/sinais isolados
- `vite.config.ts` — configuração actual do servidor
- `package.json` — script `dev` é normal (`vite`), sem customizações suspeitas
- `src/main.tsx` — já remove service workers no preview/iframe, portanto não parece ser o causador
- `/tmp/dev-server-logs/dev-server.log` — principal prova do conflito real

4. Decisões técnicas
- Manter `strictPort: true`. Não devo removê-lo, porque isso só esconderia o problema e faria o Vite saltar para 8081, voltando a quebrar o preview.
- Tratar primeiro como problema operacional do ambiente, não como bug da aplicação.
- Só fazer novo ajuste de código se, depois de libertar a porta, continuar a haver instabilidade no proxy/HMR.

5. Plano de implementação
- Passo 1: localizar e terminar o processo órfão que está a usar a porta 8080.
- Passo 2: garantir que fica apenas um único processo Vite gerido pelo ambiente a arrancar em 8080.
- Passo 3: validar novamente o preview na rota `/` e numa rota interna, confirmando que a app monta.
- Passo 4: se o preview continuar instável mesmo com a porta livre:
  - simplificar `server.host` em `vite.config.ts` de `"::"` para `true` ou `0.0.0.0`
  - manter `port: 8080`
  - manter `strictPort: true`
  - manter HMR com `protocol: "wss"` e `clientPort: 443`
- Passo 5: rever se houve algum arranque manual de Vite fora do fluxo normal e evitar voltar a criar processos paralelos no sandbox.

6. O que não vou fazer
- Não vou mexer nas páginas, rotas ou componentes da app sem estabilizar primeiro o servidor.
- Não vou remover `strictPort`.
- Não vou assumir que a culpa é do React sem evidência de runtime error.

7. Critérios de aceitação
- O log do dev server deixa de mostrar o ciclo repetido de `Port 8080 is already in use`.
- Fica apenas um arranque Vite activo em 8080.
- O preview volta a abrir a rota `/` com conteúdo visível.
- A consola deixa de mostrar repetidamente `server connection lost. Polling for restart...`.
- Uma rota interna também abre sem ecrã em branco.

8. Riscos e pontos a validar
- Se o processo que ocupa 8080 for do próprio sandbox e não apenas um Vite órfão, pode ser necessário reinício limpo do ambiente.
- Se, depois de libertar a porta, ainda houver falhas no preview, o problema secundário poderá ser binding/host do Vite e aí faz sentido o ajuste em `server.host`.
- Neste momento, não encontrei evidência de que `App.tsx`, `main.tsx` ou `index.html` sejam a causa raiz.

9. Resumo prático
- O preview não abre outra vez porque a porta 8080 ficou ocupada por um processo paralelo.
- O servidor gerido tenta arrancar, falha por causa do `strictPort`, e o browser fica à espera de um restart que não estabiliza.
- A correcção certa é libertar a 8080 e voltar a ter apenas um único Vite gerido; só depois, se necessário, afinar `host` no `vite.config.ts`.
