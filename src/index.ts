import { green, bold, red } from 'colorette'
import { config } from './helpers/utils'
import { promptLambdaOptions, parseArgumentsIntoOptions } from './prompt/index'
import { runTasks } from './tasks/index'

export async function cli (args: string[]) {
  let debug

  try {
    const opt = parseArgumentsIntoOptions(args)
    const options = await promptLambdaOptions(opt, config)


    if (options.help) {
      return
    }
    await runTasks(options, config)
    console.log('%s Project ready', bold(green(('DONE'))))
  } catch (error: any) {
    if (debug) {
      console.log('%s %s', bold(red(('ERROR'))), error)
    } else {
      console.log('%s %s', bold(red(('ERROR'))), error.message)
    }
  }
  return true
}
