export default interface options {
  /**
   * The value to use as `this` when calling a given function.
   */
  scope?: unknown;
  /**
   * How many times to attempt function upon failure.
   */
  attempts?: number;
  /**
   * Time in milliseconds to delay each re-invocation.
   */
  delay?: number;
}
