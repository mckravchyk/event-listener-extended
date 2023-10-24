import { addListener } from '../src/enhanced_event_listener';

const listItemCount = 4;

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

  for (let i = 0; i < listItemCount; i += 1) {
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

    let eventFireCount = 0;
    let callbackThisContext: EventTarget | null = null;

    // Number of test rounds for the event dispatch
    const rounds = 2;

    const removeListener = addListener({
      target: eventTarget,
      eventName: 'click',
      callback() {
        eventFireCount += 1;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        callbackThisContext = this;
      },
    });

    // Fire the event on a child node of the target
    fireEvent(inputTarget, 'click', rounds);
    expect(eventFireCount).toBe(rounds);
    // This context of the callback has to be eventTarget (despite being fired on a child node)
    expect(callbackThisContext).toBe(eventTarget);

    // Expect the callback has not fired after listener is detached
    removeListener();
    fireEvent(inputTarget, 'click', 1);
    expect(eventFireCount).toBe(rounds);
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

    let eventFireCount = 0;

    const removeListener = addListener({
      target: eventTarget,
      eventName: 'mousedown click',
      callback: () => {
        eventFireCount += 1;
      },
    });

    fireEvent(eventTarget, 'mousedown', 2);
    fireEvent(eventTarget, 'click', 2);

    expect(eventFireCount).toBe(4);

    // Expect the callback has not fired after listener is detached
    removeListener();
    fireEvent(eventTarget, 'mousedown', 1);
    fireEvent(eventTarget, 'click', 1);
    expect(eventFireCount).toBe(4);
  });

  test('A single listener observes an event on multiple targets until removed', () => {
    const targets = [
      document.getElementById('list-1')!,
      document.getElementById('list-2')!,
    ];
    let eventFireCount = 0;

    const removeListener = addListener({
      target: targets,
      eventName: 'click',
      callback: () => {
        eventFireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
    });
    expect(eventFireCount).toBe(2 * targets.length);

    // Expect listener is properly removed
    removeListener();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
    });
    expect(eventFireCount).toBe(2 * targets.length);
  });

  test('A single listener observes an event on multiple targets (defined as NodeList) until removed', () => {
    const targets = document.querySelectorAll('.list')!;
    let eventFireCount = 0;

    const removeListener = addListener({
      target: targets,
      eventName: 'click',
      callback: () => {
        eventFireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
    });
    expect(eventFireCount).toBe(2 * targets.length);

    // Expect listener is properly removed
    removeListener();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
    });
    expect(eventFireCount).toBe(2 * targets.length);
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
      delegate: {
        selector: '.list-item',
      },
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
      delegate: { selector: '.list, .list-item' },

      // This is not just for convenience - once should not affect this behaviour - the listener
      // should still fire for each match in the same target / event combination.
      once: true,
    });

    fireEvent(delegateTarget.children[0].children[0], 'click', 1);
    expect(fireCount).toBe(2);
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
    // It suffices to test that the correct parameter is passed to EventTarget.addEventListener,
    // it's also not possible to test it otherwise at the moment as it seems like
    // e.defaultPrevented is always false in jsdom.

    const originalAddListener = window.addEventListener;
    const addListenerMock = jest.fn(window.addEventListener);
    window.addEventListener = addListenerMock;

    const removeListener = addListener({
      target: window,
      eventName: 'touchmove',
      callback: () => { },
    });

    fireEvent(window, 'touchmove', 1);

    let addListenerArg = addListenerMock.mock.calls[0][2] as { passive?: boolean };

    expect(!!addListenerArg.passive).toBe(false);

    removeListener();

    const removePassiveListener = addListener({
      target: window,
      eventName: 'touchmove',
      callback: () => { },
      passive: true,
    });

    fireEvent(window, 'touchmove', 1);

    addListenerArg = addListenerMock.mock.calls[1][2] as { passive: boolean };

    expect(addListenerArg.passive).toBe(true);

    removePassiveListener();

    window.addEventListener = originalAddListener;
  });
});
