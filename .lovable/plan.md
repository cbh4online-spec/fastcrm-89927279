

# Reorganizar ProductDetailDialog — Layout Profissional

## Diagnóstico

O dialog tem 16+ tabs numa única linha que faz wrap desorganizado. O conteúdo dentro do ScrollArea não tem padding consistente. O header hero funciona mas pode ser mais limpo. As tabs precisam de agrupamento lógico para serem navegáveis.

## Solução

Reorganizar o dialog em 3 eixos: (1) header hero mais compacto e limpo, (2) tabs agrupadas em duas linhas lógicas com separação visual, (3) padding e espaçamento consistente no conteúdo.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/products/ProductDetailDialog.tsx` | Reestruturar layout completo |

### 1. Header Hero — mais compacto

- Reduzir altura da imagem de 220px para 180px
- Mover badges (tipo, status, categoria) para linha única mais compacta
- Alinhar preço e margem na mesma linha que SKU
- Botões de ação mais compactos com tooltips em vez de texto

### 2. Tabs — agrupamento em duas filas lógicas

Organizar as 16 tabs em duas linhas temáticas com `TabsList` estilizado:

**Linha 1 — Core:**
Detalhes | Financeiro | Histórico | Imagens | Progressões | Ciclos | Ficha

**Linha 2 — Avançado:**
Relações | Documentos | Specs | Stock | Analytics | Ciclo de Vida | Entregáveis | Preços

- Usar `flex-wrap` com gap controlado e `text-xs` para caber melhor
- Adicionar ícones apenas na segunda linha (avançado) para diferenciar visualmente
- Tabs condicionais (Componentes, Pacotes) aparecem no início da linha 1

### 3. Conteúdo — padding e espaçamento

- Adicionar `px-5 pb-5` ao ScrollArea inner
- KPI cards e alerts dentro do padding consistente
- Remover `mb-6` / `mb-4` inconsistentes, usar `space-y-4` no wrapper

### 4. Detalhes tab — layout mais limpo

- Cards de preço/custo lado a lado com altura equalizada
- Grid de metadados (SKU, datas, comissão) com estilo de tabela limpa
- Secções condicionais (Consumo, Specs, Vídeo) em cards com header
- Barcode/QR mais compacto

## Resultado esperado

Dialog visualmente mais profissional, com navegação clara entre as 16+ tabs, hierarquia visual correcta no header, e conteúdo bem espaçado. Sem alteração de funcionalidade — apenas layout e UX.

