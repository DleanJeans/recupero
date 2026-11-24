import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import { CueSectionLabel } from '../../../components/cues/cue-section-label';
import { NeedsPanel } from '../../../components/needs/needs-panel';
import { Text } from '../../../components/text';
import type { CopingUrgeItem } from '../../../hooks/use-coping-urges';
import { useNeedLevels } from '../../../hooks/use-need-levels';
import { useSettingsStore } from '../../../store/settings-store';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { getRefillBehaviorIds } from '../../../utils/need-utils';

interface UrgesByNeedProps {
  items: CopingUrgeItem[];
  behaviors: BehaviorEntry[];
  renderUrge: (item: CopingUrgeItem, showCopesFor?: boolean) => React.ReactNode;
  onDo: (behaviorId: string) => void;
}

/** Urges grouped under the need they cope for, with what fills that need as "Do instead" chips. */
export function UrgesByNeed({ items, behaviors, renderUrge, onDo }: UrgesByNeedProps) {
  const { needs, now } = useNeedLevels();
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const urgeIds = new Set(items.map(item => item.urge.behaviorId));
  const nameById = new Map(behaviors.map(behavior => [behavior.id, behavior]));
  // Needs in their current level order (lowest first), only those that have urges linked to them.
  const groups = needs
    .filter(need => items.some(item => item.urge.copesFor === need.id))
    .sort((a, b) => (a.level ?? 100) - (b.level ?? 100))
    .map(need => ({ need, urges: items.filter(item => item.urge.copesFor === need.id) }));
  const linkedNeedIds = groups.map(group => group.need.id);
  const other = items.filter(item => !item.urge.copesFor || !linkedNeedIds.includes(item.urge.copesFor));

  return (
    <>
      {groups.length === 0 && (
        <Text style={styles.empty}>Long-press an urge and pick the need it copes for to group it here.</Text>
      )}
      {groups.map(({ need, urges }) => {
        const instead = getRefillBehaviorIds(need.config, behaviors, need.source, now, 6)
          .filter(id => !urgeIds.has(id))
          .map(id => nameById.get(id))
          .filter(
            (behavior): behavior is BehaviorEntry =>
              !!behavior && behavior.type !== 'undesirable' && (!hidePrivate || !behavior.private),
          )
          .slice(0, 3);
        return (
          <View
            key={need.id}
            style={styles.card}
          >
            <NeedsPanel onlyIds={[need.id]} />
            <Text
              style={styles.feeds}
              numberOfLines={1}
            >
              Feeds these urges
            </Text>
            {urges.map(item => renderUrge(item, false))}
            {instead.length > 0 && (
              <View style={styles.instead}>
                <Text
                  style={styles.insteadLabel}
                  numberOfLines={1}
                >
                  Do instead
                </Text>
                {instead.map(behavior => (
                  <Pressable
                    key={behavior.id}
                    style={({ pressed }) => [styles.insteadChip, pressed && styles.pressed]}
                    onPress={() => onDo(behavior.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${behavior.name}`}
                  >
                    <BehaviorIcon
                      behavior={behavior}
                      size={14}
                    />
                    <Text
                      style={styles.insteadText}
                      numberOfLines={1}
                    >
                      {behavior.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {other.length > 0 && (
        <View style={styles.section}>
          <CueSectionLabel>Other urges</CueSectionLabel>
          <View style={styles.card}>{other.map(item => renderUrge(item))}</View>
        </View>
      )}
      <NeedsPanel
        title={groups.length ? 'Other needs' : 'Needs'}
        excludeIds={linkedNeedIds}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  empty: { color: Colors.text.faint, fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.75 },
  feeds: {
    color: Colors.text.faint,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginLeft: 30,
    marginTop: 2,
  },
  instead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingVertical: 6 },
  insteadLabel: { color: Colors.typeText.desirable, fontSize: 12 },
  insteadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 160,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#14532d',
  },
  insteadText: { flexShrink: 1, color: '#bbf7d0', fontSize: 12, fontWeight: '600' },
});
