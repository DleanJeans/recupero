import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Colors } from '../../utils/colors';
import {
  DESKTOP_USER_AGENT,
  getImageSearchUrl,
  getUrlForQuery,
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
  const [desktop, setDesktop] = useState(false);
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const currentUrl = useRef('');

  // System Back steps back through the browser history; it closes only when there is none left.
  const handleBack = () => {
    if (canGoBack.current) webRef.current?.goBack();
    else onClose();
  };
  const onNavigation = (nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack;
    currentUrl.current = nav.url;
  };

  const search = () => {
    if (query.trim()) setUrl(getUrlForQuery(query));
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={handleBack}
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
            placeholder="Search images or type a web address"
            placeholderTextColor={Colors.text.faint}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Button
            variant="icon"
            onPress={() => {
              // The browser restarts with the other identity: reopen the page being viewed, not the first search.
              if (currentUrl.current) setUrl(currentUrl.current);
              setDesktop(value => !value);
            }}
            accessibilityLabel={desktop ? 'Desktop mode on' : 'Desktop mode off'}
            accessibilityState={{ selected: desktop }}
          >
            <Ionicons
              name={desktop ? 'desktop' : 'desktop-outline'}
              size={22}
              color={desktop ? Colors.type.desirable : Colors.text.secondary}
            />
          </Button>
        </View>
        <View style={styles.web}>
          <WebView
            key={desktop ? 'desktop' : 'mobile'}
            ref={webRef}
            userAgent={desktop ? DESKTOP_USER_AGENT : undefined}
            onNavigationStateChange={onNavigation}
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
