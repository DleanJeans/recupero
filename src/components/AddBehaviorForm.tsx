import React, { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './Text';

interface Props {
  newIcon: string;
  newName: string;
  onChangeIcon: (v: string) => void;
  onChangeName: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function AddBehaviorForm({ newIcon, newName, onChangeIcon, onChangeName, onAdd, onCancel }: Props) {
  const nameRef = useRef<import('react-native').TextInput>(null);

  return (
    <KeyboardAvoidingView behavior="position">
      <View style={styles.form}>
        <View style={styles.row}>
          <TextInput
            style={styles.iconInput}
            placeholder="🏃"
            placeholderTextColor="#4a4a4a"
            value={newIcon}
            onChangeText={onChangeIcon}
            onSubmitEditing={() => nameRef.current?.focus()}
            returnKeyType="next"
          />
          <TextInput
            ref={nameRef}
            style={styles.nameInput}
            placeholder="Behavior name (e.g. Water, Push-ups)"
            placeholderTextColor="#666"
            value={newName}
            onChangeText={onChangeName}
            autoFocus
            onSubmitEditing={onAdd}
            returnKeyType="done"
          />
        </View>
        <View style={styles.actions}>
          <Pressable
            style={styles.cancelBtn}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={styles.addBtn}
            onPress={onAdd}
          >
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  iconInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 22,
    width: 56,
    textAlign: 'center',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '600',
  },
});
