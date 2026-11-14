import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useCuesStore } from '../store/cues-store';
import { useSunlightStore } from '../store/sunlight-store';
import { syncSunlightNotification } from '../utils/sunlight-notification';
import { syncPreciseTracking } from '../utils/sunlight-precise-tracking';
import { closeOutdoorStretchAtNewPlace, syncSunlight } from '../utils/sunlight-sync';

/**
 * Checks where you are and refreshes the sunshine forecast on launch and when Recupero comes to the foreground,
 * and keeps the live "counting sunlight" notification in step with settings and new events.
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

  const preciseTracking = useSunlightStore(state => state.preciseTracking);
  useEffect(() => {
    if (ready) void syncPreciseTracking();
  }, [ready, enabled, preciseTracking]);

  useEffect(() => {
    if (!ready) return;
    syncSunlightNotification();
    const unsubscribeSunlight = useSunlightStore.subscribe(syncSunlightNotification);
    const unsubscribePlaces = useCuesStore.subscribe((state, previous) => {
      if (state.places === previous.places) return;
      syncSunlightNotification();
      const known = new Set(previous.places.map(place => place.id));
      const addedAt = Date.now();
      for (const place of state.places) {
        if (!known.has(place.id)) {
          closeOutdoorStretchAtNewPlace(place, addedAt).catch(error =>
            console.warn('Sunlight new place check failed', error),
          );
        }
      }
    });
    return () => {
      unsubscribeSunlight();
      unsubscribePlaces();
    };
  }, [ready]);
}
