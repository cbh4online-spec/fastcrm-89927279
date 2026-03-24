import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'

// ── Prospect Search ───────────────────────────────────────────────────────────
export function useFirecrawlSearch() {
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (params: {
      query: string
      limit?: number
      include_content?: boolean
      campaign_id?: string
    }) => {
      const { data, error } = await supabase.functions.invoke('firecrawl-search', {
        body: { ...params, workspace_id: currentWorkspace?.id },
      })
      if (error) throw error
      return data as {
        success: boolean
        results: Array<{ url: string; title: string; description: string; content_preview?: string }>
        total: number
        query: string
      }
    },
  })
}

// ── Company Enrichment ────────────────────────────────────────────────────────
export function useFirecrawlEnrichCompany() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (params: {
      company_id?: string
      lead_id?: string
      website_url: string
    }) => {
      const { data, error } = await supabase.functions.invoke('firecrawl-company-enrich', {
        body: { ...params, workspace_id: currentWorkspace?.id },
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      if (vars.company_id) qc.invalidateQueries({ queryKey: ['company', vars.company_id] })
      if (vars.lead_id) qc.invalidateQueries({ queryKey: ['lead', vars.lead_id] })
    },
  })
}

// ── Knowledge Base URL Import ──────────────────────────────────────────────────
export function useFirecrawlImportURL() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (params: {
      url: string
      knowledge_base_id: string
      crawl_subpages?: boolean
      max_pages?: number
    }) => {
      const { data, error } = await supabase.functions.invoke('firecrawl-url-import', {
        body: { ...params, workspace_id: currentWorkspace?.id },
      })
      if (error) throw error
      return data as { success: boolean; imported_count: number; document_ids: string[] }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['knowledge-documents', vars.knowledge_base_id] })
    },
  })
}

// ── Market Intelligence Search ────────────────────────────────────────────────
export function useFirecrawlMarketSearch() {
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (params: {
      sectors: string[]
      country?: string
      analysis_depth?: 'quick' | 'deep'
    }) => {
      const { data, error } = await supabase.functions.invoke('firecrawl-market-search', {
        body: { ...params, workspace_id: currentWorkspace?.id },
      })
      if (error) throw error
      return data
    },
  })
}

// ── Competitors ────────────────────────────────────────────────────────────────
export function useCompetitors() {
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  return useQuery({
    queryKey: ['competitors', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .from('competitors' as any)
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      return (data ?? []) as unknown as Array<{
        id: string
        workspace_id: string
        name: string
        website_url: string
        tracked_pages: string[]
        notes: string | null
        last_scraped_at: string | null
        last_change_detected_at: string | null
        changes_count: number
        is_active: boolean
        created_at: string
      }>
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  })
}

export function useAddCompetitor() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (params: {
      name: string
      website_url: string
      tracked_pages?: string[]
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('competitors' as any)
        .insert({
          workspace_id: currentWorkspace?.id,
          name: params.name,
          website_url: params.website_url,
          tracked_pages: params.tracked_pages ?? ['/', '/pricing', '/features'],
          notes: params.notes,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitors', currentWorkspace?.id] })
    },
  })
}

export function useTrackCompetitor() {
  const qc = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (params: {
      competitor_id: string
      url: string
      track_pages?: string[]
    }) => {
      const { data, error } = await supabase.functions.invoke('firecrawl-competitor-track', {
        body: { ...params, workspace_id: currentWorkspace?.id },
      })
      if (error) throw error
      return data as { success: boolean; changes_detected: number; changes: Array<{ page: string; change_type: string; summary: string }> }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitors', currentWorkspace?.id] })
    },
  })
}

export function useCompetitorSnapshots(competitorId: string) {
  const { currentWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['competitor-snapshots', competitorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('competitor_snapshots' as any)
        .select('*')
        .eq('competitor_id', competitorId)
        .eq('workspace_id', currentWorkspace?.id!)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data ?? []) as unknown as Array<{
        id: string
        competitor_id: string
        page_path: string
        page_url: string
        content_hash: string
        content_preview: string | null
        has_changed: boolean
        created_at: string
      }>
    },
    enabled: !!competitorId && !!currentWorkspace?.id,
  })
}
