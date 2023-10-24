import matchesSelector from 'matches-selector';

import { detectEventListener } from 'detect-event-listener';

/**
 * The third argument for addEventListener
 */
type EventListenerArg = boolean | {
  capture: boolean
  once?: boolean
  passive?: boolean
}

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

const optionSupport = detectEventListener();

/**
 * A helper for addEventListener that supports multiple targets, event names and delegated events.
 *
 * Usage:
 *   Attach event listener: let listener = new EnhancedEventListener(options);
 *   Detach event: listener.off()
 */
export class EnhancedEventListener {
  private events : Array<string>;

  private delegateSelector : string | false;

  private targets : Array<EventTarget> | null;

  private callback : Options['callback'] | null;

  /**
   * The third argument for addEventListener / removeEventListener
   */
  private eventListenerArg : EventListenerArg = false;

  constructor(options: Options) {
    if (Array.isArray(options.target)) {
      this.targets = [...options.target];
    }
    else if (options.target instanceof NodeList) {
      // TODO: Ensure it works with ES5 target
      // Convert NodeList to Array so there are no doubts on iteration and backward compatibility
      this.targets = Array.from(options.target);
    }
    else {
      this.targets = [options.target as EventTarget];
    }

    this.events = options.eventName.split(' ');
    this.delegateSelector = (options.delegate) ? options.delegate.selector : false;
    this.callback = options.callback;

    this.setEventListenerArg(options);

    this.addListeners();
  }

  /**
   * Removes all event listeners attached.
   */
  public off() : void {
    if (this.targets === null || this.callback === null) {
      return;
    }

    this.removeAllListeners();

    this.targets = null;
    this.callback = null;
    this.eventListenerArg = false;
  }

  /**
   * Adds an event listener for each target and event name supplied.
   */
  private addListeners() {
    if (this.targets === null) {
      throw new Error('Property target is null');
    }
    this.targets.forEach((target) => {
      this.events.forEach((eventName) => {
        target.addEventListener(eventName, this.eventListenerCallback, this.eventListenerArg);
      });
    });
  }

  private eventListenerCallback = (e: Event) : void => {
    // XXX: Could it ever eveluate as true?
    if (e.target === null || e.currentTarget === null) {
      return;
    }

    // The target listener was attached to
    const listenerTarget = e.currentTarget;

    // The event target which is the source of the event
    const eventSource = e.target;

    if (!this.delegateSelector) {
      this.callback!.call(listenerTarget, e);
      return;
    }

    if (eventSource instanceof Element) {
      let currentNode: Node | null = eventSource;

      // Traverse the dom up fron the event source and check if any element matches the selector
      while (currentNode !== listenerTarget && currentNode !== null) {
        if (matchesSelector(currentNode, this.delegateSelector)) {
          this.callback!.call(currentNode, e);
        }
        currentNode = currentNode.parentNode;
      }
    }
  };

  private removeAllListeners() {
    if (this.targets === null) {
      throw new Error('Property target is null');
    }
    this.targets.forEach((target) => {
      this.events.forEach((eventName) => {
        target.removeEventListener(eventName, this.eventListenerCallback, this.eventListenerArg);
      });
    });
  }

  private setEventListenerArg(constructorOptions: Options): void {
    if (!optionSupport.supportsOptions) {
      // If options not supported, use the old schema with boolean useCapture as the third parameter
      this.eventListenerArg = !!constructorOptions.capture;
      return;
    }

    this.eventListenerArg = {
      capture: !!constructorOptions.capture,
    };

    if (typeof constructorOptions.passive !== 'undefined' && optionSupport.supportsPassive) {
      this.eventListenerArg.passive = constructorOptions.passive;
    }
  }
}
