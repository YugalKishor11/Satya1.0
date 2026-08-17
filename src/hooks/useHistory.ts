import { useState, useCallback } from 'react';

export interface UseHistoryReturn<T> {
  state: T;
  set: (action: T | ((prevState: T) => T), recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useHistory<T>(initialPresent: T): UseHistoryReturn<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((prev) => [present, ...prev]);
    setPresent(previous);
  }, [canUndo, past, present]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [canRedo, future, present]);

  const set = useCallback(
    (action: T | ((prevState: T) => T), recordHistory: boolean = false) => {
      setPresent((currentPresent) => {
        const nextPresent = typeof action === 'function' ? (action as (prev: T) => T)(currentPresent) : action;

        if (nextPresent === currentPresent) return currentPresent;

        if (recordHistory) {
          setPast((prev) => [...prev, currentPresent]);
          setFuture([]);
        }
        return nextPresent;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return { state: present, set, undo, redo, canUndo, canRedo, clearHistory };
}
