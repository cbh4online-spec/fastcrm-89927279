
# Plano: Abrir Editor Visual ao Criar Nova Campanha

## Contexto Actual

Quando o utilizador clica em "Nova Campanha", abre o `CampaignFormDialog` que apresenta um `Textarea` para editar HTML manualmente. Isto contrasta com o editor visual profissional (`EmailBuilder`) que ja existe no sistema e oferece uma experiencia drag-and-drop de 3 colunas.

## Solucao Proposta

Modificar o fluxo para que ao criar uma nova campanha, o utilizador seja levado primeiro pelo editor visual. O processo sera:

1. Clique em "Nova Campanha"
2. Abre o editor visual full-screen
3. Utilizador desenha o email com blocos
4. Ao guardar, e mostrado um formulario simples para completar os metadados (nome, assunto, segmento)
5. Campanha e criada com o design visual persistido

---

## Arquitectura da Solucao

```text
+---------------------+     +------------------+     +-------------------+
| "Nova Campanha"     | --> | EmailBuilder     | --> | CampaignSaveModal |
| Button              |     | (Editor Visual)  |     | (Nome, Assunto)   |
+---------------------+     +------------------+     +-------------------+
                                    |
                                    v
                            +------------------+
                            | createCampaign() |
                            | bodyHtml + design|
                            +------------------+
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Marketing.tsx` | Abrir EmailBuilderDialog ao clicar "Nova Campanha" em vez de CampaignFormDialog |
| `src/components/marketing/EmailBuilderDialog.tsx` | Adicionar modo "campaign" que mostra formulario de metadados antes de guardar |
| `src/components/marketing/CampaignFormDialog.tsx` | Manter para edicao de campanhas existentes (que ja tem HTML) |

---

## Implementacao Detalhada

### 1. Criar Componente CampaignCreationFlow

Novo componente que gere o fluxo completo:

```text
// CampaignCreationFlow.tsx

Estado interno:
- step: 'editor' | 'metadata'
- design: EmailDesign
- html: string

Fluxo:
1. Inicialmente step = 'editor', mostra EmailBuilder
2. Quando utilizador clica "Guardar" no EmailBuilder:
   - Recebe (design, html)
   - Muda para step = 'metadata'
   - Mostra formulario simples (nome, assunto, fromName, segmento)
3. Quando utilizador submete formulario:
   - Chama createCampaign com bodyHtml + metadados
   - Fecha dialogo
```

### 2. Formulario de Metadados Simplificado

```text
Campos obrigatorios:
- Nome da Campanha
- Assunto do Email
- Nome do Remetente

Campos opcionais:
- Texto de Preview
- Segmento de destinatarios
- Email de resposta
```

### 3. Modificar Marketing.tsx

```text
// Antes
const [showCampaignDialog, setShowCampaignDialog] = useState(false);

// Depois
const [showCampaignCreation, setShowCampaignCreation] = useState(false);
const [showCampaignEdit, setShowCampaignEdit] = useState(false);
const [campaignToEdit, setCampaignToEdit] = useState(null);

// Novo botao "Nova Campanha" abre fluxo de criacao
<Button onClick={() => setShowCampaignCreation(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Nova Campanha
</Button>
```

---

## Fluxo de Utilizador Apos Implementacao

```text
1. Utilizador clica "Nova Campanha"
   -> Abre editor visual full-screen

2. Arrasta blocos, personaliza design
   -> Clica "Guardar"

3. Aparece modal simples:
   - Nome: "Newsletter Fevereiro 2026"
   - Assunto: "Novidades de Fevereiro"
   - Remetente: "Joao Silva"
   - Segmento: [Dropdown]
   -> Clica "Criar Campanha"

4. Campanha criada com status "draft"
   -> Pode editar, pre-visualizar, enviar
```

---

## Experiencia de Edicao de Campanhas Existentes

Para campanhas ja criadas:
- Se tem `design_json` -> Abre EmailBuilder com o design
- Se so tem `body_html` -> Abre CampaignFormDialog com textarea

Isto requer adicionar campo `design_json` a tabela `marketing_campaigns` para persistir o design visual.

---

## Migracao de Base de Dados

Adicionar coluna para guardar o design visual (permite reedicao futura):

```text
ALTER TABLE marketing_campaigns 
ADD COLUMN design_json JSONB;

COMMENT ON COLUMN marketing_campaigns.design_json IS 
'Design visual do email (JSON do EmailBuilder)';
```

---

## Prioridades de Implementacao

1. Criar `CampaignCreationFlow.tsx` com os dois passos
2. Modificar `Marketing.tsx` para usar o novo fluxo
3. Adicionar coluna `design_json` a base de dados
4. Adaptar edicao de campanhas para detectar se tem design visual
