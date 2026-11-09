import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useHealthStore } from '../store/health-store';
import { syncGoogleHealth } from '../utils/google-health-sync';

/** Syncs Google Health (Fitbit) sleep and Active Zone Minutes on launch and when Recupero comes to the foreground. */
export function useGoogleHealthSync(enabled: boolean) {
  const connected = useHealthStore(state => state.tokens != null);
  useEffect(() => {
    if (!enabled || !connected) return;
    syncGoogleHealth();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') syncGoogleHealth();
    });
    return () => subscription.remove();
  }, [enabled, connected]);
}
