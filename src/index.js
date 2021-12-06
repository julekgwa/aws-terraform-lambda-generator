import { promptLambdaOptions } from './helpers/prompt.js'
import { runTasks } from './helpers/tasks.js'
import { parseArgumentsIntoOptions } from './helpers/utils.js'

export async function cli (args) {
  let options = parseArgumentsIntoOptions(args)
  options = await promptLambdaOptions(options)

  await runTasks(options)
}
