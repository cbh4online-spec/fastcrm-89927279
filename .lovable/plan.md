

# Configuração de Imagens por Tipo de Página no Wizard de eBook

## Contexto

Actualmente, o wizard gera 1 imagem por capítulo em formato "wide", sem controlo sobre quantidade, tamanho ou posicionamento. O utilizador quer definir estas configurações no passo "Imagens" do wizard.

## Solução

Adicionar um painel de configuração de imagens no Step 4 do wizard, abaixo do style picker, com presets por tipo de página e opções de tamanho/posição.

### 1. Novo componente `EbookImageLayoutConfig.tsx`

Configuração visual com presets por tipo de página:

| Tipo de Página | Imagens | Tamanho Default | Posição Default |
|---|---|---|---|
| Capa | 1 | Full (100%) | Centro |
| Capítulo (intro) | 1 | Grande (75%) | Topo |
| Conteúdo | 0-2 | Médio (50%) | Lateral / Inline |
| CTA / Autor | 1 | Pequeno (30%) | Lateral |

Opções configuráveis:
- **Quantidade por página**: 0, 1 ou 2 imagens
- **Tamanho**: Pequeno (30%), Médio (50%), Grande (75%), Full (100%)
- **Posição**: Topo, Centro, Lateral esquerda, Lateral direita, Fundo

UI: Cards colapsáveis por tipo de página com selectors visuais (botões icon-based para posição, slider ou botões para tamanho).

### 2. Actualizar `EbookWizard.tsx`

- Adicionar estado `imageLayoutConfig` com defaults por tipo de página
- Passar config ao prompt de geração de imagem (aspect ratio, formato)
- Mapear tamanho para aspect ratio no prompt: Small→square, Medium→4:3, Large→16:9, Full→panoramic
- Incluir posição nos metadados do capítulo para o renderer usar

### 3. Actualizar `EbookImageStylePicker.tsx`

- Integrar o novo componente como secção adicional abaixo das keywords

### 4. Actualizar geração de imagens no wizard

- Ajustar prompt com base no tamanho/posição escolhido
- Respeitar `count: 0` para não gerar imagem em tipos configurados sem imagem
- Guardar metadados de layout (`imageSize`, `imagePosition`) nos dados do capítulo

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/EbookImageLayoutConfig.tsx` | Novo — painel de configuração de imagens por tipo de página |
| `src/components/ebooks/EbookWizard.tsx` | Integrar config, passar ao gerador |
| `src/components/ebooks/EbookImageStylePicker.tsx` | Compor com o novo componente |

## Critérios de Aceitação

- Utilizador pode configurar quantidade (0-2), tamanho e posição por tipo de página
- Defaults sensatos aplicados automaticamente
- Prompt de geração reflecte o tamanho/posição escolhido
- Custo de créditos actualiza conforme o total de imagens configurado
- UI limpa e intuitiva com presets visuais

