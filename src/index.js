import yaml from 'js-yaml'
import fs from 'fs'
import chalk from 'chalk'
import {
  promptLambdaOptions,
  parseArgumentsIntoOptions
} from './prompt/index.js'
import { runTasks } from './tasks/index.js'

export async function cli (args) {
  let options

  try {
    const config = yaml.load(
      await fs.promises.readFile(new URL('../config/default.yml', import.meta.url), {
        encoding: 'utf-8'
      })
    )

    options = parseArgumentsIntoOptions(args)
    options = await promptLambdaOptions(options, config)

    if (options.help) {
      return
    }
    await runTasks(options, config)
    console.log('%s Project ready', chalk.green.bold('DONE'))
  } catch (error) {
    if (options && options.debug) {
      console.log('%s %s', chalk.red.bold('ERROR'), error)
    } else {
      console.log('%s %s', chalk.red.bold('ERROR'), error.message)
    }
  }
  return true
}
