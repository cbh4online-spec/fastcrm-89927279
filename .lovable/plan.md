
# Pagina de Link da Loja + QR Code

## Resumo

Melhorar a secao de URL da loja na pagina de configuracoes, transformando o card basico atual num painel completo de partilha com QR code, botoes de partilha social e opcao de download do QR.

---

## O que existe atualmente

A pagina `StoreSettingsPage.tsx` (linhas 98-116) ja tem um card simples com:
- URL da loja em texto
- Botao copiar
- Botao abrir em nova aba

## O que sera adicionado

### 1. Card de Partilha expandido

Substituir o card atual por uma seccao mais completa com:
- URL da loja com botao copiar (manter)
- QR Code renderizado com `react-qr-code` (ja instalado)
- Botao para download do QR code como imagem PNG
- Botoes de partilha rapida (WhatsApp, Email)
- Preview visual do link

### 2. Componente `StoreShareCard`

Novo componente isolado em `src/components/store-settings/StoreShareCard.tsx`:
- Recebe `storeUrl` como prop
- Renderiza QR code (tamanho 180px, com margem branca)
- Botao "Descarregar QR Code" que converte o SVG para PNG via canvas
- Botao "Copiar Link" com feedback visual
- Botoes de partilha: WhatsApp (`https://wa.me/?text=...`) e Email (`mailto:?subject=...&body=...`)
- Botao "Abrir Loja" para preview

---

## Seccao Tecnica

### Ficheiros a criar
- `src/components/store-settings/StoreShareCard.tsx` -- componente de partilha com QR code

### Ficheiros a modificar
- `src/pages/StoreSettingsPage.tsx` -- substituir o card de URL atual (linhas 98-116) pelo novo `StoreShareCard`

### Dependencias utilizadas (ja instaladas)
- `react-qr-code` -- renderizacao do QR code
- Nenhuma dependencia nova necessaria

### Logica de download do QR
- Usar `ref` no componente QR code para obter o SVG
- Converter SVG para canvas via `new Image()` + `canvas.toDataURL("image/png")`
- Trigger download automatico com `<a>` temporario
