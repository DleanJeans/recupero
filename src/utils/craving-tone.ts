import type { BehaviorType } from '../types/behavior';
import { Colors } from './colors';

/**
 * Wording and colours for a craving, by the craved behaviour's type.
 * An undesirable craving is something to ride out; a neutral or desirable one is a pull worth acting on.
 */
export interface CravingTone {
  /** Main colour: urge cells, latest urge bar, list icon. */
  accent: string;
  /** Dim version of the accent: older urge bars, outlines. */
  accentDim: string;
  /** Text colour on top of the accent. */
  onAccent: string;
  title: string;
  firstUrgeQuestion: string;
  urgeChartLabel: string;
  alternativesLabel: string;
  /** Button that ends the craving without doing the behaviour, before and after the timer runs out. */
  passLabel: string;
  passLabelTimeUp: string;
  /** Button for doing the craved behaviour. */
  doLabel: string;
  /** Whether doing the craved behaviour is the good outcome. */
  doingIsGood: boolean;
  passedTitle: string;
  listIcon: 'flame-outline' | 'sparkles-outline';
}

const UNDESIRABLE: CravingTone = {
  accent: Colors.type.undesirable,
  accentDim: Colors.typeBtn.undesirable,
  onAccent: Colors.typeBtn.undesirable,
  title: 'Ride it out',
  firstUrgeQuestion: 'How strong is the urge?',
  urgeChartLabel: 'URGE SO FAR',
  alternativesLabel: 'Do this instead',
  passLabel: "It's passed",
  passLabelTimeUp: 'I rode it out',
  doLabel: 'I gave in',
  doingIsGood: false,
  passedTitle: 'You rode it out',
  listIcon: 'flame-outline',
};

const DESIRABLE: CravingTone = {
  accent: Colors.type.desirable,
  accentDim: Colors.typeBtn.desirable,
  onAccent: Colors.typeBtn.desirable,
  title: 'Act on it',
  firstUrgeQuestion: 'How much do you want to?',
  urgeChartLabel: 'PULL SO FAR',
  alternativesLabel: 'Or do something like it',
  passLabel: 'Not now',
  passLabelTimeUp: 'It faded',
  doLabel: "I'm doing it",
  doingIsGood: true,
  passedTitle: 'Let it pass',
  listIcon: 'sparkles-outline',
};

const NEUTRAL: CravingTone = {
  ...DESIRABLE,
  accent: Colors.type.neutral,
  accentDim: '#5c4710',
  onAccent: '#3a2c06',
  title: 'Your call',
  alternativesLabel: 'Or do something else',
  doLabel: 'I did it',
};

export function getCravingTone(type: BehaviorType): CravingTone {
  if (type === 'undesirable') return UNDESIRABLE;
  return type === 'desirable' ? DESIRABLE : NEUTRAL;
}
