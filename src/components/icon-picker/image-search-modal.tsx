import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Colors } from '../../utils/colors';
import {
  getImageSearchUrl,
  IMAGE_SEARCH_SCRIPT,
  type ImageCandidate,
  parseImageCandidate,
} from '../../utils/image-search-utils';
import { Button } from '../button';
import { Text, TextInput } from '../text';

interface Props {
  initialQuery: string;
  onPick: (url: string) => void;
  onClose: () => void;
}

/** Google Images inside the app. Tap a result to open its preview, then "Use this image". */
export function ImageSearchModal({ initialQuery, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [url, setUrl] = useState(() => getImageSearchUrl(initialQuery));
  const [candidate, setCandidate] = useState<ImageCandidate | null>(null);
  const [loading, setLoading] = useState(true);

  const search = () => {
    if (query.trim()) setUrl(getImageSearchUrl(query));
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Button
            variant="icon"
            onPress={onClose}
            accessibilityLabel="Close image search"
          >
            <Ionicons
              name="close"
              size={22}
              color={Colors.text.primary}
            />
          </Button>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            placeholder="Search images"
            placeholderTextColor={Colors.text.faint}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
        <View style={styles.web}>
          <WebView
            source={{ uri: url }}
            injectedJavaScript={IMAGE_SEARCH_SCRIPT}
            onMessage={event => setCandidate(parseImageCandidate(event.nativeEvent.data))}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            setSupportMultipleWindows={false}
            style={styles.web}
          />
          {loading && (
            <ActivityIndicator
              style={styles.spinner}
              color={Colors.text.muted}
            />
          )}
        </View>
        <View style={styles.footer}>
          {candidate ? (
            <Image
              source={{ uri: candidate.src }}
              style={styles.thumb}
            />
          ) : (
            <View style={styles.thumb} />
          )}
          <Text
            style={styles.footerText}
            numberOfLines={2}
          >
            {candidate
              ? `${candidate.width}×${candidate.height}. Tap a result for a bigger version.`
              : 'Tap a result to preview it, then use it.'}
          </Text>
          <Button
            variant="primary"
            disabled={!candidate}
            onPress={() => candidate && onPick(candidate.src)}
          >
            Use
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg.primary, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  search: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    color: Colors.text.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
  web: { flex: 1, backgroundColor: Colors.bg.primary },
  spinner: { position: 'absolute', top: 24, alignSelf: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.bg.input },
  footerText: { flex: 1, color: Colors.text.muted, fontSize: 12, lineHeight: 16 },
});
