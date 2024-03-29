import { addListener } from 'src';

/* eslint-disable @typescript-eslint/no-this-alias */

const LIST_ITEM_COUNT = 4;

/**
 * Emits `eventName` on `target` `count` times
 */
function fireEvent(target: EventTarget, eventName: string, count = 1): void {
  for (let i = 0; i < count; i += 1) {
    target.dispatchEvent(new Event(eventName, { bubbles: true }));
  }
}

function setUpDOM() {
  let liItems = '';

  for (let i = 0; i < LIST_ITEM_COUNT; i += 1) {
    liItems += `<li class="list-item" data-index="${i}">Item ${i}</li>`;
  }

  const html = `
    <div id="container">
      <ul id="list-1" class="list">${liItems}</ul>
      <ul id="list-2" class="list">${liItems}</ul>
    </div>
    `;

  document.body.innerHTML = html;
}

beforeAll(setUpDOM);

describe('General', () => {
  test('A listener observes an event until removed', () => {
    // The target which the event is bound too
    const eventTarget = document.getElementById('list-1')!;
    // A child node of the event target - the event will be fired on the child node
    const inputTarget = eventTarget.childNodes[0];

    let fireCount = 0;
    let callbackThisContext: EventTarget | null = null;

    // Number of test rounds for the event dispatch
    const rounds = 2;

    const removeListener = addListener({
      target: eventTarget,
      eventName: 'click',
      callback() {
        fireCount += 1;
        callbackThisContext = this;
      },
    });

    // Fire the event on a child node of the target
    fireEvent(inputTarget, 'click', rounds);
    expect(fireCount).toBe(rounds);
    // This context of the callback has to be eventTarget (despite being fired on a child node)
    expect(callbackThisContext).toBe(eventTarget);

    // Expect the callback has not fired after listener is detached
    removeListener();
    fireEvent(inputTarget, 'click', 1);
    expect(fireCount).toBe(rounds);
  });

  test('A listener observes a custom event', () => {
    // The target which the event is bound too
    const eventTarget = document.getElementById('list-1')!;

    // A child node of the event target - the event will be fired on the child node
    const inputTarget = eventTarget.childNodes[0];

    let fireCount = 0;
    let detail = '';

    interface MyCustomEvent extends Event {
      detail: string
    }

    addListener({
      target: eventTarget,
      eventName: 'myCustomEvent',
      callback(e: MyCustomEvent) { fireCount += 1; detail = e.detail; },
      once: true,
    });

    const customEvent = new CustomEvent('myCustomEvent', { bubbles: true, detail: 'test' });
    inputTarget.dispatchEvent(customEvent);
    expect(fireCount).toBe(1);
    expect(detail).toBe('test');
  });

  test('A listener observes multiple events until removed', () => {
    const eventTarget = document.getElementById('list-1')!;

    let fireCount = 0;

    const removeListener = addListener({
      target: eventTarget,
      eventName: ['mousedown', 'click'],
      callback: () => {
        fireCount += 1;
      },
    });

    fireEvent(eventTarget, 'mousedown', 2);
    fireEvent(eventTarget, 'click', 2);

    expect(fireCount).toBe(4);

    // Expect the callback has not fired after listener is detached
    removeListener();
    fireEvent(eventTarget, 'mousedown', 1);
    fireEvent(eventTarget, 'click', 1);
    expect(fireCount).toBe(4);
  });

  test('A listener observes an event on multiple targets until removed', () => {
    const targets = [
      document.getElementById('list-1')!,
      document.getElementById('list-2')!,
    ];
    let fireCount = 0;

    const removeListener = addListener({
      target: targets,
      eventName: 'click',
      callback: () => {
        fireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
    });
    expect(fireCount).toBe(2 * targets.length);

    // Expect listener is properly removed
    removeListener();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
    });
    expect(fireCount).toBe(2 * targets.length);
  });

  test('A listener observes multiple events on multiple targets until removed', () => {
    const targets = [
      document.getElementById('list-1')!,
      document.getElementById('list-2')!,
    ];
    let fireCount = 0;

    const removeListener = addListener({
      target: targets,
      eventName: ['click', 'mousedown'],
      callback: () => {
        fireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
      fireEvent(target, 'mousedown', 2);
    });
    expect(fireCount).toBe(4 * targets.length);

    // Expect listener is properly removed
    removeListener();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
      fireEvent(target, 'mousedown', 1);
    });
    expect(fireCount).toBe(4 * targets.length);
  });

  test('A delegate listener observes an event on the target\'s descendants until removed', () => {
    const delegateTarget = document.getElementById('list-1')!;
    const listItems = delegateTarget.querySelectorAll('.list-item');

    let parentFireCount = 0;
    let childFireCount = 0;

    const removeParentListener = addListener({
      target: delegateTarget,
      eventName: 'click',
      callback: () => {
        parentFireCount += 1;
      },
    });

    const removeDelegateListener = addListener({
      target: delegateTarget,
      eventName: 'click',
      callback: () => {
        childFireCount += 1;
      },
      delegateSelector: '.list-item',
    });

    // Trigger click event on the parent, expect that the parent listener fired, but the child did
    // not.
    fireEvent(delegateTarget, 'click', 1);
    expect(parentFireCount).toBe(1);
    expect(childFireCount).toBe(0);

    // Trigger click event twice on each child item. Expect that the listener fired for both
    // parent and child items.
    fireEvent(listItems[0], 'click', 2);
    fireEvent(listItems[1], 'click', 2);
    expect(parentFireCount).toBe(5);
    expect(childFireCount).toBe(4);

    // Test that all listeners were properly removed
    removeParentListener();
    removeDelegateListener();

    fireEvent(delegateTarget, 'click', 1);
    fireEvent(listItems[0], 'click', 2);
    fireEvent(listItems[1], 'click', 2);

    expect(parentFireCount).toBe(5);
    expect(childFireCount).toBe(4);
  });

  test('A delegate listener observes an event on multiple target\'s descendants', () => {
    const target1 = document.getElementById('list-1')!;
    const target2 = document.getElementById('list-2')!;
    const listItems1 = target1.querySelectorAll('.list-item');
    const listItems2 = target2.querySelectorAll('.list-item');

    const result: string[] = [];

    const removeListener = addListener({
      target: [target1, target2],
      eventName: 'click',
      callback() {
        const parentId = (this.parentNode! as HTMLElement).id;
        result.push(`${parentId}-${this.dataset.index}`);
      },
      delegateSelector: '.list-item',
    });

    fireEvent(listItems1[0], 'click', 2);
    fireEvent(listItems1[1], 'click', 2);
    fireEvent(listItems2[0], 'click', 2);
    fireEvent(listItems2[1], 'click', 2);

    expect(result).toEqual([
      'list-1-0', 'list-1-0',
      'list-1-1', 'list-1-1',
      'list-2-0', 'list-2-0',
      'list-2-1', 'list-2-1',
    ]);

    removeListener();
  });
});

