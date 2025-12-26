import { useState, useCallback, useEffect, useRef } from 'react';

interface UseHistoryOptions<T> {
    maxHistorySize?: number;
}

interface UseHistoryReturn<T> {
    state: T;
    setState: (newState: T) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    clearHistory: () => void;
}

/**
 * Hook for managing undo/redo history with keyboard shortcuts
 * @param initialState - The initial state value
 * @param options - Configuration options
 */
export function useHistory<T>(
    initialState: T,
    options: UseHistoryOptions<T> = {}
): UseHistoryReturn<T> {
    const { maxHistorySize = 50 } = options;

    // Past states (for undo)
    const [past, setPast] = useState<T[]>([]);
    // Current state
    const [present, setPresent] = useState<T>(initialState);
    // Future states (for redo)
    const [future, setFuture] = useState<T[]>([]);

    // Track if we should skip the next state change (for external sync)
    const skipNextPush = useRef(false);

    // Set new state and push current to history
    const setState = useCallback((newState: T) => {
        if (skipNextPush.current) {
            skipNextPush.current = false;
            setPresent(newState);
            return;
        }

        setPast(prev => {
            const newPast = [...prev, present];
            // Limit history size
            if (newPast.length > maxHistorySize) {
                return newPast.slice(-maxHistorySize);
            }
            return newPast;
        });
        setPresent(newState);
        setFuture([]); // Clear redo stack when new action is performed
    }, [present, maxHistorySize]);

    // Set state without pushing to history (for external sync like loading data)
    const setStateWithoutHistory = useCallback((newState: T) => {
        skipNextPush.current = true;
        setPresent(newState);
    }, []);

    // Undo: Go back to previous state
    const undo = useCallback(() => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        setPast(newPast);
        setPresent(previous);
        setFuture(prev => [present, ...prev]);
    }, [past, present]);

    // Redo: Go forward to next state
    const redo = useCallback(() => {
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast(prev => [...prev, present]);
        setPresent(next);
        setFuture(newFuture);
    }, [future, present]);

    // Clear all history
    const clearHistory = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

    // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        state: present,
        setState,
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        clearHistory,
    };
}

/**
 * Hook variant that syncs with external state (like from useSchedulerData)
 * This is useful when the state is managed externally but you want history
 */
export function useHistorySync<T>(
    externalState: T,
    setExternalState: (state: T) => void,
    options: UseHistoryOptions<T> = {}
): Omit<UseHistoryReturn<T>, 'state' | 'setState'> & { pushToHistory: () => void } {
    const { maxHistorySize = 50 } = options;

    const [past, setPast] = useState<T[]>([]);
    const [future, setFuture] = useState<T[]>([]);
    const previousState = useRef<T>(externalState);

    // Push current state to history (call this before making changes)
    const pushToHistory = useCallback(() => {
        setPast(prev => {
            const newPast = [...prev, previousState.current];
            if (newPast.length > maxHistorySize) {
                return newPast.slice(-maxHistorySize);
            }
            return newPast;
        });
        setFuture([]); // Clear redo when new action is taken
    }, [maxHistorySize]);

    // Track state changes
    useEffect(() => {
        previousState.current = externalState;
    }, [externalState]);

    const undo = useCallback(() => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        setFuture(prev => [externalState, ...prev]);
        setPast(newPast);
        setExternalState(previous);
    }, [past, externalState, setExternalState]);

    const redo = useCallback(() => {
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast(prev => [...prev, externalState]);
        setFuture(newFuture);
        setExternalState(next);
    }, [future, externalState, setExternalState]);

    const clearHistory = useCallback(() => {
        setPast([]);
        setFuture([]);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        undo,
        redo,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        clearHistory,
        pushToHistory,
    };
}
