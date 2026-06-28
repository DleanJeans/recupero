interface IntegerTweenOptions {
  from: number;
  to: number;
  durationMs: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function animateInteger({ from, to, durationMs, onUpdate, onComplete }: IntegerTweenOptions) {
  if (from === to || durationMs <= 0) {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  let frame: ReturnType<typeof requestAnimationFrame> | undefined;
  let canceled = false;
  const startedAt = Date.now();

  const tick = () => {
    if (canceled) return;

    const elapsed = Date.now() - startedAt;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(progress);
    onUpdate(Math.round(from + (to - from) * eased));

    if (progress >= 1) {
      onComplete?.();
      return;
    }

    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return () => {
    canceled = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
}
