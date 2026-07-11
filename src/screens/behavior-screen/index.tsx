import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, BackHandler, LayoutAnimation, StyleSheet, View } from 'react-native';
import { BackButton } from '../../components/back-button';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { BehaviorScreenLayout } from '../components/behavior-screen-layout';
import { BehaviorActions } from './components/behavior-actions';
import { BehaviorLogList } from './components/behavior-log-list';
import { BehaviorLogScreen } from './components/behavior-log-screen';

type ScreenMode = 'details' | 'log';

export function BehaviorScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'BehaviorLog'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviorId, initialMode, logId, timerStartTimestamp, timerEndTimestamp } = route.params;

  const behavior = useBehaviorStore(useCallback(state => state.behaviors.find(b => b.id === behaviorId), [behaviorId]));

  const [mode, setMode] = useState<ScreenMode>(logId ? 'log' : (initialMode ?? 'details'));
  const [editLogId, setEditLogId] = useState<string | undefined>(logId);
  const [formKey, setFormKey] = useState(0);

  const isEditing = editLogId != null;
  const titleOverride = isEditing && behavior ? `Edit: ${behavior.name}` : undefined;
  const removeBehavior = useBehaviorStore(s => s.removeBehavior);

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
      // When editing an existing log, always go back to the details list so
      // the user can see the log in context. When creating a new log, fall
      // back to the entry point.
      if (isEditing || initialMode === 'details') {
        animate('details');
      } else {
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  }, [mode, isEditing, initialMode, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (mode !== 'log' || !isEditing) return undefined;
      const onBack = () => {
        animate('details');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      const unsubscribe = navigation.addListener('beforeRemove', e => {
        if (e.data.action.type !== 'GO_BACK') return;
        e.preventDefault();
        animate('details');
      });
      return () => {
        sub.remove();
        unsubscribe();
      };
    }, [mode, isEditing, navigation]),
  );

  const handleSaved = useCallback(() => {
    if (initialMode === 'details') {
      animate('details');
    } else {
      navigation.goBack();
    }
  }, [initialMode, navigation]);

  const handleDeleteBehavior = useCallback(() => {
    if (!behavior) return;

    Alert.alert('Remove Behavior', `Remove "${behavior.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeBehavior(behavior.id);
          navigation.goBack();
        },
      },
    ]);
  }, [behavior, navigation, removeBehavior]);

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
      summaryXpMotionEnabled={mode === 'log'}
      showCurrentHabitXpLabel
      summaryStarMotionEnabled={mode === 'log'}
      onBack={handleBack}
    >
      {mode === 'details' ? (
        <View style={styles.detailsBody}>
          <BehaviorLogList
            behavior={behavior}
            onEditLog={handleEditLog}
          />
          <BehaviorActions
            onDelete={handleDeleteBehavior}
            onEdit={() => navigation.navigate('BehaviorForm', { behaviorId: behavior.id })}
            onLog={handleOpenLog}
          />
        </View>
      ) : (
        <BehaviorLogScreen
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
  detailsBody: {
    flex: 1,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
  },
});
