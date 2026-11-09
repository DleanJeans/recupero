import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { LayoutAnimation, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { useChecklistsStore } from '../../../store/checklists-store';
import { useScreenUiStore } from '../../../store/screen-ui-store';
import type { RootStackParamList } from '../../../types/navigation';
import { getStripSwipe } from '../../../utils/checklist-utils';
import { Colors } from '../../../utils/colors';
import { CHECKLIST_CARD_HEIGHT, ChecklistStripCard } from './checklist-strip-card';
import { CHECKLIST_PILL_HEIGHT, ChecklistStripPill } from './checklist-strip-pill';

const EMPTY_STRIP_HEIGHT = 44;

/**
 * Checklists above the category chips on Routines. Collapsed (default): one row of slim pills.
 * Swipe down, or tap the handle, to expand to full cards; swipe up to collapse again.
 */
export function ChecklistStrip() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checklists = useChecklistsStore(state => state.checklists);
  const expanded = useScreenUiStore(state => state.checklistStripExpanded);
  const setExpanded = useScreenUiStore(state => state.setChecklistStripExpanded);
  const empty = checklists.length === 0;

  const changeExpanded = useCallback(
    (next: boolean) => {
      if (useScreenUiStore.getState().checklistStripExpanded === next) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(next);
    },
    [setExpanded],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) => getStripSwipe(gesture.dx, gesture.dy, 10) != null,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_event, gesture) => {
          const swipe = getStripSwipe(gesture.dx, gesture.dy);
          if (swipe) changeExpanded(swipe === 'expand');
        },
      }),
    [changeExpanded],
  );

  const height = empty ? EMPTY_STRIP_HEIGHT : expanded ? CHECKLIST_CARD_HEIGHT : CHECKLIST_PILL_HEIGHT;

  return (
    <View
      style={styles.wrapper}
      {...panResponder.panHandlers}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.strip, { height }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {checklists.map(checklist =>
          expanded ? (
            <ChecklistStripCard
              key={checklist.id}
              checklist={checklist}
            />
          ) : (
            <ChecklistStripPill
              key={checklist.id}
              checklist={checklist}
            />
          ),
        )}
        <Pressable
          style={({ pressed }) => [styles.add, empty && styles.addEmpty, pressed && styles.pressed]}
          onPress={() => navigation.navigate('ChecklistForm', {})}
          accessibilityRole="button"
          accessibilityLabel="New checklist"
        >
          <Ionicons
            name="add"
            size={18}
            color={Colors.text.muted}
          />
          {(empty || expanded) && <Text style={styles.addLabel}>{empty ? 'New checklist' : 'New'}</Text>}
        </Pressable>
      </ScrollView>
      {!empty && (
        <Pressable
          style={styles.handle}
          onPress={() => changeExpanded(!expanded)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse checklists' : 'Expand checklists'}
          accessibilityHint="You can also swipe the checklists down or up."
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.text.dim}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 6,
  },
  strip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
  },
  add: {
    minWidth: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addEmpty: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  addLabel: {
    color: Colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  handle: {
    alignSelf: 'center',
    height: 18,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
