

## Diagnóstico — Câmara não funciona na Live

### Problema identificado

Há **dois problemas distintos**:

1. **Limitação da plataforma Lovable**: O preview corre dentro de um iframe sandboxed que **não tem permissões `camera` e `microphone`**. A API `getUserMedia` falha silenciosamente ou com `NotAllowedError`. Isto afeta tanto a pré-visualização (GoLiveSetup) como o viewer (SimulatedVideoFeed). **Na app publicada** (fastcrm.lovable.app), a câmara deve funcionar se o utilizador conceder permissão no browser.

2. **Erro de build**: O ficheiro `LiveBadge.tsx` foi criado anteriormente mas parece ter sido removido/corrompido, causando falhas de HMR. Precisa de ser recriado.

### Plano de implementação

**Passo 1 — Recriar `LiveBadge.tsx`**
- Criar o componente em `src/components/c2c/livestream/LiveBadge.tsx` com badge pulsante "AO VIVO" em 3 tamanhos (sm, md, lg), usando as animações CSS já definidas no `index.css`.

**Passo 2 — Melhorar o tratamento de erros da câmara em `C2CGoLiveSetup.tsx`**
- Detectar se está em iframe (`window.self !== window.top`) e mostrar mensagem explicativa.
- Adicionar verificação de `navigator.mediaDevices` antes de chamar `getUserMedia`.
- Mostrar mensagens de erro específicas por tipo (`NotAllowedError`, `NotFoundError`, `NotReadableError`).
- Adicionar botão "Tentar novamente" com feedback visual.

**Passo 3 — Melhorar fallback em `SimulatedVideoFeed.tsx`**
- Quando a câmara não está disponível, usar `thumbnail_url` (se existir) como fundo estático com overlay animado.
- Adicionar prop `thumbnailUrl` ao componente.
- Mostrar mensagem contextual em vez de placeholder genérico.

**Passo 4 — Passar `thumbnail_url` no Viewer**
- Em `C2CLivestreamViewer.tsx`, passar o `thumbnail_url` da live ao `SimulatedVideoFeed`.

### Nota importante
A câmara **só funcionará na app publicada** (não no preview do Lovable). O código será corrigido para lidar graciosamente com esta limitação e dar feedback claro ao utilizador.

### Critérios de aceitação
- Build sem erros
- Mensagem clara quando câmara não está disponível (preview vs publicada)
- Fallback visual com thumbnail quando disponível
- Câmara funcional na app publicada com permissões do browser

