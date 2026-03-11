/**
 * lite-fsm — Zero-dependency Finite State Machine
 */

/** Disposer function — call to unsubscribe a hook. */
export type Disposer = () => void;

/** Map of state → allowed next states. */
export type TransitionMap = Record<string, string[]>;

export class FSM {
    /** Current state value. */
    readonly current: string;
    /** Current state value (alias for current). */
    readonly value: string;
    /** The transition map passed to the constructor. */
    readonly transitions: TransitionMap;

    /**
     * Create a finite state machine.
     * @param initialState The starting state.
     * @param transitions Map of state → allowed next states.
     */
    constructor(initialState: string, transitions: TransitionMap);

    /** Check if transitioning to `nextState` is allowed from the current state. */
    can(nextState: string): boolean;

    /**
     * Attempt a validated state transition.
     * @returns true if succeeded or same-state, false if blocked.
     */
    set(nextState: string): boolean;

    /**
     * Bypass transition rules to force a state change.
     * Fires lifecycle hooks. No-op for same state or after destroy.
     */
    force(nextState: string): void;

    /**
     * Register a callback that fires when entering a specific state.
     * @returns Disposer to unsubscribe. Returns no-op after destroy.
     */
    onEnter(state: string, callback: (prevState: string) => void): Disposer;

    /**
     * Register a callback that fires when leaving a specific state.
     * @returns Disposer to unsubscribe. Returns no-op after destroy.
     */
    onLeave(state: string, callback: (nextState: string) => void): Disposer;

    /**
     * Register a callback that fires on every state change.
     * @returns Disposer to unsubscribe. Returns no-op after destroy.
     */
    onChange(callback: (prevState: string, nextState: string) => void): Disposer;

    /** Check if current state equals `state`. */
    is(state: string): boolean;

    /** Check if current state is any of the given states. */
    isAnyOf(...states: string[]): boolean;

    /** Clear all hooks and freeze the FSM. Idempotent. */
    destroy(): void;
}

export default FSM;
