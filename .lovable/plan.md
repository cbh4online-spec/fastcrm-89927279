

## Diagnóstico: FastMatch - Estado Atual vs. Funcional

### O que já existe (infraestrutura completa)
- Tabelas: `fastmatch_profiles`, `fastmatch_interests`, `fastmatch_connections`, `fastmatch_reputation_reviews`
- Hooks: discovery, quota, interests, connections, reviews, profile CRUD
- UI: cards de perfil, quota indicator, dialogs de interesse/conexão, badges
- CRM auto-provisioning: ao desbloquear conexão, cria empresa + contacto + oportunidade
- Função `consume_fastmatch_quota` no banco

### Porque não funciona
1. **Sem onboarding de perfil** - Não existe formulário para criar/editar o perfil FastMatch. Sem perfis, a discovery devolve lista vazia
2. **Sem cálculo de score estratégico** - O campo `strategic_score` nunca é preenchido por IA
3. **Discovery limitada ao workspace** - Só encontra perfis do mesmo workspace (faz sentido para rede privada, mas precisa de perfis)

### Plano para tornar funcional e diferenciador

#### 1. Criar Profile Onboarding Wizard (novo componente)
**Ficheiro:** `src/components/fastmatch/ProfileSetupWizard.tsx`

Wizard em 3 passos que aparece quando o utilizador não tem perfil:
- **Passo 1 - Empresa:** Nome, indústria (select), público-alvo, ticket range, website, LinkedIn
- **Passo 2 - Serviços:** Serviços oferecidos (tags/chips), serviços procurados (tags/chips), bio
- **Passo 3 - Revisão:** Preview do perfil antes de publicar

Usa `useUpdateFastMatchProfile()` para guardar. Após criação, status = "active".

#### 2. Integrar Wizard na página Discovery
**Ficheiro:** `src/pages/fastmatch/FastMatchDiscoveryPage.tsx`

- Se `myProfile` é `null` → mostrar `ProfileSetupWizard` em vez da discovery
- Se `myProfile` existe mas `status !== "active"` → mostrar banner para completar perfil
- Adicionar botão "Editar Perfil" no header quando perfil existe

#### 3. Criar Profile Edit Dialog
**Ficheiro:** `src/components/fastmatch/ProfileEditDialog.tsx`

Dialog reutilizável com os mesmos campos do wizard, pré-preenchidos. Acessível pelo botão "Editar Perfil".

#### 4. AI Strategic Scoring (edge function)
**Ficheiro:** `supabase/functions/fastmatch-score/index.ts`

Edge function que usa Lovable AI para calcular `strategic_score` e `strategic_reasons`:
- Input: perfil A + perfil B
- Prompt: analisa complementaridade (serviços oferecidos vs. procurados, indústria, público-alvo)
- Output via tool calling: `{ score: number, reasons: string[] }`
- Invocada após criação/edição de perfil para recalcular scores contra todos os perfis ativos
- Armazena resultado em `fastmatch_profiles.strategic_score` e `strategic_reasons`

#### 5. Trigger de recálculo automático
**Ficheiro:** `src/hooks/useFastMatchProfile.ts` (editar onSuccess)

Após criar/atualizar perfil, invocar a edge function `fastmatch-score` para recalcular compatibilidades.

#### 6. Melhorias UX na Discovery
**Ficheiro:** `src/pages/fastmatch/FastMatchDiscoveryPage.tsx`

- Ordenar perfis por `strategic_score` descendente (já faz isto)
- Adicionar badge visual de compatibilidade (Alta >75%, Média >50%)
- Mostrar "razões estratégicas" em cada card (já suportado no `MatchProfileCard`)
- Empty state melhorado com CTA para convidar membros

### Resumo de ficheiros
| Ação | Ficheiro |
|------|---------|
| Criar | `src/components/fastmatch/ProfileSetupWizard.tsx` |
| Criar | `src/components/fastmatch/ProfileEditDialog.tsx` |
| Criar | `supabase/functions/fastmatch-score/index.ts` |
| Editar | `src/pages/fastmatch/FastMatchDiscoveryPage.tsx` |
| Editar | `src/hooks/useFastMatchProfile.ts` |

### Impacto diferenciador
- **Onboarding guiado** → perfis reais aparecem na rede
- **IA calcula compatibilidade** → matching estratégico, não aleatório
- **Razões explicadas** → utilizador entende porque deve conectar
- **CRM auto-provisioning** já existe → conexão gera pipeline automaticamente

