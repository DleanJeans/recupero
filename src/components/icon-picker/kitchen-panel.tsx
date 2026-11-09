import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../../utils/colors';
import { filterEmojiData } from '../../utils/emoji-data';
import {
  codepointsToEmoji,
  findKitchenMix,
  getKitchenChoices,
  getKitchenPartners,
  getLooseCodepoints,
} from '../../utils/emoji-kitchen-utils';
import { mixIcon, parseIcon } from '../../utils/icon-utils';
import { Button } from '../button';
import { Text } from '../text';
import { EmojiGrid } from './emoji-grid';
import { KitchenPreview } from './kitchen-preview';

interface Props {
  value: string;
  onUse: (value: string) => void;
}

type Slot = 'left' | 'right';

function initialPair(value: string): [string, string] {
  const parsed = parseIcon(value);
  if (parsed.kind === 'mix') return [parsed.left, parsed.right];
  if (parsed.kind === 'emoji' && getKitchenChoices().has(getLooseCodepoints(parsed.emoji))) return [parsed.emoji, ''];
  if (parsed.kind === 'stack') return [parsed.layers[0].emoji, parsed.layers[1]?.emoji ?? ''];
  return ['', ''];
}

/** Emoji Kitchen: two slots, a grid that only offers emoji that mix with the other slot, and every mix of slot 1. */
export function KitchenPanel({ value, onUse }: Props) {
  const [[left, right], setPair] = useState(() => initialPair(value));
  const [slot, setSlot] = useState<Slot>(left ? 'right' : 'left');

  const partners = useMemo(() => (left ? getKitchenPartners(left).map(codepointsToEmoji) : []), [left]);
  const categories = useMemo(() => {
    const allowed = getKitchenChoices(slot === 'right' && left ? left : undefined);
    return filterEmojiData(emoji => allowed.has(getLooseCodepoints(emoji)));
  }, [slot, left]);

  const mix = left && right ? findKitchenMix(left, right) : null;

  const pick = (emoji: string) => {
    if (slot === 'left') {
      const keepRight = right && findKitchenMix(emoji, right) ? right : '';
      setPair([emoji, keepRight]);
      setSlot('right');
    } else {
      setPair([left, emoji]);
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.slots}>
        <SlotButton
          emoji={left}
          active={slot === 'left'}
          onPress={() => setSlot('left')}
          label="First emoji"
        />
        <Text style={styles.op}>+</Text>
        <SlotButton
          emoji={right}
          active={slot === 'right'}
          onPress={() => setSlot('right')}
          label="Second emoji"
        />
        <Text style={styles.op}>=</Text>
        <View style={styles.result}>
          {mix ? (
            <KitchenPreview
              left={left}
              right={right}
              size={52}
            />
          ) : (
            <Text style={styles.resultHint}>?</Text>
          )}
        </View>
      </View>

      {partners.length > 0 && (
        <>
          <Text style={styles.hint}>
            All {left} mixes ({partners.length})
          </Text>
          <FlatList
            horizontal
            data={partners}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={8}
            windowSize={3}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.stripItem,
                  item === right && styles.stripItemOn,
                  pressed && styles.pressed,
                ]}
                onPress={() => setPair([left, item])}
                accessibilityLabel={`Mix with ${item}`}
              >
                <KitchenPreview
                  left={left}
                  right={item}
                  size={36}
                />
              </Pressable>
            )}
          />
        </>
      )}

      <EmojiGrid
        key={`${slot}:${slot === 'right' ? left : ''}`}
        categories={categories}
        onPick={pick}
        selected={[slot === 'left' ? left : right].filter(Boolean)}
      />

      <Button
        variant="primary"
        disabled={!mix}
        onPress={() => onUse(mixIcon(left, right))}
      >
        Use this mix
      </Button>
    </View>
  );
}

function SlotButton({
  emoji,
  active,
  onPress,
  label,
}: {
  emoji: string;
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      style={[styles.slot, active && styles.slotActive, !emoji && styles.slotEmpty]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {emoji ? <Text style={styles.slotEmoji}>{emoji}</Text> : <Text style={styles.slotHint}>pick</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: 8 },
  slots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  slot: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: { borderWidth: 2, borderColor: Colors.cooldown.yellow },
  slotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border.light,
  },
  slotEmoji: { fontSize: 28 },
  slotHint: { color: Colors.text.faint, fontSize: 11 },
  op: { color: Colors.text.muted, fontSize: 18 },
  result: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#2a2410',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHint: { color: Colors.text.faint, fontSize: 20 },
  hint: { color: Colors.text.muted, fontSize: 11, textAlign: 'center' },
  strip: { flexGrow: 0 },
  stripContent: { gap: 6 },
  stripItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripItemOn: { borderWidth: 2, borderColor: Colors.cooldown.yellow },
  pressed: { opacity: 0.6 },
});
