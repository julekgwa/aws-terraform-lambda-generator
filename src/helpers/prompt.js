import inquirer from 'inquirer'
import { isInProjectRoot, validateInput } from './utils.js'

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

export async function promptLambdaOptions (options) {
  if (!isInProjectRoot()) {
    const projectQuestions = [PROJECT_OPTIONS]
    const newProjectAnswer = await inquirer.prompt(projectQuestions)

    if (
      newProjectAnswer.create_project &&
      newProjectAnswer.create_project.toLowerCase() === 'y'
    ) {
      QUESTIONS.push(NEW_PROJECT_OPTIONS)
    } else {
      console.log('You must be in a project directory to add a lambda.')
      process.exit(1)
    }
  }

  if (!options.lambda) {
    QUESTIONS.push(LAMBDA_OPTIONS)
  }

  const answers = await inquirer.prompt(QUESTIONS)

  return {
    ...options,
    lambda: options.lambda || answers.name,
    projectName: options.projectName || answers.project_name
  }
}
