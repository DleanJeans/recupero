import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useToastCountdown } from '../hooks/use-toast-countdown';
import { useBehaviorStore } from '../store/behavior-store';
import { Colors } from '../utils/colors';
import { getToastRemainingShare, getToastSecondsLeft, type ReminderToast } from '../utils/reminder-toast-utils';
import { BehaviorIcon } from './behavior-icon';
import { Text } from './text';
import { ToastCountdownRing } from './toast-countdown-ring';

interface Props {
  toast: ReminderToast;
  /** Hold the countdown, e.g. while the keyboard is up. */
  paused: boolean;
  onButton: (buttonId: string) => void;
  onOpen: () => void;
  onTimeout: () => void;
}

/** One reminder card: the suggested behaviour's icon inside a countdown ring, the message and its buttons. */
export function ReminderToastCard({ toast, paused, onButton, onOpen, onTimeout }: Props) {
  const [held, setHeld] = useState(false);
  const behavior = useBehaviorStore(state => state.behaviors.find(item => item.id === toast.behaviorId));
  const remainingMs = useToastCountdown(toast.durationMs, paused || held, onTimeout);

  return (
    <View
      style={styles.card}
      onTouchStart={() => setHeld(true)}
      onTouchEnd={() => setHeld(false)}
      onTouchCancel={() => setHeld(false)}
    >
      <Pressable
        style={styles.head}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={toast.title}
      >
        <ToastCountdownRing share={getToastRemainingShare(remainingMs, toast.durationMs)}>
          {behavior ? (
            <BehaviorIcon
              behavior={behavior}
              size={22}
            />
          ) : (
            <Text style={styles.linkIcon}>🔗</Text>
          )}
        </ToastCountdownRing>
        <View style={styles.texts}>
          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {toast.title}
          </Text>
          <Text
            style={styles.body}
            numberOfLines={2}
          >
            {toast.body}
          </Text>
        </View>
        <Text style={styles.seconds}>{getToastSecondsLeft(remainingMs)}s</Text>
      </Pressable>
      {toast.buttons.length > 0 && (
        <View style={styles.buttons}>
          {toast.buttons.map(button => (
            <Pressable
              key={button.id}
              style={({ pressed }) => [
                styles.button,
                button.primary && styles.buttonPrimary,
                pressed && styles.pressed,
              ]}
              onPress={() => onButton(button.id)}
              accessibilityRole="button"
            >
              <Text
                style={[styles.buttonText, button.primary && styles.buttonTextPrimary]}
                numberOfLines={1}
              >
                {button.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 12,
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkIcon: { fontSize: 20 },
  texts: { flex: 1, gap: 1 },
  title: { color: Colors.text.primary, fontSize: 15, fontWeight: '700' },
  body: { color: Colors.text.light, fontSize: 12.5 },
  seconds: { color: Colors.cooldown.green, fontSize: 12, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 9,
    backgroundColor: Colors.bg.elevated,
  },
  buttonPrimary: { flex: 1.4, backgroundColor: Colors.cooldown.green },
  buttonText: { color: Colors.text.secondary, fontSize: 13, fontWeight: '700' },
  buttonTextPrimary: { color: Colors.bg.black },
  pressed: { opacity: 0.8 },
});
