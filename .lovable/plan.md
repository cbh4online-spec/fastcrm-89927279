

## Diagnóstico

A observação é 100% correta. A câmara funciona no setup porque o `C2CGoLiveSetup.tsx` faz `getUserMedia` e liga o stream ao `<video>`. Mas quando carregas "Ir ao Vivo":

1. `handleGoLive()` chama `stopCamera()` — **mata o stream**
2. Navega para `/dashboard/marketplace/lives/{id}` (viewer)
3. O viewer (`C2CLivestreamViewer.tsx`) renderiza `SimulatedVideoFeed` **sem prop `stream`**
4. `SimulatedVideoFeed` sem stream mostra o placeholder animado

O componente `SimulatedVideoFeed` já aceita uma prop `stream` e sabe renderizar vídeo real. O problema é que **ninguém lhe passa o stream na página do viewer**.

## Plano

### Passo 1 — Criar hook `useCameraStream`
Extrair a lógica de câmara (`getUserMedia`, `stopCamera`, error handling, iframe detection) para um hook reutilizável `src/hooks/c2c/useCameraStream.ts`. Evita duplicação entre setup e viewer.

### Passo 2 — Viewer do owner com câmara
Em `C2CLivestreamViewer.tsx`, quando `isOwner && isLive`:
- Usar `useCameraStream` para obter o stream local
- Passar o `stream` ao `SimulatedVideoFeed`
- Não chamar câmara para espectadores (não-owners)

### Passo 3 — Não matar o stream antes de navegar
Em `C2CGoLiveSetup.tsx`, remover a chamada `stopCamera()` no `handleGoLive()`. O stream será limpo pelo cleanup do `useEffect` quando o componente desmonta. O viewer reabrirá a câmara automaticamente.

### Passo 4 — Mostrar controlo de câmara/mic no viewer (owner)
Adicionar botões de toggle câmara/microfone para o owner na barra do viewer, para que possa controlar durante a transmissão.

### Ficheiros impactados
- **Novo:** `src/hooks/c2c/useCameraStream.ts`
- **Editar:** `src/pages/c2c/C2CLivestreamViewer.tsx` — usar hook, passar stream
- **Editar:** `src/pages/c2c/C2CGoLiveSetup.tsx` — usar hook, remover `stopCamera()` no goLive

### Nota
Para espectadores (não-owners), continuará a mostrar o placeholder até haver streaming remoto real (WebRTC/HLS). Mas para o **owner**, a câmara ficará visível durante toda a live.

