import { apiRequest } from './api.js';
import { AppNotification, SecurityEvent } from '../types/index.js';

function watchItems<T extends { _id: string }>(
  fetchItems: () => Promise<T[]>,
  callback: (item: T) => void,
): () => void {
  let initialized = false;
  let knownIds = new Set<string>();
  let stopped = false;

  const poll = async () => {
    try {
      const items = await fetchItems();
      if (stopped) return;

      if (!initialized) {
        knownIds = new Set(items.map((item) => item._id));
        initialized = true;
        return;
      }

      const added = items.filter((item) => !knownIds.has(item._id));
      knownIds = new Set(items.map((item) => item._id));
      added.reverse().forEach(callback);
    } catch {
      // Authentication and transient network errors are handled by the page's initial load.
    }
  };

  void poll();
  const timer = window.setInterval(() => void poll(), 5000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}

export function onNotification(callback: (notification: AppNotification) => void) {
  return watchItems(
    () => apiRequest<AppNotification[]>('/api/v1/notifications/'),
    callback,
  );
}

export function onSecurityEvent(callback: (event: SecurityEvent) => void) {
  return watchItems(
    async () => {
      const result = await apiRequest<{ items: SecurityEvent[] }>('/api/v1/security-events/?limit=100');
      return result.items || [];
    },
    callback,
  );
}
