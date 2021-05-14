import { withRetries } from '../index';

describe('withRetries', () => {
  const mockFunc = jest.fn().mockReturnValue('there');

  it('should call the provided function with the provided args', () => {
    withRetries(mockFunc)('hello');

    expect(mockFunc).toHaveBeenCalledTimes(1);
    expect(mockFunc).toHaveBeenCalledWith('hello');
  });

  it('should return the result of the provided function', () => {
    expect(withRetries(mockFunc)('hello')).toEqual('there');
  });
});
