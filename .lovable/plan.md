

# Plano: Redesenho da Secção Student Journey no Contacto

## Problema Identificado

A interface actual está fragmentada e confusa:
1. Card de perfil com 2 botões redundantes (Ver Perfil / Inscrições)
2. Secção "Jornada do Aluno" vazia (sem inscrições)
3. "Formações Disponíveis" ocupa muito espaço visual
4. Não há hierarquia clara nem call-to-action óbvio

## Solução Proposta

Consolidar tudo num único card organizado em tabs, mostrando claramente:
- O estado actual do aluno
- Cursos onde está inscrito vs disponíveis
- Acção principal clara

## Nova Estrutura Visual

```text
┌─────────────────────────────────────────────────────────────┐
│  [Avatar] Karen Guimarães                      [Badge Lead] │
│           Lifecycle: Lead • Score: 50/100                   │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Minha       │ │ Formações   │ │ Perfil      │            │
│  │ Jornada (0) │ │ Disponíveis │ │ Completo    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│  ══════════════════════════════════════════════             │
│                                                             │
│  [TAB: Minha Jornada - se houver inscrições]                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ✓ Iniciação          │ Em Progresso  │ 85%         │    │
│  │ ○ Básica             │ Por Iniciar   │ 0%          │    │
│  │ ✓ Aromaterapia       │ Concluído     │ 100%        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [TAB: Formações Disponíveis]                               │
│  ┌──────────────────┐ ┌──────────────────┐                  │
│  │ Avançada         │ │ Tricologia       │                  │
│  │ Presencial       │ │ Presencial       │                  │
│  │ [+ Inscrever]    │ │ [+ Inscrever]    │                  │
│  └──────────────────┘ └──────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Alterações Técnicas

### Ficheiro: `src/components/contacts/sections/ContactStudentJourneySection.tsx`

**1. Remover múltiplos Cards e usar Tabs**
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

**2. Novo Layout Consolidado**
- Header unificado com avatar, nome, stage e score
- 3 tabs: "Minha Jornada", "Formações Disponíveis", "Perfil Completo"
- Cada tab tem conteúdo focado e accionável

**3. Tab "Minha Jornada"**
- Lista vertical de inscrições com:
  - Nome do curso
  - Estado (badge colorido)
  - Barra de progresso inline
- Se vazio: mensagem "Ainda não iniciou nenhuma formação"

**4. Tab "Formações Disponíveis"**
- Grid de cursos disponíveis
- Cada curso com botão "Inscrever" directo
- Ao clicar abre o diálogo de inscrição com curso pré-seleccionado

**5. Tab "Perfil Completo"**
- Link para página de detalhe do perfil SJ
- Mostra estatísticas resumidas
- Acções avançadas (editar, follow-up)

## Melhorias de UX

| Antes | Depois |
|-------|--------|
| 3 cards separados | 1 card com tabs |
| Botões redundantes | Navegação por tabs |
| Jornada vazia confusa | Mensagem clara + CTA |
| Cursos sem acção directa | Botão "Inscrever" por curso |
| Informação dispersa | Tudo num só lugar |

## Código Principal

```typescript
<Card>
  <CardHeader>
    {/* Avatar + Nome + Badges */}
    <div className="flex items-center gap-3">
      <Avatar />
      <div>
        <h3>{profile.full_name}</h3>
        <span>Lifecycle: {stage} • Score: {score}</span>
      </div>
      <Badge>{stageConfig.label}</Badge>
    </div>
  </CardHeader>
  
  <CardContent>
    <Tabs defaultValue={enrollments.length > 0 ? "journey" : "available"}>
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="journey">
          Minha Jornada ({enrollments.length})
        </TabsTrigger>
        <TabsTrigger value="available">
          Disponíveis ({availableCourses.length})
        </TabsTrigger>
        <TabsTrigger value="profile">
          Perfil
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="journey">
        {/* Lista de inscrições com progresso inline */}
      </TabsContent>
      
      <TabsContent value="available">
        {/* Grid de cursos com botão inscrever */}
      </TabsContent>
      
      <TabsContent value="profile">
        {/* Links e estatísticas */}
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

## Comportamento das Inscrições

Na tab "Minha Jornada", cada inscrição mostra:
- Ícone de estado (✓ concluído, → em progresso, ○ por iniciar)
- Nome do curso
- Estado como texto colorido
- Barra de progresso pequena
- Clicável para ir ao detalhe

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/contacts/sections/ContactStudentJourneySection.tsx` | Redesenho completo com tabs |

## Resultado Esperado

1. Interface consolidada num único card
2. Navegação clara por tabs
3. "Formações Disponíveis" mostra cursos com botão de inscrição por curso
4. "Minha Jornada" mostra progresso de forma linear e clara
5. Acesso rápido ao perfil completo
6. Mensagens claras quando não há dados

