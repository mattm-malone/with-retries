/**
 * Options used to configure the retry logic.
 */
interface RetryOptions {
  attempts?: {
    /*
     * Max number of attempts to try before throwing error.
     */
    max?: number;
    /**
     * Predicate function that determines whether or not to retry based on the response.
     * If function returns true, it will retry again (after delay).
     * else, return result.
     */
    when?: (result: any) => boolean;
  };
  delay?: {
    /*
     * Whether to use exponential backoff.
     */
    exponentialBackoff?: boolean;
    /*
     * Whether delay between attempts is randomized.
     */
    jitter?: boolean;
    /*
     * Time in milliseconds to delay each re-invocation.
     */
    initial?: number;
    /*
     * Maximum delay between invocations.
     */
    max?: number;
  };
  /*
   * Function to handle caught error on failure.
   */
  errorHandler?: (error: Error) => any;
  /**
   * The value to use as `this` when calling a given function.
   */
  scope?: any;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

async function retryHelper<T>(
  func: (...args: any[]) => Promise<T> | T,
  args: any[],
  options: RetryOptions,
  attempt: number
): Promise<T | undefined> {
  const { attempts = {}, delay = {}, errorHandler, scope } = options;
  const { max: maxAttempts = 5, when } = attempts;
  const { exponentialBackoff = true, initial = 100, jitter = true, max: maxDelay = Infinity } = delay;
  try {
    const funcResult = func.apply(scope, args);
    if (when && when(funcResult)) throw new Error('Failed given condition');
    return funcResult;
  } catch (err) {
    if (attempt < maxAttempts - 1) {
      if (exponentialBackoff) {
        if (jitter) {
          await sleep(getRandomInt(0, Math.min(maxDelay, initial * 2 ** attempt)));
        } else {
          await sleep(Math.min(maxDelay, initial * 2 ** attempt));
        }
      } else await sleep(initial);
      return retryHelper(func, args, options, attempt + 1);
    } else {
      if (errorHandler) errorHandler(err);
      else throw err;
    }
  }
}

/**
 * Creates a new async function that, when invoked, will invoke the given func.
 * If the given func throws an error or rejects, with-retries will attempt to invoke the function again.
 *
 * @param {function(...args:*):boolean} func - The function to invoke.
 * @param {Object} [options] - Options used to configure how `func` is retried and invoked.
 * @param {Object} [options.delay] - Options used to configure the delay between invocations
 * @param {number} [options.delay.initial=100] - Time in milliseconds to delay each re-invocation.
 * @param {boolean} [options.delay.jitter=true] - Whether delay between attempts is randomized.
 * @param {boolean} [options.delay.exponentialBackoff=true] - Whether to use exponential backoff for the delay between invocations.
 * @param {number} [options.delay.max=Infinity] - Max delay between invocations.
 * @param {Object} [options.attempts] - Options used to configure how many times and when to retry.
 * @param {number} [options.attempts.max=5] - How many times to attempt function upon failure.
 * @param {function(result:*):boolean} [options.attempts.when] - Predicate function that determines whether to retry or not.
 * @param {function(error:*):*} [options.errorHandler] - Function to handle error.
 * @param {object} [options.scope] - The value to use as `this` when calling `func`.
 *
 * @returns Returns async function that, when invoked, will invoke the given func.
 */
export default function withRetries<T>(
  func: (...args: any[]) => Promise<T> | T,
  options: RetryOptions = {}
): (...args: any[]) => Promise<T | undefined> {
  return async function retry(...args: any[]): Promise<T | undefined> {
    return retryHelper(func, args, options, 0);
  };
}
