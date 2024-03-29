import matchesSelector from 'matches-selector';

import { detectEventListener } from 'detect-event-listener';

// The conditional is here to use anything that extends HTMLElement as HTMLElement type, so for
// example, if the target is HTMLTableElement, it's not desirable to have the this keyword as
// HTMLTableElement when using a delegate selector where the keyword points to a table cell.
type CallbackThis<Target extends EventTarget> = Target extends HTMLElement ? HTMLElement : Target;

export interface Options<Target extends EventTarget> {
  target: Target extends Node ? Target | Target[] | NodeListOf<Target> : Target | Target[]

  /**
   * A single event name, multiple event names separated by space or an array of event names to
   * listen to.
   */
  eventName: string | string[]

  callback(this: CallbackThis<Target>, e: Event) : void;

  /**
   * If enabled, events of this type will be dispatched to the registered listener before being
   * dispatched to any EventTarget beneath it in the DOM tree.
   */
  capture?: boolean

  /**
   * Whether to make the listener passive - not able to prevent default - which is a performance
   * optimization for frequently-firing events.
   *
   * If not set, the argument is not passed to the native EventTarget.addEventListener which lets
   * the browser decide whether to enable it. For example, Chromium will enable passive by default
   * on a touchmove listener attached to the window, body or document [0]
   *
   * [0] https://developers.google.com/web/updates/2017/01/scrolling-intervention
   */
  passive?: boolean

  /**
   * Whether the listener should respond only to the first event that is emitted after it has been
   * attached.
   *
   * In the case of delegated events, if the delegate selector targets multiple nodes in the same
   * lineage of target's descendants, the listener will still fire for each matched node.
   */
  once?: boolean

  /**
   * A selector string to match target's descendant(s) that will be observed. Enabling this will
   * not call the listener on the target but the descendant node(s) that match the selector instead.
   *
   * This can be useful when there are many nodes to observe or the nodes to observe do not exist
   * yet - rather than adding a listener for each, one listener set at the ancestor can observe
   * them all.
   *
   * It requires some extra processing when the event is fired so it's not recommended to
   * use for events that have the potential to fire frequently like pointerin, scroll, etc.
   */
  delegateSelector?: string | false
}

/**
 * The third argument for addEventListener
 */
type EventListenerArg = boolean | {
  capture: boolean
  once?: boolean
  passive?: boolean
}

const optionsSupport_ = detectEventListener();

function getEventListenerArg<Target extends EventTarget>(
  constructorOptions: Options<Target>,
): EventListenerArg {
  if (!optionsSupport_.supportsOptions) {
    // If options not supported, use the old schema with boolean useCapture as the third parameter
    return !!constructorOptions.capture;
  }

  const eventListenerArg: EventListenerArg = {
    capture: !!constructorOptions.capture,
  };

  if (typeof constructorOptions.passive !== 'undefined' && optionsSupport_.supportsPassive) {
    eventListenerArg.passive = constructorOptions.passive;
  }

  return eventListenerArg;
}

function createCallback(
  callback: (this: EventTarget, e: Event) => void,
  unsubscribe: { unsubscribe?: () => void },
  delegateSelector?: string | false,
) {
  return (e: Event) => {
    if (e.target === null || e.currentTarget === null) {
      return;
    }

    // The target listener was attached to
    const listenerTarget = e.currentTarget;

    // The event target which is the source of the event
    const eventSource = e.target;

    if (!delegateSelector) {
      callback.call(listenerTarget, e);

      if (unsubscribe.unsubscribe) {
        unsubscribe.unsubscribe();
        delete unsubscribe.unsubscribe;
      }

      return;
    }

    if (eventSource instanceof Element) {
      let currentNode: Node | null = eventSource;
      let matchFound = false;

      // Go up from the event source and check if any element matches the selector
      while (currentNode !== listenerTarget && currentNode !== null) {
        if (matchesSelector(currentNode, delegateSelector)) {
          callback.call(currentNode, e);
          matchFound = true;
        }

        currentNode = currentNode.parentNode;
      }

      if (matchFound && unsubscribe.unsubscribe) {
        unsubscribe.unsubscribe();
        delete unsubscribe.unsubscribe;
      }
    }
  };
}

/**
 * A wrapper to EventTarget.addEventListener that supports multiple targets, event names and
 * delegated events.
 *
 * @returns an unsubscribe function to remove all listeners that were attached
 */
export function addListener<Target extends EventTarget>(options: Options<Target>): () => void {
  let events: string[] = [];

  if (Array.isArray(options.eventName)) {
    events = options.eventName;
  }
  else {
    events = options.eventName.split(' ').filter((e) => e !== '');
  }

  let targets : Array<EventTarget>;

  if (Array.isArray(options.target)) {
    targets = [...options.target];
  }
  else if (options.target instanceof NodeList) {
    // Convert NodeList to Array so there are no doubts on iteration and backward compatibility
    targets = Array.from(options.target);
  }
  else {
    targets = [options.target as EventTarget];
  }

  const eventListenerArg = getEventListenerArg(options);

  // callback and unsubscribe circularly depend on each other. It's either this container that is
  // updated or having the callback refer itself / closure inside createCallback.
  const unsubscribeContainer: { unsubscribe?: () => void } = { };

  const callback = createCallback(
    options.callback as (this: EventTarget, e: Event) => void,
    unsubscribeContainer,
    options.delegateSelector,
  );

  const unsubscribe = () => {
    targets.forEach((target) => {
      events.forEach((eventName) => {
        target.removeEventListener(eventName, callback, eventListenerArg);
      });
    });
  };

  if (options.once) {
    unsubscribeContainer.unsubscribe = unsubscribe;
  }

  targets.forEach((target) => {
    events.forEach((eventName) => {
      target.addEventListener(eventName, callback, eventListenerArg);
    });
  });

  return unsubscribe;
}
