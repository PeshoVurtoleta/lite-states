# lite-states

[![npm version](https://img.shields.io/npm/v/lite-states.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/lite-states)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/lite-states?style=for-the-badge)](https://bundlephobia.com/result?p=lite-states)
[![npm downloads](https://img.shields.io/npm/dm/lite-states?style=for-the-badge&color=blue)](https://www.npmjs.com/package/lite-states)
[![npm total downloads](https://img.shields.io/npm/dt/lite-states?style=for-the-badge&color=blue)](https://www.npmjs.com/package/lite-states)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A zero-dependency finite state machine with strict transition validation, lifecycle hooks, and an emergency escape hatch.

Built for games, UI flows, and any system where state transitions must be predictable and auditable.

## Features

- **Strict transitions** — only allowed state changes succeed, everything else is blocked with a console warning
- **Lifecycle hooks** — `onEnter`, `onLeave`, `onChange` with disposer-based cleanup
- **Emergency `force()`** — bypass rules for debug menus, level skips, or error recovery
- **State queries** — `is()`, `isAnyOf()`, `can()`
- **Disposer pattern** — every hook returns a cleanup function
- **Clean teardown** — `destroy()` clears hooks and freezes the machine
- **Zero dependencies, < 1 KB**

## Installation

```bash
npm install lite-states
```

## Quick Start

```javascript
import { FSM } from 'lite-states';

const fsm = new FSM('idle', {
    idle:     ['loading'],
    loading:  ['ready', 'error'],
    ready:    ['playing'],
    playing:  ['complete', 'error'],
    complete: ['idle'],
    error:    ['idle'],
});

fsm.set('loading');  // true — valid transition
fsm.set('playing');  // false — blocked (loading → playing not allowed)
fsm.set('ready');    // true
fsm.set('playing');  // true
```

## Defining Transitions

The transition map is a plain object where each key is a state and its value is an array of states it can transition to:

```javascript
const transitions = {
    idle:     ['loading'],           // idle can only go to loading
    loading:  ['ready', 'error'],    // loading can go to ready OR error
    ready:    ['playing'],           // ready can only go to playing
    playing:  ['complete', 'error'], // playing can go to complete OR error
    complete: ['idle'],              // complete loops back to idle
    error:    ['idle'],              // error recovers to idle
};
```

## Lifecycle Hooks

All hooks return a disposer function for cleanup:

```javascript
// Fires when entering 'playing' — receives the previous state
const dispose1 = fsm.onEnter('playing', (prevState) => {
    console.log(`Started playing from ${prevState}`);
    startGameLoop();
});

// Fires when leaving 'playing' — receives the next state
const dispose2 = fsm.onLeave('playing', (nextState) => {
    console.log(`Left playing, going to ${nextState}`);
    stopGameLoop();
});

// Fires on EVERY state change — great for logging/analytics
const dispose3 = fsm.onChange((prev, next) => {
    analytics.track('state_change', { from: prev, to: next });
});

// Clean up when done
dispose1();
dispose2();
dispose3();
```

**Hook firing order:** `onLeave` → `onEnter` → `onChange`

## API

### Constructor

```javascript
const fsm = new FSM(initialState, transitions);
```

### State Transitions

| Method | Returns | Description |
|--------|---------|-------------|
| `.set(state)` | `boolean` | Validated transition. Returns `true` if successful or same-state. |
| `.force(state)` | `void` | Bypass rules. Fires hooks. Logs a warning. |
| `.can(state)` | `boolean` | Check if transition is allowed without executing it. |

### Queries

| Method | Returns | Description |
|--------|---------|-------------|
| `.is(state)` | `boolean` | Check if current state equals `state`. |
| `.isAnyOf(...states)` | `boolean` | Check if current state is in the list. |
| `.current` | `string` | Current state (getter). |

### Hooks

| Method | Returns | Description |
|--------|---------|-------------|
| `.onEnter(state, fn)` | `Disposer` | Called when entering `state`. `fn(prevState)`. |
| `.onLeave(state, fn)` | `Disposer` | Called when leaving `state`. `fn(nextState)`. |
| `.onChange(fn)` | `Disposer` | Called on every change. `fn(prev, next)`. |

### Lifecycle

| Method | Description |
|--------|-------------|
| `.destroy()` | Clear all hooks, freeze the FSM. Idempotent. |

## Emergency Escape Hatch

Sometimes you need to break the rules — debug menus, level skips, error recovery:

```javascript
fsm.force('idle'); // FSM Forced: playing -> idle
```

`force()` fires all lifecycle hooks normally but skips transition validation. It logs a warning so you can trace unexpected state jumps in production.

## TypeScript

```typescript
import { FSM, type TransitionMap, type Disposer } from 'lite-states';

const transitions: TransitionMap = {
    idle: ['loading'],
    loading: ['ready', 'error'],
};

const fsm = new FSM('idle', transitions);
const dispose: Disposer = fsm.onChange((prev, next) => {
    // fully typed
});
```

## License

MIT
