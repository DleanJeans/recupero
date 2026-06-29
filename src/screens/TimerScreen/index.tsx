import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { SafeAreaView } from '../../components/SafeAreaView';
import { ScreenTitle } from '../../components/ScreenTitle';
import { Text } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { TaskComposer } from '../TaskScreen/components/task-composer';

export function TimerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(state => state.behaviors);
  const hidePrivate = useSettingsStore(state => state.hidePrivate);
  const [behaviorQuery, setBehaviorQuery] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | undefined>();

  const availableBehaviors = useMemo(() => {
    const visibleBehaviors = hidePrivate ? behaviors.filter(behavior => !behavior.private) : behaviors;
    return [...visibleBehaviors].sort((a, b) => a.name.localeCompare(b.name));
  }, [behaviors, hidePrivate]);

  const handleContinue = () => {
    if (!selectedBehaviorId) return;
    navigation.navigate('BehaviorLog', {
      behaviorId: selectedBehaviorId,
      initialMode: 'log',
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <ScreenTitle>Timer</ScreenTitle>
          <Text style={styles.subtitle}>Pick a behavior, then log a start and end time.</Text>
        </View>

        <TaskComposer
          title=""
          behaviorQuery={behaviorQuery}
          stars={0}
          behaviors={availableBehaviors}
          selectedBehaviorId={selectedBehaviorId}
          onTitleChange={() => {}}
          onBehaviorQueryChange={setBehaviorQuery}
          onStarsChange={() => {}}
          onBehaviorSelect={setSelectedBehaviorId}
          onAdd={handleContinue}
          onCancel={() => {
            setBehaviorQuery('');
            setSelectedBehaviorId(undefined);
          }}
          submitLabel="Continue"
          showTitleInput={false}
          showStarPicker={false}
          showCancelButton={false}
          showAllBehaviorsWhenSearchEmpty
          canSubmit={selectedBehaviorId != null}
        />

        {availableBehaviors.length === 0 && (
          <Button
            variant="secondary"
            onPress={() => navigation.navigate('BehaviorForm', {})}
          >
            + Add behavior
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  subtitle: {
    color: Colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
