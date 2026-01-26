
# Trigger.dev Integration Layer for FastCRM

## Executive Summary

This plan implements **Trigger.dev** as the durable execution backbone for AI-driven workflows in the CRM. Trigger.dev will complement the existing workflow automation layer by providing TypeScript-first, observable, and guaranteed-exactly-once execution for background jobs.

## Current State Analysis

### Existing Infrastructure
The project already has a solid foundation:
- **Workflow Engine** (`src/lib/workflowEngine.ts`): Client-side execution with checkpointing
- **Edge Functions**: `workflow-trigger`, `workflow-processor`, `ai-agent-processor`, `ai-agent-scheduler`
- **Database Tables**: `workflow_executions`, `workflow_steps`, `workflow_queue`, `ai_agent_jobs`
- **Job Queue System**: Priority-based processing with locks and retries

### Gaps That Trigger.dev Addresses
1. **No guaranteed durability** - Edge functions can timeout without recovery
2. **No native observability** - Limited visibility into long-running jobs
3. **No cross-step state persistence** - Context can be lost on failures
4. **No native cron scheduling** - Relies on external cron triggers
5. **Limited concurrency control** - No workspace-level throttling

---

## Architecture Design

### Integration Approach

```text
+------------------+      +-----------------+      +------------------+
|   Recommendation |----->|  Trigger.dev    |----->|  Step Executors  |
|     Accepted     |      |   Job Router    |      |  (Edge Functions)|
+------------------+      +-----------------+      +------------------+
        |                         |                        |
        v                         v                        v
+------------------+      +-----------------+      +------------------+
|  AI Agent Jobs   |      |  Job Registry   |      |  Supabase DB     |
|   (Queue)        |      |  (trigger.dev)  |      |  (State Store)   |
+------------------+      +-----------------+      +------------------+
```

### Trigger.dev Job Categories

| Job Type | Purpose | Trigger |
|----------|---------|---------|
| `ai-analysis` | Lead/Opportunity/Client analysis | recommendation_accepted, schedule |
| `workflow-execute` | Durable workflow execution | workflow-trigger |
| `batch-process` | Daily/weekly batch operations | cron schedule |
| `integration-sync` | External system sync (email, WhatsApp) | event, webhook |
| `rag-indexing` | Index historical outcomes | event |

---

## Implementation Details

### Phase 1: Trigger.dev Configuration

**New Files:**
- `trigger.config.ts` - Trigger.dev project configuration
- `src/trigger/client.ts` - Trigger.dev client initialization
- `src/trigger/jobs/index.ts` - Job registry and exports

**Configuration:**
```typescript
// trigger.config.ts
export const config = {
  project: "fastcrm",
  runtime: "supabase-edge",
  retries: {
    default: { maxAttempts: 3, factor: 2, minTimeout: 1000 }
  },
  concurrency: {
    perWorkspace: 5
  }
};
```

### Phase 2: Core Job Definitions

**1. AI Analysis Job** (`src/trigger/jobs/ai-analysis.ts`)
- Handles lead, opportunity, and client analysis
- Integrates with existing `ai-agent-orchestrator`
- Respects cooldown periods and locks
- Emits progress events for observability

**2. Workflow Execution Job** (`src/trigger/jobs/workflow-execute.ts`)
- Durable execution of workflow steps
- Automatic checkpointing between steps
- Parallel step support with aggregation
- Replaces `workflow-processor` polling with push-based execution

**3. Batch Processing Job** (`src/trigger/jobs/batch-process.ts`)
- Daily pipeline review
- Weekly health checks
- Workspace-scoped with throttling
- Uses Trigger.dev native cron scheduling

**4. Integration Sync Job** (`src/trigger/jobs/integration-sync.ts`)
- Email sync operations
- WhatsApp message sending
- Payment webhook processing
- Built-in retry with exponential backoff

### Phase 3: Edge Function Adapters

**New Edge Functions:**
- `supabase/functions/trigger-webhook/index.ts` - Receives Trigger.dev callbacks
- `supabase/functions/trigger-dispatch/index.ts` - Dispatches jobs to Trigger.dev

