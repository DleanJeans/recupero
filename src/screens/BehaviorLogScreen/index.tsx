import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { LayoutAnimation, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/BackButton';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Text } from '../../components/Text';
import { useBehaviorStore } from '../../store/behaviorStore';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { BehaviorScreenLayout } from '../components/BehaviorScreenLayout';
import { BehaviorLogList } from './components/BehaviorLogList';
import { DetailsActions } from './components/DetailsActions';
import { LogForm } from './components/LogForm';

type ScreenMode = 'details' | 'log';

export function BehaviorLogScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'BehaviorLog'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviorId, initialMode, timerStartTimestamp, timerEndTimestamp } = route.params;

  const behavior = useBehaviorStore(useCallback(state => state.behaviors.find(b => b.id === behaviorId), [behaviorId]));

  const [mode, setMode] = useState<ScreenMode>(initialMode ?? 'details');
  const [editLogId, setEditLogId] = useState<string | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);

  const isEditing = editLogId != null;
  const titleOverride = isEditing ? 'Edit Session' : undefined;

  const animate = (next: ScreenMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(next);
  };

  /** Open the log form for a new entry. */
  const handleOpenLog = useCallback(() => {
    setEditLogId(undefined);
    setFormKey(k => k + 1);
    animate('log');
  }, []);

  /** Open the log form pre-filled for editing an existing entry. */
  const handleEditLog = useCallback((logId: string) => {
    setEditLogId(logId);
    setFormKey(k => k + 1);
    animate('log');
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'log') {
      if (initialMode === 'details') {
        animate('details');
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  }, [mode, initialMode, navigation]);

  const handleSaved = useCallback(() => {
    if (initialMode === 'details') {
      animate('details');
    } else {
      navigation.goBack();
    }
  }, [initialMode, navigation]);

  if (!behavior) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 }}>
          <BackButton />
          <Text style={styles.title}>Behavior Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <BehaviorScreenLayout
      behavior={behavior}
      titleOverride={titleOverride}
      summaryStarMotionEnabled={mode === 'log'}
      onBack={handleBack}
      actions={
        mode === 'details' ? (
          <DetailsActions
            onEdit={() => navigation.navigate('BehaviorForm', { behaviorId: behavior.id })}
            onLog={handleOpenLog}
          />
        ) : undefined
      }
    >
      {mode === 'details' ? (
        <BehaviorLogList
          behavior={behavior}
          onEditLog={handleEditLog}
        />
      ) : (
        <LogForm
          key={formKey}
          behaviorId={behaviorId}
          behavior={behavior}
          editLogId={editLogId}
          timerStartTimestamp={timerStartTimestamp}
          timerEndTimestamp={timerEndTimestamp}
          onSaved={handleSaved}
        />
      )}
    </BehaviorScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
  },
});
