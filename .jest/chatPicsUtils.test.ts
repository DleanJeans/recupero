import type { ChatPic } from '../modules/app-usage';
import type { Person } from '../src/types/person';
import { findPicOwner, getChatApp, isPicForPerson } from '../src/utils/chat-pics-utils';

const pic = (name: string, id = 'abc'): ChatPic => ({
  id,
  packageName: 'com.facebook.orca',
  name,
  updatedAt: 0,
  uri: 'file:///x.jpg',
});
const person = { name: 'Tuan', nicknames: 'Tuấn Anh, TA', phone: '', emoji: '🧑' } as Person;

test('matches name ignoring accents', () => {
  expect(isPicForPerson(pic('Tuấn Anh'), person)).toBe(true);
  expect(isPicForPerson(pic('Linh'), person)).toBe(false);
});
test('app from package', () => {
  expect(getChatApp('com.whatsapp.w4b')).toBe('whatsapp');
  expect(getChatApp('com.instagram.android')).toBe('instagram');
});
test('finds owner by copied file name', () => {
  const owner = { ...person, id: 'p', emoji: 'file:///data/person-pics/abc-123.jpg' };
  expect(findPicOwner(pic('x'), [person, owner])?.id).toBe('p');
});
