## Diagnóstico

O scanner já está integrado no **wizard mobile** (`MQPCStepSKU.tsx` — botão `ScanLine` ao lado do input SKU) e o `MQPCStepImages.tsx` já usa `<input capture="environment">` (abre câmara nativa do telemóvel).

**O que falta** (e explica os screenshots enviados):

1. **Screenshot IMG_1086** mostra o `CreateProductDialog.tsx` (diálogo "Criar Produto" usado em desktop **e** quando o utilizador abre a partir da listagem de produtos no telemóvel) — o campo "Código / SKU / Referência" só tem lupa de pesquisa. **Não tem botão de câmara/scanner**, apesar do `BarcodeScannerModal` existir e ser usado noutros sítios (`ProductsList`, `B2BStockPage`, `PurchaseOrderForm`, `GoodsReceiptForm`).
2. **Galeria de imagens do diálogo desktop** (`ProductImageGalleryManager`) só permite upload de ficheiros — não tem botão para "Tirar foto" com a câmara, nem usa `capture="environment"`.
3. **Screenshot IMG_1085** (MQPC mobile) já tem o botão `ScanLine`, mas o utilizador pode não o estar a ver porque está num build em cache, ou porque entra pelo diálogo `CreateProductDialog` (desktop) em vez do wizard mobile.
4. **Erro de runtime**: `Cannot stop, scanner is not running or paused` — o `BarcodeScannerModal` chama `scanner.stop()` sem verificar o estado, gerando exceções no console quando o utilizador fecha rapidamente.

---

## Decisões de produto / UX

- A **câmara para ler códigos** deve estar disponível em **todos os pontos onde se cria/edita produto** — não só no MQPC mobile.
- A **câmara para fotografar produtos** deve estar disponível tanto no wizard mobile (já existe via `capture="environment"`) como no diálogo desktop, com **dois botões distintos** na zona de imagens: "Carregar ficheiros" e "Tirar foto" (este último usa `capture="environment"` em mobile e abre stream de webcam em desktop).
- Em desktop sem câmara, o botão "Tirar foto" cai graciosamente para "selecionar ficheiro".
- O `BarcodeScannerModal` deve permitir alternar **flash/lanterna** (quando suportado) e ter tratamento robusto do ciclo `start/stop` para eliminar o erro de consola.

---

## Estrutura técnica

```text
CreateProductDialog.tsx (desktop)
  └── [novo] botão ScanLine ao lado da lupa no campo SKU
        └── BarcodeScannerModal (já existe)
              └── onScan → setSku(code) + setSkuSearchTrigger(prev+1)

ProductImageGalleryManager.tsx (desktop)
  └── [novo] botão "Tirar foto" + <input capture="environment">
        OU getUserMedia → canvas → blob (desktop com webcam)

BarcodeScannerModal.tsx
  └── [fix] guardar estado isRunning antes de stop()
  └── [fix] evitar removeChild error ao desmontar
  └── [novo] toggle de lanterna (torch) quando track.applyConstraints suporta
```

---

## Plano de implementação

1. **`CreateProductDialog.tsx`** (linhas 678-703):
   - Importar `BarcodeScannerModal` e `ScanLine` do lucide.
   - Adicionar `const [scannerOpen, setScannerOpen] = useState(false)`.
   - Inserir botão `ScanLine` entre o `Input` e o `Button` da lupa.
   - Ao receber código: `setSku(code)` + `setSkuSearchTrigger(prev => prev + 1)` (dispara pesquisa automática).

2. **`ProductImageGalleryManager.tsx`**:
   - Adicionar segundo `<input ref capture="environment" accept="image/*">` escondido.
   - Novo botão "Tirar foto" (ícone `Camera`) ao lado de "Carregar imagens".
   - Reaproveitar o pipeline de upload existente.

3. **`BarcodeScannerModal.tsx`** — robustez:
   - Adicionar `if (scannerRef.current?.isScanning)` antes de `stop()`.
   - Envolver `stop()` em try/catch silencioso.
   - Limpar `innerHTML` do container `barcode-scanner-view` antes de desmontar (evita o `removeChild` error).
   - Adicionar toggle de torch (lanterna) usando `track.applyConstraints({ advanced: [{ torch: true }] })` quando suportado.
   - Mensagem clara quando em iframe (preview do Lovable bloqueia getUserMedia) — sugerir testar em preview publicado.

4. **`MQPCStepImages.tsx`**:
   - Já está correto. Apenas adicionar segundo botão visível "Tirar foto agora" separado de "Galeria" para clarificar a intenção (ambos usam o mesmo file input mas com `capture` vs sem).

5. **Verificar `MQPCStepSKU.tsx`**: já tem botão. Garantir que o build não está em cache — forçar reimport limpo.

---

## Critérios de aceitação

- [ ] No diálogo `CreateProductDialog` (desktop e mobile fora do MQPC), aparece botão de câmara/scanner ao lado do campo SKU/EAN.
- [ ] Ao ler um código com a câmara, o SKU é preenchido e a pesquisa IA é disparada automaticamente.
- [ ] Na zona de imagens do diálogo desktop, existe botão "Tirar foto" que abre câmara nativa no telemóvel ou webcam no desktop.
- [ ] O erro `Cannot stop, scanner is not running or paused` deixa de aparecer na consola.
- [ ] O erro `Failed to execute 'removeChild'` deixa de aparecer ao fechar o scanner.
- [ ] Botão de lanterna funciona em telemóveis Android compatíveis.
- [ ] Mensagem clara em iframe de preview a indicar que a câmara só funciona em produção publicada.

---

## Riscos / pontos por validar

- **Iframe do Lovable**: `getUserMedia` está bloqueado no preview. O scanner só funcionará na URL publicada (`fastcrm.lovable.app`) ou em domínio próprio. Vamos manter mensagem informativa.
- **html5-qrcode** já está como dependência (usado em `HRKioskPage`). Não é necessário instalar nada novo.
- **Permissões**: a primeira utilização pede permissão de câmara — comportamento normal do browser.
