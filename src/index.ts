import RetryOptions from './types/options';
import sleep from './utils/sleep.js';

export default function withRetries<T>(
  func: (...params: any[]) => T,
  options?: RetryOptions
): (...args: any[]) => Promise<T>;
export default function withRetries<T>(
  func: (...params: any[]) => Promise<T>,
  { scope, maxRetries = 3, delay = 500 }: RetryOptions = {
    maxRetries: 3,
    delay: 500,
  }
): (...args: any[]) => Promise<T | undefined> {
  return async function retry(...args: any[]): Promise<T | undefined> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const funcResult = func.apply(scope, args);
        // if (!resultingFunction || !resultingFunction.then) return resultingFunction;
        return funcResult;
      } catch (err) {
        if (i < maxRetries - 1) await sleep(delay);
        else throw err;
      }
    }
  };
}
