import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { ChatPic } from '../../../modules/app-usage';
import { CHAT_APPS, getChatApp } from '../../utils/chat-pics-utils';
import { Colors } from '../../utils/colors';
import { Text } from '../text';

interface ChatPicTileProps {
  pic: ChatPic;
  /** Name of the person already using this pic. */
  ownerName?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

/** One saved chat pic: round picture, app badge, sender name and who uses it. */
export function ChatPicTile({ pic, ownerName, onPress, onLongPress }: ChatPicTileProps) {
  const app = CHAT_APPS[getChatApp(pic.packageName)];
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${pic.name}, ${app.label}`}
    >
      <View>
        <Image
          source={{ uri: pic.uri }}
          style={styles.image}
        />
        <View style={[styles.badge, { backgroundColor: app.color }]}>
          <Text style={styles.badgeText}>{app.letter}</Text>
        </View>
      </View>
      <Text
        style={styles.name}
        numberOfLines={1}
      >
        {pic.name}
      </Text>
      {ownerName ? (
        <Text
          style={styles.owner}
          numberOfLines={1}
        >
          {ownerName}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '33.33%', alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 4 },
  pressed: { opacity: 0.6 },
  image: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.bg.card },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  name: { color: Colors.text.primary, fontSize: 12, maxWidth: 110 },
  owner: {
    color: Colors.type.desirable,
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 100,
  },
});
