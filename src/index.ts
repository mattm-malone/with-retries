import RetryOptions from './types/options';

export function withRetries<T>(func: (...params: any[]) => T, options?: RetryOptions) : (...args: any[]) => T
export function withRetries<T>(
    func: (...params: any[]) => Promise<T> | T,
    { scope, maxRetries = 3, delay = 500 }: RetryOptions = {
      maxRetries: 3, delay: 500
    }
): (...args: any[]) => T | Promise<T> {
  return (...args: any[]) => {
    const resultingFunction = func.apply(scope, args);
    // if (!resultingFunction || !resultingFunction.then) return resultingFunction;
    return resultingFunction;
  }
}

