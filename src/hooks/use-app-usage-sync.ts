import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncAppUsage } from '../utils/app-usage-sync';

/** Syncs auto-tracked app usage on launch and whenever Recupero comes back to the foreground. */
export function useAppUsageSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    syncAppUsage();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') syncAppUsage();
    });
    return () => subscription.remove();
  }, [enabled]);
}
