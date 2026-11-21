import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ContactKind, Person, PersonContact } from '../types/person';
import { CONTACT_AMOUNTS, DEFAULT_NUDGE_DAYS } from '../utils/people-utils';
import { useNeedsStore } from './needs-store';

const MAX_CONTACTS = 3000;

export type PersonDraft = Omit<Person, 'id' | 'createdAt'>;

export const EMPTY_PERSON: PersonDraft = {
  name: '',
  emoji: '🧑',
  nicknames: '',
  phone: '',
  birthday: '',
  address: '',
  preferences: '',
  nudgeDays: DEFAULT_NUDGE_DAYS,
};

interface PeopleStore {
  people: Person[];
  contacts: PersonContact[];
  /** Chat notifications up to this time were already turned into contacts. */
  chatSyncedTs: number;
  setChatSyncedTs: (ts: number) => void;
  addPerson: (draft: PersonDraft) => string | undefined;
  updatePerson: (personId: string, draft: PersonDraft) => void;
  removePerson: (personId: string) => void;
  /** Records a contact and tops up the Social need by how much that kind of contact counts. */
  logContact: (personId: string, kind: ContactKind, ts?: number, source?: PersonContact['source']) => void;
  removeContact: (contactId: string) => void;
}

export const usePeopleStore = create<PeopleStore>()(
  persist(
    set => ({
      people: [],
      contacts: [],
      chatSyncedTs: Date.now(),
      setChatSyncedTs: chatSyncedTs => set({ chatSyncedTs }),
      addPerson: draft => {
        if (!draft.name.trim()) return undefined;
        const id = uuidv4();
        set(state => ({ people: [...state.people, { ...draft, name: draft.name.trim(), id, createdAt: Date.now() }] }));
        return id;
      },
      updatePerson: (personId, draft) =>
        set(state => ({
          people: state.people.map(person =>
            person.id === personId ? { ...person, ...draft, name: draft.name.trim() || person.name } : person,
          ),
        })),
      removePerson: personId =>
        set(state => ({
          people: state.people.filter(person => person.id !== personId),
          contacts: state.contacts.filter(contact => contact.personId !== personId),
        })),
      logContact: (personId, kind, ts = Date.now(), source = 'manual') => {
        set(state => ({
          contacts: [...state.contacts, { id: uuidv4(), personId, ts, kind, source }].slice(-MAX_CONTACTS),
        }));
        useNeedsStore.getState().updateLevel('social', CONTACT_AMOUNTS[kind]);
      },
      removeContact: contactId =>
        set(state => ({ contacts: state.contacts.filter(contact => contact.id !== contactId) })),
    }),
    {
      name: 'recupero-people',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
