import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { BehaviorSummary } from '../../components/BehaviorSummary';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { groupLogsByRecency } from '../../utils/behaviorUtils';
import { Colors } from '../../utils/colors';

import { BehaviorLogItem } from './components/BehaviorLogItem';
import { LogGap } from './components/LogGap';

type BehaviorDetailsRouteProp = RouteProp<RootStackParamList, 'BehaviorDetails'>;
export function BehaviorDetailsScreen() {
  const route = useRoute<BehaviorDetailsRouteProp>();
  const { behaviorId } = route.params;

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviors } = useBehaviorStore();
  const behavior = behaviors.find(b => b.id === behaviorId);

  if (!behavior) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>Behavior Not Found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <BehaviorSummary
          behavior={behavior}
          titleSize="header"
        />
      </View>

      <BehaviorLogList behavior={behavior} />

      <View style={styles.actions}>
        <EditButton behaviorId={behaviorId} />
        <Button
          variant="primary"
          size="lg"
          style={styles.primaryAction}
          onPress={() => navigation.navigate('BehaviorLog', { behaviorId: behavior.id })}
        >
          Log
        </Button>
      </View>
    </SafeAreaView>
  );
}

// #region Header components

function EditButton({ behaviorId }: { behaviorId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Button
      variant="secondary"
      size="lg"
      style={styles.secondaryAction}
      onPress={() => navigation.navigate('BehaviorForm', { behaviorId })}
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
  );
}
// #endregion

// #region List component

function BehaviorLogList({ behavior }: { behavior: BehaviorEntry }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { categories } = useBehaviorStore();

  const logs = behavior.logs ?? [];
  const sections = useMemo(() => groupLogsByRecency(logs), [logs]);
  const category = behavior.categoryId ? categories.find(c => c.id === behavior.categoryId) : undefined;
  const metadataFields = category?.metadataFields;

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={({ item, index, section }) => (
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
            onEdit={() =>
              navigation.navigate('BehaviorLog', {
                behaviorId: behavior.id,
                logId: item.id,
                initialTimestamp: item.timestamp,
                initialNotes: (item.metadata?.notes as string | undefined) ?? '',
              })
            }
          />
        </>
      )}
      renderSectionHeader={({ section }) => {
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
      }}
      ListEmptyComponent={<Text style={styles.empty}>No logs yet.{'\n'}Press Log below to record this behavior.</Text>}
      contentContainerStyle={logs.length === 0 && styles.emptyContainer}
    />
  );
}
// #endregion

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  headerTitle: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
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
