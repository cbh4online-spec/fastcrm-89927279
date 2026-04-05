

# Melhorar Secção de Especificações — Produto na Loja

## Problema
A secção de especificações no `StoreProductPage.tsx` (linhas 681-699) usa um layout simples `flex justify-between` com texto alinhado à direita, sem ícones nem hierarquia visual. Resultado: aspecto monótono, pouco apelativo para o visitante.

## Solução

Redesenhar a secção de especificações com:

1. **Layout em grid de cards** — cada spec num card individual com ícone + label + valor
2. **Ícones contextuais por chave** — mapeamento automático de nomes de spec comuns (brand, weight/peso, resolution, connectivity, audio, sensor, power, storage, protection, temperature, etc.) para ícones Lucide adequados, com fallback genérico
3. **Estilo 3D subtil** — cards com `shadow-md`, `hover:shadow-lg`, gradiente suave no fundo do ícone, e leve transform `hover:-translate-y-0.5` para efeito de elevação
4. **Valores alinhados à esquerda** — label e valor ambos à esquerda, valor abaixo do label
5. **Grid responsivo** — 2 colunas mobile, 3 colunas tablet, 4 colunas desktop

## Implementação

### Ficheiro: `src/pages/store/StoreProductPage.tsx` (linhas 681-699)

Substituir o bloco de especificações por um grid de cards onde cada card tem:
- Círculo com gradiente contendo o ícone Lucide mapeado
- Label (key) em texto `font-medium text-xs uppercase tracking-wide text-muted-foreground`
- Value em texto `font-semibold text-sm`
- Card com `rounded-xl border bg-card shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`

### Mapeamento de ícones (inline no componente)

Mapa de ~20 chaves comuns (brand→Tag, weight/peso→Scale, resolution→Monitor, audio→Volume2, power→Zap, sensor→Eye, storage→HardDrive, connectivity→Wifi, protection→Shield, temperature→Thermometer, lens→Aperture, compression→FileCode, nightVision→Moon, wdr→Sun, compatibility→Puzzle, etc.) com fallback `Info`.

### Sem novos ficheiros — apenas modificação inline no `StoreProductPage.tsx`

A alteração é isolada à secção de especificações (~20 linhas substituídas por ~40 linhas).