**Modified Edge Functions:**
- `workflow-trigger/index.ts` - Add Trigger.dev dispatch option
- `ai-agent-lifecycle/index.ts` - Route to Trigger.dev for durable execution

### Phase 4: Observability Dashboard

**New Components:**
- `src/components/jobs/JobMonitoringPanel.tsx` - Real-time job status
- `src/components/jobs/JobExecutionTimeline.tsx` - Step-by-step visualization
- `src/components/jobs/JobRetryControls.tsx` - Manual retry/cancel actions

**New Hooks:**
- `src/hooks/useTriggerJobs.ts` - Job status polling and management
- `src/hooks/useJobMetrics.ts` - Aggregate metrics for dashboard

### Phase 5: Database Schema Extensions

**New Table:** `trigger_job_runs`
```sql
CREATE TABLE trigger_job_runs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  trigger_run_id TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output_data JSONB,
  error_data JSONB,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Technical Specifications

### Job Contract (All Jobs Must Follow)

```typescript
interface TriggerJobPayload {
  workspaceId: string;
  jobType: string;
  entityType?: string;
  entityId?: string;
  recommendationId?: string;
  inputData: Record<string, unknown>;
  idempotencyKey: string;
}

interface TriggerJobResult {
  success: boolean;
  output: Record<string, unknown>;
  stepsExecuted?: number;
  durationMs: number;
  error?: {
    message: string;
    code: string;
    retryable: boolean;
  };
}
```

### Idempotency Strategy

Every job generates an idempotency key:
```typescript
const idempotencyKey = generateKey(
  jobType,
  workspaceId,
  entityId,
  recommendationId,
  Date.now() // Daily uniqueness for scheduled jobs
);
```

### Concurrency Limits

| Scope | Limit | Reason |
|-------|-------|--------|
| Per Workspace | 5 concurrent jobs | Prevent resource hogging |
| Per Entity | 1 concurrent job | Prevent race conditions |
| AI Analysis | 3 concurrent | Respect AI gateway limits |
| Integration Sync | 2 concurrent | External API rate limits |

---

## Files to Create

| File | Purpose |
|------|---------|
| `trigger.config.ts` | Project configuration |
| `src/trigger/client.ts` | Client initialization |
| `src/trigger/jobs/ai-analysis.ts` | AI analysis job definition |
| `src/trigger/jobs/workflow-execute.ts` | Workflow execution job |
| `src/trigger/jobs/batch-process.ts` | Batch processing job |
| `src/trigger/jobs/integration-sync.ts` | Integration sync job |
| `src/trigger/jobs/index.ts` | Job registry |
| `supabase/functions/trigger-webhook/index.ts` | Webhook receiver |
| `supabase/functions/trigger-dispatch/index.ts` | Job dispatcher |
| `src/components/jobs/JobMonitoringPanel.tsx` | Monitoring UI |
| `src/components/jobs/JobExecutionTimeline.tsx` | Timeline UI |
| `src/components/jobs/index.ts` | Component exports |
| `src/hooks/useTriggerJobs.ts` | Job management hook |
| `src/types/trigger.ts` | Type definitions |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/workflow-trigger/index.ts` | Add Trigger.dev dispatch |
| `supabase/functions/ai-agent-lifecycle/index.ts` | Route to Trigger.dev |
| `supabase/config.toml` | Add new edge functions |
| `package.json` | Add @trigger.dev/sdk dependency |

---

## Migration Strategy

### Phase 1: Shadow Mode
- Deploy Trigger.dev alongside existing system
- Log job executions without replacing existing flow
- Compare execution results

### Phase 2: Gradual Rollout
- Enable for new workflows first
- Migrate scheduled jobs
- Keep existing processors as fallback

### Phase 3: Full Migration
- Route all jobs through Trigger.dev
- Deprecate polling-based processors
- Remove redundant edge function calls

---

## Success Criteria

1. **Durability**: Jobs resume after failures without data loss
2. **Observability**: Full visibility into job execution timeline
3. **Idempotency**: Zero duplicate side effects on retries
4. **Performance**: Sub-second job dispatch latency
5. **Scalability**: Handle 1000+ jobs/hour per workspace
