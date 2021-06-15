interface RetryOptions {
  /**
   * The value to use as `this` when calling a given function.
   */
  scope?: unknown;
  /**
   * How many times to attempt function upon failure.
   */
  maxAttempts?: number;
  /**
   * Time in milliseconds to delay each re-invocation.
   */
  delay?: number;
  /**
   * Function that returns true or false based on the result of the given function.
   * Indicates whether to retry or not
   * If function returns true, it will retry again (after the specified delay).
   * else, return result.
   */
  when?: (result: any) => boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function withRetries<T>(
  func: (...params: any[]) => Promise<T> | T,
  { delay = 500, maxAttempts = 3, scope, when }: RetryOptions = {}
): (...args: any[]) => Promise<T | undefined> {
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
