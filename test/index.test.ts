import {cli} from '../src/index';

describe.only('Given cli', () => {
  test('should expose the cli function', () => {
    expect(typeof cli).toBe('function');
  });
});
