import cloneDeep from 'clone-deep';

// TODO: Add a declaration file for this module
import matchesSelector from 'matches-selector';

import { getEventListenerOptionsSupport } from '../featureDetect/eventListener';

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

  /**
   * Callback - executes when the event is fired
   */
  // callback: Function
  callback(this: EventTarget, e: Event) : void;

  /**
   * Delegate
   * Use this to delegate event to child elements which match the selector
   */
  delegate?: {
    selector: string
  } | undefined

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

const optionSupport = getEventListenerOptionsSupport();

/**
 * A very simple dom event creation class with support for event delegation
 *
 * Usage:
 *
 * Attach event listener: let listener = new SimpleEventListener(options);
 *
 * Detach event: listener.off()
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
    // Setup targets property
    if (Array.isArray(options.target)) {
      this.targets = cloneDeep(options.target);
    } else if (options.target instanceof NodeList) {
      // TODO: Ensure it works with ES5 target
      // Convert NodeList to Array so there are no doubts on iteration and backward compatibility
      this.targets = Array.from(options.target);
    } else {
      this.targets = [options.target as EventTarget];
    }

    // Setup events properties
    this.events = options.eventName.split(' ');

    this.delegateSelector = (options.delegate) ? options.delegate.selector : false;
    this.callback = options.callback;

    // Set this.eventListenerArg
    this.setEventListenerArg(options);

    // Attach event listener(s)
    this.addListeners();
  }

  /**
   * Destroy the event listener
   */
  public off() : void {
    if (this.targets === null || this.callback === null) {
      return;
    }

    this.removeListeners();

    this.targets = null;
    this.callback = null;
    this.eventListenerArg = false;
  }

  /**
   * Callback for addEventListener
   * @param e
   */
  private processListener = (e: Event) : void => {
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

    // Process delegated event if the event target is Element-type
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
  }

  /**
   * Add an event listener for each target and event name supplied
   */
  private addListeners() {
    if (this.targets === null) {
      throw new Error('Property target is null');
    }
    this.targets.forEach((target) => {
      this.events.forEach((eventName) => {
        target.addEventListener(eventName, this.processListener, this.eventListenerArg);
      });
    });
  }

  /**
   * Remove all listeners
   */
  private removeListeners() {
    if (this.targets === null) {
      throw new Error('Property target is null');
    }
    this.targets.forEach((target) => {
      this.events.forEach((eventName) => {
        target.removeEventListener(eventName, this.processListener, this.eventListenerArg);
      });
    });
  }

  /**
   * Set the 3rd argument for addEventListener
   * @param constructorOptions
   */
  private setEventListenerArg(constructorOptions: Options): void {
    if (!optionSupport.supportsOptions) {
      // If options not supported, use the old schema with boolean useCapture as the third parameter
      this.eventListenerArg = !!constructorOptions.capture;
      // EXIT
      return;
    }

    this.eventListenerArg = {
      capture: !!constructorOptions.capture,
    };

    // Add passive option if set - and is supported
    if (typeof constructorOptions.passive !== 'undefined' && optionSupport.supportsPassive) {
      this.eventListenerArg.passive = constructorOptions.passive;
    }
  }
}
