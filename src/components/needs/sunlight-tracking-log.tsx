import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCuesStore } from '../../store/cues-store';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { getSunlightLogEntries, type SunlightLogEntry } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';

function describe(entry: SunlightLogEntry, placeName: (id: string) => string): string {
  if (entry.kind === 'enter') return `Arrived at ${placeName(entry.placeId ?? '')}`;
  if (entry.kind === 'exit') return `Left ${placeName(entry.placeId ?? '')}`;
  return entry.placeId ? `GPS: at ${placeName(entry.placeId)}` : 'GPS: away from places';
}

/** What tracking saw recently (geofence arrivals/departures and GPS checks), to see why a session did or didn't count. */
export function SunlightTrackingLog() {
  const [open, setOpen] = useState(false);
  const events = useSunlightStore(state => state.events);
  const samples = useSunlightStore(state => state.samples);
  const trackingSince = useSunlightStore(state => state.trackingSince);
  const places = useCuesStore(state => state.places);
  const placeName = (id: string) => places.find(place => place.id === id)?.name ?? 'a removed place';
  const entries = open ? getSunlightLogEntries(events, samples) : [];
  const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen(value => !value)}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text style={styles.toggle}>{open ? 'Hide tracking log' : 'Show tracking log'}</Text>
      </Pressable>
      {open && (
        <>
          <Text style={styles.meta}>
            {`Counting since ${day(trackingSince)} ${formatTime(trackingSince)} · ${events.length} arrivals/departures · ${samples.length} GPS checks`}
          </Text>
          {entries.length === 0 && <Text style={styles.meta}>Nothing recorded yet.</Text>}
          {entries.map(entry => (
            <View
              key={`${entry.source}${entry.ts}${entry.kind}${entry.placeId}`}
              style={styles.row}
            >
              <Text style={styles.time}>{`${day(entry.ts)} ${formatTime(entry.ts, undefined, true)}`}</Text>
              <Text
                style={[styles.text, entry.kind !== 'sample' && styles.geofence]}
                numberOfLines={1}
              >
                {describe(entry, placeName)}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    paddingHorizontal: 4,
  },
  toggle: {
    color: Colors.text.light,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 4,
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
});
