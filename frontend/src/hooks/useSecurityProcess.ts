import { useCallback, useState } from 'react';
import { SecurityProcessState } from '../components/security/SecurityProcessModal.js';

export function useSecurityProcess() {
  const [process, setProcess] = useState<SecurityProcessState | null>(null);
  const close = useCallback(() => setProcess(null), []);

  const run = useCallback(async <T,>(config: Pick<SecurityProcessState, 'title' | 'subtitle' | 'steps'> & Pick<SecurityProcessState, 'minDurationMs'> & { visual?: SecurityProcessState['visual']; resolveVisual?: (result: T) => SecurityProcessState['visual'] }, action: () => Promise<T>, summarize?: (result: T) => string): Promise<T> => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let step = 0;
    const started = Date.now();
    setProcess({ ...config, activeStep: 0, status: 'running', elapsedMs: 0 });
    timer = setInterval(() => {
      step = Math.min(step + 1, config.steps.length - 1);
      setProcess((current) => current ? { ...current, activeStep: step, elapsedMs: Date.now() - started } : current);
    }, 900);
    try {
      const result = await action();
      const visual = config.resolveVisual?.(result) ?? config.visual;
      setProcess((current) => current ? { ...current, visual, result: summarize?.(result) } : current);
      const minimum = config.minDurationMs ?? 8800;
      if (Date.now() - started < minimum) await new Promise((resolve) => setTimeout(resolve, minimum - (Date.now() - started)));
      if (timer) clearInterval(timer);
      setProcess((current) => current ? { ...current, activeStep: config.steps.length, status: 'success', elapsedMs: Date.now() - started, visual, result: summarize?.(result) || 'Security steps completed.' } : current);
      return result;
    } catch (error) {
      if (timer) clearInterval(timer);
      setProcess((current) => current ? { ...current, status: 'error', elapsedMs: Date.now() - started, error: error instanceof Error ? error.message : 'The operation failed.' } : current);
      throw error;
    }
  }, []);

  return { process, run, close };
}
