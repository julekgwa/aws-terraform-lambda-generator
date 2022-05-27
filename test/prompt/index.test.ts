import * as prompt from '../../src/prompt/index'

describe('Given src/prompt/index.ts', () => {
  describe('And parseArgumentsIntoOptions is called', () => {
    it('should return lambda name', () => {
      const res = prompt.parseArgumentsIntoOptions(['--add sfn'])
    })
  })
});
