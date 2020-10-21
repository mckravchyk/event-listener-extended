import { getEventListenerOptionsSupport } from '../featureDetect/eventListener';

interface Options {

  /**
   * Event target
   */
  target: HTMLElement | Document

  /**
   * Event name to bind. It's possible to pass multiple event names, separated by space.
   * E.g. "touchstart mousedown"
   */
  eventName: string

  /**
   * Delegate
   * Use this to delegate event to child elements which match the selector
   */
  delegate?: {
    selector: string
  } | undefined

  /**
   * Callback - executes when the event is fired
   */
  callback: Function

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

const optionSupport = getEventListenerOptionsSupport();

/**
 * A very simple dom event creation class with support for event delegation
 *
 * Usage:
 *
 * Attach event: let listener = new DelegatedEvent(target, eventName, selector, callback);
 *
 * Detach event: listener.off()
 */
class SimpleEventListener {
  private events : Array<string>;

  private delegateSelector : string | false;

  private target : HTMLElement | Document | null;

  private callback : Function | null;

  /**
   * The third argument for addEventListener / removeEventListener
   */
  private eventListenerArg : EventListenerArg = false;

  constructor(options: Options) {
    this.target = options.target;
    this.events = options.eventName.split(' ');

    this.delegateSelector = (options.delegate) ? options.delegate.selector : false;
    this.callback = options.callback;

    // Set this.eventListenerArg
    this.setEventListenerArg(options);

    // Attach event listener(s)
    for (let i = 0; i < this.events.length; i += 1) {
      this.target.addEventListener(this.events[i], this.processListener, this.eventListenerArg);
    }
  }

  // private addListener()

  private processListener = (e: Event) : void => {
    // Note: Using assertion operator "!" - target and callback will never be null here
    if (this.delegateSelector) {
      // Execute the callback for each child of the target which matches the selector
      this.target!.querySelectorAll(this.delegateSelector).forEach((element, index) => {
        this.callback!.call(element, e);
      });
    } else {
      this.callback!.call(this.target, e);
    }
  }

  public off() : void {
    if (this.target === null || this.callback === null) {
      return;
    }

    for (let i = 0; i < this.events.length; i += 1) {
      this.target.removeEventListener(
        this.events[i],
        this.processListener,
        this.eventListenerArg,
      );
    }

    this.target = null;
    this.callback = null;
    this.eventListenerArg = false;
  }

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

export type { Options as SimpleEventListenerOptions };
export { SimpleEventListener };
