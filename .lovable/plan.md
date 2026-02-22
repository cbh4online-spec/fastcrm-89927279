

# Abrir DMs do Instagram directamente com mensagem copiada

## Problema

Actualmente o sistema abre o perfil do Instagram (`instagram.com/username`) e copia a mensagem. O utilizador tem de: abrir o perfil -> clicar em "Enviar mensagem" -> colar -> enviar. Sao 3 passos desnecessarios.

## Solucao

Usar o deep link `https://ig.me/m/USERNAME` que abre directamente a conversa de DM com o utilizador no Instagram. A mensagem ja esta copiada no clipboard, entao o utilizador so precisa de colar (Ctrl+V) e clicar "Enviar".

## Alteracoes

### 1. `BulkOutreachDialog.tsx` - Alterar `handleCopyAndOpen`

- Extrair o username do `profile_url` (ex: `instagram.com/joao.silva` -> `joao.silva`)
- Em vez de abrir `profile.profile_url`, abrir `https://ig.me/m/USERNAME`
- Mostrar toast a dizer "Mensagem copiada! Cole (Ctrl+V) na conversa e envie"
- Alterar o texto do botao de "Copiar + Abrir" para "Abrir DM + Copiar"

### 2. `ProspectingMessageDialog.tsx` - Alterar botao existente de perfil individual

- Mesma logica: ao copiar e abrir Instagram para um perfil individual, abrir `ig.me/m/USERNAME` em vez do perfil

### 3. Instrucao visual no dialog

- Adicionar uma pequena nota no topo do `BulkOutreachDialog`: "A mensagem e copiada automaticamente. Na conversa do Instagram, cole (Ctrl+V) e envie."

## Resultado

O utilizador reduz de 4 passos para 2: clicar "Abrir DM" no sistema -> colar e enviar no Instagram.

## Detalhes tecnicos

### Extraccao do username

```text
profile_url: "https://www.instagram.com/joao.silva/"
regex: /instagram\.com\/([a-zA-Z0-9._]+)/
resultado: "joao.silva"
URL DM: "https://ig.me/m/joao.silva"
```

### Ficheiros a modificar

- `src/components/professional-prospecting/BulkOutreachDialog.tsx` - alterar `handleCopyAndOpen` e UI
- `src/components/professional-prospecting/ProspectingMessageDialog.tsx` - alterar botao de abrir Instagram (se existir logica similar)

