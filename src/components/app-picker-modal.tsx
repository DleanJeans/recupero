import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppUsage, type LaunchableApp } from '../../modules/app-usage';
import { useBehaviorStore } from '../store/behavior-store';
import { getAppUsageTotals } from '../utils/app-usage-totals';
import { findAutoTrackedBehavior } from '../utils/app-usage-utils';
import { Colors } from '../utils/colors';
import { formatDuration } from '../utils/time-utils';
import { FullScreenModal } from './full-screen-modal';
import { Text, TextInput } from './text';

interface AppPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onPick: (app: LaunchableApp) => void;
  /** Tag apps with no behavior yet as "New" (the caller makes one for them). */
  markNew?: boolean;
}

const MOST_USED_COUNT = 6;
const iconCache = new Map<string, string | null>();

type Row = { kind: 'header'; title: string } | { kind: 'app'; app: LaunchableApp; usageMs?: number; key: string };

/** The app's icon, loaded when its row scrolls into view. Blank until the icon arrives (or on older builds). */
function AppRowIcon({ packageName }: { packageName: string }) {
  const [uri, setUri] = useState<string | null>(iconCache.get(packageName) ?? null);

  useEffect(() => {
    if (iconCache.has(packageName) || !AppUsage?.getAppIcon) return;
    let cancelled = false;
    AppUsage.getAppIcon(packageName)
      .catch(() => null)
      .then(result => {
        iconCache.set(packageName, result);
        if (!cancelled) setUri(result);
      });
    return () => {
      cancelled = true;
    };
  }, [packageName]);

  return uri ? (
    <Image
      source={{ uri }}
      style={styles.icon}
    />
  ) : (
    <View style={styles.icon} />
  );
}

/** "Choose an app": full-screen, searchable, most-used apps first, with the behavior that already tracks each app. */
export function AppPickerModal({ visible, onClose, onPick, markNew = false }: AppPickerModalProps) {
  if (!visible) return null;
  return (
    <AppPickerScreen
      onClose={onClose}
      onPick={onPick}
      markNew={markNew}
    />
  );
}

function AppPickerScreen({ onClose, onPick, markNew }: Omit<AppPickerModalProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const behaviors = useBehaviorStore(s => s.behaviors);
  const [apps, setApps] = useState<LaunchableApp[] | null>(null);
  const [usage, setUsage] = useState<Map<string, number>>(new Map());
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!AppUsage) {
      setApps([]);
      return;
    }
    AppUsage.getLaunchableApps()
      .then(list => setApps([...list].sort((a, b) => a.label.localeCompare(b.label))))
      .catch(() => setApps([]));
    getAppUsageTotals()
      .then(setUsage)
      .catch(() => undefined);
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!apps) return [];
    const q = query.trim().toLowerCase();
    if (q) {
      return apps
        .filter(app => app.label.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q))
        .map(app => ({ kind: 'app', app, usageMs: usage.get(app.packageName), key: app.packageName }));
    }
    const mostUsed = apps
      .filter(app => (usage.get(app.packageName) ?? 0) >= 60_000)
      .sort((a, b) => (usage.get(b.packageName) ?? 0) - (usage.get(a.packageName) ?? 0))
      .slice(0, MOST_USED_COUNT);
    const all: Row[] = apps.map(app => ({ kind: 'app', app, key: app.packageName }));
    if (mostUsed.length === 0) return all;
    return [
      { kind: 'header', title: 'Most used this week' },
      ...mostUsed.map<Row>(app => ({
        kind: 'app',
        app,
        usageMs: usage.get(app.packageName),
        key: `top:${app.packageName}`,
      })),
      { kind: 'header', title: 'All apps' },
      ...all,
    ];
  }, [apps, query, usage]);

  return (
    <FullScreenModal
      title="Choose an app"
      onClose={onClose}
    >
      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={17}
          color={Colors.text.faint}
        />
        <TextInput
          style={styles.search}
          placeholder="Search apps"
          placeholderTextColor={Colors.text.faint}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {apps == null ? (
        <ActivityIndicator
          color={Colors.text.faint}
          style={styles.loading}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={row => (row.kind === 'header' ? `h:${row.title}` : row.key)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
          renderItem={({ item }) => {
            if (item.kind === 'header') return <Text style={styles.header}>{item.title}</Text>;
            const tracker = findAutoTrackedBehavior(behaviors, { packageName: item.app.packageName });
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => onPick(item.app)}
              >
                <AppRowIcon packageName={item.app.packageName} />
                <View style={styles.texts}>
                  <Text
                    style={styles.label}
                    numberOfLines={1}
                  >
                    {item.app.label}
                  </Text>
                  <Text
                    style={styles.sub}
                    numberOfLines={1}
                  >
                    {item.usageMs != null && item.usageMs >= 60_000
                      ? `${formatDuration(item.usageMs)} this week`
                      : item.app.packageName}
                  </Text>
                </View>
                {tracker ? (
                  <Text
                    style={[styles.badge, styles.trackedBadge]}
                    numberOfLines={1}
                  >
                    {tracker.name}
                  </Text>
                ) : markNew ? (
                  <Text
                    style={[styles.badge, styles.newBadge]}
                    numberOfLines={1}
                  >
                    New
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No apps found</Text>}
        />
      )}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
  },
  search: { flex: 1, color: Colors.text.primary, fontSize: 15, paddingVertical: 0 },
  loading: { paddingVertical: 24 },
  header: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  icon: { width: 36, height: 36, borderRadius: 9 },
  texts: { flex: 1, gap: 2 },
  pressed: { opacity: 0.6 },
  label: { color: Colors.text.primary, fontSize: 15 },
  sub: { color: Colors.text.faint, fontSize: 12 },
  badge: {
    maxWidth: 120,
    fontSize: 11,
    fontWeight: '600',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  trackedBadge: { color: '#86efac', backgroundColor: '#14532d' },
  newBadge: { color: Colors.text.muted, backgroundColor: Colors.bg.input },
  empty: { color: Colors.text.muted, textAlign: 'center', paddingVertical: 24 },
});
