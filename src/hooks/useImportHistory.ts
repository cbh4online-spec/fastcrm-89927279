import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ImportConfig, ImportResult } from "@/types/import";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface ImportHistoryRecord {
  id: string;
  workspace_id: string;
  import_type: string;
  file_name: string;
  file_size?: number;
  total_rows: number;
  success_count: number;
  error_count: number;
  skip_count: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  column_mapping: Record<string, unknown>;
  field_transformations: Record<string, unknown>;
  conflict_policy: string;
  errors: Array<{ row: number; field?: string; error: string }>;
  created_fields: string[];
  started_at?: string;
  completed_at?: string;
  created_at: string;
  created_by?: string;
}

export function useImportHistory() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["import_history", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("import_history")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ImportHistoryRecord[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreateImportRecord() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      importType,
      fileName,
      fileSize,
      totalRows,
      config,
    }: {
      importType: string;
      fileName: string;
      fileSize?: number;
      totalRows: number;
      config: ImportConfig;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await workspaceClient
        .from("import_history")
        .insert({
          workspace_id: currentWorkspace.id,
          import_type: importType,
          file_name: fileName,
          file_size: fileSize,
          total_rows: totalRows,
          status: 'pending',
          column_mapping: config.columnMappings as unknown as Record<string, unknown>,
          conflict_policy: config.conflictPolicy,
          created_by: user?.id,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data as ImportHistoryRecord;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["import_history", currentWorkspace?.id] });
      console.log(`[IMPORTS] Import record created: ${data.id}, type=${variables.importType}, file=${variables.fileName}, rows=${variables.totalRows}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'IMPORT.STARTED',
          entity_kind: 'import',
          entity_id: data.id,
          source_module: 'core-imports',
          payload: {
            import_type: variables.importType,
            file_name: variables.fileName,
            total_rows: variables.totalRows,
            conflict_policy: variables.config.conflictPolicy,
          },
        });
      }
    },
    onError: (error: Error) => {
      console.warn('[IMPORTS] CREATE_FAILED:', error.message);
    },
  });
}

export function useUpdateImportRecord() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      result,
    }: {
      id: string;
      status: 'processing' | 'complete' | 'error';
      result?: ImportResult;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
      };

      if (status === 'processing') {
        updateData.started_at = new Date().toISOString();
      }

      if (status === 'complete' || status === 'error') {
        updateData.completed_at = new Date().toISOString();
      }

      if (result) {
        updateData.success_count = result.success;
        updateData.error_count = result.errors;
        updateData.skip_count = result.skipped;
        updateData.errors = result.errorDetails;
        updateData.created_fields = result.fieldsCreated;
      }

      const { data, error } = await workspaceClient
        .from("import_history")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ImportHistoryRecord;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["import_history", currentWorkspace?.id] });
      console.log(`[IMPORTS] Import record updated: ${variables.id}, status=${variables.status}`);

      if (currentWorkspace && variables.status === 'complete') {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'IMPORT.COMPLETED',
          entity_kind: 'import',
          entity_id: variables.id,
          source_module: 'core-imports',
          payload: {
            success_count: data.success_count,
            error_count: data.error_count,
            skip_count: data.skip_count,
          },
        });
      }

      if (currentWorkspace && variables.status === 'error') {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'IMPORT.FAILED',
          entity_kind: 'import',
          entity_id: variables.id,
          source_module: 'core-imports',
          payload: {
            error_count: data.error_count,
          },
        });
      }
    },
    onError: (error: Error) => {
      console.warn('[IMPORTS] UPDATE_FAILED:', error.message);
    },
  });
}
