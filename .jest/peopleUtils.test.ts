import type { Person } from '../src/types/person';
import {
  formatBirthday,
  getContactTone,
  getDaysSince,
  getDaysUntilBirthday,
  matchPersonBySender,
  parseBirthday,
  planChatContacts,
  toBirthday,
} from '../src/utils/people-utils';

const person = (over: Partial<Person>): Person => ({
  id: 'p',
  name: 'Alex',
  emoji: '🧑',
  nicknames: '',
  phone: '',
  birthday: '',
  address: '',
  preferences: '',
  nudgeDays: 7,
  createdAt: 0,
  ...over,
});

describe('people utils', () => {
  it('parses birthdays', () => {
    expect(parseBirthday('05-14')).toEqual({ year: undefined, month: 5, day: 14 });
    expect(parseBirthday('1990-05-14')).toEqual({ year: 1990, month: 5, day: 14 });
    expect(parseBirthday('13-40')).toBeUndefined();
    expect(parseBirthday('02-31')).toBeUndefined();
    expect(parseBirthday('abc')).toBeUndefined();
    expect(formatBirthday('1990-05-14')).toBe('14 May 1990');
    expect(toBirthday(new Date(1990, 4, 4))).toBe('1990-05-04');
  });

  it('counts days until the next birthday', () => {
    const now = new Date(2026, 10, 21, 12).getTime();
    expect(getDaysUntilBirthday('11-21', now)).toBe(0);
    expect(getDaysUntilBirthday('11-25', now)).toBe(4);
    expect(getDaysUntilBirthday('11-20', now)).toBe(364);
  });

  it('counts calendar days since contact', () => {
    const now = new Date(2026, 10, 21, 1).getTime();
    expect(getDaysSince(new Date(2026, 10, 20, 23).getTime(), now)).toBe(1);
    expect(getDaysSince(now, now)).toBe(0);
  });

  it('colours by nudge days', () => {
    expect(getContactTone(undefined, 7)).toBe('never');
    expect(getContactTone(0, 7)).toBe('fresh');
    expect(getContactTone(2, 7)).toBe('ok');
    expect(getContactTone(4, 7)).toBe('due');
    expect(getContactTone(7, 7)).toBe('overdue');
  });

  it('matches senders by name, nickname and phone', () => {
    const people = [
      person({ id: 'a', name: 'Alex', nicknames: 'Lex, Alexander' }),
      person({ id: 'b', name: 'Ben', phone: '+84 912 345 678' }),
    ];
    expect(matchPersonBySender('lex', people)?.id).toBe('a');
    expect(matchPersonBySender('Ben', people)?.id).toBe('b');
    expect(matchPersonBySender('+84912345678', people)?.id).toBe('b');
    expect(matchPersonBySender('Carl', people)).toBeUndefined();
  });

  it('plans one message contact per chat session', () => {
    const people = [person({ id: 'a', name: 'Alex', nicknames: 'Lex' })];
    const min = 60_000;
    const event = (t: number, title = 'Lex') => ({ timestamp: t, packageName: 'com.whatsapp', title });
    const plan = planChatContacts(
      [event(10 * min), event(15 * min), event(60 * min), event(70 * min, 'Stranger'), event(1 * min)],
      people,
      5 * min,
      [],
    );
    expect(plan).toEqual([
      { personId: 'a', ts: 10 * min },
      { personId: 'a', ts: 60 * min },
    ]);
  });
});
