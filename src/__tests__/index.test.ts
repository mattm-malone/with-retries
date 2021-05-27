import withRetries from '../index';
import sleep from '../utils/sleep';

jest.mock('../utils/sleep');

describe('withRetries', () => {
  const mockFunc = jest.fn();
  const mockedSleep = sleep as jest.Mocked<typeof sleep>;

  beforeEach(() => {
    mockFunc.mockReturnValue('there');
    (mockedSleep as jest.Mock).mockImplementation(async () => 'i sleep');
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

      it('should call the function the default number of retries', async () =>
        await withRetries(mockFunc)().catch(() => {
          expect(mockFunc).toHaveBeenCalledTimes(3);
        }));

      it('should wait the default of 500ms between each call', async () =>
        withRetries(mockFunc)().catch(() => {
          expect(mockedSleep).toHaveBeenCalledTimes(2);
          expect(mockedSleep).toHaveBeenCalledWith(500);
        }));
    });
  });
});
