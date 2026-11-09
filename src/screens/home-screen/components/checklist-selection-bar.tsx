import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useChecklistSelectionStore } from '../../../store/checklist-selection-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';

/** Header and bottom bar of select mode on Routines: count, cancel, and Make checklist. */
export function ChecklistSelectionBar() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviorIds = useChecklistSelectionStore(state => state.behaviorIds);
  const clear = useChecklistSelectionStore(state => state.clear);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      clear();
      return true;
    });
    return () => {
      subscription.remove();
      clear();
    };
  }, [clear]);

  const handleMake = () => {
    const ids = behaviorIds;
    clear();
    navigation.navigate('ChecklistForm', { behaviorIds: ids });
  };

  return (
    <>
      <View style={styles.header}>
        <Button
          variant="icon"
          onPress={clear}
          accessibilityLabel="Cancel selection"
        >
          <Ionicons
            name="close"
            size={24}
            color={Colors.text.primary}
          />
        </Button>
        <Text style={styles.count}>{behaviorIds.length} selected</Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.hint}>Tap behaviours in the order you do them.</Text>
        <Button
          variant="primary"
          disabled={behaviorIds.length === 0}
          onPress={handleMake}
        >
          {`Make checklist (${behaviorIds.length})`}
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  count: {
    color: Colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  hint: {
    flex: 1,
    color: Colors.text.muted,
    fontSize: 12,
  },
});
