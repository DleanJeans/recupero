import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCuesStore } from '../../store/cues-store';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { getSunlightTaskRuns, type SunlightTaskRun } from '../../utils/sunlight-persist';
import { getSunlightLogEntries, type SunlightLogEntry } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';

function describe(entry: SunlightLogEntry, placeName: (id: string) => string): string {
  if (entry.kind === 'enter') return `Arrived at ${placeName(entry.placeId ?? '')}`;
  if (entry.kind === 'exit') return `Left ${placeName(entry.placeId ?? '')}`;
  if (entry.placeId) return `GPS: at ${placeName(entry.placeId)}`;
  const detail = entry.edgeM != null ? ` (${entry.edgeM} m out, ±${entry.accuracyM ?? '?'} m)` : '';
  return `GPS: away from places${detail}`;
}

/** Recent arrivals, departures and GPS checks, to see why a session did or didn't count (its Settings row opens it). */
export function SunlightTrackingLog() {
  const events = useSunlightStore(state => state.events);
  const samples = useSunlightStore(state => state.samples);
  const trackingSince = useSunlightStore(state => state.trackingSince);
  const places = useCuesStore(state => state.places);
  const placeName = (id: string) => places.find(place => place.id === id)?.name ?? 'a removed place';
  const [runs, setRuns] = useState<SunlightTaskRun[]>([]);
  useEffect(() => {
    void getSunlightTaskRuns().then(setRuns);
  }, []);
  const entries = getSunlightLogEntries(events, samples);
  const lastRun = (task: SunlightTaskRun['task']) => runs.filter(run => run.task === task).at(-1);
  const describeRun = (run: SunlightTaskRun | undefined) =>
    run ? `${day(run.ts)} ${formatTime(run.ts)} (${run.appState === 'active' ? 'app open' : 'background'})` : 'never';
  const backgroundRuns = runs.filter(run => run.appState !== 'active').length;
  const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <Text style={styles.meta}>
        {`Counting since ${day(trackingSince)} ${formatTime(trackingSince)} · ${events.length} arrivals/departures · ${samples.length} GPS checks`}
      </Text>
      <Text style={styles.meta}>
        {`Background wake-ups: last GPS batch ${describeRun(lastRun('precise'))} · last place event ${describeRun(lastRun('geofence'))} · ${backgroundRuns} of the last ${runs.length} ran in the background`}
      </Text>
      {entries.length === 0 && <Text style={styles.meta}>Nothing recorded yet.</Text>}
      {entries.map(entry => (
        <View
          key={`${entry.source}${entry.ts}${entry.kind}${entry.placeId}`}
          style={styles.row}
        >
          <Text style={styles.time}>{`${day(entry.ts)} ${formatTime(entry.ts, undefined, true)}`}</Text>
          <Text
            style={[styles.text, entry.kind !== 'sample' && styles.geofence, entry.ignored && styles.ignored]}
            numberOfLines={1}
          >
            {`${describe(entry, placeName)}${entry.ignored ? ' · ignored' : ''}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    paddingHorizontal: 4,
  },
  meta: {
    color: Colors.text.faint,
    fontSize: 11,
    lineHeight: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  time: {
    color: Colors.text.muted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  text: {
    flex: 1,
    color: Colors.text.faint,
    fontSize: 11,
  },
  geofence: {
    color: Colors.text.secondary,
  },
  ignored: {
    color: Colors.text.dim,
    textDecorationLine: 'line-through',
  },
});
