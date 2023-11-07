# event-listener-extended

A wrapper to `EventTarget.addEventListener` that supports multiple targets, event names and delegated events with a convenient remove listener mechanism.

## Installation

```bash
npm install event-listener-extended --save
```

## Examples

### Basic usage

Set `target`, `event` and `callback` which are the required options.

```ts
import { addListener } from 'event-listener-extended';

const list = document.getElementById('list');

const removeListener = addListener({
  target: list,
  event: 'click',
  callback(e) {
    console.log(`x: ${e.clientX}, y: ${e.clientY}`)
  }
});

// Call when cleaning up
removeListener();
```

### Once

Use the `once` option to listen to an event only once.

```ts
import { addListener } from 'event-listener-extended';

const list = document.getElementById('list');

const removeListener = addListener({
  target: list,
  event: 'pointermove',
  callback(e) {
    console.log(`x: ${e.clientX}, y: ${e.clientY}`)
  },
  once: true,
});

```

### Multiple events

Listen to multiple events by setting an array or a string of space-separated event names as the `event` option.

```ts
import { addListener } from 'event-listener-extended';

const list = document.getElementById('list');

const removeListener = addListener({
  target: list,
  event: ['pointerdown', 'pointerup'],
  callback(e) {
    console.log(`${e.type}: x: ${e.clientX}, y: ${e.clientY}`)
  }
});

// Call when cleaning up
removeListener();
```

### Multiple targets

Listen to multiple targets by setting `EventTarget[]` or `NodeListOf<EventTarget>` as the `target` option.

```ts
import { addListener } from 'event-listener-extended';

const list = document.getElementById('list');

const removeListener = addListener({
  target: list.getElementsByTagName('li'),
  event: 'click',
  callback(e) {
    console.log(`x: ${e.clientX}, y: ${e.clientY}`)
  }
});

// Call when cleaning up
removeListener();
```

Under the hood, .addEventListener() will be called for each node in the target NodeList

### A delegated listener

A delegated listener is a pseudo-listener that is bound to a common ancestor of targeted nodes rather than the targeted nodes themselves. This allows to bind the event only once, to the ancestor target (i.e. list element) without having to add / remove the listener when a new node (i.e. list item) is added / removed.

Event delegation is enabled by using `delegateSelector` option - which must be a CSS selector that targeted items will match.

```ts
import { addListener } from 'event-listener-extended';

const list = document.getElementById('list');

const removeListener = addListener({
  target: container,
  event: 'click',
  callback(e) {
    console.log(this.tagName); // LI
  },
  delegateSelector: 'li',
});

// Clicking this newly added item will fire the listener without having to add a listener on it
const li = document.createElement('li');
list.appendChild(li);

// Call when cleaning up
removeListener();
```

Mind that delegated listeners add extra processing overhead on the event to find the matched node, thus are not recommended for events that fire often like pointermove, pointerin.

## Options

See the `Options` interface in [this file](src/index.ts) for the full list of options.