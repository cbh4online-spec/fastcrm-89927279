

## Correcção — QRCode recebe valor null

### Diagnóstico

O `react-qr-code` crasha com `TypeError: Cannot read properties of null (reading 'length')` quando recebe `null` como `value`. Isto acontece em `HREmployeeDetailPage.tsx` linha 241, onde `employee.qr_code_token` pode ser null.

### Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/dashboard/hr/HREmployeeDetailPage.tsx` | Envolver o `<QRCode>` numa condição: só renderizar se `employee.qr_code_token` não for null. Mostrar mensagem alternativa quando não existe token. |
| `src/components/security/SecurityQRCode.tsx` | Guardar contra `url` null/undefined nos dois locais onde `<QRCode value={url}>` é usado |
| `src/components/products/ProductBarcodeQRSection.tsx` | Guardar contra `qrValue` null |

### Detalhe

Em cada local, a correcção é simples:

```tsx
// Antes
<QRCode value={employee.qr_code_token} size={250} />

// Depois
{employee.qr_code_token ? (
  <QRCode value={employee.qr_code_token} size={250} />
) : (
  <p className="text-muted-foreground">Nenhum token QR atribuído</p>
)}
```

Aplicar o mesmo padrão defensivo (`value || ""` ou condicional) nos outros ficheiros que usam `<QRCode>` para prevenir recorrência.

