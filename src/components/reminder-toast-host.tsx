import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '../hooks/use-keyboard-visible';
import { useReminderToastStore } from '../store/reminder-toast-store';
import { useSettingsStore } from '../store/settings-store';
import type { CueRef } from '../types/cue';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { presentToastFallbackNotification } from '../utils/reminder-toast';
import { runToastButton } from '../utils/reminder-toast-actions';
import { LOG_ACTION_PREFIX } from '../utils/reminder-utils';
import { ReminderToastCard } from './reminder-toast-card';
import { Text } from './text';

const EDGE_GAP = 8;
const DECK_PEEK = 6;

interface Props {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
  /** Height of whatever the app pins to the bottom (the nav bar), so a bottom toast sits above it. */
  bottomOffset: number;
}

/** Cards waiting behind the front one peek out on the side facing the screen's middle. */
function getDeckOffset(position: 'top' | 'bottom', level: number) {
  return position === 'top' ? { bottom: -DECK_PEEK * level } : { top: -DECK_PEEK * level };
}

/** Shows the first queued reminder toast at the top or bottom of the screen, with the rest stacked behind it. */
export function ReminderToastHost({ navigationRef, bottomOffset }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const toasts = useReminderToastStore(state => state.toasts);
  const dismiss = useReminderToastStore(state => state.dismiss);
  const position = useSettingsStore(state => state.reminderToastPosition);
  const front = toasts[0];

  const openLog = useCallback(
    (behaviorId: string | undefined, cueRef: CueRef | undefined) => {
      if (!behaviorId || !navigationRef.isReady()) return;
      navigationRef.navigate('BehaviorLog', {
        behaviorId,
        initialMode: 'log',
        initialCues: cueRef ? [cueRef] : undefined,
      });
    },
    [navigationRef],
  );

  if (!front) return null;

  const handleButton = (buttonId: string) => {
    dismiss(front.id);
    if (buttonId.startsWith(LOG_ACTION_PREFIX)) {
      openLog(buttonId.slice(LOG_ACTION_PREFIX.length), front.data.cueRef);
      return;
    }
    runToastButton(front, buttonId).catch(error => console.warn('Toast action failed', error));
  };
  const handleOpen = () => {
    dismiss(front.id);
    openLog(front.behaviorId, front.data.cueRef);
  };
  const handleTimeout = () => {
    dismiss(front.id);
    // Message-only toasts were seen; one with buttons becomes a notification so the suggestion isn't lost.
    if (front.buttons.length > 0) {
      presentToastFallbackNotification(front).catch(error => console.warn('Toast fallback failed', error));
    }
  };

  const placement =
    position === 'top' ? { top: insets.top + EDGE_GAP } : { bottom: insets.bottom + bottomOffset + EDGE_GAP };
  // A toast would sit on top of the keyboard's dialogs (or hide behind the keyboard), so it waits.
  if (keyboardVisible) return null;

  return (
    <View
      style={[styles.wrap, placement]}
      pointerEvents="box-none"
    >
      {toasts.length > 1 && (
        <View style={[styles.badge, position === 'top' ? styles.badgeTop : styles.badgeBottom]}>
          <Text style={styles.badgeText}>1 / {toasts.length}</Text>
        </View>
      )}
      {toasts.length > 2 && <View style={[styles.deck, styles.deckFar, getDeckOffset(position, 2)]} />}
      {toasts.length > 1 && <View style={[styles.deck, styles.deckNear, getDeckOffset(position, 1)]} />}
      <ReminderToastCard
        key={front.id}
        toast={front}
        paused={false}
        onButton={handleButton}
        onOpen={handleOpen}
        onTimeout={handleTimeout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 10, right: 10 },
  badge: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
    backgroundColor: Colors.cooldown.green,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeTop: { bottom: -DECK_PEEK * 2 - 6 },
  badgeBottom: { top: -DECK_PEEK * 2 - 8 },
  badgeText: { color: Colors.bg.black, fontSize: 10, fontWeight: '800' },
  deck: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: Colors.bg.darker,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  deckNear: { left: 12, right: 12 },
  deckFar: { left: 24, right: 24, opacity: 0.6 },
});
