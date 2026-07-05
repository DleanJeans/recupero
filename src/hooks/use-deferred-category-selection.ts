import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

type CategoryId = string | null;

export function useDeferredCategorySelection(initialCategoryId: CategoryId = null) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId>(initialCategoryId);
  const [listCategoryId, setListCategoryId] = useState<CategoryId>(initialCategoryId);
  const [categoryListPending, setCategoryListPending] = useState(false);
  const pendingCategoryFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const pendingCategoryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingCategorySwitch = useCallback(() => {
    if (pendingCategoryFrame.current != null) {
      cancelAnimationFrame(pendingCategoryFrame.current);
      pendingCategoryFrame.current = null;
    }
    if (pendingCategoryTimeout.current != null) {
      clearTimeout(pendingCategoryTimeout.current);
      pendingCategoryTimeout.current = null;
    }
  }, []);

  const selectCategory = useCallback(
    (id: CategoryId) => {
      cancelPendingCategorySwitch();
      setSelectedCategoryId(id);

      if (id === listCategoryId) {
        setCategoryListPending(false);
        return;
      }

      setCategoryListPending(true);

      pendingCategoryFrame.current = requestAnimationFrame(() => {
        pendingCategoryFrame.current = null;
        pendingCategoryTimeout.current = setTimeout(() => {
          pendingCategoryTimeout.current = null;
          startTransition(() => {
            setListCategoryId(id);
            setCategoryListPending(false);
          });
        }, 0);
      });
    },
    [cancelPendingCategorySwitch, listCategoryId],
  );

  const resetCategorySelection = useCallback(() => {
    cancelPendingCategorySwitch();
    setSelectedCategoryId(initialCategoryId);
    setListCategoryId(initialCategoryId);
    setCategoryListPending(false);
  }, [cancelPendingCategorySwitch, initialCategoryId]);

  useEffect(() => {
    return cancelPendingCategorySwitch;
  }, [cancelPendingCategorySwitch]);

  return {
    selectedCategoryId,
    listCategoryId,
    renderedSummaryCategoryId: categoryListPending ? listCategoryId : selectedCategoryId,
    categoryListPending,
    selectCategory,
    resetCategorySelection,
  };
}
