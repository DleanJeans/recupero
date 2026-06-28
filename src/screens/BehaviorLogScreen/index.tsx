import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { DatePicker } from '../../components/DatePicker';
import { Text, TextInput } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { groupLogsByRecency } from '../../utils/behaviorUtils';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/dateUtils';
import { BehaviorScreenLayout } from '../components/BehaviorScreenLayout';
import { BehaviorLogItem } from './components/BehaviorLogItem';
import { FloatingXpBurst, type XpBurst } from './components/FloatingXpBurst';
import { LogGap } from './components/LogGap';
import { NumberWheel } from './components/NumberWheel';

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

type ScreenMode = 'details' | 'log';

export function BehaviorLogScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'BehaviorLog'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviorId, initialMode } = route.params;

  const behavior = useBehaviorStore(useCallback(state => state.behaviors.find(b => b.id === behaviorId), [behaviorId]));

  const [mode, setMode] = useState<ScreenMode>(initialMode ?? 'details');
  const [editLogId, setEditLogId] = useState<string | undefined>(undefined);
  const [editTimestamp, setEditTimestamp] = useState<number | undefined>(undefined);
  const [editNotes, setEditNotes] = useState('');
  const [formKey, setFormKey] = useState(0);

  const isEditing = editLogId != null;
  const titleOverride = isEditing ? 'Edit Time' : undefined;

  const animate = (next: ScreenMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(next);
  };

  /** Open the log form for a new entry. */
  const handleOpenLog = useCallback(() => {
    setEditLogId(undefined);
    setEditTimestamp(undefined);
    setEditNotes('');
    setFormKey(k => k + 1);
    animate('log');
  }, []);

  /** Open the log form pre-filled for editing an existing entry. */
  const handleEditLog = useCallback((logId: string, timestamp: number, notes: string) => {
    setEditLogId(logId);
    setEditTimestamp(timestamp);
    setEditNotes(notes);
    setFormKey(k => k + 1);
    animate('log');
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'log') {
      if (initialMode === 'details') {
        animate('details');
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  }, [mode, initialMode, navigation]);

  const handleSaved = useCallback(() => {
    if (initialMode === 'details') {
      animate('details');
    } else {
      navigation.goBack();
    }
  }, [initialMode, navigation]);

  if (!behavior) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 }}>
          <BackButton />
          <Text style={styles.title}>Behavior Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <BehaviorScreenLayout
      behavior={behavior}
      titleOverride={titleOverride}
      onBack={handleBack}
      actions={
        mode === 'details' ? (
          <DetailsActions
            onEdit={() => navigation.navigate('BehaviorForm', { behaviorId: behavior.id })}
            onLog={handleOpenLog}
          />
        ) : undefined
      }
    >
      {mode === 'details' ? (
        <BehaviorLogList
          behavior={behavior}
          onEditLog={handleEditLog}
        />
      ) : (
        <LogForm
          key={formKey}
          behaviorId={behaviorId}
          behavior={behavior}
          editLogId={editLogId}
          editTimestamp={editTimestamp}
          editNotes={editNotes}
          onSaved={handleSaved}
        />
      )}
    </BehaviorScreenLayout>
  );
}

// #region Actions bar

interface DetailsActionsProps {
  onEdit: () => void;
  onLog: () => void;
}

function DetailsActions({ onEdit, onLog }: DetailsActionsProps) {
  return (
    <View style={styles.detailsActionsRow}>
      <Button
        variant="secondary"
        style={styles.detailAction}
        onPress={onEdit}
      >
        <View style={styles.actionIconRow}>
          <Ionicons
            name="create-outline"
            size={18}
            color={Colors.text.light}
          />
          <Text style={styles.actionLabel}>Edit</Text>
        </View>
      </Button>
      <Button
        variant="primary"
        style={styles.detailAction}
        onPress={onLog}
      >
        Log
      </Button>
    </View>
  );
}

// #endregion

// #region Log form

interface LogFormProps {
  behaviorId: string;
  behavior: BehaviorEntry;
  editLogId?: string;
  editTimestamp?: number;
  editNotes: string;
  onSaved: () => void;
}