describe('Behavior', () => {
  test('2 identical listeners sharing the same callback do not collide', () => {
    const eventTarget = document.getElementById('list-1')!;

    let fireCount = 0;

    // The native addEventListener will ignore another listener with the same event name and a
    // callback function - this library will not.
    const callback = () => { fireCount += 1; };

    const removeListener1 = addListener({
      target: eventTarget,
      eventName: 'click',
      callback,
    });

    const removeListener2 = addListener({
      target: eventTarget,
      eventName: 'click',
      callback,
    });

    fireEvent(eventTarget, 'click', 1);
    expect(fireCount).toBe(2);

    removeListener1();
    fireEvent(eventTarget, 'click', 1);
    expect(fireCount).toBe(3);
    removeListener2();
    fireEvent(eventTarget, 'click', 1);
    expect(fireCount).toBe(3);
  });

  test('A listener with a delegate selector targeting multiple nodes in the same lineage is fired for each matched node', () => {
    const delegateTarget = document.getElementById('container')!;
    let fireCount = 0;

    addListener({
      target: delegateTarget,
      eventName: 'click',
      callback: () => {
        fireCount += 1;
      },
      delegateSelector: '.list, .list-item',

      // This is not just for convenience - once should not affect this behaviour - the listener
      // should still fire for each match in the same target / event combination.
      once: true,
    });

    fireEvent(delegateTarget.children[0].children[0], 'click', 1);
    expect(fireCount).toBe(2);
  });

  test('A listener has the event target as the this keyword and retains original e.target, e.currentTarget', () => {
    const listenerTarget = document.getElementById('container')!;

    // The first list item in the first list
    const eventTarget = listenerTarget.children[0].children[0];

    let currentTargetValue: HTMLElement | null = null;
    let thisValue: HTMLElement | null = null;
    let targetValue: HTMLElement | null = null;

    addListener({
      target: listenerTarget,
      eventName: 'click',
      callback(e) {
        currentTargetValue = e.currentTarget as HTMLElement;
        thisValue = this;
        targetValue = e.target as HTMLElement;
      },
      once: true,
    });

    fireEvent(eventTarget, 'click', 1);

    expect(currentTargetValue).toBe(listenerTarget);
    expect(thisValue).toBe(listenerTarget);
    expect(targetValue).toBe(eventTarget);
  });

  test('A delegated listener has the matched node as the this keyword and retains original e.target, e.currentTarget', () => {
    const listenerTarget = document.getElementById('container')!;

    // The first list item in the first list
    const eventTarget = listenerTarget.children[0].children[0];

    let currentTargetValue: HTMLElement | null = null;
    let thisValue: HTMLElement | null = null;
    let targetValue: HTMLElement | null = null;

    addListener({
      target: listenerTarget,
      eventName: 'click',
      callback(e) {
        currentTargetValue = e.currentTarget as HTMLElement;
        thisValue = this;
        targetValue = e.target as HTMLElement;
      },
      delegateSelector: '.list',
      once: true,
    });

    fireEvent(eventTarget, 'click', 1);

    expect(currentTargetValue).toBe(listenerTarget);
    expect(thisValue).toBe(listenerTarget.children[0]);
    expect(targetValue).toBe(eventTarget);
  });
});

