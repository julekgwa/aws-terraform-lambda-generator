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

const NEW_PROJECT_OPTIONS = {
  type: 'input',
  name: 'project_name',
  message: 'What is the name of your project?',
  validate: validateInput
}

const PROJECT_OPTIONS = {
  type: 'boolean',
  name: 'create_project',
  message: 'You\'re not in a project directory. Do you want to create a new project? Y/N',
  validate: validateInput
}

const REGION_OPTIONS = {
  type: 'input',
  name: 'region',
  message: 'What is the region of your lambda?'
}

export async function promptLambdaOptions (options, config) {
  if (!isInProjectRoot() && !options.sfn) {
    const projectQuestions = [PROJECT_OPTIONS]
    const newProjectAnswer = await inquirer.prompt(projectQuestions)

    if (
      newProjectAnswer.create_project &&
      newProjectAnswer.create_project.toLowerCase() === 'y'
    ) {
      REGION_OPTIONS.default = config.aws.region
      QUESTIONS.push(NEW_PROJECT_OPTIONS)
      QUESTIONS.push(REGION_OPTIONS)
    } else {
      console.log('You must be in a project directory to add a lambda.')
      process.exit(1)
    }
  }

  if (!options.lambda) {
    QUESTIONS.push(LAMBDA_OPTIONS)
  }

  if (options.sfn) {
    if (!isInProjectRoot()) {
      console.log('%s: You must be in a project directory to create state machine', chalk.red.bold('ERROR'))
      process.exit(1)
    }

    const sfns = await getDirectories(process.cwd() + '/packages')

    const choices = []

    for (const sfn of sfns) {
      choices.push(sfn)
      choices.push(new inquirer.Separator(' = Task = '))
    }

    if (choices.length) {
      QUESTIONS.push({
        type: 'checkbox',
        name: 'sfn',
        message: 'Which lambda do you want to add to a state machine?',
        choices
      })
    }
  }

  const answers = await inquirer.prompt(QUESTIONS)

  return {
    ...options,
    lambda: options.lambda || answers.name,
    projectName: options.projectName || answers.project_name || DIRECTORY_NAME,
    region: options.region || answers.region,
    currentProjectDir: !!isInProjectRoot(),
    sfnList: answers.sfn || []
  }
}
