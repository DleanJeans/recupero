import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import { useChecklistsStore } from '../../../store/checklists-store';
import { useScreenUiStore } from '../../../store/screen-ui-store';
import type { RootStackParamList } from '../../../types/navigation';
import { getStripSettleTarget, getStripSwipe } from '../../../utils/checklist-utils';
import { Colors } from '../../../utils/colors';
import { CHECKLIST_CARD_HEIGHT, ChecklistStripCard } from './checklist-strip-card';
import { CHECKLIST_PILL_HEIGHT, ChecklistStripPill } from './checklist-strip-pill';

const EMPTY_STRIP_HEIGHT = 44;
const RANGE = CHECKLIST_CARD_HEIGHT - CHECKLIST_PILL_HEIGHT;

/**
 * Checklists above the category chips on Routines. Collapsed (default): one row of slim pills.
 * Drag the strip down to expand to full cards and up to collapse; it follows your finger and springs to the
 * nearest state on release. Tapping the handle animates the same way.
 */
export function ChecklistStrip() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checklists = useChecklistsStore(state => state.checklists);
  const expanded = useScreenUiStore(state => state.checklistStripExpanded);
  const setExpanded = useScreenUiStore(state => state.setChecklistStripExpanded);
  const empty = checklists.length === 0;

  /** 0 = pills, 1 = cards. Driven by the drag and by springs, so the strip animates either way. */
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const current = useRef(expanded ? 1 : 0);
  const dragStart = useRef(0);
  const target = useRef(expanded);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      current.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const animateTo = useCallback(
    (next: boolean) => {
      target.current = next;
      setExpanded(next);
      Animated.spring(progress, {
        toValue: next ? 1 : 0,
        useNativeDriver: false,
        bounciness: 4,
        speed: 16,
      }).start();
    },
    [progress, setExpanded],
  );

  // Expanded changed from elsewhere (not by this strip): animate to it.
  useEffect(() => {
    if (target.current !== expanded) animateTo(expanded);
  }, [animateTo, expanded]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) => getStripSwipe(gesture.dx, gesture.dy, 8) != null,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          progress.stopAnimation();
          dragStart.current = current.current;
        },
        onPanResponderMove: (_event, gesture) => {
          progress.setValue(Math.max(0, Math.min(1, dragStart.current + gesture.dy / RANGE)));
        },
        onPanResponderRelease: (_event, gesture) => animateTo(getStripSettleTarget(current.current, gesture.vy)),
        onPanResponderTerminate: () => animateTo(getStripSettleTarget(current.current, 0)),
      }),
    [animateTo, progress],
  );

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CHECKLIST_PILL_HEIGHT, CHECKLIST_CARD_HEIGHT],
  });
  const pillOpacity = progress.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const cardOpacity = progress.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const cardShift = progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
  const chevronTurn = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const addButton = (label: string | null) => (
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
      {label ? <Text style={styles.addLabel}>{label}</Text> : null}
    </Pressable>
  );

  if (empty) {
    return (
      <Animated.View style={[styles.wrapper, { height: EMPTY_STRIP_HEIGHT }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {addButton('New checklist')}
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={styles.wrapper}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.clip, { height }]}>
        <Animated.View
          style={[styles.layer, { opacity: pillOpacity }]}
          pointerEvents={expanded ? 'none' : 'auto'}
        >
          <ScrollView
            style={styles.pillScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {checklists.map(checklist => (
              <ChecklistStripPill
                key={checklist.id}
                checklist={checklist}
              />
            ))}
            {addButton(null)}
          </ScrollView>
        </Animated.View>
        <Animated.View
          style={[styles.layer, { opacity: cardOpacity, transform: [{ translateY: cardShift }] }]}
          pointerEvents={expanded ? 'auto' : 'none'}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {checklists.map(checklist => (
              <ChecklistStripCard
                key={checklist.id}
                checklist={checklist}
              />
            ))}
            {addButton('New')}
          </ScrollView>
        </Animated.View>
      </Animated.View>
      <Pressable
        style={styles.handle}
        onPress={() => animateTo(!expanded)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse checklists' : 'Expand checklists'}
        accessibilityHint="You can also swipe the checklists down or up."
      >
        <Animated.View style={{ transform: [{ rotate: chevronTurn }] }}>
          <Ionicons
            name="chevron-down"
            size={14}
            color={Colors.text.dim}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 6,
  },
  clip: {
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CHECKLIST_CARD_HEIGHT,
  },
  pillScroll: {
    flexGrow: 0,
    height: CHECKLIST_PILL_HEIGHT,
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
