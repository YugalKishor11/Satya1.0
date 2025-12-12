import { useState, useCallback } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface HistoryActions<T> {
  state: T;
  set: (newPresent: T | ((curr: T) => T), saveToHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyState: HistoryState<T>;
}

export const useHistory = <T>(initialPresent: T): HistoryActions<T> => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;
      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;
      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newPresent: T | ((curr: T) => T), saveToHistory: boolean = true) => {
    setState((currentState) => {
      const value = typeof newPresent === 'function' 
        ? (newPresent as (curr: T) => T)(currentState.present)
        : newPresent;

      // Deep equality check could go here, but strict ref equality is safer for React
      if (value === currentState.present) return currentState;

      if (saveToHistory) {
        return {
          past: [...currentState.past, currentState.present],
          present: value,
          future: [],
        };
      } else {
        return {
          ...currentState,
          present: value,
        };
      }
    });
  }, []);

  return { state: state.present, set, undo, redo, canUndo, canRedo, historyState: state };
};
