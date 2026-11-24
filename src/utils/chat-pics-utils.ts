import type { ChatPic } from '../../modules/app-usage';
import type { Person } from '../types/person';
import { getPersonMatchKeys } from './people-utils';

export type ChatApp = 'whatsapp' | 'messenger' | 'instagram';

export const CHAT_APPS: Record<ChatApp, { label: string; letter: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', letter: 'W', color: '#25d366' },
  messenger: { label: 'Messenger', letter: 'M', color: '#0a84ff' },
  instagram: { label: 'Instagram', letter: 'I', color: '#e1306c' },
};

export function getChatApp(packageName: string): ChatApp {
  if (packageName.startsWith('com.whatsapp')) return 'whatsapp';
  if (packageName.startsWith('com.instagram')) return 'instagram';
  return 'messenger';
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

/** True when a chat pic's sender name looks like this person (name, nickname or phone, ignoring accents). */
export function isPicForPerson(pic: ChatPic, person: Pick<Person, 'name' | 'nicknames' | 'phone'>): boolean {
  const sender = normalize(pic.name);
  if (!sender) return false;
  const keys = getPersonMatchKeys({ ...person } as Person).map(normalize);
  const digits = sender.replace(/\D/g, '');
  return keys.some(key => key === sender || (digits.length >= 6 && key.length >= 6 && digits.endsWith(key.slice(-9))));
}

/** Pics that match the person first, then the rest. */
export function splitSuggestedPics(
  pics: ChatPic[],
  person: Pick<Person, 'name' | 'nicknames' | 'phone'>,
): { suggested: ChatPic[]; others: ChatPic[] } {
  const suggested: ChatPic[] = [];
  const others: ChatPic[] = [];
  for (const pic of pics) (isPicForPerson(pic, person) ? suggested : others).push(pic);
  return { suggested, others };
}

/** The person using this cached pic, if any. A person's copy is named after the pic id. */
export function findPicOwner(pic: ChatPic, people: Person[]): Person | undefined {
  return people.find(person => person.emoji.includes(`/${pic.id}-`));
}
