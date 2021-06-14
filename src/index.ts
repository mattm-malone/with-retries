import RetryOptions from './types/options';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function withRetries<T>(
  func: (...params: any[]) => T,
  options?: RetryOptions
): (...args: any[]) => Promise<T>;
export default function withRetries<T>(
  func: (...params: any[]) => Promise<T>,
  { scope, attempts = 3, delay = 500 }: RetryOptions = {
    attempts: 3,
    delay: 500,
  }
): (...args: any[]) => Promise<T | undefined> {
  return async function retry(...args: any[]): Promise<T | undefined> {
    for (let i = 0; i < attempts; i++) {
      try {
        const funcResult = func.apply(scope, args);
        return funcResult;
      } catch (err) {
        if (i < attempts - 1) await sleep(delay);
        else throw err;
      }
    }
  };
}
