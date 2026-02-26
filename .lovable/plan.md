

# Permitir inserção manual de datas no campo de aniversário

## Problema
O campo de data só permite selecção via calendário (picker), o que é lento para datas de nascimento antigas.

## Solução
Substituir o picker-only por um **input de texto com máscara dd/mm/aaaa** + botão para abrir o calendário como alternativa. O utilizador pode digitar directamente ou usar o picker.

## Alteração: `src/components/custom-fields/InlineEditableField.tsx`

No bloco `case "date"` (linhas 203-232), substituir por:
- Um `Input` com placeholder `dd/mm/aaaa` onde o utilizador digita a data manualmente
- Um botão de calendário ao lado que abre o `Popover` com o `Calendar` como alternativa
- Parsing da data digitada no formato `dd/MM/yyyy` ao guardar (usando `parse` do date-fns)
- Suporte a Enter/Escape como nos outros campos de texto
- Ao seleccionar data no calendário, preenche automaticamente o input e fecha o popover

