

# Melhorar UX do Assistente IA por Imagem

## Problema
O botao "Assistente IA" ja existe e analisa fotos, mas nao e suficientemente visivel nem intuitivo. O utilizador tem de carregar a foto e depois procurar o botao para ativar a IA.

## Melhorias Propostas

### 1. Auto-sugestao apos upload de foto
Apos o upload da primeira foto, mostrar automaticamente um banner/card destacado a perguntar: "Queres que a IA preencha o anuncio com base nesta foto?" com botao "Preencher com IA". Isto torna a funcionalidade impossivel de ignorar.

### 2. Botao IA na zona de fotos
Adicionar um botao "Analisar com IA" diretamente na zona de fotos, junto as thumbnails, para ser mais contextual e visivel.

### 3. Auto-trigger opcional
Apos a primeira foto ser carregada, se o titulo estiver vazio, disparar automaticamente a analise IA sem necessidade de clique extra.

## Seccao Tecnica

### Ficheiro: `src/pages/c2c/C2CCreateListing.tsx`

Alteracoes:
- Adicionar um `useEffect` que deteta quando `photos` passa de 0 para 1+ e `title` esta vazio, disparando automaticamente `handleAnalyzeWithAI()`
- Mostrar banner visual animado durante a analise ("A analisar a tua foto com IA...")
- Mover/duplicar o botao "Assistente IA" para dentro da zona de fotos com design mais prominente
- Adicionar estado `autoAnalyzed` para evitar re-trigger

```text
+--------------------------------------------------+
| Fotos                                            |
| [img1] [img2] [+]                                |
|                                                  |
| [sparkles] A analisar a tua foto com IA...       |  <-- banner auto apos upload
| ou                                               |
| [Wand2] Preencher tudo com IA                    |  <-- botao na zona de fotos
+--------------------------------------------------+
```

| Ficheiro | Alteracao |
|---|---|
| `src/pages/c2c/C2CCreateListing.tsx` | Auto-trigger IA apos upload, banner de analise, botao IA na zona de fotos |

