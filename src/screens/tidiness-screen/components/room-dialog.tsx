import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/button';
import { EmojiPicker } from '../../../components/emoji-picker';
import { Text, TextInput } from '../../../components/text';
import { useKeyboardVisible } from '../../../hooks/use-keyboard-visible';
import { useTidinessStore } from '../../../store/tidiness-store';
import { Colors } from '../../../utils/colors';
import { findEmojiByKeyword } from '../../../utils/emoji-data';

interface RoomDialogProps {
  /** Undefined = a new room. */
  roomId?: string;
  onSaved?: (roomId: string) => void;
  onClose: () => void;
}

/** Name and icon for a room. Docks to the top while the keyboard shows. */
export function RoomDialog({ roomId, onSaved, onClose }: RoomDialogProps) {
  const room = useTidinessStore(store => store.rooms.find(item => item.id === roomId));
  const spotCount = useTidinessStore(store => store.spots.filter(spot => spot.roomId === roomId).length);
  const addRoom = useTidinessStore(store => store.addRoom);
  const updateRoom = useTidinessStore(store => store.updateRoom);
  const removeRoom = useTidinessStore(store => store.removeRoom);
  const keyboardUp = useKeyboardVisible();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(room?.name ?? '');
  const [emoji, setEmoji] = useState(room?.emoji ?? '');
  const trimmed = name.trim();

  const save = () => {
    if (!trimmed) return;
    const icon = emoji || findEmojiByKeyword(trimmed) || '🏠';
    if (room) {
      updateRoom(room.id, { name: trimmed, emoji: icon });
      onSaved?.(room.id);
    } else {
      onSaved?.(addRoom({ name: trimmed, emoji: icon }));
    }
    onClose();
  };

  const remove = () => {
    if (!room) return;
    const doRemove = () => {
      removeRoom(room.id);
      onClose();
    };
    if (spotCount === 0) {
      doRemove();
      return;
    }
    Alert.alert(`Delete ${room.name}?`, `Its ${spotCount} spot${spotCount === 1 ? '' : 's'} will be deleted too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          keyboardUp && styles.overlayTop,
          { paddingTop: 24 + (keyboardUp ? insets.top : 0), paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{room ? 'Edit room' : 'New room'}</Text>
          <View style={styles.inputRow}>
            <EmojiPicker
              value={emoji}
              onChangeText={setEmoji}
              nameHint={name}
              style={styles.emoji}
            />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Kitchen, Desk corner…"
              placeholderTextColor={Colors.text.faint}
              autoFocus={!room}
              returnKeyType="done"
              onSubmitEditing={save}
            />
          </View>
          <View style={styles.actions}>
            {room && (
              <Button
                variant="danger"
                onPress={remove}
              >
                Delete
              </Button>
            )}
            <View style={styles.spacer} />
            <Button onPress={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!trimmed}
              onPress={save}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayTop: { justifyContent: 'flex-start' },
  sheet: { backgroundColor: Colors.bg.card, borderRadius: 14, padding: 16, gap: 12 },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { height: 46, borderRadius: 10 },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 16,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { flex: 1 },
});
