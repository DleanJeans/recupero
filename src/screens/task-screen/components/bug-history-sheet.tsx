import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import type { TaskEntry } from '../../../types/task';
import { Colors } from '../../../utils/colors';
import {
  formatBugAgo,
  getBugCount,
  getBugHeat,
  getBugHeatFill,
  getHeatSeries,
  getLastBugAt,
} from '../../../utils/task-bug-utils';

const CHART_DAYS = 30;
const CHART_HEIGHT = 80;

interface BugHistorySheetProps {
  task: TaskEntry;
  onClose: () => void;
  onLogBug: () => void;
  onRemoveBug: (at: number) => void;
}

function formatWhen(at: number): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

/** Heat chart (last 30 days) and every logged bug of a task, newest first. A mistaken bug can be removed. */
export function BugHistorySheet({ task, onClose, onLogBug, onRemoveBug }: BugHistorySheetProps) {
  const insets = useSafeAreaInsets();
  const now = Date.now();
  const series = useMemo(() => getHeatSeries(task.bugs, Date.now(), CHART_DAYS), [task.bugs]);
  const bugs = useMemo(() => [...(task.bugs ?? [])].sort((a, b) => b.at - a.at), [task.bugs]);
  const last = getLastBugAt(task);
  const heatPercent = Math.round(getBugHeatFill(getBugHeat(task.bugs, now)) * 100);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grabber} />
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            😣 {task.title}
          </Text>
          <View style={styles.stats}>
            <Stat
              value={String(getBugCount(task))}
              label="Bugs"
            />
            <Stat
              value={`${heatPercent}%`}
              label="Heat now"
            />
            <Stat
              value={last != null ? formatBugAgo(last, now) : '–'}
              label="Last time"
            />
          </View>
          <View style={styles.chart}>
            {series.map((heat, index) => (
              <View
                key={index}
                style={[styles.column, { height: Math.max(2, getBugHeatFill(heat) * CHART_HEIGHT) }]}
              />
            ))}
          </View>
          <View style={styles.axis}>
            <Text style={styles.axisText}>30 days ago</Text>
            <Text style={styles.axisText}>Today</Text>
          </View>
          <Text style={styles.hint}>Heat cools by half every 2 weeks without new bugs.</Text>
          <ScrollView style={styles.list}>
            {bugs.length === 0 && <Text style={styles.empty}>No bugs logged yet.</Text>}
            {bugs.map(bug => (
              <View
                key={bug.at}
                style={styles.row}
              >
                <Text
                  style={styles.when}
                  numberOfLines={1}
                >
                  {formatWhen(bug.at)}
                </Text>
                <View style={styles.rowText}>
                  <Text style={styles.note}>{bug.note ?? (bug.tags?.length ? '' : 'Bugged me')}</Text>
                  {bug.tags && bug.tags.length > 0 && <Text style={styles.tags}>{bug.tags.join(' · ')}</Text>}
                </View>
                <Pressable
                  onPress={() => onRemoveBug(bug.at)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Remove this bug"
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={Colors.text.faint}
                  />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Button
            variant="primary"
            onPress={onLogBug}
            style={styles.logButton}
          >
            Bugged me +1
          </Button>
        </View>
      </View>
    </Modal>
  );
}

interface StatProps {
  value: string;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text
        style={styles.statValue}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={styles.statLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.dim,
    marginBottom: 14,
  },
  title: { color: Colors.text.primary, fontSize: 18, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: Colors.bg.input, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  statValue: { color: '#FDBA74', fontSize: 22, fontWeight: '700' },
  statLabel: { color: Colors.text.muted, fontSize: 11.5 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_HEIGHT, marginTop: 16 },
  column: { flex: 1, backgroundColor: '#FB923C', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisText: { color: Colors.text.faint, fontSize: 10.5 },
  hint: { color: Colors.text.muted, fontSize: 12, marginTop: 8 },
  list: { marginTop: 8, flexGrow: 0 },
  empty: { color: Colors.text.muted, fontSize: 14, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.default,
  },
  when: { width: 96, color: Colors.text.muted, fontSize: 12, paddingTop: 2 },
  rowText: { flex: 1 },
  note: { color: Colors.text.primary, fontSize: 14 },
  tags: { color: Colors.text.muted, fontSize: 12, marginTop: 1 },
  logButton: { marginTop: 12 },
});
