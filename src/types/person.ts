export type ContactKind = 'in-person' | 'call' | 'message';

export interface Person {
  id: string;
  name: string;
  emoji: string;
  /** Other names this person goes by, comma separated. Used to match chat notifications. */
  nicknames: string;
  phone: string;
  /** "MM-DD" or "YYYY-MM-DD". Empty when unknown. */
  birthday: string;
  address: string;
  /** Pin on the map for the address, when picked. */
  lat?: number;
  lng?: number;
  /** Free notes: likes, dislikes, gift ideas, food allergies... */
  preferences: string;
  /** Days without contact after which this person turns red. */
  nudgeDays: number;
  createdAt: number;
}

export interface PersonContact {
  id: string;
  personId: string;
  /** When the contact ended (the "last contact" time). */
  ts: number;
  /** When it started, when it was logged with a start time. */
  startTs?: number;
  kind: ContactKind;
  source: 'manual' | 'notification';
}