describe('Options', () => {
  test('`once` makes it observe only the first event', () => {
    // The target which the event is bound too
    const eventTarget = document.getElementById('list-1')!;

    // A child node of the event target - the event will be fired on the child node
    const inputTarget = eventTarget.childNodes[0];

    let fireCount = 0;

    addListener({
      target: eventTarget,
      eventName: 'mousedown click',
      callback() { fireCount += 1; },
      once: true,
    });

    fireEvent(inputTarget, 'mousedown', 1);
    expect(fireCount).toBe(1);
    fireEvent(inputTarget, 'click', 1);
    expect(fireCount).toBe(1);
  });

  test('`eventName` can be a string of space-separated event names (alternative)', () => {
    const eventTarget = document.getElementById('list-1')!;

    let fireCount = 0;

    const removeListener = addListener({
      target: eventTarget,
      eventName: 'mousedown click  mouseup', // Intended double space before mouseup
      callback: () => {
        fireCount += 1;
      },
    });

    fireEvent(eventTarget, 'mousedown', 2);
    fireEvent(eventTarget, 'click', 2);
    fireEvent(eventTarget, 'mouseup', 2);

    expect(fireCount).toBe(6);

    // Expect the callback has not fired after listener is detached
    removeListener();
    fireEvent(eventTarget, 'mousedown', 1);
    fireEvent(eventTarget, 'click', 1);
    fireEvent(eventTarget, 'mouseup', 1);
    expect(fireCount).toBe(6);
  });

  test('`target` can be a NodeList (alternative)', () => {
    const targets = document.querySelectorAll('.list')!;
    let fireCount = 0;

    const removeListener = addListener({
      target: targets,
      eventName: 'click',
      callback: () => {
        fireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
    });
    expect(fireCount).toBe(2 * targets.length);

    // Expect listener is properly removed
    removeListener();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
    });
    expect(fireCount).toBe(2 * targets.length);
  });

  test('`capture` is forwarded to EventTarget.addEventListener', () => {
    const originalAddListener = window.addEventListener;
    const addListenerMock = jest.fn(window.addEventListener);
    window.addEventListener = addListenerMock;

    const removeListener = addListener({
      target: window,
      eventName: 'touchmove',
      callback: () => { },
    });

    fireEvent(window, 'touchmove', 1);

    let addListenerArg = addListenerMock.mock.calls[0][2] as { capture?: boolean };

    expect(!!addListenerArg.capture).toBe(false);

    removeListener();

    const removePassiveListener = addListener({
      target: window,
      eventName: 'touchmove',
      callback: () => { },
      capture: true,
    });

    fireEvent(window, 'touchmove', 1);

    addListenerArg = addListenerMock.mock.calls[1][2] as { capture: boolean };

    expect(addListenerArg.capture).toBe(true);

    removePassiveListener();

    window.addEventListener = originalAddListener;
  });

  test('`passive` is forwarded to EventTarget.addEventListener', () => {
    // It's not possible to test the behaviour at the moment since e.defaultPrevented seems to be
    // always false in jsodom, even on non-passive. Either way, it's more important to test that
    // the parameter is passed (or not passed) so handling the default can be left to the
    // browsers.

    const originalAddListener = window.addEventListener;
    const addListenerMock = jest.fn(window.addEventListener);
    window.addEventListener = addListenerMock;

    addListener({
      target: window,
      eventName: 'touchmove',
      callback: () => { },
      once: true,
    });

    fireEvent(window, 'touchmove', 1);

    let addListenerArg = addListenerMock.mock.calls[0][2] as { passive?: boolean };

    // It must not be false since it would interfere with browser vendor optimizations to enable
    // passive by default for certain event / event targets combinations.
    expect(addListenerArg.passive).not.toBe(false);
    expect(addListenerArg.passive).toBe(undefined);

    addListener({
      target: window,
      eventName: 'touchmove',
      callback: () => { },
      passive: true,
      once: true,
    });

    fireEvent(window, 'touchmove', 1);

    addListenerArg = addListenerMock.mock.calls[1][2] as { passive: boolean };

    expect(addListenerArg.passive).toBe(true);

    window.addEventListener = originalAddListener;
  });
});
