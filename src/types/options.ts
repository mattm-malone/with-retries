export default interface options {
  /**
   * The value to use as `this` when calling a given function.
   */
  scope?: unknown;
  /**
   * How many times to attempt function
   */
  attempts?: number;
  /**
   * Time in ms to delay each invocation
   */
  delay?: number;
}
