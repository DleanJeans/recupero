import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import { formatElapsedNumeric } from '../utils/timeUtils';
import { BehaviorForm } from './BehaviorForm';
import { BehaviorIcon } from './BehaviorIcon';
import { BehaviorLogModal } from './BehaviorLogModal';
import { CooldownLabel } from './CooldownLabel';
import { Text } from './Text';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  behavior: BehaviorEntry;
  showCategory?: boolean;
}
export function BehaviorCard({ behavior, showCategory }: Props) {
  const navigation = useNavigation<NavProp>();
  const { removeBehavior } = useBehaviorStore();
  const swipeableRef = useRef<Swipeable>(null);
  const [, setTick] = useState(0);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = () => {
    swipeableRef.current?.close();
    Alert.alert('Remove Behavior', `Remove "${behavior.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeBehavior(behavior.id),
      },
    ]);
  };

  const handlePress = () => {
    navigation.navigate('BehaviorDetails', { behaviorId: behavior.id });
  };

  const handleLongPress = () => {
    setEditModalVisible(true);
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={() => <SwipeDelete onRemove={handleRemove} />}
        overshootLeft={false}
      >
        <View style={styles.card}>
          <Pressable
            style={styles.content}
            onPress={handlePress}
            onLongPress={handleLongPress}
          >
            <BehaviorIcon
              behavior={behavior}
              size={32}
            />
            <BehaviorInfo
              behavior={behavior}
              showCategory={showCategory}
            />
          </Pressable>

          <LogButton
            behavior={behavior}
            onPress={() => setLogModalVisible(true)}
          />
        </View>
      </Swipeable>

      <BehaviorLogModal
        behavior={behavior}
        visible={logModalVisible}
        onClose={() => setLogModalVisible(false)}
      />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <Pressable
            style={styles.editModalBackdrop}
            onPress={() => setEditModalVisible(false)}
          />
          <BehaviorForm
            behavior={behavior}
            onClose={() => setEditModalVisible(false)}
          />
        </View>
      </Modal>
    </>
  );
}

// #region Sub-components

interface BehaviorInfoProps {
  behavior: BehaviorEntry;
  showCategory?: boolean;
}
function BehaviorInfo({ behavior, showCategory }: BehaviorInfoProps) {
  const { categories } = useBehaviorStore();
  const category = showCategory && behavior.categoryId
    ? categories.find((c) => c.id === behavior.categoryId)
    : undefined;

  return (
    <View style={styles.info}>
      <View style={styles.nameRow}>
        <BehaviorName behavior={behavior} />
        {category && <Text style={styles.categoryBadge}>{category.emoji}</Text>}
      </View>
      <View style={styles.elapsedRow}>
        <BehaviorElapsed behavior={behavior} />
        <CooldownLabel behavior={behavior} />
      </View>
    </View>
  );
}

interface BehaviorNameProps {
  behavior: BehaviorEntry;
}
function BehaviorName({ behavior }: BehaviorNameProps) {
  return <Text style={styles.name}>{behavior.name}</Text>;
}

interface BehaviorElapsedProps {
  behavior: BehaviorEntry;
}
function BehaviorElapsed({ behavior }: BehaviorElapsedProps) {
  return <Text style={styles.elapsed}>{formatElapsedNumeric(behavior.lastTimestamp)}</Text>;
}

interface LogButtonProps {
  behavior: BehaviorEntry;
  onPress: () => void;
}
function LogButton({ behavior, onPress }: LogButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.logBtn, pressed && styles.logBtnPressed]}
      onPress={onPress}
      accessibilityLabel={`Log ${behavior.name}`}
    >
      <Ionicons
        name="add-circle-outline"
        size={28}
        color="#ccc"
      />
    </Pressable>
  );
}

interface SwipeDeleteProps {
  onRemove: () => void;
}
function SwipeDelete({ onRemove }: SwipeDeleteProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.deleteButton,
        pressed && {
          opacity: 0.8,
        },
      ]}
      onPress={onRemove}
    >
      <Ionicons
        name="trash"
        size={24}
        color="#fff"
      />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Pressable>
  );
}
// #endregion

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  info: {
    flex: 1,
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBadge: {
    fontSize: 15,
  },
  elapsed: {
    color: '#888',
    fontSize: 13,
  },
  logBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logBtnPressed: {
    opacity: 0.5,
    transform: [
      {
        scale: 0.92,
      },
    ],
  },
  deleteButton: {
    backgroundColor: '#943030',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: 6,
    marginLeft: 16,
    marginRight: -48,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingRight: 28,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  editModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
