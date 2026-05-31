import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import type { MetadataField, MetadataType } from '../types/metadata';
import { Text, TextInput } from './Text';

interface Props {
  metadata: MetadataField[];
  onChange: (metadata: MetadataField[]) => void;
}

export function MetadataInput({ metadata, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newType, setNewType] = useState<MetadataType>('string');

  const handleAdd = () => {
    if (!newName.trim()) return;

    const field: MetadataField = {
      id: uuidv4(),
      name: newName.trim(),
      type: newType,
      value: newType === 'integer' ? Number(newValue) || 0 : newValue,
      unit: newType === 'integer' && newUnit.trim() ? newUnit.trim() : undefined,
    };

    onChange([
      ...metadata,
      field,
    ]);
    setNewName('');
    setNewValue('');
    setNewUnit('');
    setNewType('string');
    setShowAdd(false);
  };

  const handleRemove = (id: string) => {
    onChange(metadata.filter((m) => m.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<MetadataField>) => {
    onChange(
      metadata.map((m) =>
        m.id === id
          ? {
              ...m,
              ...updates,
            }
          : m,
      ),
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Metadata</Text>

      {metadata.map((field) => (
        <View
          key={field.id}
          style={styles.fieldRow}
        >
          <View style={styles.fieldInfo}>
            <Text style={styles.fieldName}>{field.name}</Text>
            <TextInput
              style={styles.fieldValueInput}
              value={String(field.value)}
              onChangeText={(text) => {
                const value = field.type === 'integer' ? Number(text) || 0 : text;
                handleUpdate(field.id, {
                  value,
                });
              }}
              keyboardType={field.type === 'integer' ? 'numeric' : 'default'}
              placeholder="Value"
              placeholderTextColor="#666"
            />
            {field.unit && <Text style={styles.unit}>{field.unit}</Text>}
          </View>
          <Pressable
            style={styles.removeBtn}
            onPress={() => handleRemove(field.id)}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#ff4444"
            />
          </Pressable>
        </View>
      ))}

      {showAdd ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Name (e.g., Cooldown, Reps)"
            placeholderTextColor="#666"
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />

          <View style={styles.typeSelector}>
            {(
              [
                'string',
                'integer',
                'duration',
              ] as MetadataType[]
            ).map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.typeBtn,
                  newType === type && styles.typeBtnActive,
                ]}
                onPress={() => setNewType(type)}
              >
                <Text
                  style={[
                    styles.typeText,
                    newType === type && styles.typeTextActive,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.valueRow}>
            <TextInput
              style={[
                styles.input,
                styles.valueInput,
              ]}
              placeholder="Value"
              placeholderTextColor="#666"
              value={newValue}
              onChangeText={setNewValue}
              keyboardType={newType === 'integer' ? 'numeric' : 'default'}
            />
            {newType === 'integer' && (
              <TextInput
                style={[
                  styles.input,
                  styles.unitInput,
                ]}
                placeholder="Unit"
                placeholderTextColor="#666"
                value={newUnit}
                onChangeText={setNewUnit}
              />
            )}
          </View>

          <View style={styles.addActions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => {
                setShowAdd(false);
                setNewName('');
                setNewValue('');
                setNewUnit('');
                setNewType('string');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.addBtn}
              onPress={handleAdd}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.addNewBtn}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color="#aaa"
          />
          <Text style={styles.addNewText}>Add metadata field</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  fieldInfo: {
    flex: 1,
    gap: 6,
  },
  fieldName: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldValueInput: {
    color: '#fff',
    fontSize: 15,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unit: {
    color: '#888',
    fontSize: 12,
  },
  removeBtn: {
    padding: 4,
  },
  addForm: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#fff',
  },
  typeText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeTextActive: {
    color: '#000',
  },
  valueRow: {
    flexDirection: 'row',
    gap: 8,
  },
  valueInput: {
    flex: 1,
  },
  unitInput: {
    width: 80,
  },
  addActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  addNewText: {
    color: '#aaa',
    fontSize: 14,
  },
});
