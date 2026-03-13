import { useState, useEffect, useCallback } from "react";
import { circuitBreaker, CircuitOpenError, type CircuitState } from "@/services/circuit-breaker";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export function useCircuitBreaker(moduleId: string) {
  const { currentWorkspace } = useWorkspace();
  const [state, setState] = useState<CircuitState>("CLOSED");
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    const s = circuitBreaker.getState(moduleId);
    setState(s.state);
    setFailureCount(s.failureCount);

    const unsub = circuitBreaker.onStateChange((mId, from, to, reason) => {
      if (mId !== moduleId) return;
      setState(to);
      setFailureCount(circuitBreaker.getState(moduleId).failureCount);

      // Persist to DB
      if (currentWorkspace?.id) {
        supabase
          .from("circuit_breaker_states")
          .upsert(
            {
              workspace_id: currentWorkspace.id,
              module_id: moduleId,
              state: to,
              failure_count: circuitBreaker.getState(moduleId).failureCount,
              last_failure_at: circuitBreaker.getState(moduleId).lastFailureAt
                ? new Date(circuitBreaker.getState(moduleId).lastFailureAt!).toISOString()
                : null,
              last_success_at: circuitBreaker.getState(moduleId).lastSuccessAt
                ? new Date(circuitBreaker.getState(moduleId).lastSuccessAt!).toISOString()
                : null,
              opened_at: to === "OPEN" ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "workspace_id,module_id" }
          )
          .then(() => {
            // Log history
            supabase.from("circuit_breaker_history").insert({
              workspace_id: currentWorkspace.id,
              module_id: moduleId,
              from_state: from,
              to_state: to,
              reason,
            });
          });
      }

      // Notify user
      if (to === "OPEN") {
        toast.error(`Módulo "${moduleId}" indisponível — a usar dados em cache`, { duration: 5000 });
      } else if (to === "CLOSED" && from !== "CLOSED") {
        toast.success(`Módulo "${moduleId}" recuperado`, { duration: 3000 });
      }
    });

    return unsub;
  }, [moduleId, currentWorkspace?.id]);

  const execute = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      return circuitBreaker.execute(moduleId, fn);
    },
    [moduleId]
  );

  const reset = useCallback(() => {
    circuitBreaker.reset(moduleId);
  }, [moduleId]);

  return {
    state,
    isOpen: state === "OPEN",
    isHalfOpen: state === "HALF_OPEN",
    failureCount,
    execute,
    reset,
  };
}

export { CircuitOpenError };
