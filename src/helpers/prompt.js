import inquirer from 'inquirer'
import { getDirectories, isInProjectRoot, validateInput } from './utils.js'
import path from 'path'
import chalk from 'chalk'

const DIRECTORY_NAME = path.basename(path.resolve(''))
const QUESTIONS = []

const LAMBDA_OPTIONS = {
  type: 'input',
  name: 'name',
  message: 'What is the name of your lambda?',
  validate: validateInput
}

const REGION_OPTIONS = {
  type: 'input',
  name: 'region',
  message: 'What is the region of your lambda?'
}

async function stateMachineQuestions (options) {
  if (options.sfn && !isInProjectRoot()) {
    console.log(
      '%s: You must be in a project directory to create state machine',
      chalk.red.bold('ERROR')
    )
    process.exit(1)
  } else if (!options.sfn) {
    return []
  }
  const sfns = await getDirectories(process.cwd() + '/packages')

  const choices = []

  for (const sfn of sfns) {
    choices.push(sfn)
    choices.push(new inquirer.Separator(' = Task = '))
  }

  return choices
}

export async function promptLambdaOptions (options, config) {
  if (options.new && !isInProjectRoot() && !options.sfn) {
    REGION_OPTIONS.default = config.aws.region
    QUESTIONS.push(REGION_OPTIONS)
  }

  if (!options.lambda) {
    QUESTIONS.push(LAMBDA_OPTIONS)
  }

  const choices = await stateMachineQuestions(options)

  if (choices.length) {
    QUESTIONS.push({
      type: 'checkbox',
      name: 'sfn',
      message: 'Which lambda do you want to add to a state machine?',
      choices
    })
  }

  const answers = await inquirer.prompt(QUESTIONS)

  return {
    ...options,
    lambda: options.lambda || answers.name,
    projectName: options.projectName || answers.project_name || DIRECTORY_NAME,
    region: options.region || answers.region || config.aws.region,
    currentProjectDir: !!isInProjectRoot(),
    sfnList: answers.sfn || []
  }
}
