import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppUsage, type LaunchableApp } from '../../../../modules/app-usage';
import { Text, TextInput } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import { Colors } from '../../../utils/colors';

interface AppPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onPick: (app: LaunchableApp) => void;
}

const iconCache = new Map<string, string | null>();

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

export function AppPickerModal({ visible, onClose, onPick }: AppPickerModalProps) {
  const keyboardUp = useKeyboardVisible();
  const [apps, setApps] = useState<LaunchableApp[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible || apps || !AppUsage) return;
    AppUsage.getLaunchableApps()
      .then(setApps)
      .catch(() => setApps([]));
  }, [apps, visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!apps || !q) return apps ?? [];
    return apps.filter(app => app.label.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q));
  }, [apps, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, keyboardUp && styles.overlayTop]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <TextInput
            style={styles.search}
            placeholder="Search apps"
            placeholderTextColor={Colors.text.faint}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {apps == null ? (
            <ActivityIndicator
              color={Colors.text.faint}
              style={styles.loading}
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={app => app.packageName}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => onPick(item)}
                >
                  <AppRowIcon packageName={item.packageName} />
                  <View style={styles.texts}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.packageName}>{item.packageName}</Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No apps found</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayTop: { justifyContent: 'flex-start' },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  search: {
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  loading: {
    paddingVertical: 24,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { width: 36, height: 36, borderRadius: 8 },
  texts: { flex: 1, gap: 2 },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: Colors.text.primary,
    fontSize: 15,
  },
  packageName: {
    color: Colors.text.faint,
    fontSize: 12,
  },
  empty: {
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
