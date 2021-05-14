export default interface options {
    /**
     * The value to use as `this` when calling a given function.
     */
    scope?: unknown;
    /**
     * How many times to retry function
     */
    maxRetries?: number;
    /**
     * Time in ms to delay each invokation
     */
    delay?: number;
}