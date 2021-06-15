export interface RetryOptions {
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
   * if false: return result
   * else retry
   */
  when?: (result: any) => boolean;
}

const checkCondition = (result: any, when: ((result: any) => boolean) | undefined) => {
  if (result instanceof Error) return result;
  else if (when && when(result)) throw new Error('Failed');
  else return result;
};

export default function withRetries<T>(
  func: (...params: any[]) => T,
  options?: RetryOptions
): (...args: any[]) => Promise<T>;
export default function withRetries<T>(
  func: (...params: any[]) => Promise<T>,
  { scope, maxAttempts = 3, delay = 500, when }: RetryOptions = {
    maxAttempts: 3,
    delay: 500,
  }
): (...args: any[]) => Promise<T | undefined> {
  return async function retry(...args: any[]): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      let attempt = 1;
      const handleErr = (err: any) => {
        if (attempt < maxAttempts) {
          attempt += 1;
          setTimeout(applied, delay);
        } else reject(err);
      };

      const applied = () =>
        new Promise((resolve, reject) => {
          try {
            const result = func.apply(scope, args);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        })
          .then((res) => checkCondition(res, when))
          .then(resolve)
          .catch(handleErr);
      return applied();
    });
    // for (let i = 0; i < maxAttempts; i++) {
    //   try {
    //     const funcResult = func.apply(scope, args);
    //     if (when && when(funcResult)) throw new Error('Failed');
    //     return funcResult;
    //   } catch (err) {
    //     if (i < maxAttempts - 1) await sleep(delay);
    //     else throw err;
    //   }
    // }
  };
}
