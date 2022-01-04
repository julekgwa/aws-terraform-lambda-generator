import { jest } from '@jest/globals'
import { promptLambdaOptions } from '../../src/prompt'

describe('Given prompt/index.js ', () => {
  let log

  beforeEach(() => {
    log = jest.spyOn(global.console, 'log')
  })

  describe('And promptLambdaOptions is called', () => {
    describe('And help flag is passed in the options', () => {
      it('should display help text on the console', async () => {
        await promptLambdaOptions({ help: true }, { help: 'test', aws: { region: 'test' } })
        expect(console.log).toBeCalled()
      })
    })
  })

  afterEach(() => {
    log.mockRestore()
  })
})
