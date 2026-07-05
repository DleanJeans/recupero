import { useEffect, useRef, useState } from 'react';
import { animateInteger } from '../utils/animation-utils';

const NUMBER_TWEEN_MS = 420;
const LEVEL_UP_CURRENT_TWEEN_MS = 220;

interface XPBarNumberState {
  xp: number;
  level: number;
  currentXp: number;
  levelXp: number;
}

interface Options extends XPBarNumberState {
  animateNumbers: boolean;
}

export function useAnimatedXPNumbers({ animateNumbers, xp, level, currentXp, levelXp }: Options) {
  const [displayedCurrentXp, setDisplayedCurrentXp] = useState(currentXp);
  const [displayedLevelXp, setDisplayedLevelXp] = useState(levelXp);
  const previousValues = useRef<XPBarNumberState>({ xp, level, currentXp, levelXp });
  const hasMounted = useRef(false);
  const activeTweens = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      for (const cancel of activeTweens.current) cancel();
      activeTweens.current = [];
    };
  }, []);

  useEffect(() => {
    const previous = previousValues.current;
    const next = { xp, level, currentXp, levelXp };

    for (const cancel of activeTweens.current) cancel();
    activeTweens.current = [];

    if (!animateNumbers || !hasMounted.current) {
      setDisplayedCurrentXp(currentXp);
      setDisplayedLevelXp(levelXp);
      hasMounted.current = true;
      previousValues.current = next;
      return;
    }

    if (xp === previous.xp && currentXp === previous.currentXp && levelXp === previous.levelXp) {
      previousValues.current = next;
      return;
    }

    if (level > previous.level) {
      const cancelCurrent = animateInteger({
        from: previous.currentXp,
        to: previous.levelXp,
        durationMs: LEVEL_UP_CURRENT_TWEEN_MS,
        onUpdate: setDisplayedCurrentXp,
        onComplete: () => {
          if (currentXp === 0) {
            setDisplayedCurrentXp(0);
            return;
          }

          const cancelRemainder = animateInteger({
            from: 0,
            to: currentXp,
            durationMs: NUMBER_TWEEN_MS,
            onUpdate: setDisplayedCurrentXp,
          });
          activeTweens.current.push(cancelRemainder);
        },
      });
      const cancelLevelXp = animateInteger({
        from: previous.levelXp,
        to: levelXp,
        durationMs: NUMBER_TWEEN_MS,
        onUpdate: setDisplayedLevelXp,
      });
      activeTweens.current.push(cancelCurrent, cancelLevelXp);
    } else {
      const cancelCurrent = animateInteger({
        from: previous.currentXp,
        to: currentXp,
        durationMs: NUMBER_TWEEN_MS,
        onUpdate: setDisplayedCurrentXp,
      });
      activeTweens.current.push(cancelCurrent);
      setDisplayedLevelXp(levelXp);
    }

    previousValues.current = next;
  }, [animateNumbers, currentXp, level, levelXp, xp]);

  return { displayedCurrentXp, displayedLevelXp };
}
