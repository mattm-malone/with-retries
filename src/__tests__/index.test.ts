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

      it('should call the function the default number of maxAttempts', async () => {
        await withRetries(mockFunc)().catch(() => {
          expect(mockFunc).toHaveBeenCalledTimes(5);
        });
      });

      it('should call setTimeout with the default delay', async () => {
        const timeoutSpy = jest.spyOn(global, 'setTimeout');
        await withRetries(mockFunc, { delay: { jitter: false } })().catch(() => {
          expect(timeoutSpy).toHaveBeenCalledTimes(4);
          expect(timeoutSpy).toHaveBeenCalledWith(expect.anything(), 100);
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

      describe('attempts', () => {
        describe('max', () => {
          it('should call the given func the given number of max attempts', async () =>
            await withRetries(mockFunc, { attempts: { max: 2 } })().catch(() => {
              expect(mockFunc).toHaveBeenCalledTimes(2);
            }));
        });

        describe('when', () => {
          it('should retry until "when" function returns false', async () => {
            const lessThanTwo = (res: number) => res < 2;
            mockFunc.mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValueOnce(2);
            await withRetries(mockFunc, { attempts: { when: lessThanTwo } })();
            expect(mockFunc).toHaveBeenCalledTimes(3);
          });
        });
      });

      describe('delay', () => {
        describe('exponentialBackoff', () => {
          it('should increase the delay exponentially', async () => {
            const timeoutSpy = jest.spyOn(global, 'setTimeout');
            await withRetries(mockFunc, {
              delay: { initial: 1, jitter: false },
            })().catch(() => {
              expect(timeoutSpy.mock.calls[0][1]).toEqual(1);
              expect(timeoutSpy.mock.calls[1][1]).toEqual(2);
              expect(timeoutSpy.mock.calls[2][1]).toEqual(4);
              expect(timeoutSpy.mock.calls[3][1]).toEqual(8);
            });
          });

          it('should not use exponential backoff whens set to false', async () => {
            const timeoutSpy = jest.spyOn(global, 'setTimeout');
            await withRetries(mockFunc, {
              delay: { exponentialBackoff: false },
            })().catch(() => {
              timeoutSpy.mock.calls.forEach((call) => {
                expect(call[1]).toEqual(100);
              });
            });
          });
        });

        describe('initial', () => {
          it('should call setTimeout with the specified delay', async () => {
            const timeoutSpy = jest.spyOn(global, 'setTimeout');
            await withRetries(mockFunc, { delay: { initial: 5, jitter: false, exponentialBackoff: false } })().catch(
              () => {
                timeoutSpy.mock.calls.forEach((call) => {
                  expect(call[1]).toEqual(5);
                });
              }
            );
          });
        });

        describe('jitter', () => {
          it('should delay reinvokation randomly between 0 and the backoff value', async () => {
            const timeoutSpy = jest.spyOn(global, 'setTimeout');
            await withRetries(mockFunc, { attempts: { max: 10 }, delay: { initial: 2, jitter: false } })().catch(() => {
              timeoutSpy.mock.calls.forEach((call, index) => {
                expect(call[1]).toBeGreaterThanOrEqual(0);
                expect(call[1]).toBeLessThanOrEqual(2 * 2 ** index);
              });
            });
          });

          it('should not jitter when jitter is set to false', async () => {
            const timeoutSpy = jest.spyOn(global, 'setTimeout');
            await withRetries(mockFunc, {
              delay: { jitter: false },
            })().catch(() => {
              expect(timeoutSpy.mock.calls[0][1]).toEqual(100);
              expect(timeoutSpy.mock.calls[1][1]).toEqual(200);
              expect(timeoutSpy.mock.calls[2][1]).toEqual(400);
              expect(timeoutSpy.mock.calls[3][1]).toEqual(800);
            });
          });
        });

        describe('max', () => {
          it('should delay no longer than the max delay', async () => {
            const timeoutSpy = jest.spyOn(global, 'setTimeout');
            await withRetries(mockFunc, {
              delay: { initial: 1, jitter: false, max: 4 },
            })().catch(() => {
              expect(timeoutSpy.mock.calls[0][1]).toEqual(1);
              expect(timeoutSpy.mock.calls[1][1]).toEqual(2);
              expect(timeoutSpy.mock.calls[2][1]).toEqual(4);
              expect(timeoutSpy.mock.calls[3][1]).toEqual(4);
            });
          });
        });
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
    });
  });
});
