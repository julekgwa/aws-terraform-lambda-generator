import { promptLambdaOptions } from './helpers/prompt.js'
import { runTasks } from './helpers/tasks.js'
import { parseArgumentsIntoOptions } from './helpers/utils.js'
import yaml from 'js-yaml'
import fs from 'fs'
import chalk from 'chalk'

export async function cli (args) {
  const config = yaml.load(fs.readFileSync(new URL('../config/default.yml', import.meta.url), { encoding: 'utf-8' }))

  let options = parseArgumentsIntoOptions(args, config)
  options = await promptLambdaOptions(options, config)

  await runTasks(options, config)
  console.log('%s Project ready', chalk.green.bold('DONE'))
  return true
}
