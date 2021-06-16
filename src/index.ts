/**
 * Options used to configure the retry logic.
 */
interface RetryOptions {
  /**
   * The value to use as `this` when calling a given function.
   */
  scope?: any;
  /**
   * How many times to attempt function upon failure.
   */
  maxAttempts?: number;
  /**
   * Time in milliseconds to delay each re-invocation.
   */
  delay?: number;
  /**
   * If function returns true, it will retry again (after the specified delay).
   * else, return result.
   * Function that returns true or false based on the result of the given function.
   * Indicates whether to retry or not
   */
  when?: (result: any) => boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new async function that, when invoked, will invoke the given func.
 * If the given func throws an error or rejects, with-retries will attempt to invoke the function again.
 *
 * @param {function(...args:*):boolean} func - The function to invoke.
 * @param {Object} [options] - Options used to configure how `func` is retried and invoked.
 * @param {object} [options.scope] - The value to use as `this` when calling `func`.
 * @param {number} [options.maxAttempts=3] - How many times to attempt function upon failure.
 * @param {number} [options.delay=500] - Time in milliseconds to delay each re-invocation.
 * @param {function(result:*):boolean} [options.when] - Function that determines whether to retry or not.
 *
 * @returns Returns async function that, when invoked, will invoke the given func.
 */
export default function withRetries<T>(
  func: (...args: any[]) => Promise<T> | T,
  options: RetryOptions = {}
): (...args: any[]) => Promise<T | undefined> {
  const { delay = 500, maxAttempts = 3, scope, when } = options;
  return async function retry(...args: any[]): Promise<T | undefined> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const funcResult = func.apply(scope, args);
        if (when && when(funcResult)) throw new Error('Failed given condition');
        return funcResult;
      } catch (err) {
        if (attempt <= maxAttempts - 1) await sleep(delay);
        else throw err;
      }
    }
  };
}
