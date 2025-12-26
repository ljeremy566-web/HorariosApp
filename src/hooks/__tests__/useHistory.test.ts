import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory, useHistorySync } from '../useHistory';

describe('useHistory', () => {
    it('should initialize with the given state', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));
        expect(result.current.state).toEqual({ count: 0 });
    });

    it('should update state correctly', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        act(() => {
            result.current.setState({ count: 1 });
        });

        expect(result.current.state).toEqual({ count: 1 });
    });

    it('should undo to previous state', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        act(() => {
            result.current.setState({ count: 1 });
        });

        act(() => {
            result.current.setState({ count: 2 });
        });

        expect(result.current.state).toEqual({ count: 2 });
        expect(result.current.canUndo).toBe(true);

        act(() => {
            result.current.undo();
        });

        expect(result.current.state).toEqual({ count: 1 });
        expect(result.current.canRedo).toBe(true);
    });

    it('should redo to next state', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        act(() => {
            result.current.setState({ count: 1 });
        });

        act(() => {
            result.current.undo();
        });

        expect(result.current.state).toEqual({ count: 0 });
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.redo();
        });

        expect(result.current.state).toEqual({ count: 1 });
        expect(result.current.canRedo).toBe(false);
    });

    it('should clear future on new state after undo', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        act(() => {
            result.current.setState({ count: 1 });
        });

        act(() => {
            result.current.undo();
        });

        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.setState({ count: 5 });
        });

        expect(result.current.canRedo).toBe(false);
        expect(result.current.state).toEqual({ count: 5 });
    });

    it('should not undo when no history', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        expect(result.current.canUndo).toBe(false);

        act(() => {
            result.current.undo();
        });

        expect(result.current.state).toEqual({ count: 0 });
    });

    it('should not redo when no future', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        expect(result.current.canRedo).toBe(false);

        act(() => {
            result.current.redo();
        });

        expect(result.current.state).toEqual({ count: 0 });
    });

    it('should clear history', () => {
        const { result } = renderHook(() => useHistory({ count: 0 }));

        act(() => {
            result.current.setState({ count: 1 });
            result.current.setState({ count: 2 });
        });

        expect(result.current.canUndo).toBe(true);

        act(() => {
            result.current.clearHistory();
        });

        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should limit history size', () => {
        const { result } = renderHook(() => useHistory(0, { maxHistorySize: 3 }));

        act(() => {
            for (let i = 1; i <= 5; i++) {
                result.current.setState(i);
            }
        });

        expect(result.current.state).toBe(5);

        // Undo 3 times (max history)
        act(() => {
            result.current.undo();
            result.current.undo();
            result.current.undo();
        });

        expect(result.current.state).toBe(2); // Should be at the oldest saved state
        expect(result.current.canUndo).toBe(false); // No more history
    });
});

describe('useHistorySync', () => {
    it('should undo to previous external state', () => {
        let externalState = { count: 0 };
        const setExternalState = vi.fn((newState) => {
            externalState = newState;
        });

        const { result, rerender } = renderHook(
            () => useHistorySync(externalState, setExternalState)
        );

        // Push initial state to history
        act(() => {
            result.current.pushToHistory();
        });

        // Simulate external state change
        externalState = { count: 1 };
        rerender();

        expect(result.current.canUndo).toBe(true);

        act(() => {
            result.current.undo();
        });

        expect(setExternalState).toHaveBeenCalledWith({ count: 0 });
    });
});
