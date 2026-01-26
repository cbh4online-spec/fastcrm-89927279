/**
 * Hook for managing Trigger.dev job runs
 */

import { useState, useCallback, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import type { TriggerJobRun, TriggerJobType, TriggerJobStatus, EntityType } from '@/types/trigger';

interface UseTriggerJobsOptions {
  status?: TriggerJobStatus[];
  jobType?: TriggerJobType;
  entityType?: EntityType;
  entityId?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useTriggerJobs(options: UseTriggerJobsOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [jobs, setJobs] = useState<TriggerJobRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('trigger_job_runs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }
      if (options.jobType) {
        query = query.eq('job_type', options.jobType);
      }
      if (options.entityType) {
        query = query.eq('entity_type', options.entityType);
      }
      if (options.entityId) {
        query = query.eq('entity_id', options.entityId);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setJobs((data || []) as TriggerJobRun[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, options.status, options.jobType, options.entityType, options.entityId, options.limit]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!options.autoRefresh) return;
    const interval = setInterval(fetchJobs, options.refreshInterval || 5000);
    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, fetchJobs]);

  const cancelJob = useCallback(async (jobId: string) => {
    const { error } = await supabase
      .from('trigger_job_runs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', jobId)
      .in('status', ['pending', 'queued', 'running']);

    if (!error) fetchJobs();
    return !error;
  }, [fetchJobs]);

  const retryJob = useCallback(async (jobId: string) => {
    const { data, error } = await supabase.functions.invoke('trigger-dispatch', {
      body: { action: 'retry', jobRunId: jobId },
    });
    if (!error) fetchJobs();
    return { success: !error, data };
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch: fetchJobs, cancelJob, retryJob };
}
