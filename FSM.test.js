import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FSM } from './FSM.js';

const TRANSITIONS = {
    idle:     ['loading'],
    loading:  ['ready', 'error'],
    ready:    ['playing'],
    playing:  ['scratching', 'complete', 'error'],
    scratching: ['playing', 'complete'],
    complete: ['idle'],
    error:    ['idle'],
};

describe('🧠 FSM', () => {
    let fsm;

    beforeEach(() => {
        fsm = new FSM('idle', TRANSITIONS);
    });

    // ═══════════════════════════════════════════════
    //  Constructor & State
    // ═══════════════════════════════════════════════

    describe('constructor', () => {
        it('starts in the initial state', () => {
            expect(fsm.current).toBe('idle');
            expect(fsm.value).toBe('idle');
        });

        it('stores the transition map', () => {
            expect(fsm.transitions).toBe(TRANSITIONS);
        });
    });

    // ═══════════════════════════════════════════════
    //  can()
    // ═══════════════════════════════════════════════

    describe('can()', () => {
        it('returns true for valid transitions', () => {
            expect(fsm.can('loading')).toBe(true);
        });

        it('returns false for invalid transitions', () => {
            expect(fsm.can('playing')).toBe(false);
        });

        it('returns false for unknown states', () => {
            expect(fsm.can('nonexistent')).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════
    //  set()
    // ═══════════════════════════════════════════════

    describe('set()', () => {
        it('transitions to a valid next state', () => {
            const result = fsm.set('loading');
            expect(result).toBe(true);
            expect(fsm.current).toBe('loading');
        });

        it('blocks invalid transitions', () => {
            const result = fsm.set('playing');
            expect(result).toBe(false);
            expect(fsm.current).toBe('idle');
        });

        it('returns true for same-state (no-op)', () => {
            const result = fsm.set('idle');
            expect(result).toBe(true);
            expect(fsm.current).toBe('idle');
        });

        it('does not fire hooks on same-state', () => {
            const onChange = vi.fn();
            fsm.onChange(onChange);
            fsm.set('idle');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('logs warning on blocked transition', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            fsm.set('complete');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('Blocked'));
            spy.mockRestore();
        });

        it('returns false after destroy', () => {
            fsm.destroy();
            expect(fsm.set('loading')).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════
    //  force()
    // ═══════════════════════════════════════════════

    describe('force()', () => {
        it('bypasses transition rules', () => {
            fsm.force('complete'); // idle → complete is not a valid transition
            expect(fsm.current).toBe('complete');
        });

        it('fires lifecycle hooks', () => {
            const onLeave = vi.fn();
            const onEnter = vi.fn();
            fsm.onLeave('idle', onLeave);
            fsm.onEnter('complete', onEnter);

            fsm.force('complete');
            expect(onLeave).toHaveBeenCalledWith('complete');
            expect(onEnter).toHaveBeenCalledWith('idle');
        });

        it('is no-op for same state', () => {
            const onChange = vi.fn();
            fsm.onChange(onChange);
            fsm.force('idle');
            expect(onChange).not.toHaveBeenCalled();
        });

        it('logs warning', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            fsm.force('error');
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('Forced'));
            spy.mockRestore();
        });

        it('is no-op after destroy', () => {
            fsm.destroy();
            fsm.force('loading');
            expect(fsm.current).toBe('idle');
        });
    });

    // ═══════════════════════════════════════════════
    //  Lifecycle Hooks
    // ═══════════════════════════════════════════════

    describe('onEnter()', () => {
        it('fires when entering the specified state', () => {
            const fn = vi.fn();
            fsm.onEnter('loading', fn);
            fsm.set('loading');
            expect(fn).toHaveBeenCalledWith('idle');
        });

        it('does not fire for other states', () => {
            const fn = vi.fn();
            fsm.onEnter('ready', fn);
            fsm.set('loading');
            expect(fn).not.toHaveBeenCalled();
        });

        it('disposer unsubscribes', () => {
            const fn = vi.fn();
            const dispose = fsm.onEnter('loading', fn);
            dispose();
            fsm.set('loading');
            expect(fn).not.toHaveBeenCalled();
        });

        it('returns no-op disposer after destroy', () => {
            fsm.destroy();
            const dispose = fsm.onEnter('loading', vi.fn());
            expect(dispose).toBeTypeOf('function');
            expect(() => dispose()).not.toThrow();
        });
    });

    describe('onLeave()', () => {
        it('fires when leaving the specified state', () => {
            const fn = vi.fn();
            fsm.onLeave('idle', fn);
            fsm.set('loading');
            expect(fn).toHaveBeenCalledWith('loading');
        });

        it('does not fire for other states', () => {
            const fn = vi.fn();
            fsm.onLeave('loading', fn);
            fsm.set('loading'); // leaving idle, not loading
            expect(fn).not.toHaveBeenCalled();
        });

        it('disposer unsubscribes', () => {
            const fn = vi.fn();
            const dispose = fsm.onLeave('idle', fn);
            dispose();
            fsm.set('loading');
            expect(fn).not.toHaveBeenCalled();
        });
    });

    describe('onChange()', () => {
        it('fires on every state change', () => {
            const fn = vi.fn();
            fsm.onChange(fn);

            fsm.set('loading');
            fsm.set('ready');

            expect(fn).toHaveBeenCalledTimes(2);
            expect(fn).toHaveBeenCalledWith('idle', 'loading');
            expect(fn).toHaveBeenCalledWith('loading', 'ready');
        });

        it('disposer unsubscribes', () => {
            const fn = vi.fn();
            const dispose = fsm.onChange(fn);
            dispose();
            fsm.set('loading');
            expect(fn).not.toHaveBeenCalled();
        });

        it('multiple listeners all fire', () => {
            const a = vi.fn();
            const b = vi.fn();
            fsm.onChange(a);
            fsm.onChange(b);
            fsm.set('loading');
            expect(a).toHaveBeenCalledTimes(1);
            expect(b).toHaveBeenCalledTimes(1);
        });
    });

    describe('hook firing order', () => {
        it('fires onLeave → onEnter → onChange', () => {
            const order = [];
            fsm.onLeave('idle', () => order.push('leave'));
            fsm.onEnter('loading', () => order.push('enter'));
            fsm.onChange(() => order.push('change'));

            fsm.set('loading');
            expect(order).toEqual(['leave', 'enter', 'change']);
        });
    });

    // ═══════════════════════════════════════════════
    //  Queries
    // ═══════════════════════════════════════════════

    describe('is()', () => {
        it('returns true for current state', () => {
            expect(fsm.is('idle')).toBe(true);
        });

        it('returns false for other states', () => {
            expect(fsm.is('loading')).toBe(false);
        });
    });

    describe('isAnyOf()', () => {
        it('returns true if current is in the list', () => {
            expect(fsm.isAnyOf('idle', 'loading')).toBe(true);
        });

        it('returns false if current is not in the list', () => {
            expect(fsm.isAnyOf('playing', 'complete')).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════
    //  Destroy
    // ═══════════════════════════════════════════════

    describe('destroy()', () => {
        it('prevents set() transitions', () => {
            fsm.destroy();
            expect(fsm.set('loading')).toBe(false);
            expect(fsm.current).toBe('idle');
        });

        it('prevents force() transitions', () => {
            fsm.destroy();
            fsm.force('loading');
            expect(fsm.current).toBe('idle');
        });

        it('stops firing hooks', () => {
            const fn = vi.fn();
            fsm.onChange(fn);
            fsm.destroy();
            // Internally try to apply — should not fire
            fsm._apply('idle', 'loading');
            expect(fn).not.toHaveBeenCalled();
        });

        it('hook registration returns no-op after destroy', () => {
            fsm.destroy();
            const dispose1 = fsm.onEnter('loading', vi.fn());
            const dispose2 = fsm.onLeave('idle', vi.fn());
            const dispose3 = fsm.onChange(vi.fn());
            expect(() => { dispose1(); dispose2(); dispose3(); }).not.toThrow();
        });

        it('is idempotent', () => {
            fsm.destroy();
            expect(() => fsm.destroy()).not.toThrow();
        });
    });

    // ═══════════════════════════════════════════════
    //  Full Lifecycle
    // ═══════════════════════════════════════════════

    describe('full game lifecycle', () => {
        it('idle → loading → ready → playing → complete → idle', () => {
            const history = [];
            fsm.onChange((prev, next) => history.push(`${prev}→${next}`));

            expect(fsm.set('loading')).toBe(true);
            expect(fsm.set('ready')).toBe(true);
            expect(fsm.set('playing')).toBe(true);
            expect(fsm.set('complete')).toBe(true);
            expect(fsm.set('idle')).toBe(true);

            expect(history).toEqual([
                'idle→loading',
                'loading→ready',
                'ready→playing',
                'playing→complete',
                'complete→idle',
            ]);
        });

        it('blocks invalid jumps', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            expect(fsm.set('playing')).toBe(false);  // idle → playing blocked
            fsm.set('loading');
            fsm.set('ready');
            expect(fsm.set('complete')).toBe(false);  // ready → complete blocked

            spy.mockRestore();
        });

        it('error recovery via force', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            fsm.set('loading');
            fsm.set('error');
            expect(fsm.current).toBe('error');

            // Can recover to idle via normal transition
            expect(fsm.set('idle')).toBe(true);
            expect(fsm.current).toBe('idle');

            spy.mockRestore();
        });
    });
});
