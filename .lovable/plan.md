

## Verificação Facial para Registo de Ponto

### Diagnóstico

- `hr_employees` já tem campo `avatar_url` — é a foto de referência para comparação
- O Kiosk usa `html5-qrcode` para câmara; o Time Tracking usa botões manuais
- A edge function `hr-clock-qr` e `hr-clock-action` já tratam o registo — só precisamos de uma nova edge function para o fluxo facial
- Lovable AI (Gemini) suporta análise de imagens — pode comparar duas faces sem dependências externas

### Arquitectura

```text
┌──────────────────┐    foto capturada     ┌─────────────────────┐
│  Kiosk / Time    │ ──── base64 ────────► │  hr-face-verify     │
│  Tracking UI     │                       │  (edge function)    │
│  (câmara browser)│ ◄── match + action ── │                     │
└──────────────────┘                       │  1. Busca employee  │
                                           │     por ID/código   │
                                           │  2. Compara foto    │
                                           │     via Lovable AI  │
                                           │  3. Se match →      │
                                           │     regista ponto   │
                                           └─────────────────────┘
```

**Fluxo do utilizador:**
1. Colaborador selecciona o seu nome (dropdown) ou digita código de funcionário
2. Câmara captura foto ao vivo
3. Sistema envia foto + employee_id à edge function
4. Edge function busca `avatar_url` do colaborador, envia ambas as imagens ao Lovable AI (Gemini vision) perguntando "São a mesma pessoa?"
5. Se sim → regista ponto (reutiliza lógica de `hr-clock-action`)
6. Se não → rejeita com mensagem de erro

### Plano de Implementação

#### 1. Edge Function `hr-face-verify`

**Ficheiro**: `supabase/functions/hr-face-verify/index.ts`

- Recebe: `{ employee_id, workspace_id, photo_base64 }`
- Busca `avatar_url` e `full_name` do `hr_employees`
- Se não tem `avatar_url` → erro "Sem foto de referência"
- Chama Lovable AI (Gemini 2.5 Flash — rápido, multimodal) com as duas imagens:
  - System: "Compara as duas faces. Responde APENAS 'match' ou 'no_match'."
  - User: imagem de referência + imagem capturada
- Se resultado = "match" → determina entry_type (mesma lógica do `hr-clock-qr`) e regista ponto
- Retorna: `{ success, verified, employee_name, action, recorded_at }`

#### 2. Componente `FaceCaptureDialog`

**Ficheiro**: `src/components/hr/FaceCaptureDialog.tsx`

- Dialog com:
  - Dropdown para seleccionar colaborador (ou campo de código)
  - Preview de vídeo da câmara (`navigator.mediaDevices.getUserMedia`)
  - Botão "Capturar" → tira snapshot via canvas → base64
  - Preview da foto tirada + botão "Verificar e Registar"
  - Estados: idle → capturing → verifying → success/error
- Reutilizável entre Kiosk e Time Tracking

#### 3. Integração no Kiosk (`HRKioskPage.tsx`)

- Adicionar toggle/tab: "QR Code" | "Reconhecimento Facial"
- No modo facial, mostra `FaceCaptureDialog` inline (sem modal, estilo kiosk)
- Resultado aparece no mesmo overlay existente

#### 4. Integração no Time Tracking (`HRTimeTrackingPage.tsx`)

- Novo botão "Verificação Facial" ao lado dos botões de entrada/saída manual
- Abre `FaceCaptureDialog` como dialog modal
- Ao confirmar, executa o fluxo completo

### Pré-requisitos

- Colaboradores devem ter `avatar_url` preenchido (foto de perfil) — sem foto, o sistema avisa
- Câmara disponível no dispositivo (browser solicita permissão)
- `LOVABLE_API_KEY` já configurada para Lovable AI

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/hr-face-verify/index.ts` | Criar — edge function de verificação facial via AI |
| `src/components/hr/FaceCaptureDialog.tsx` | Criar — componente de captura e verificação |
| `src/pages/dashboard/hr/HRKioskPage.tsx` | Alterar — adicionar tab de reconhecimento facial |
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Alterar — adicionar botão de verificação facial |

### Critérios de Aceitação

1. Colaborador com foto de perfil pode registar ponto via câmara
2. Sistema rejeita se o rosto não corresponder
3. Funciona no Kiosk (modo tablet) e no Time Tracking (modal)
4. Erro claro se colaborador não tem foto de referência
5. Registo de ponto (entrada/saída) segue a mesma lógica automática existente
6. Método registado como `"face"` em `hr_time_entries`

### Riscos

- **Precisão**: Gemini vision é bom mas não é um sistema biométrico certificado — adequado para verificação assistida, não para segurança máxima
- **Iluminação**: Fotos com má iluminação podem falhar — UI deve avisar o utilizador
- **Custo**: Cada verificação consome 1 chamada ao Lovable AI — a ter em conta no volume

