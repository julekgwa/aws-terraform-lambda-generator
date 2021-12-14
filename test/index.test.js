const { cli } = require('../src/index')

describe('Given cli', () => {
  test('should expose the cli function', () => {
    expect(typeof cli).toBe('function')
  })
})
