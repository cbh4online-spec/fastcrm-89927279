

# QR Code para Links de Agendamento

## Solução

Adicionar um botão de QR Code na lista de booking pages que abre um dialog/modal com o QR code do link público, pronto para download ou partilha.

## Alterações

### 1. Instalar dependência
- Adicionar `qrcode.react` para gerar QR codes em SVG/Canvas directamente no React.

### 2. Novo componente `BookingQRCodeDialog.tsx`
- Dialog com:
  - QR code grande e nítido (SVG via `qrcode.react`)
  - URL do link visível abaixo
  - Botão "Copiar link"
  - Botão "Descarregar PNG" (converte o SVG/canvas para imagem descarregável)
  - Cor da marca da booking page aplicada ao QR code

### 3. Actualizar `BookingPagesTab.tsx`
- Importar ícone `QrCode` do `lucide-react`
- Adicionar botão QR Code na row de acções de cada booking page (ao lado do Copy)
- Estado para controlar qual página tem o dialog aberto

| Ficheiro | Acção |
|---|---|
| `src/components/scheduling/BookingQRCodeDialog.tsx` | Novo — dialog com QR code, download e copy |
| `src/components/scheduling/BookingPagesTab.tsx` | Adicionar botão QR e estado do dialog |
| `package.json` | Adicionar `qrcode.react` |

## Critérios de aceitação
- Botão QR visível por booking page
- Dialog mostra QR code legível com a URL correcta
- Download PNG funcional
- Cor da marca reflectida no QR code

