import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScreenModal } from '../../../components/full-screen-modal';
import { Text, TextInput } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { type FoodSearchResult, searchEatThisMuch } from '../../../utils/nutrition-import-utils';

interface EatThisMuchSearchModalProps {
  onPick: (result: FoodSearchResult) => void;
  /** Sets the picked food's image as the behaviour icon. Hides the button when missing. */
  onUseAsIcon?: (imageUrl: string) => void;
  onClose: () => void;
}

/** Searches eatthismuch.com foods and returns the picked food's page link for the nutrition import. */
export function EatThisMuchSearchModal({ onPick, onUseAsIcon, onClose }: EatThisMuchSearchModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copyImage = async (item: FoodSearchResult) => {
    if (!item.imageUrl) return;
    await Clipboard.setStringAsync(item.imageUrl);
    setNotice(`Copied the ${item.name} image link.`);
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchEatThisMuch(query));
    } catch (e) {
      setResults(null);
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenModal
      title="Search Eat This Much"
      onClose={onClose}
    >
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods, e.g. shiitake"
          placeholderTextColor={Colors.text.dim}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <Pressable
          onPress={search}
          hitSlop={8}
          style={styles.searchButton}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={Colors.text.light}
            />
          ) : (
            <Ionicons
              name="search"
              size={20}
              color={Colors.text.light}
            />
          )}
        </Pressable>
      </View>
      {notice && <Text style={styles.notice}>{notice}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {results?.length === 0 && <Text style={styles.empty}>No foods found.</Text>}
      <FlatList
        data={results ?? []}
        keyExtractor={item => item.url}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() => onPick(item)}
              style={styles.main}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.thumb}
                />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={styles.texts}>
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.description && (
                  <Text
                    style={styles.description}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
            </Pressable>
            {item.imageUrl && (
              <>
                <Pressable
                  onPress={() => copyImage(item)}
                  hitSlop={6}
                  style={styles.action}
                >
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    color={Colors.text.muted}
                  />
                </Pressable>
                {onUseAsIcon && (
                  <Pressable
                    onPress={() => item.imageUrl && onUseAsIcon(item.imageUrl)}
                    hitSlop={6}
                    style={styles.action}
                  >
                    <Ionicons
                      name="image-outline"
                      size={20}
                      color={Colors.text.muted}
                    />
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  input: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 15,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 4 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 2 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.bg.input },
  action: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  notice: { color: Colors.text.muted, fontSize: 12, paddingHorizontal: 16 },
  name: { color: Colors.text.primary, fontSize: 15 },
  description: { color: Colors.text.dim, fontSize: 12 },
  error: { color: Colors.status.dangerLight, fontSize: 12, paddingHorizontal: 16 },
  empty: { color: Colors.text.muted, fontSize: 13, paddingHorizontal: 16 },
});
