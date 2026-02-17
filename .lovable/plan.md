

# Hero Block -- Tornar mais estreito/compacto

## Resumo
Reduzir o tamanho do hero block tornando-o mais fino e compacto, diminuindo o icon, padding e espacamentos.

## Alteracoes

### Ficheiro: `src/components/bio/BioBlockPreviewCard.tsx`

1. **Reduzir o anel exterior**: de `h-28 w-28` (112px) para `h-20 w-20` (80px)
2. **Reduzir o circulo do icon**: de `h-20 w-20` (80px) para `h-14 w-14` (56px)
3. **Reduzir o icon interno**: de `h-12 w-12` para `h-8 w-8`
4. **Reduzir padding do card**: de `p-5 pt-2` para `p-4 pt-2`
5. **Reduzir margem inferior do icon**: de `mb-5` para `mb-3`
6. **Reduzir margem inferior do subtitulo**: de `mb-4` para `mb-3`

Resultado: o hero block fica mais compacto e elegante, mantendo todos os efeitos visuais (glow, anel pulsante, gradiente) mas numa escala mais refinada.

