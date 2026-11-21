import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { IconTile } from '../../../components/icon-tile';
import { Text, TextInput } from '../../../components/text';
import type { MetadataField } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';
import { fetchNutritionFromUrl, isGramAmountField } from '../../../utils/nutrition-import-utils';
import { EatThisMuchSearchModal } from './eatthismuch-search-modal';

interface NutritionUrlImportProps {
  fields: MetadataField[];
  amountField: MetadataField | undefined;
  /** Grams the rates are given for (the behaviour's rate basis). */
  rateBasis: number;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Sets the behaviour icon from a searched food's picture. */
  onIconPick?: (imageUrl: string) => void;
  /** Behaviour name, used as the starting search query. */
  searchHint?: string;
  /** The behaviour's current icon text; empty means none yet. */
  currentIcon?: string;
}

interface ImportStatus {
  message: string;
  isError: boolean;
}

export function NutritionUrlImport({
  fields,
  amountField,
  rateBasis,
  onChange,
  onIconPick,
  searchHint,
  currentIcon,
}: NutritionUrlImportProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [iconOffer, setIconOffer] = useState<string | null>(null);
  const trimmedUrl = url.trim();

  const handleImport = async (link: string = trimmedUrl) => {
    if (!/^https?:\/\//i.test(link)) {
      setStatus({ message: 'Paste a full link starting with https://', isError: true });
      return;
    }
    if (!isGramAmountField(amountField)) {
      setStatus({ message: 'Select an Amount unit in grams to import nutrition rates.', isError: true });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const result = await fetchNutritionFromUrl(link, fields, rateBasis);
      if (result.matchedFields.length === 0) {
        setStatus({ message: 'No nutrients on that page matched this category’s fields.', isError: true });
        return;
      }
      onChange(prev => ({ ...prev, ...result.values }));
      const filled = result.matchedFields.map(field => field.label).join(', ');
      const missing = result.unmatchedFields.map(field => field.label).join(', ');
      setStatus({
        message: `Filled ${filled} per ${rateBasis}g from a ${result.servingGrams}g serving.${missing ? ` Not found: ${missing}.` : ''}`,
        isError: false,
      });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : 'Import failed.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={() => setSearchOpen(true)}
          hitSlop={8}
          style={styles.searchButton}
        >
          <Ionicons
            name="search"
            size={20}
            color={Colors.text.primary}
          />
        </Pressable>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Paste a nutrition page link"
          placeholderTextColor={Colors.text.dim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => handleImport()}
        />
        <Button
          size="sm"
          onPress={() => handleImport()}
          disabled={loading || !trimmedUrl}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={Colors.text.light}
            />
          ) : (
            'Import'
          )}
        </Button>
      </View>
      {searchOpen && (
        <EatThisMuchSearchModal
          onClose={() => setSearchOpen(false)}
          initialQuery={searchHint}
          onUseAsIcon={
            onIconPick &&
            (imageUrl => {
              onIconPick(imageUrl);
              setSearchOpen(false);
            })
          }
          onPick={(result, imageUrl) => {
            setSearchOpen(false);
            // No icon yet: use the food's photo. Otherwise ask before replacing it.
            if (imageUrl && onIconPick) {
              if (currentIcon?.trim()) setIconOffer(imageUrl);
              else onIconPick(imageUrl);
            }
            setUrl(result.url);
            handleImport(result.url);
          }}
        />
      )}
      {iconOffer && (
        <Modal
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIconOffer(null)}
        >
          <View style={styles.dialogBackdrop}>
            <View style={styles.dialog}>
              <Text style={styles.dialogTitle}>Replace the icon?</Text>
              <View style={styles.dialogIcons}>
                <IconTile
                  value={currentIcon}
                  size={72}
                  radius={16}
                  style={styles.dialogTile}
                />
                <Ionicons
                  name="arrow-forward"
                  size={28}
                  color={Colors.text.muted}
                />
                <IconTile
                  value={iconOffer}
                  size={72}
                  radius={16}
                  style={styles.dialogTile}
                />
              </View>
              <View style={styles.dialogButtons}>
                <Button
                  size="sm"
                  onPress={() => setIconOffer(null)}
                >
                  Keep current
                </Button>
                <Button
                  size="sm"
                  onPress={() => {
                    onIconPick?.(iconOffer);
                    setIconOffer(null);
                  }}
                >
                  Replace
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {status && <Text style={[styles.status, status.isError && styles.statusError]}>{status.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: 14,
  },
  dialogBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  dialogTitle: { color: Colors.text.primary, fontSize: 17, fontWeight: '600' },
  dialogIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dialogTile: { backgroundColor: Colors.bg.input, alignItems: 'center', justifyContent: 'center' },
  dialogButtons: { flexDirection: 'row', gap: 12 },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg.input,
  },
  button: {
    minWidth: 72,
    justifyContent: 'center',
  },
  status: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  statusError: {
    color: Colors.status.dangerLight,
  },
});