function LogForm({ behaviorId, behavior, editLogId, editTimestamp, editNotes, onSaved }: LogFormProps) {
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(c => c.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
  );
  const logBehavior = useBehaviorStore(state => state.logBehavior);
  const updateLog = useBehaviorStore(state => state.updateLog);

  const nowRef = useRef(new Date());
  const todayStr = toDateString(nowRef.current);

  const initialDate = editTimestamp ? toDateString(new Date(editTimestamp)) : todayStr;
  const initialHour = editTimestamp ? new Date(editTimestamp).getHours() : nowRef.current.getHours();
  const initialMinute = editTimestamp ? new Date(editTimestamp).getMinutes() : nowRef.current.getMinutes();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [wheelKey, setWheelKey] = useState(0);
  const notesRef = useRef<import('react-native').TextInput>(null);
  const [notes, setNotes] = useState(editNotes);
  const [notesFocused, setNotesFocused] = useState(false);
  const [metadataFocused, setMetadataFocused] = useState(false);
  const [xpBursts, setXpBursts] = useState<XpBurst[]>([]);
  const nextXpBurstId = useRef(0);

  const metadataFields = useMemo(() => category?.metadataFields ?? [], [category?.metadataFields]);
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    if (editLogId) {
      const existingLog = behavior.logs.find(l => l.id === editLogId);
      if (existingLog?.metadata) {
        for (const field of metadataFields) {
          const v = existingLog.metadata[field.key];
          if (v != null) vals[field.key] = String(v);
        }
      }
    } else if (behavior.defaultMetadata) {
      for (const field of metadataFields) {
        const v = behavior.defaultMetadata[field.key];
        if (v != null) vals[field.key] = String(v);
      }
    }
    return vals;
  });

  const isToday = selectedDate === todayStr;
  const maxHour = isToday ? nowRef.current.getHours() : 23;
  const maxMinute = isToday && hour === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59;

  useEffect(() => {
    if (hour > maxHour) setHour(maxHour);
  }, [maxHour, hour]);

  useEffect(() => {
    if (minute > maxMinute) setMinute(maxMinute);
  }, [maxMinute, minute]);

  useEffect(() => {
    const n = editTimestamp ? new Date(editTimestamp) : new Date();
    nowRef.current = new Date();
    setSelectedDate(toDateString(n));
    setHour(n.getHours());
    setMinute(n.getMinutes());
    setWheelKey(k => k + 1);
  }, [editTimestamp]);

  // Track the deferred close after logging so we can cancel on unmount.
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current != null) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleExpandTime = useCallback(() => {
    notesRef.current?.blur();
    Keyboard.dismiss();
    setNotesFocused(false);
  }, []);

  const removeXpBurst = useCallback((id: number) => {
    setXpBursts(prev => prev.filter(burst => burst.id !== id));
  }, []);

  const handleConfirm = useCallback(
    (event: GestureResponderEvent) => {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const ts = new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
      const metadata: Record<string, string | number> = {};
      if (notes.trim()) metadata.notes = notes.trim();
      for (const field of metadataFields) {
        const val = metadataValues[field.key];
        if (val !== undefined && val !== '') {
          metadata[field.key] = Number(val);
        }
      }
      const metadataOrUndefined = Object.keys(metadata).length > 0 ? metadata : undefined;

      if (editLogId) {
        updateLog(behaviorId, editLogId, ts, metadataOrUndefined);
        onSaved();
        return;
      }

      logBehavior(behaviorId, ts, metadataOrUndefined);

      if (behavior.xpEnabled) {
        const { locationX, locationY } = event.nativeEvent;
        const id = nextXpBurstId.current;
        nextXpBurstId.current += 1;
        setXpBursts(prev => [...prev, { id, x: locationX, y: locationY }]);
      }

      const delay = behavior.xpEnabled ? 1500 : 0;
      if (delay > 0) setPending(true);
      closeTimeoutRef.current = setTimeout(() => {
        setPending(false);
        onSaved();
      }, delay);
    },
    [
      selectedDate,
      hour,
      minute,
      notes,
      metadataValues,
      metadataFields,
      editLogId,
      behaviorId,
      behavior.xpEnabled,
      logBehavior,
      updateLog,
      onSaved,
    ],
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.flex}
    >
      <View style={styles.fixedTop}>
        <Text style={styles.sectionLabel}>Date</Text>
        <View style={styles.datePickerWrapper}>
          <DatePicker
            selectedDate={selectedDate}
            maxDate={todayStr}
            onSelect={setSelectedDate}
          />
        </View>

        <TimePicker
          hour={hour}
          minute={minute}
          maxHour={maxHour}
          maxMinute={maxMinute}
          wheelKey={wheelKey}
          collapsed={notesFocused || metadataFocused}
          onHourChange={setHour}
          onMinuteChange={setMinute}
          onExpand={handleExpandTime}
        />
      </View>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {metadataFields.length > 0 && <Text style={styles.sectionLabel}>Metadata</Text>}
        {metadataFields.map(field => (
          <View
            key={field.key}
            style={styles.metadataFieldRow}
          >
            <Text style={styles.metadataFieldLabel}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ''}
            </Text>
            <TextInput
              style={styles.metadataInput}
              value={metadataValues[field.key] ?? ''}
              onChangeText={v => setMetadataValues(prev => ({ ...prev, [field.key]: v.replace(/[^0-9.]/g, '') }))}
              onFocus={() => setMetadataFocused(true)}
              onBlur={() => setMetadataFocused(false)}
              placeholder="0"
              placeholderTextColor={Colors.text.dim}
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={8}
            />
          </View>
        ))}

        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          ref={notesRef}
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes..."
          placeholderTextColor={Colors.text.dim}
          multiline
          maxLength={500}
          textAlignVertical="top"
          onFocus={() => setNotesFocused(true)}
          onBlur={() => setNotesFocused(false)}
        />
      </ScrollView>
      <Button
        variant="primary"
        fab
        style={{ bottom: 16, opacity: 1 }}
        onPress={handleConfirm}
        disabled={pending}
        overlay={xpBursts.map(burst => (
          <FloatingXpBurst
            key={burst.id}
            burst={burst}
            onDone={removeXpBurst}
          />
        ))}
      >
        {editLogId ? 'Save' : 'Log'}
      </Button>
    </KeyboardAvoidingView>
  );
}

