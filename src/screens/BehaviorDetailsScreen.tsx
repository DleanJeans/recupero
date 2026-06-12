import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { BehaviorLogItem } from '../components/BehaviorLogItem';
import { BehaviorTitle } from '../components/BehaviorTitle';
import { DistanceConnector } from '../components/DistanceConnector';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import { groupLogsByRecency } from '../utils/behaviorUtils';
import { Colors } from '../utils/colors';

type BehaviorDetailsRouteProp = RouteProp<RootStackParamList, 'BehaviorDetails'>;
export function BehaviorDetailsScreen() {
  const route = useRoute<BehaviorDetailsRouteProp>();
  const { behaviorId } = route.params;

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
        <BehaviorTitle behavior={behavior} />
        <EditButton behaviorId={behaviorId} />
      </View>

      <BehaviorLogList behavior={behavior} />
    </SafeAreaView>
  );
}

// #region Header components

function EditButton({ behaviorId }: { behaviorId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.editBehaviorBtn,
        pressed && {
          opacity: 0.5,
        },
      ]}
      onPress={() => navigation.navigate('BehaviorForm', { behaviorId })}
    >
      <Ionicons
        name="create-outline"
        size={26}
        color={Colors.text.light}
      />
    </Pressable>
  );
}
// #endregion

// #region List component

function BehaviorLogList({ behavior }: { behavior: BehaviorEntry }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const logs = behavior.logs ?? [];
  const sections = useMemo(() => groupLogsByRecency(logs), [logs]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={({ item, index, section }) => (
        <>
          {index > 0 && (
            <DistanceConnector
              durationMs={section.data[index - 1].timestamp - item.timestamp}
              style={{ marginVertical: 4 }}
            />
          )}
          <BehaviorLogItem
            log={item}
            behaviorId={behavior.id}
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
              <DistanceConnector
                durationMs={prevLast! - section.data[0].timestamp}
                style={styles.distanceConnectorAbsolute}
              />
            )}
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No logs yet.{'\n'}Press the + button to log this behavior.</Text>}
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
  editBehaviorBtn: {
    padding: 8,
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
  distanceConnectorAbsolute: {
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
