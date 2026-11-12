import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSunlightStore } from '../store/sunlight-store';
import { syncSunlight } from '../utils/sunlight-sync';

/**
 * Checks where you are and refreshes the sunshine forecast on launch and when Recupero comes to the foreground.
 * Arrive/leave events themselves come from the shared geofence task (see use-reminder-engine).
 */
export function useSunlightTracking(ready: boolean) {
  const enabled = useSunlightStore(state => state.enabled);
  useEffect(() => {
    if (!ready || !enabled) return;
    void syncSunlight();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void syncSunlight();
    });
    return () => subscription.remove();
  }, [ready, enabled]);
}
