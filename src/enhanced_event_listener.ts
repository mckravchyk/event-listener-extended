import matchesSelector from 'matches-selector';

import { detectEventListener } from 'detect-event-listener';

export interface Options {
  /**
   * Event target or an array of event targets
   */
  target: EventTarget | Array<EventTarget> | NodeList

  /**
   * Event name to bind. It's possible to pass multiple event names, separated by space.
   * E.g. "touchstart mousedown"
   */
  eventName: string

  callback(this: EventTarget, e: Event) : void;

  /**
   * Delegate the event to target's child nodes that match the selector.
   */
  delegate?: {
    selector: string
  }

  /**
   * A Boolean indicating that events of this type will be dispatched to the registered
   * listener before being dispatched to any EventTarget beneath it in the DOM tree.
   */
  capture?: boolean

  /**
   * Passive event listeners cannot call e.preventDefault()
   * If not set, the argument will not be passed to addEventListener()
   *
   * This option can be used to override browser defaulting some events
   * such as touchmove to be passive
   * https://developers.google.com/web/updates/2017/01/scrolling-intervention
   */
  passive?: boolean

  // TODO:
  // once?: boolean

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

function getEventListenerArg(constructorOptions: Options): EventListenerArg {
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
  delegateSelector: string | false,
) {
  return (e: Event) => {
    // XXX: Could it ever eveluate as true?
    if (e.target === null || e.currentTarget === null) {
      return;
    }

    // The target listener was attached to
    const listenerTarget = e.currentTarget;

    // The event target which is the source of the event
    const eventSource = e.target;

    if (!delegateSelector) {
      callback.call(listenerTarget, e);
      return;
    }

    if (eventSource instanceof Element) {
      let currentNode: Node | null = eventSource;

      // Traverse the dom up fron the event source and check if any element matches the selector
      while (currentNode !== listenerTarget && currentNode !== null) {
        if (matchesSelector(currentNode, delegateSelector)) {
          callback.call(currentNode, e);
        }
        currentNode = currentNode.parentNode;
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
export function addListener(options: Options): () => void {
  const events = options.eventName.split(' ');

  const delegateSelector = options.delegate ? options.delegate.selector : false;

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

  const callback = createCallback(options.callback, delegateSelector);

  targets.forEach((target) => {
    events.forEach((eventName) => {
      target.addEventListener(eventName, callback, eventListenerArg);
    });
  });

  return () => {
    targets.forEach((target) => {
      events.forEach((eventName) => {
        target.removeEventListener(eventName, callback, eventListenerArg);
      });
    });
  };
}
