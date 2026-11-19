import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';
import {
  canLaunchApps,
  canShowTimerOverlay,
  hasTimerOverlay,
  openTimerOverlaySettings,
} from '../../../utils/launch-app';
import { AppPickerModal } from '../../behavior-form-screen/components/app-picker-modal';

export function ShoppingTimerAppSection() {
  const app = useSettingsStore(s => s.shoppingTimerApp);
  const setApp = useSettingsStore(s => s.setShoppingTimerApp);
  const [pickerOpen, setPickerOpen] = useState(false);
  const available = canLaunchApps();
  const [overlayOn, setOverlayOn] = useState(canShowTimerOverlay);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setOverlayOn(canShowTimerOverlay());
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>SHOPPING TIMER APP</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          App to open when you press the play button on a task in the Shopping tab. The timer starts first, and a
          floating pill with the item you are shopping for stays on top of that app.
        </Text>
        {available ? (
          <View style={styles.row}>
            <Text
              style={[styles.value, !app && styles.placeholder]}
              numberOfLines={1}
            >
              {app?.label ?? 'None (only start the timer)'}
            </Text>
            <Button
              size="sm"
              onPress={() => setPickerOpen(true)}
            >
              {app ? 'Change' : 'Choose app'}
            </Button>
            {app && (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setApp(null)}
              >
                Clear
              </Button>
            )}
          </View>
        ) : (
          <Text style={styles.note}>Needs a newer Recupero build (Android). Install the latest APK to use this.</Text>
        )}
        {available && hasTimerOverlay() && !overlayOn && (
          <View style={styles.overlayRow}>
            <Text style={styles.note}>
              Allow "Display over other apps" for Recupero, or the item pill can't show over the shopping app.
            </Text>
            <Button
              size="sm"
              onPress={openTimerOverlaySettings}
            >
              Allow overlay
            </Button>
          </View>
        )}
      </View>
      <AppPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={picked => {
          setApp({ packageName: picked.packageName, label: picked.label });
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: Colors.bg.card, borderRadius: 8, padding: 12, gap: 10 },
  label: { color: Colors.text.secondary, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { flex: 1, minWidth: 0, color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
  placeholder: { color: Colors.text.faint, fontWeight: '400' },
  overlayRow: { gap: 8 },
  note: { color: Colors.text.muted, fontSize: 12 },
});
