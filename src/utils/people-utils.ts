import type { ContactKind, Person, PersonContact } from '../types/person';

export const DEFAULT_NUDGE_DAYS = 7;
const DAY_MS = 86_400_000;

/** How much one contact refills the Social need, in percent. */
export const CONTACT_AMOUNTS: Record<ContactKind, number> = { 'in-person': 50, call: 30, message: 8 };

export const CONTACT_LABELS: Record<ContactKind, string> = {
  'in-person': 'Met in person',
  call: 'Call / video',
  message: 'Message',
};

export const CONTACT_EMOJIS: Record<ContactKind, string> = { 'in-person': '🤝', call: '📞', message: '💬' };

export type ContactTone = 'fresh' | 'ok' | 'due' | 'overdue' | 'never';

/** Most recent contact timestamp of one person, or undefined when never. */
export function getLastContactTs(personId: string, contacts: PersonContact[]): number | undefined {
  let last: number | undefined;
  for (const contact of contacts) {
    if (contact.personId === personId && (last == null || contact.ts > last)) last = contact.ts;
  }
  return last;
}

/** Whole days between a contact and now (0 = today, using the local calendar day). */
export function getDaysSince(ts: number, now: number): number {
  const a = new Date(ts);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.max(0, Math.round((startB - startA) / DAY_MS));
}

export function formatDaysSince(days: number | undefined): string {
  if (days == null) return 'never';
  if (days === 0) return 'today';
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function getContactTone(days: number | undefined, nudgeDays: number): ContactTone {
  if (days == null) return 'never';
  if (days >= nudgeDays) return 'overdue';
  if (days >= nudgeDays / 2) return 'due';
  return days === 0 ? 'fresh' : 'ok';
}

/** People sorted with the longest time since contact first, never-contacted people before that. */
export function sortPeopleByContact(people: Person[], contacts: PersonContact[]): Person[] {
  const last = new Map(people.map(person => [person.id, getLastContactTs(person.id, contacts)]));
  return [...people].sort((a, b) => (last.get(a.id) ?? 0) - (last.get(b.id) ?? 0) || a.name.localeCompare(b.name));
}

/** Parses "MM-DD" or "YYYY-MM-DD" (also "/" or "." separators). Returns undefined when invalid. */
export function parseBirthday(text: string): { year?: number; month: number; day: number } | undefined {
  const parts = text
    .trim()
    .split(/[-/.]/)
    .map(part => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some(part => !Number.isInteger(part))) return undefined;
  const [year, month, day] = parts.length === 3 ? parts : [undefined, parts[0], parts[1]];
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  if (year != null && (year < 1900 || year > 2100)) return undefined;
  const check = new Date(2000, month - 1, day);
  if (check.getMonth() !== month - 1) return undefined;
  return { year, month, day };
}

/** Days until the next birthday (0 = today), or undefined when unknown or invalid. */
export function getDaysUntilBirthday(birthday: string, now: number): number | undefined {
  const parsed = parseBirthday(birthday);
  if (!parsed) return undefined;
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  let next = new Date(today.getFullYear(), parsed.month - 1, parsed.day).getTime();
  if (next < start) next = new Date(today.getFullYear() + 1, parsed.month - 1, parsed.day).getTime();
  return Math.round((next - start) / DAY_MS);
}

export function formatBirthdayHint(birthday: string, now: number): string | undefined {
  const days = getDaysUntilBirthday(birthday, now);
  if (days == null) return undefined;
  if (days === 0) return 'Birthday today 🎂';
  if (days > 30) return undefined;
  return `Birthday in ${days} day${days === 1 ? '' : 's'}`;
}

/** Every lowercase name this person can appear as in a chat: name, nicknames and phone digits. */
export function getPersonMatchKeys(person: Person): string[] {
  const keys = [person.name, ...person.nicknames.split(',')].map(key => key.trim().toLowerCase()).filter(Boolean);
  const digits = person.phone.replace(/\D/g, '');
  if (digits.length >= 6) keys.push(digits);
  return keys;
}

/** Finds the person a chat sender name (or phone number) belongs to. Exact match on name, nickname or phone. */
export function matchPersonBySender(sender: string, people: Person[]): Person | undefined {
  const text = sender.trim().toLowerCase();
  if (!text) return undefined;
  const digits = text.replace(/\D/g, '');
  const phoneLike = digits.length >= 6 && /^[+\d\s()-]+$/.test(text);
  return people.find(person =>
    getPersonMatchKeys(person).some(
      key => key === text || (phoneLike && key.length >= 6 && digits.endsWith(key.slice(-9))),
    ),
  );
}

export interface ChatEvent {
  timestamp: number;
  packageName: string;
  title: string;
}

export const CHAT_SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * Turns chat notifications into message contacts: one per person per chat session (a session ends after 30
 * minutes without a message). Events at or before `sinceTs` were handled already.
 */
export function planChatContacts(
  events: ChatEvent[],
  people: Person[],
  sinceTs: number,
  contacts: PersonContact[],
): { personId: string; ts: number }[] {
  const lastByPerson = new Map<string, number>();
  for (const contact of contacts) {
    if (contact.kind === 'message' && contact.ts > (lastByPerson.get(contact.personId) ?? 0)) {
      lastByPerson.set(contact.personId, contact.ts);
    }
  }
  const plan: { personId: string; ts: number }[] = [];
  for (const event of [...events].sort((a, b) => a.timestamp - b.timestamp)) {
    if (event.timestamp <= sinceTs) continue;
    const person = matchPersonBySender(event.title, people);
    if (!person) continue;
    const last = lastByPerson.get(person.id);
    if (last != null && event.timestamp - last < CHAT_SESSION_GAP_MS) {
      lastByPerson.set(person.id, event.timestamp);
      continue;
    }
    plan.push({ personId: person.id, ts: event.timestamp });
    lastByPerson.set(person.id, event.timestamp);
  }
  return plan;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14 May 1990" or "14 May" when no year; undefined when empty or invalid. */
export function formatBirthday(birthday: string): string | undefined {
  const parsed = parseBirthday(birthday);
  if (!parsed) return undefined;
  return `${parsed.day} ${MONTHS[parsed.month - 1]}${parsed.year ? ` ${parsed.year}` : ''}`;
}

/** Stored birthday text for a picked date: "YYYY-MM-DD". */
export function toBirthday(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
