import { cli } from '../src/index.js'

describe('Given cli', () => {
  test('should expose the cli function', () => {
    expect(typeof cli).toBe('function')
  })
})
