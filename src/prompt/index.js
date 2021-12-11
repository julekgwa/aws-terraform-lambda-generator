import path from 'path'
import {
  lambdaQuestion,
  newProjectQuestions,
  organiseLambdas,
  stateMachineQuestions
} from './questions.js'
import { isInProjectRoot } from '../helpers/utils.js'
import chalk from 'chalk'
import arg from 'arg'

const DIRECTORY_NAME = path.basename(path.resolve(''))

export async function promptLambdaOptions (options, config) {
  let answers

  switch (true) {
    case options.help:
      console.log(config.help)
      process.exit(1)
    case options.new && !isInProjectRoot() && !options.sfn:
      answers = await newProjectQuestions(config)
      break
    case options.org:
      answers = await organiseLambdas()
      break
    case options.sfn:
      answers = await stateMachineQuestions(options)
      break
    default:
      answers = await lambdaQuestion(config)
  }

  return {
    ...options,
    lambda: options.lambda || answers.name,
    projectName: options.projectName || answers.project || DIRECTORY_NAME,
    region: options.region || answers.region || config.aws.region,
    currentProjectDir: !!isInProjectRoot(),
    sfnList: answers.sfn || []
  }
}

export function parseArgumentsIntoOptions (rawArgs) {
  try {
    const args = arg(
      {
        '--add': String,
        '--remove': String,
        '--dir': String,
        '--new': String,
        '--help': Boolean,
        '--org': Boolean,
        '--debug': Boolean,
        '-a': '--add',
        '-r': '--remove',
        '-d': '--dir',
        '-n': '--new',
        '-h': '--help',
        '-o': '--org'
      },
      {
        argv: rawArgs.slice(2)
      }
    )

    return {
      lambda: args['--add'],
      remove: args['--remove'],
      projectName: args['--new'],
      skipPrompts: args['--add'],
      targetDir: args['--dir'],
      sfn: args['--add']?.toLowerCase() === 'sfn',
      new: args['--new'],
      help: args['--help'],
      org: args['--org'],
      debug: args['--debug']
    }
  } catch (error) {
    console.log(`%s: ${error.message}`, chalk.red.bold('ERROR'))
    process.exit(1)
  }
}
