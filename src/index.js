import { green, bold, red } from 'colorette'
import { config } from './helpers/utils.js'
import { promptLambdaOptions, parseArgumentsIntoOptions } from './prompt/index.js'
import { runTasks } from './tasks/index.js'

export async function cli (args) {
  let options

  try {
    options = parseArgumentsIntoOptions(args)
    options = await promptLambdaOptions(options, config)

    if (options.help) {
      return
    }
    await runTasks(options, config)
    console.log('%s Project ready', bold(green(('DONE'))))
  } catch (error) {
    if (options && options.debug) {
      console.log('%s %s', bold(red(('ERROR'))), error)
    } else {
      console.log('%s %s', bold(red(('ERROR'))), error.message)
    }
  }
  return true
}
