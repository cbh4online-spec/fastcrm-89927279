import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { useEnrichLead, useEnrichLeadsBatch, getEnrichmentStatus } from "@/hooks/useLeadEnrichment";
import { useLeadEnricherSettings } from "@/hooks/useLeadEnricherSettings";

export interface BatchProgress {
  done: number;
  total: number;
  current: string;
}

interface EnrichmentProcessorContextValue {
  batchProgress: BatchProgress | null;
  isBatchRunning: boolean;
  startBatchEnrichment: (leads?: Lead[]) => Promise<void>;
  stopRequested: boolean;
  requestStop: () => void;
}

const EnrichmentProcessorContext = createContext<EnrichmentProcessorContextValue>({
  batchProgress: null,
  isBatchRunning: false,
  startBatchEnrichment: async () => {},
  stopRequested: false,
  requestStop: () => {},
});

export const useEnrichmentProcessor = () => useContext(EnrichmentProcessorContext);

export function EnrichmentProcessorProvider({ children }: { children: React.ReactNode }) {
  const { data: leads = [] } = useLeads();
  const { settings } = useLeadEnricherSettings();
  const enrichLead = useEnrichLead(settings);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const stopRef = useRef(false);
  const [stopRequested, setStopRequested] = useState(false);
  const runningRef = useRef(false);

  const isBatchRunning = batchProgress !== null && batchProgress.done < batchProgress.total;

  const requestStop = useCallback(() => {
    stopRef.current = true;
    setStopRequested(true);
  }, []);

  const startBatchEnrichment = useCallback(async (customLeads?: Lead[]) => {
    if (runningRef.current) return;
    
    const targetLeads = customLeads ?? leads.filter(l => getEnrichmentStatus(l) === "pending");
    if (targetLeads.length === 0) return;

    runningRef.current = true;
    stopRef.current = false;
    setStopRequested(false);
    
    const total = targetLeads.length;
    let successCount = 0;

    setBatchProgress({ done: 0, total, current: targetLeads[0].name });

    for (let i = 0; i < total; i++) {
      if (stopRef.current) {
        setBatchProgress(prev => prev ? { ...prev, current: "Parado pelo utilizador" } : null);
        break;
      }

      const lead = targetLeads[i];
      setBatchProgress({ done: i, total, current: lead.name });

      try {
        await enrichLead.mutateAsync(lead);
        successCount++;
      } catch (e) {
        console.warn(`[ENRICHER-BG] Failed: ${lead.name}`, (e as Error).message);
      }
    }

    setBatchProgress({ done: stopRef.current ? successCount : total, total, current: "" });
    
    // Clear after a short delay
    setTimeout(() => {
      setBatchProgress(null);
      runningRef.current = false;
      stopRef.current = false;
      setStopRequested(false);
    }, 2000);
  }, [leads, enrichLead]);

  return (
    <EnrichmentProcessorContext.Provider value={{
      batchProgress,
      isBatchRunning,
      startBatchEnrichment,
      stopRequested,
      requestStop,
    }}>
      {children}
    </EnrichmentProcessorContext.Provider>
  );
}
