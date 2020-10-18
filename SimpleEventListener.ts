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

  // TODO:
  //once?: boolean

}

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

  constructor(options: Options) {
    this.target = options.target;
    this.events = options.eventName.split(' ');

    this.delegateSelector = (options.delegate) ? options.delegate.selector : false;
    this.callback = options.callback;

    // Attach event listener(s)
    for (let i = 0; i < this.events.length; i += 1) {
      this.target.addEventListener(this.events[i], this.processListener);
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
      this.target.removeEventListener(this.events[i], this.processListener);
    }

    this.target = null;
    this.callback = null;
  }
}

export type { Options as SimpleEventListenerOptions };
export { SimpleEventListener };
