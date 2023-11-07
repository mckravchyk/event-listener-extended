import { addListener } from 'src';

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

describe('enhanced-event-listener', () => {
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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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

  test('A single listener observes multiple events until removed', () => {
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

  test('`eventName` option accepts a string of space-separated event names', () => {
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

  test('A single listener observes an event on multiple targets until removed', () => {
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

  test('A single listener observes an event on multiple targets (defined as NodeList) until removed', () => {
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

  test('A listener observes an event on the target\'s descendant with a delegate selector until removed', () => {
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

  test('A listener added with `once` option observes only the first event', () => {
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
        thisValue = this as HTMLElement;
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
        thisValue = this as HTMLElement;
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

  test('`capture` option is forwarded to EventTarget.addEventListener', () => {
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

  test('`passive` option is forwarded to EventTarget.addEventListener', () => {
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
