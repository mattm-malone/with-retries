import withRetries from '../index';

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

  describe('invoking the function', () => {
    it('should call the provided function with the provided args', async () => {
      await withRetries(mockFunc)('hello', 1, true);

      expect(mockFunc).toHaveBeenCalledTimes(1);
      expect(mockFunc).toHaveBeenCalledWith('hello', 1, true);
    });

    it('should return the result of the provided function', async () =>
      expect(await withRetries(mockFunc)('hello')).toEqual('there'));

    describe('when the provided function continuously fails', () => {
      beforeEach(() => {
        mockFunc.mockImplementation(() => {
          throw new Error('error :(');
        });
      });

      it('should call the function the default number of maxAttempts', async () =>
        await withRetries(mockFunc)().catch(() => {
          expect(mockFunc).toHaveBeenCalledTimes(3);
        }));
    });

    describe('when fail conditon is given', () => {
      it('should retry until condition is false', async () => {
        const condition = (res: number) => res < 1;
        mockFunc.mockReturnValueOnce(0).mockReturnValueOnce(1);
        await withRetries(mockFunc, { when: condition })();
        expect(mockFunc).toHaveBeenCalledTimes(2);
      });
    });
  });
});
