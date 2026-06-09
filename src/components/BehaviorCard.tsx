import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import { getBehaviorTypeColor } from '../utils/behaviorTypeUtils';
import { Colors } from '../utils/colors';
import { getCooldownColor } from '../utils/cooldownUtils';
import { formatElapsedNumeric } from '../utils/timeUtils';
import { BehaviorForm } from './BehaviorForm';
import { BehaviorIcon } from './BehaviorIcon';
import { BehaviorLogModal } from './BehaviorLogModal';
import { Button } from './Button';
import { CooldownLabel } from './CooldownLabel';
import { Text } from './Text';
import { XpBar } from './XpBar';

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
          <Pressable style={styles.content} onPress={handlePress} onLongPress={handleLongPress}>
            <BehaviorIcon behavior={behavior} size={32} />
            <BehaviorInfo behavior={behavior} showCategory={showCategory} />
          </Pressable>

          <LogButton behavior={behavior} onPress={() => setLogModalVisible(true)} />
        </View>
      </Swipeable>

      <BehaviorLogModal behavior={behavior} visible={logModalVisible} onClose={() => setLogModalVisible(false)} />

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <Pressable style={styles.editModalBackdrop} onPress={() => setEditModalVisible(false)} />
          <BehaviorForm behavior={behavior} onClose={() => setEditModalVisible(false)} />
        </View>
      </Modal>
    </>
  );
}

// #region Sub-components

interface CategoryEmojiProps {
  behavior: BehaviorEntry;
}
function CategoryEmoji({ behavior }: CategoryEmojiProps) {
  const { categories } = useBehaviorStore();
  if (!behavior.categoryId) return;

  const category = categories.find(c => c.id === behavior.categoryId);

  if (!category) return null;

  return <Text style={{ fontSize: 15 }}>{category.emoji}</Text>;
}

interface BehaviorInfoProps {
  behavior: BehaviorEntry;
  showCategory?: boolean;
}
function BehaviorInfo({ behavior, showCategory }: BehaviorInfoProps) {
  return (
    <View style={styles.info}>
      <View style={styles.nameRow}>
        <BehaviorName behavior={behavior} />
        {showCategory && <CategoryEmoji behavior={behavior} />}
      </View>
      <View style={styles.elapsedRow}>
        <BehaviorElapsed behavior={behavior} />
        <CooldownLabel behavior={behavior} />
      </View>
      <XpBar logCount={behavior.logs.length} color={getBehaviorTypeColor(behavior.type)} />
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
  const color = behavior.cooldownMinutes ? getCooldownColor(behavior) : undefined;

  return (
    <Text style={color ? [styles.elapsed, { color }] : styles.elapsed}>
      {formatElapsedNumeric(behavior.lastTimestamp)}
    </Text>
  );
}

interface LogButtonProps {
  behavior: BehaviorEntry;
  onPress: () => void;
}
function LogButton({ behavior, onPress }: LogButtonProps) {
  return (
    <Button variant="icon" onPress={onPress} accessibilityLabel={`Log ${behavior.name}`} style={styles.logBtn}>
      <Ionicons name="add-circle-outline" size={28} color="#ccc" />
    </Button>
  );
}

interface SwipeDeleteProps {
  onRemove: () => void;
}
function SwipeDelete({ onRemove }: SwipeDeleteProps) {
  return (
    <Button variant="danger" onPress={onRemove} style={styles.deleteButton}>
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Button>
  );
}
// #endregion

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
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
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },

  elapsed: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  logBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
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
    color: Colors.textPrimary,
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
