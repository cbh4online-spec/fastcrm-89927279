import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useState } from 'react';
import { toast } from 'sonner';

export interface SupplierFeed {
  id: string;
  workspace_id: string;
  supplier_id: string | null;
  feed_name: string;
  feed_url: string;
  feed_type: string;
  auto_sync_enabled: boolean;
  sync_interval_hours: number;
  column_mapping: Record<string, string>;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_rows: number;
  csv_delimiter: string;
  csv_encoding: string;
  is_active: boolean;
  default_markup_pct: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierFeedLog {
  id: string;
  feed_id: string;
  status: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface FeedSyncSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export function useSupplierFeeds() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ['supplier_feeds', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await (supabase.from('supplier_feeds' as any).select('*') as any)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SupplierFeed[];
    },
    enabled: !!workspaceId,
  });

  const createFeed = useMutation({
    mutationFn: async (config: Partial<SupplierFeed>) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await (supabase.from('supplier_feeds' as any).insert as any)({
        workspace_id: workspaceId,
        ...config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_feeds', workspaceId] });
      toast.success('Feed criado com sucesso');
    },
    onError: (e: Error) => toast.error('Erro ao criar feed: ' + e.message),
  });

  const updateFeed = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<SupplierFeed>) => {
      const { error } = await (supabase.from('supplier_feeds' as any).update as any)({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_feeds', workspaceId] });
      toast.success('Feed atualizado');
    },
    onError: (e: Error) => toast.error('Erro ao atualizar feed: ' + e.message),
  });

  const deleteFeed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('supplier_feeds' as any).update as any)({
        is_active: false,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_feeds', workspaceId] });
      toast.success('Feed removido');
    },
    onError: (e: Error) => toast.error('Erro ao remover feed: ' + e.message),
  });

  const syncNow = useMutation({
    mutationFn: async (feedId: string): Promise<FeedSyncSummary> => {
      setSyncingFeedId(feedId);
      const { data, error } = await supabase.functions.invoke('supplier-feed-sync', {
        body: { feed_id: feedId },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.summary as FeedSyncSummary;
    },
    onSuccess: (summary) => {
      setSyncingFeedId(null);
      queryClient.invalidateQueries({ queryKey: ['supplier_feeds', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['supplier_feed_logs'] });
      queryClient.invalidateQueries({ queryKey: ['supplier_products'] });
      toast.success(
        `Sincronização concluída: ${summary.created} criados, ${summary.updated} atualizados, ${summary.errors} erros`
      );
    },
    onError: (e: Error) => {
      setSyncingFeedId(null);
      toast.error('Erro na sincronização: ' + e.message);
    },
  });

  const previewFeed = useMutation({
    mutationFn: async (feedId: string) => {
      const { data, error } = await supabase.functions.invoke('supplier-feed-sync', {
        body: { feed_id: feedId, preview_only: true },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data as { headers: string[]; sample_rows: Record<string, string>[]; total_rows: number };
    },
  });

  return {
    feeds,
    isLoading,
    syncingFeedId,
    isSyncing: syncNow.isPending,
    createFeed,
    updateFeed,
    deleteFeed,
    syncNow,
    previewFeed,
  };
}

export function useSupplierFeedLogs(feedId: string | undefined) {
  return useQuery({
    queryKey: ['supplier_feed_logs', feedId],
    queryFn: async () => {
      if (!feedId) return [];
      const { data, error } = await (supabase.from('supplier_feed_logs' as any).select('*') as any)
        .eq('feed_id', feedId)
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as SupplierFeedLog[];
    },
    enabled: !!feedId,
  });
}