// #endregion

// #region Log list view

interface BehaviorLogListProps {
  behavior: BehaviorEntry;
  onEditLog: (logId: string, timestamp: number, notes: string) => void;
}

function BehaviorLogList({ behavior, onEditLog }: BehaviorLogListProps) {
  const category = useBehaviorStore(
    useCallback(
      state => (behavior.categoryId ? state.categories.find(c => c.id === behavior.categoryId) : undefined),
      [behavior.categoryId],
    ),
  );
  const [elapsedTick, setElapsedTick] = useState(0);

  const logs = behavior.logs ?? [];
  const sections = useMemo(() => groupLogsByRecency(logs), [logs]);
  const metadataFields = category?.metadataFields;

  useEffect(() => {
    const interval = setInterval(() => setElapsedTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: BehaviorEntry['logs'][number];
      index: number;
      section: { data: BehaviorEntry['logs'] };
    }) => (
      <>
        {index > 0 && (
          <LogGap
            earlierMs={item.timestamp}
            laterMs={section.data[index - 1].timestamp}
            xpDecay={behavior.xpDecay}
          />
        )}
        <BehaviorLogItem
          log={item}
          behaviorId={behavior.id}
          metadataFields={metadataFields}
          elapsedTick={elapsedTick}
          onEdit={() => onEditLog(item.id, item.timestamp, (item.metadata?.notes as string | undefined) ?? '')}
        />
      </>
    ),
    [behavior.id, behavior.xpDecay, elapsedTick, metadataFields, onEditLog],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: (typeof sections)[number] }) => {
      const sectionIdx = sections.indexOf(section);
      const prevLast = sectionIdx > 0 ? sections[sectionIdx - 1].data.at(-1)?.timestamp : null;
      const showDistance = prevLast != null && section.data.length > 0;

      return (
        <View style={[styles.sectionHeader, sectionIdx > 0 && styles.sectionHeaderWithDistance]}>
          {showDistance && (
            <LogGap
              earlierMs={section.data[0].timestamp}
              laterMs={prevLast!}
              xpDecay={behavior.xpDecay}
              style={styles.logGapAbsolute}
            />
          )}
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
      );
    },
    [behavior.xpDecay, sections],
  );

  const listEmptyComponent = useMemo(
    () => <Text style={styles.empty}>No logs yet.{'\n'}Press Log below to record this behavior.</Text>,
    [],
  );
  const contentContainerStyle = useMemo(
    () => [logs.length === 0 && styles.emptyContainer, { paddingBottom: 80 }],
    [logs.length],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListEmptyComponent={listEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}

// #endregion

// #region Time picker sub-component

interface TimePickerProps {
  hour: number;
  minute: number;
  maxHour: number;
  maxMinute: number;
  wheelKey: number;
  collapsed: boolean;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onExpand: () => void;
}

function TimePicker({
  hour,
  minute,
  maxHour,
  maxMinute,
  wheelKey,
  collapsed,
  onHourChange,
  onMinuteChange,
  onExpand,
}: TimePickerProps) {
  const hourValues = ALL_HOURS.slice(0, maxHour + 1);
  const minuteValues = ALL_MINUTES.slice(0, maxMinute + 1);

  if (collapsed) {
    const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return (
      <>
        <Text style={styles.sectionLabel}>Time</Text>
        <Pressable
          style={styles.collapsedTime}
          onPress={onExpand}
        >
          <Text style={styles.collapsedTimeText}>{displayTime}</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionLabel}>Time</Text>
      <View style={styles.wheels}>
        <NumberWheel
          key={`hour-${wheelKey}-${maxHour}`}
          values={hourValues}
          initialIndex={Math.min(hour, maxHour)}
          onChange={onHourChange}
        />
        <Text style={styles.colon}>:</Text>
        <NumberWheel
          key={`min-${wheelKey}-${maxMinute}`}
          values={minuteValues}
          initialIndex={Math.min(minute, maxMinute)}
          onChange={onMinuteChange}
        />
      </View>
    </>
  );
}

// #endregion

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
  },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  fixedTop: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  datePickerWrapper: { marginBottom: 20 },
  sectionLabel: {
    color: Colors.text.light,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 },
  colon: { color: Colors.text.primary, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  collapsedTime: { alignItems: 'center', marginBottom: 16 },
  collapsedTimeText: {
    color: Colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metadataFieldRow: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  metadataFieldLabel: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  metadataInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 16,
  },
  notesInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text.primary,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    lineHeight: 22,
  },
  primaryAction: { flex: 0, width: '100%' },
  detailAction: { flex: 1, position: 'relative', bottom: 0, left: 0, right: 0 },
  detailsActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionLabel: {
    color: Colors.text.light,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 32,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 16,
    overflow: 'visible',
  },
  sectionHeaderWithDistance: {
    marginTop: 0,
    minHeight: 40,
  },
  logGapAbsolute: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
  },
  sectionHeaderText: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 'auto',
  },
});
