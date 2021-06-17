import withRetries from '../index';
import 'jest-extended';

describe('withRetries', () => {
  const mockFunc = jest.fn();

  beforeEach(() => {
    mockFunc.mockReturnValue('there');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an async function', async () =>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    expect(await withRetries(mockFunc)).toStrictEqual(expect.any(Object.getPrototypeOf(async () => {}).constructor)));

  describe('invoking the function', () => {
    it('should call the provided function with the provided args', async () => {
      await withRetries(mockFunc)('hello', 1, true);

      expect(mockFunc).toHaveBeenCalledTimes(1);
      expect(mockFunc).toHaveBeenCalledWith('hello', 1, true);
    });

    it('should return the result of the provided function', async () =>
      expect(await withRetries(mockFunc)('hello')).toEqual('there'));

    describe('when the provided function fails', () => {
      beforeEach(() => {
        mockFunc.mockImplementation(() => {
          throw new Error('error :(');
        });
      });

      it('should call the function the default number of maxAttempts', async () =>
        await withRetries(mockFunc)().catch(() => {
          expect(mockFunc).toHaveBeenCalledTimes(3);
        }));

      it('should call setTimeout', async () => {
        const timeoutSpy = jest.spyOn(global, 'setTimeout');
        await withRetries(mockFunc)().catch(() => {
          expect(timeoutSpy).toHaveBeenCalledTimes(2);
          expect(timeoutSpy).toHaveBeenCalledWith(expect.anything(), 500);
        });
      });
    });

    describe('options', () => {
      const error = new Error('error :(');
      beforeEach(() => {
        mockFunc.mockImplementation(() => {
          throw error;
        });
      });
      describe('when', () => {
        it('should retry until "when" function returns false', async () => {
          const lessThanTwo = (res: number) => res < 2;
          mockFunc.mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValueOnce(2);
          await withRetries(mockFunc, { when: lessThanTwo })();
          expect(mockFunc).toHaveBeenCalledTimes(3);
        });
      });

      describe('scope', () => {
        it('should apply scope to provided function if passed in', async () => {
          const scope = { func: jest.fn().mockName('scope.func') };
          jest.spyOn(scope.func, 'apply').mockName('scope.func.apply');

          await withRetries(scope.func, { scope })();

          expect(scope.func.apply).toHaveBeenCalledTimes(1);
          expect(scope.func.apply).toHaveBeenCalledWith(scope, []);
        });

        it('should NOT apply scope to provided function if not passed in', async () => {
          const scope = { func: jest.fn().mockName('scope.func') };
          jest.spyOn(scope.func, 'apply').mockName('scope.func.apply');

          await withRetries(scope.func)();

          expect(scope.func.apply).toHaveBeenCalledTimes(1);
          expect(scope.func.apply).toHaveBeenCalledWith(undefined, []);
        });
      });

      describe('delay', () => {
        it('should call setTimeout with the specified delay', async () => {
          const timeoutSpy = jest.spyOn(global, 'setTimeout');
          await withRetries(mockFunc, { delay: 5 })().catch(() => {
            expect(timeoutSpy).toHaveBeenCalledTimes(2);
            expect(timeoutSpy).toHaveBeenCalledWith(expect.anything(), 5);
          });
        });
      });

      describe('maxAttempts', () => {
        it('should call the given func the given number of maxAttempts', async () =>
          await withRetries(mockFunc, { maxAttempts: 2 })().catch(() => {
            expect(mockFunc).toHaveBeenCalledTimes(2);
          }));
      });

      describe('errorHandler', () => {
        it('should call the given errorHandler function with the thrown error', async () => {
          const errorHandler = jest.fn().mockImplementation((err) => {
            throw err;
          });
          await withRetries(mockFunc, { errorHandler })().catch(() => {
            expect(errorHandler).toHaveBeenCalledTimes(1);
            expect(errorHandler).toHaveBeenCalledWith(error);
          });
        });

        it('should throw a custom error if errorHandler throws a custom error', async () => {
          const customError = new Error('customError');
          const errorHandler = jest.fn().mockImplementation(() => {
            throw customError;
          });
          await withRetries(mockFunc, { errorHandler })().catch((err) => {
            expect(err).toEqual(customError);
          });
        });

        it('should not throw an error if errorHandler does not throw an error.', async () => {
          const errorHandler = jest.fn();
          await expect(withRetries(mockFunc, { errorHandler })()).not.toReject();
          expect(errorHandler).toHaveBeenCalledTimes(1);
          expect(errorHandler).toHaveBeenCalledWith(error);
        });
      });
    });
  });
});
