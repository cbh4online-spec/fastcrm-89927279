
# Ajustar Tamanho do Logotipo da Loja

## Problema
O logotipo no header da loja usa `h-8 w-8` (32x32px), que e demasiado pequeno para uma loja online. O tamanho recomendado para logos de e-commerce e entre 40-48px de altura, mantendo a proporcao original.

## Correcao

### Ficheiro: `src/components/store/StoreHeader.tsx`

Alterar a classe do logo de:
```text
h-8 w-8 object-contain rounded
```
Para:
```text
h-10 w-auto max-w-[160px] object-contain rounded
```

Isto garante:
- **Altura de 40px** (h-10) -- tamanho recomendado para headers de e-commerce
- **Largura automatica** (w-auto) -- respeita a proporcao original do logo em vez de forcar um quadrado
- **Largura maxima de 160px** -- evita que logos muito largos ocupem espaco excessivo no header
- O `object-contain` mantem-se para nunca distorcer a imagem

### Resumo

| Local | Antes | Depois |
|---|---|---|
| StoreHeader (logo) | `h-8 w-8` (32x32px, quadrado forcado) | `h-10 w-auto max-w-[160px]` (40px altura, proporcao livre) |
