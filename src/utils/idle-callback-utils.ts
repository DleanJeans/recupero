type IdleCallbackGlobals = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function scheduleIdleCallback(callback: () => void): () => void {
  const { requestIdleCallback, cancelIdleCallback } = globalThis as IdleCallbackGlobals;

  if (requestIdleCallback && cancelIdleCallback) {
    const handle = requestIdleCallback(callback);
    return () => cancelIdleCallback(handle);
  }

  let timeout: ReturnType<typeof setTimeout> | null = null;
  const frame = requestAnimationFrame(() => {
    timeout = setTimeout(callback, 0);
  });

  return () => {
    cancelAnimationFrame(frame);
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  };
}
