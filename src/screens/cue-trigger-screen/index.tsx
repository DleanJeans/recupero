import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import { useCueStore } from '../../store/cue-store';
import { useSettingsStore } from '../../store/settings-store';
import { Colors } from '../../utils/colors';
import { CueSection } from '../cue-screen/components/cue-section';
import { CueTriggerComposer } from '../cue-screen/components/cue-trigger-composer';
import { CueTriggerRuleCard } from '../cue-screen/components/cue-trigger-rule-card';

export function CueTriggerScreen() {
  const behaviors = useBehaviorStore(s => s.behaviors);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const triggerRules = useCueStore(s => s.triggerRules);
  const addTriggerRule = useCueStore(s => s.addTriggerRule);
  const toggleTriggerRule = useCueStore(s => s.toggleTriggerRule);
  const removeTriggerRule = useCueStore(s => s.removeTriggerRule);

  const visibleBehaviors = useMemo(() => {
    const filtered = hidePrivate ? behaviors.filter(behavior => !behavior.private) : behaviors;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, hidePrivate]);
  const visibleBehaviorNameById = useMemo(
    () => new Map(visibleBehaviors.map(behavior => [behavior.id, behavior.name])),
    [visibleBehaviors],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>Behavior triggers</ScreenTitle>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <CueSection title="Add trigger">
          <CueTriggerComposer
            behaviors={visibleBehaviors}
            onAdd={(sourceBehaviorId, targetBehaviorId, delayMinutes) =>
              addTriggerRule({ sourceBehaviorId, targetBehaviorId, delayMinutes })
            }
          />
        </CueSection>

        <CueSection title="Saved triggers">
          <View style={styles.rules}>
            {triggerRules.length === 0 ? (
              <Text style={styles.empty}>No triggers saved.</Text>
            ) : (
              triggerRules.map(rule => (
                <CueTriggerRuleCard
                  key={rule.id}
                  rule={rule}
                  sourceName={visibleBehaviorNameById.get(rule.sourceBehaviorId) ?? 'Hidden behavior'}
                  targetName={visibleBehaviorNameById.get(rule.targetBehaviorId) ?? 'Hidden behavior'}
                  onToggle={() => toggleTriggerRule(rule.id)}
                  onRemove={() => removeTriggerRule(rule.id)}
                />
              ))
            )}
          </View>
        </CueSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  rules: {
    gap: 8,
  },
  empty: {
    color: Colors.text.faint,
    fontSize: 13,
    paddingVertical: 2,
  },
});
