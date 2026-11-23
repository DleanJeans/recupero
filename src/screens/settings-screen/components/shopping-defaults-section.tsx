import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppPickerModal } from '../../../components/app-picker-modal';
import { Button } from '../../../components/button';
import { CheckboxRow } from '../../../components/checkbox-row';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';
import { TaskBehaviorPicker } from '../../task-screen/components/task-behavior-picker';

/** What "Add to buy" starts with: Shopee's behavior and app unless changed here. */
export function ShoppingDefaultsSection() {
  const enabled = useSettingsStore(s => s.shoppingDefaultsEnabled);
  const setEnabled = useSettingsStore(s => s.setShoppingDefaultsEnabled);
  const app = useSettingsStore(s => s.shoppingDefaultApp);
  const setApp = useSettingsStore(s => s.setShoppingDefaultApp);
  const behaviorId = useSettingsStore(s => s.shoppingDefaultBehaviorId);
  const setBehaviorId = useSettingsStore(s => s.setShoppingDefaultBehaviorId);
  const behaviors = useBehaviorStore(s => s.behaviors);
  const active = behaviors.filter(b => !b.archivedAt);
  const behavior = behaviorId ? behaviors.find(b => b.id === behaviorId) : undefined;
  const [appPicker, setAppPicker] = useState(false);
  const [behaviorPicker, setBehaviorPicker] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ADD TO BUY DEFAULTS</Text>
      <View style={styles.card}>
        <CheckboxRow
          variant="row"
          label="Start Add to buy with these"
          checked={enabled}
          onToggle={() => setEnabled(!enabled)}
        />
        {enabled && (
          <>
            <View style={styles.row}>
              <Text style={styles.name}>Behavior</Text>
              <Text
                style={styles.value}
                numberOfLines={1}
              >
                {behavior?.name ?? 'Shopee (auto)'}
              </Text>
              <Button
                size="sm"
                onPress={() => setBehaviorPicker(true)}
              >
                Change
              </Button>
              {behaviorId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setBehaviorId(null)}
                >
                  Reset
                </Button>
              )}
            </View>
            <View style={styles.row}>
              <Text style={styles.name}>App</Text>
              <Text
                style={styles.value}
                numberOfLines={1}
              >
                {app?.label ?? 'Shopee (auto)'}
              </Text>
              <Button
                size="sm"
                onPress={() => setAppPicker(true)}
              >
                Change
              </Button>
              {app && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setApp(null)}
                >
                  Reset
                </Button>
              )}
            </View>
          </>
        )}
      </View>
      <AppPickerModal
        visible={appPicker}
        onClose={() => setAppPicker(false)}
        onPick={picked => {
          setApp({ packageName: picked.packageName, label: picked.label });
          setAppPicker(false);
        }}
      />
      {behaviorPicker && (
        <TaskBehaviorPicker
          behaviors={active}
          selectedBehaviorId={behaviorId ?? undefined}
          onPick={id => {
            setBehaviorId(id ?? null);
            setBehaviorPicker(false);
          }}
          onClose={() => setBehaviorPicker(false)}
        />
      )}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { width: 64, color: Colors.text.secondary, fontSize: 14 },
  value: { flex: 1, minWidth: 0, color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
});
