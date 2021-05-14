const withRetries = (fn: (...fnArg: any[]) => any) => (...args: any[]): any => {
  return fn(...args);
};

export { withRetries };
