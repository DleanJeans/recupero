import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { BackButton } from '../../components/back-button';
import { Button } from '../../components/button';
import { CategoryForm } from '../../components/category-picker/category-form';
import { SafeAreaView } from '../../components/safe-area-view';
import { ScreenTitle } from '../../components/screen-title';
import { Text } from '../../components/text';
import { useBehaviorStore } from '../../store/behavior-store';
import type { MetadataField } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { FabButtonRow } from '../components/fab-button-row';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function CategoryFormScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const navigation = useNavigation<NavigationProp>();
  const { categoryId, selectOnSave } = route.params ?? {};
  const category = useBehaviorStore(state => state.categories.find(c => c.id === categoryId));
  const isEditing = categoryId != null;

  const [emoji, setEmoji] = useState(() => category?.emoji ?? '');
  const [name, setName] = useState(() => category?.name ?? '');
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>(() => category?.metadataFields ?? []);
  const [metadataResetNonce, setMetadataResetNonce] = useState(0);
  const trimmedEmoji = emoji.trim();
  const trimmedName = name.trim();
  const metadataFieldsValid = metadataFields.every(field => field.label.trim().length > 0);
  const metadataFieldsChanged = JSON.stringify(metadataFields) !== JSON.stringify(category?.metadataFields ?? []);
  const hasChanges =
    !isEditing ||
    (category != null && (trimmedEmoji !== category.emoji || trimmedName !== category.name || metadataFieldsChanged));
  const canSave = trimmedEmoji.length > 0 && trimmedName.length > 0 && metadataFieldsValid && hasChanges;

  const handleSave = () => {
    if (!trimmedEmoji || !trimmedName || !metadataFieldsValid) return;

    const metadata = metadataFields.length > 0 ? metadataFields : undefined;
    const { addCategory, updateCategory } = useBehaviorStore.getState();

    if (categoryId) {
      updateCategory(categoryId, { name: trimmedName, emoji: trimmedEmoji, metadataFields: metadata });
      navigation.goBack();
      return;
    }

    const beforeCount = useBehaviorStore.getState().categories.length;
    addCategory(trimmedName, trimmedEmoji, metadata);
    const newCategory = useBehaviorStore.getState().categories[beforeCount];

    if (selectOnSave && newCategory) {
      navigation.navigate({
        name: 'BehaviorForm',
        params: { selectedCategoryId: newCategory.id },
        merge: true,
      });
      return;
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    if (!categoryId || !category) return;
    Alert.alert(`Delete "${category.name}"?`, 'Behaviors in this category will lose their category assignment.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          useBehaviorStore.getState().removeCategory(categoryId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleUndo = () => {
    if (!category) return;
    setEmoji(category.emoji);
    setName(category.name);
    setMetadataFields(category.metadataFields ?? []);
    setMetadataResetNonce(nonce => nonce + 1);
  };

  if (isEditing && !category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <ScreenTitle>Category Not Found</ScreenTitle>
        </View>
        <Text style={styles.emptyText}>This category no longer exists.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <ScreenTitle>{isEditing ? 'Edit Category' : 'New Category'}</ScreenTitle>
      </View>
      <KeyboardAvoidingView
        behavior="height"
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <CategoryForm
            categoryId={categoryId}
            emoji={emoji}
            name={name}
            isEditing={isEditing}
            onEmojiChange={setEmoji}
            onNameChange={setName}
            metadataFields={metadataFields}
            metadataResetNonce={metadataResetNonce}
            onMetadataFieldsChange={setMetadataFields}
            onSave={handleSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <FabButtonRow>
        {isEditing && (
          <Button
            variant="danger"
            onPress={handleDelete}
            style={styles.deleteButton}
            accessibilityLabel="Delete category"
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={Colors.text.primary}
            />
          </Button>
        )}
        {isEditing && (
          <Button
            variant="secondary"
            onPress={handleUndo}
            disabled={!hasChanges}
            style={styles.undoButton}
            accessibilityLabel="Undo category changes"
          >
            <Ionicons
              name="arrow-undo"
              size={20}
              color={Colors.text.light}
            />
          </Button>
        )}
        <Button
          variant="primary"
          onPress={handleSave}
          disabled={!canSave}
          style={styles.saveButton}
        >
          {isEditing ? 'Save' : 'Add'}
        </Button>
      </FabButtonRow>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 112,
  },
  deleteButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  undoButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  saveButton: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 12,
  },
  emptyText: {
    color: Colors.text.faint,
    fontSize: 15,
    padding: 16,
  },
});
