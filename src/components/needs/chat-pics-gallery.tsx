import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppUsage, type ChatPic } from '../../../modules/app-usage';
import { useChatPics } from '../../hooks/use-chat-pics';
import { usePeopleStore } from '../../store/people-store';
import type { Person } from '../../types/person';
import { CHAT_APPS, type ChatApp, findPicOwner, getChatApp, splitSuggestedPics } from '../../utils/chat-pics-utils';
import { Colors } from '../../utils/colors';
import { FullScreenModal } from '../full-screen-modal';
import { Text } from '../text';
import { ChatPicTile } from './chat-pic-tile';

interface ChatPicsGalleryProps {
  /** Person whose pic is being chosen: their name matches are shown first. Omit to just browse and assign. */
  forPerson?: Pick<Person, 'name' | 'nicknames' | 'phone'>;
  /** Called with the chosen pic when picking for a person. */
  onPick?: (pic: ChatPic) => void;
  onClose: () => void;
}

type Filter = 'all' | ChatApp;

/** Profile pics saved from chat notifications. Tap one to use it for a person; long-press to delete it. */
export function ChatPicsGallery({ forPerson, onPick, onClose }: ChatPicsGalleryProps) {
  const { pics, remove } = useChatPics();
  const people = usePeopleStore(state => state.people);
  const updatePerson = usePeopleStore(state => state.updatePerson);
  const [filter, setFilter] = useState<Filter>('all');
  const [assigning, setAssigning] = useState<ChatPic>();

  const shown = useMemo(
    () => pics.filter(pic => filter === 'all' || getChatApp(pic.packageName) === filter),
    [pics, filter],
  );
  const { suggested, others } = useMemo(
    () => (forPerson ? splitSuggestedPics(shown, forPerson) : { suggested: [], others: shown }),
    [shown, forPerson],
  );

  const assign = (pic: ChatPic, person: Person) => {
    const uri = AppUsage?.copyChatPicForPerson?.(pic.id);
    if (uri) updatePerson(person.id, { ...person, emoji: uri });
    setAssigning(undefined);
  };

  const renderTiles = (list: ChatPic[]) => (
    <View style={styles.grid}>
      {list.map(pic => (
        <ChatPicTile
          key={pic.id}
          pic={pic}
          ownerName={findPicOwner(pic, people)?.name}
          onPress={() => (onPick ? onPick(pic) : setAssigning(pic))}
          onLongPress={() =>
            Alert.alert(
              `Delete ${pic.name}'s pic?`,
              'It is removed from this phone. People already using it keep it.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => remove(pic.id) },
              ],
            )
          }
        />
      ))}
    </View>
  );

  return (
    <FullScreenModal
      title="Chat pics"
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filters}>
          {(['all', 'whatsapp', 'messenger', 'instagram'] as const).map(value => (
            <Pressable
              key={value}
              style={[styles.pill, filter === value && styles.pillOn]}
              onPress={() => setFilter(value)}
              accessibilityRole="button"
            >
              <Text style={[styles.pillText, filter === value && styles.pillTextOn]}>
                {value === 'all' ? `All ${pics.length}` : CHAT_APPS[value].label}
              </Text>
            </Pressable>
          ))}
        </View>
        {pics.length === 0 ? (
          <Text style={styles.hint}>
            No pics yet. They appear here after someone messages you on WhatsApp, Messenger or Instagram (Notification
            access must be on). Pics stay on this phone.
          </Text>
        ) : null}
        {suggested.length > 0 ? (
          <>
            <Text style={styles.section}>MATCHES THE NAME</Text>
            {renderTiles(suggested)}
            <Text style={styles.section}>OTHER PICS</Text>
          </>
        ) : null}
        {renderTiles(others)}
        {pics.length > 0 ? (
          <>
            <Text style={styles.hint}>Long-press a pic to delete it.</Text>
            <Pressable
              onPress={() =>
                Alert.alert('Delete all chat pics?', 'People already using a pic keep it.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete all', style: 'destructive', onPress: () => remove(null) },
                ])
              }
              accessibilityRole="button"
            >
              <Text style={styles.deleteAll}>Delete all chat pics</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
      {assigning ? (
        <FullScreenModal
          title={`Use ${assigning.name}'s pic for…`}
          onClose={() => setAssigning(undefined)}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {people.length === 0 ? <Text style={styles.hint}>Add a person on the Social screen first.</Text> : null}
            {people.map(person => (
              <Pressable
                key={person.id}
                style={({ pressed }) => [styles.person, pressed && styles.pressed]}
                onPress={() => assign(assigning, person)}
                accessibilityRole="button"
              >
                <Text
                  style={styles.personName}
                  numberOfLines={1}
                >
                  {person.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </FullScreenModal>
      ) : null}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.bg.card },
  pillOn: { backgroundColor: '#14532d' },
  pillText: { color: Colors.text.light, fontSize: 12 },
  pillTextOn: { color: '#86efac' },
  section: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  deleteAll: { color: Colors.type.undesirable, fontSize: 13, fontWeight: '600', paddingVertical: 8 },
  person: { padding: 14, borderRadius: 12, backgroundColor: Colors.bg.card },
  pressed: { opacity: 0.6 },
  personName: { color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
});
