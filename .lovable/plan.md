
# Tornar os Hero blocks visualmente distintos

## Problema
Os dois hero blocks (Agencias e Empresas) parecem identicos porque as variantes de gradiente 0 e 1 diferem apenas no angulo (135deg vs 160deg), resultando em cores quase iguais.

## Solucao
Alterar o array `GRADIENT_VARIANTS` em `BioBlockPreviewCard.tsx` para que cada variante tenha diferencas de cor (hue shift) muito mais pronunciadas, tornando cada hero block visualmente unico.

## Alteracoes

### Ficheiro: `src/components/bio/BioBlockPreviewCard.tsx`

Substituir as 5 variantes de gradiente por versoes com maior diferenciacao:

- **Variante 0**: Manter o gradiente original (hue +15) -- tom base
- **Variante 1**: Hue shift de +40 com lightness invertida -- tom complementar mais quente
- **Variante 2**: Hue shift de +80 com saturacao boost -- tom contrastante
- **Variante 3**: Hue shift de -30 com lightness mais claro -- tom frio
- **Variante 4**: Hue shift de +120 (analogous complement) -- tom oposto

Valores concretos:
```
Variante 0: h -> h+15   (shift pequeno, original)
Variante 1: h -> h+45   (shift medio-grande, visivelmente diferente)
Variante 2: h -> h+90   (shift grande, cor contrastante)
Variante 3: h-30 -> h   (direcao oposta, mais frio)
Variante 4: h -> h+150  (quase complementar)
```

Isto garante que dois hero blocks consecutivos (indices 0 e 1) tenham cores visivelmente distintas sem necessitar de configuracao manual.
