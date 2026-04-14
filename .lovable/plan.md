
1. Diagnóstico

Pergunta de controlo: “Sei qual é o problema?” Sim.

O problema não é apenas o preview do iframe. Há 4 causas reais no código atual:

- `C2CGoLiveSetup.tsx`: a stream da câmara é obtida, mas o `videoRef` ainda não existe quando `srcObject` é atribuído. Depois a `<video>` monta sem stream, por isso a pré-visualização fica vazia.
- `SimulatedVideoFeed.tsx`: existe um bug de ciclo de vida ainda mais forte — `setHasCamera(true)` só acontece se `videoRef.current` já existir, mas o `<video>` só existe quando `hasCamera === true`. Resultado: a câmara nunca entra.
- `GoLiveModal.tsx`: permite colocar uma live em estado `live` sem qualquer sessão de vídeo. Ou seja, hoje é possível “estar ao vivo” só na base de dados, sem media real.
- `C2CLivestreamViewer.tsx` + `SimulatedVideoFeed.tsx`: o viewer está a tentar abrir a câmara do próprio utilizador. Isso nunca pode mostrar a câmara do vendedor.

Diagnóstico sénior: neste momento a feature não tem streaming real. Tem estados, chat, cards e placeholders, mas não tem pipeline de emissão/reprodução. Não encontrei player remoto, `playback_url`, HLS, WebRTC, sessão de broadcast nem SDK de live. Por isso, mesmo corrigindo o bug local da preview, a live nunca chegará aos espectadores sem uma camada real de broadcast.

Nota de segurança importante: `c2c_livestreams` está pública para leitura, por isso segredos/tokens/chaves de emissão nunca podem ser guardados nessa tabela.

2. Decisões de produto/UX

- Separar claramente “Pré-visualizar câmara” de “Entrar em direto”.
- O viewer nunca deve pedir acesso à câmara ao espectador.
- “Live Rápida” não pode continuar a criar lives em direto sem media; deve redirecionar para setup ou criar apenas rascunho/agendada.
- Mostrar estados claros:
  - a preparar câmara
  - sem permissão
  - sem dispositivo
  - a iniciar emissão
  - em direto
  - erro de emissão
  - terminada
- Manter `thumbnail_url` apenas como fallback visual enquanto o stream remoto arranca ou quando a live não tem emissão ativa.

3. Estrutura técnica

Frontend
- Corrigir o binding do `MediaStream` com `useEffect` reativo ao `stream`.
- Criar um player com 2 responsabilidades separadas:
  - preview local do vendedor
  - reprodução remota para espectadores
- Remover `getUserMedia` do viewer.

Backend/Lovable Cloud
- Criar uma sessão privada de broadcast para cada live.
- Guardar metadados públicos no registo da live e credenciais sensíveis numa tabela privada protegida por RLS.
- Criar funções de backend para criar sessão, iniciar emissão, entrar como viewer e terminar emissão.

Streaming real
- Integrar um provider de live em browser com arquitetura WebRTC/SFU (recomendação: LiveKit ou Daily, conforme a opção mais rápida/robusta que escolhermos).
- Vendedor publica vídeo; espectadores recebem stream remoto.

Segurança
- Validar JWT, pertença ao workspace e ownership da live nas funções de backend.
- Nunca expor segredos de emissão no cliente.

4. Plano de implementação

Fase 1 — corrigir o que está claramente errado
1. `C2CGoLiveSetup.tsx`
   - renderizar a `<video>` de forma estável
   - anexar `stream` num `useEffect`
   - chamar `play()` com tratamento de erro
   - melhorar estados de permissão/dispositivo
2. `SimulatedVideoFeed.tsx`
   - retirar a lógica de câmara local
   - transformar em player/fallback visual
3. `GoLiveModal.tsx`
   - impedir “Ir ao Vivo” sem setup de media
   - redirecionar para `/dashboard/marketplace/lives/setup`

Fase 2 — implementar live real
4. Criar nova estrutura de dados:
   - campos públicos mínimos na live (`broadcast_status`, `playback_url`, `last_broadcast_error`)
   - tabela privada para sessão de broadcast e credenciais
5. Criar funções de backend para:
   - criar sessão do vendedor
   - obter credenciais/tokens de publicação
   - obter acesso do viewer ao stream
   - terminar a sessão
6. Integrar o SDK do provider no setup e no viewer.
7. Atualizar `C2CLivestreamViewer.tsx` para reproduzir stream remoto em vez de tentar abrir a câmara local.

Fase 3 — QA
8. Testar:
   - preview do vendedor
   - entrar em direto
   - abrir viewer noutro navegador/sessão
   - estado sem permissões
   - fallback com thumbnail
   - mobile
   - lives antigas sem `playback_url`

5. Critérios de aceitação

- O vendedor vê a própria câmara na página de setup na app publicada.
- O espectador não recebe pedido de permissão de câmara ao abrir a live.
- Uma live só passa a `live` quando existe sessão de media válida.
- O viewer mostra vídeo remoto do vendedor.
- Enquanto o stream arranca, existe estado intermédio claro com fallback visual.
- Lives antigas continuam visíveis sem partir a UI.
- Não existem segredos expostos no frontend nem em tabelas públicas.

6. Riscos e pontos por validar

- O preview do Lovable pode continuar a bloquear hardware; a validação real da câmara tem de ser feita na app publicada.
- Para live real será necessário configurar um provider de streaming e os respetivos secrets.
- Safari/iOS pode exigir ajustes de autoplay/permissões.
- É preciso migrar sem quebrar as lives mock já existentes.

Ficheiros mais impactados
- `src/pages/c2c/C2CGoLiveSetup.tsx`
- `src/components/c2c/livestream/SimulatedVideoFeed.tsx` (ou substituição por novo player)
- `src/pages/c2c/C2CLivestreamViewer.tsx`
- `src/components/c2c/livestream/GoLiveModal.tsx`
- `src/hooks/c2c/useLivestreams.ts`
- nova migration + funções de backend para sessões de broadcast

Conclusão operacional:
- Há um bug real de lifecycle que impede a preview local.
- Há também um erro de arquitetura: a “live” atual não transmite vídeo real para espectadores.
- Se aprovares, eu avanço em duas frentes: corrigir já a preview/local setup e montar a infraestrutura certa para a live funcionar mesmo no viewer.
