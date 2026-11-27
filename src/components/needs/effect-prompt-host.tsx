import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBehaviorStore } from '../../store/behavior-store';
import { useEffectPromptStore } from '../../store/effect-prompt-store';
import { useNeedsStore } from '../../store/needs-store';
import { Colors } from '../../utils/colors';
import { addEffectSample, formatEffect } from '../../utils/need-effect-utils';
import { NEED_INFO } from '../../utils/need-utils';
import { Button } from '../button';
import { Text } from '../text';

/** A prompt older than this is about a moment that's gone; it's dropped instead of shown. */
const PROMPT_MAX_AGE_MS = 2 * 3_600_000;

function minutesAgo(ts: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - ts) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ago`;
}

/**
 * Asks "Was it the workout?" when a check-in came in well off what was expected right after a behaviour.
 * Yes saves (or strengthens) that behaviour's side effect on the need.
 */
export function EffectPromptHost() {
  const insets = useSafeAreaInsets();
  const prompt = useEffectPromptStore(state => state.prompt);
  const dismiss = useEffectPromptStore(state => state.dismiss);
  const behaviors = useBehaviorStore(state => state.behaviors);
  const configs = useNeedsStore(state => state.needs);
  const learnEffect = useNeedsStore(state => state.learnEffect);

  if (!prompt) return null;
  const now = Date.now();
  if (now - prompt.ts > PROMPT_MAX_AGE_MS) return null;
  const info = NEED_INFO[prompt.needId];
  const config = configs[prompt.needId];
  const candidates = prompt.candidates.flatMap(candidate => {
    const behavior = behaviors.find(item => item.id === candidate.behaviorId);
    return behavior ? [{ ...candidate, behavior }] : [];
  });
  if (!info || !config || candidates.length === 0) return null;

  const gap = Math.round(prompt.actual - prompt.expected);
  const sample = { expected: prompt.expected, actual: prompt.actual };
  const first = candidates[0];
  const confirm = (behaviorId: string) => {
    learnEffect(prompt.needId, behaviorId, sample);
    dismiss();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={[styles.overlay, { paddingBottom: 24 + insets.bottom }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityLabel="Close"
        />
        <View style={styles.card}>
          <Text style={styles.title}>
            {info.emoji} {info.label} is {Math.abs(gap)}% {gap < 0 ? 'lower' : 'higher'} than expected.
          </Text>
          <Text style={styles.body}>
            {candidates.length === 1
              ? `${first.behavior.name} ended ${minutesAgo(first.endTs, now)}. Was it that?`
              : 'Was it one of these?'}
          </Text>
          {candidates.map(candidate => {
            const effect = addEffectSample(config.effects?.[candidate.behaviorId], sample);
            return (
              <Button
                key={candidate.behaviorId}
                variant="primary"
                onPress={() => confirm(candidate.behaviorId)}
                accessibilityLabel={`Yes, ${candidate.behavior.name}`}
              >
                <Text
                  style={styles.yes}
                  numberOfLines={1}
                >
                  {candidates.length === 1 ? 'Yes' : candidate.behavior.name}, {info.emoji} {formatEffect(effect)}
                </Text>
              </Button>
            );
          })}
          <Button onPress={dismiss}>{gap < 0 ? 'No, just tired' : 'No'}</Button>
          <Text style={styles.note}>Yes saves it as an effect on that behaviour and warns you next time.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.6)' },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#5a4716',
  },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  body: { color: '#fde68a', fontSize: 14, lineHeight: 20 },
  yes: { color: Colors.bg.black, fontSize: 15, fontWeight: '700' },
  note: { color: Colors.text.muted, fontSize: 11, lineHeight: 16 },
});
