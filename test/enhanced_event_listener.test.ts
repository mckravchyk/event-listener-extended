import { EnhancedEventListener } from '../src/enhanced_event_listener';

const listItemCount = 4;

/**
 * Trigger {eventName} on {target} {count} times
 * @param target
 * @param eventName
 * @param count (optional) Default 1
 */
const fireEvent = (target: EventTarget, eventName: string, count?: number) : void => {
  if (typeof count === 'undefined') {
    count = 1;
  }
  for (let i = 0; i < count; i++) {
    target.dispatchEvent(new Event(eventName, { bubbles: true }));
  }
};

beforeAll(() => {
  // Set up dom

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
});

/**
 * Things to test:
 *
 * Multiple event names
 * Multiple targets (to implement)
 * Delegated events (to implement)
 *
 * once (to implement)
 *
 * passive events (expect an error to be thrown when calling e.preventDefault())
 * custom dom events
 *
 * off() - will be tested in every situation
 *
 *
 * Test cases:
 *
 * 1. Click event on a single target with a single event name
 * 2. Multiple event names
 * 3. Multiple event targets
 * 3. Delegated event
 * 4. Once
 * 5. Passive event
 * 6. Custom dom events
 *
 * Is there a need to do combined tests?
 *  E.g. should I test whether both multiple event names and multiple event targets work?
 * Should I test if multiple event names + multiple event targets + delegated events work?
 *
 * Tests:
 *  Event capturing
 *
 *
 */

describe('Test EnhancedEventListener', () => {
  test('Click event fires on target and is removed properly', () => {
    // The target which the event is bound too
    const eventTarget = document.getElementById('list-1')!;
    // A child node of the event target - the event will be fired on the child node
    const inputTarget = eventTarget.childNodes[0];

    let eventFireCount = 0;
    let callbackThisContext: EventTarget | null = null;

    // Number of test rounds for the event dispatch
    const rounds = 2;

    const listener = new EnhancedEventListener({
      target: eventTarget,
      eventName: 'click',
      callback(e: Event) {
        eventFireCount += 1;
        callbackThisContext = this;
      },
    });

    // Fire the event on a child node of the target
    fireEvent(inputTarget, 'click', rounds);
    expect(eventFireCount).toBe(rounds);
    // This context of the callback has to be eventTarget (despite being fired on a child node)
    expect(callbackThisContext).toBe(eventTarget);

    // Expect the callback has not fired after listener is detached
    listener.off();
    fireEvent(inputTarget, 'click', 1);
    expect(eventFireCount).toBe(rounds);
  });

  test('2 identical listeners do not collide', () => {
    const eventTarget = document.getElementById('list-1')!;

    let listener1FireCount = 0;
    let listener2FireCount = 0;

    const listener1 = new EnhancedEventListener({
      target: eventTarget,
      eventName: 'click',
      callback: (e: Event) => {
        listener1FireCount += 1;
      },
    });

    const listener2 = new EnhancedEventListener({
      target: eventTarget,
      eventName: 'click',
      callback: (e: Event) => {
        listener2FireCount += 1;
      },
    });

    fireEvent(eventTarget, 'click', 1);
    expect(listener1FireCount).toBe(1);
    expect(listener2FireCount).toBe(1);

    listener1.off();
    fireEvent(eventTarget, 'click', 1);
    expect(listener1FireCount).toBe(1);
    expect(listener2FireCount).toBe(2);
    listener2.off();
    fireEvent(eventTarget, 'click', 1);
    expect(listener2FireCount).toBe(2);
  });

  test('Multiple events fire on target', () => {
    const eventTarget = document.getElementById('list-1')!;

    let eventFireCount = 0;

    const listener = new EnhancedEventListener({
      target: eventTarget,
      eventName: 'mousedown click',
      callback: (e: Event) => {
        eventFireCount += 1;
      },
    });

    fireEvent(eventTarget, 'mousedown', 2);
    fireEvent(eventTarget, 'click', 2);

    expect(eventFireCount).toBe(4);

    // Expect the callback has not fired after listener is detached
    listener.off();
    fireEvent(eventTarget, 'mousedown', 1);
    fireEvent(eventTarget, 'click', 1);
    expect(eventFireCount).toBe(4);
  });

  test('Click event fires on multiple targets', () => {
    const targets = [
      document.getElementById('list-1')!,
      document.getElementById('list-2')!,
    ];
    let eventFireCount = 0;

    const listener = new EnhancedEventListener({
      target: targets,
      eventName: 'click',
      callback: (e: Event) => {
        eventFireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
    });
    expect(eventFireCount).toBe(2 * targets.length);

    // Expect listener is properly removed
    listener.off();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
    });
    expect(eventFireCount).toBe(2 * targets.length);
  });

  test('Click event fires on multiple targets (defined as NodeList)', () => {
    const targets = document.querySelectorAll('.list')!;
    let eventFireCount = 0;

    const listener = new EnhancedEventListener({
      target: targets,
      eventName: 'click',
      callback: (e: Event) => {
        eventFireCount += 1;
      },
    });

    targets.forEach((target) => {
      fireEvent(target, 'click', 2);
    });
    expect(eventFireCount).toBe(2 * targets.length);

    // Expect listener is properly removed
    listener.off();
    targets.forEach((target) => {
      fireEvent(target, 'click', 1);
    });
    expect(eventFireCount).toBe(2 * targets.length);
  });


  // test('Passive events', () => {
  //   const listener = new EnhancedEventListener({
  //     target: window,
  //     eventName: 'touchmove',
  //     callback: (e: Event) => {
  //       e.preventDefault();
  //     },
  //     passive: true,
  //   });

  //   fireEvent(window, 'touchmove', 1);
  // });

  test('Delegated click event fires', () => {
    const delegateTarget = document.getElementById('list-1')!;
    const listItems = delegateTarget.querySelectorAll('.list-item');

    let parentFireCount = 0;
    let childFireCount = 0;

    const parentListener = new EnhancedEventListener({
      target: delegateTarget,
      eventName: 'click',
      callback: (e: Event) => {
        parentFireCount += 1;
      },
    });

    const delegateListener = new EnhancedEventListener({
      target: delegateTarget,
      eventName: 'click',
      callback: (e: Event) => {
        childFireCount += 1;
      },
      delegate: {
        selector: '.list-item',
      },
    });

    /**
     * Trigger click event on the parent,
     * expect that the parent listener fired,
     * but the child did not
     */
    fireEvent(delegateTarget, 'click', 1);
    expect(parentFireCount).toBe(1);
    expect(childFireCount).toBe(0);

    /**
     * Trigger click event twice on each child item
     * Expect that the listener fired for both parent and child items
     */
    fireEvent(listItems[0], 'click', 2);
    fireEvent(listItems[1], 'click', 2);
    expect(parentFireCount).toBe(5);
    expect(childFireCount).toBe(4);

    // Test that all listeners were properly removed
    parentListener.off();
    delegateListener.off();

    fireEvent(delegateTarget, 'click', 1);
    fireEvent(listItems[0], 'click', 2);
    fireEvent(listItems[1], 'click', 2);

    expect(parentFireCount).toBe(5);
    expect(childFireCount).toBe(4);
  });
});
