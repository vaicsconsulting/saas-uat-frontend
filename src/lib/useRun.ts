import { useEffect } from 'react';
import { api } from '../api/client';

/** Calls onChange when anyone changes the run (SSE with polling fallback). */
export function useRunLive(runId: string, onChange: () => void) {
  useEffect(() => api.subscribeRun(runId, onChange), [runId, onChange]);
}
