/**
 * lite-fsm — Zero-dependency Finite State Machine
 *
 * Features:
 * - Strict transition validation with human-readable blocked warnings
 * - Lifecycle hooks: onEnter, onLeave, onChange
 * - Emergency escape hatch (force) for debug/error recovery
 * - is() / isAnyOf() state queries
 * - Disposer pattern for all hooks
 * - Clean teardown (destroy)
 * - Zero dependencies, < 1 KB
 */

export class FSM {
    /**
     * @param {string} initialState  The starting state
     * @param {Object<string, string[]>} transitions  Map of state → allowed next states
     *
     * @example
     *   const fsm = new FSM('idle', {
     *       idle:      ['loading'],
     *       loading:   ['ready', 'error'],
     *       ready:     ['playing'],
     *       playing:   ['complete', 'error'],
     *       complete:  ['idle'],
     *       error:     ['idle'],
     *   });
     */
    constructor(initialState, transitions) {
        this.value = initialState;
        this.transitions = transitions;
        this._destroyed = false;

        // Set-based listeners for O(1) add/remove on all hook types
        this._listeners = {
            enter: {},   // { [state]: Set<Function> }
            leave: {},   // { [state]: Set<Function> }
            change: new Set(),
        };
    }

    /** Current state value. */
    get current() {
        return this.value;
    }

    /**
     * Check if a transition to `nextState` is allowed from current state.
     * @param {string} nextState
     * @returns {boolean}
     */
    can(nextState) {
        return (this.transitions[this.value] || []).includes(nextState);
    }

    /**
     * Attempt a validated state transition.
     * Returns true if the transition succeeded or state was already equal.
     * Returns false if the transition is not allowed.
     *
     * @param {string} nextState
     * @returns {boolean}
     */
    set(nextState) {
        if (this._destroyed) return false;
        if (this.value === nextState) return true;

        if (!this.can(nextState)) {
            console.warn(`FSM Blocked: ${this.value} -> ${nextState}`);
            return false;
        }

        this._apply(this.value, nextState);
        return true;
    }

    /**
     * Bypass transition rules to force a state change.
     * Useful for debug menus, level skips, or error recovery.
     *
     * @param {string} nextState
     */
    force(nextState) {
        if (this._destroyed || this.value === nextState) return;
        console.warn(`FSM Forced: ${this.value} -> ${nextState}`);
        this._apply(this.value, nextState);
    }

    /** @private Apply the transition and fire lifecycle hooks. */
    _apply(prevState, nextState) {
        if (this._destroyed) return;

        // Fire Leave hooks for the state we're leaving
        const leaveSet = this._listeners.leave[prevState];
        if (leaveSet) {
            for (const cb of leaveSet) cb(nextState);
        }

        this.value = nextState;

        // Fire Enter hooks for the state we're entering
        const enterSet = this._listeners.enter[nextState];
        if (enterSet) {
            for (const cb of enterSet) cb(prevState);
        }

        // Fire global change hooks
        for (const cb of this._listeners.change) {
            cb(prevState, nextState);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  Lifecycle Hooks
    // ═══════════════════════════════════════════════════════

    /**
     * Register a callback that fires when entering a specific state.
     * @param {string}   state
     * @param {Function} callback  Receives (prevState)
     * @returns {Function} Disposer — call to unsubscribe
     */
    onEnter(state, callback) {
        if (this._destroyed) return () => {};
        if (!this._listeners.enter[state]) {
            this._listeners.enter[state] = new Set();
        }
        this._listeners.enter[state].add(callback);
        return () => this._listeners.enter[state]?.delete(callback);
    }

    /**
     * Register a callback that fires when leaving a specific state.
     * @param {string}   state
     * @param {Function} callback  Receives (nextState)
     * @returns {Function} Disposer — call to unsubscribe
     */
    onLeave(state, callback) {
        if (this._destroyed) return () => {};
        if (!this._listeners.leave[state]) {
            this._listeners.leave[state] = new Set();
        }
        this._listeners.leave[state].add(callback);
        return () => this._listeners.leave[state]?.delete(callback);
    }

    /**
     * Register a callback that fires on every state change.
     * Great for logging, analytics, or debug overlays.
     *
     * @param {Function} callback  Receives (prevState, nextState)
     * @returns {Function} Disposer — call to unsubscribe
     */
    onChange(callback) {
        if (this._destroyed) return () => {};
        this._listeners.change.add(callback);
        return () => this._listeners.change.delete(callback);
    }

    // ═══════════════════════════════════════════════════════
    //  Queries
    // ═══════════════════════════════════════════════════════

    /** Check if current state equals `state`. */
    is(state) {
        return this.value === state;
    }

    /** Check if current state is any of the given states. */
    isAnyOf(...states) {
        return states.includes(this.value);
    }

    // ═══════════════════════════════════════════════════════
    //  Teardown
    // ═══════════════════════════════════════════════════════

    /**
     * Clear all hooks and freeze the FSM.
     * Idempotent — safe to call multiple times.
     */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._listeners.enter = {};
        this._listeners.leave = {};
        this._listeners.change.clear();
    }
}

export default FSM;
