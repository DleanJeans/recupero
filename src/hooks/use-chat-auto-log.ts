import { useEffect } from 'react';
import { AppState } from 'react-native';
import { AppUsage } from '../../modules/app-usage';
import { usePeopleStore } from '../store/people-store';
import { planChatContacts } from '../utils/people-utils';

/** Logs a "message" contact for people who wrote to you in WhatsApp or Messenger (needs Notification access). */
async function syncChatContacts() {
  if (!AppUsage?.getChatEvents || !AppUsage.isMediaWatchEnabled?.()) return;
  const store = usePeopleStore.getState();
  const now = Date.now();
  const events = await AppUsage.getChatEvents(store.chatSyncedTs, now);
  const plan = planChatContacts(events, store.people, store.chatSyncedTs, store.contacts);
  for (const { personId, ts } of plan) usePeopleStore.getState().logContact(personId, 'message', ts, 'notification');
  store.setChatSyncedTs(now);
}

/** Runs the chat sync at start and whenever the app comes to the front. */
export function useChatAutoLog(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    syncChatContacts().catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') syncChatContacts().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [ready]);
}
