import chalk from 'chalk'
import fs from 'fs'
import inquirer from 'inquirer'
import { getDirectories, isInProjectRoot, validateInput } from '../helpers/utils.js'

export const lambdaQuestion = async (config) => {
  const regionTfScript = `${process.cwd()}/terraform/variables.tf`
  const lambdaRegion = {
    type: 'input',
    name: 'region',
    message: 'What is the region of your lambda?',
    default: config.aws.region
  }
  const lambdaName = {
    type: 'input',
    name: 'name',
    message: 'What is the name of your lambda?',
    validate: validateInput
  }

  const questions = [lambdaName]

  if (!fs.existsSync(regionTfScript)) {
    questions.push(lambdaRegion)
  }

  return inquirer.prompt(questions)
}

export const stateMachineQuestions = async (options) => {
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

  return choices.length
    ? inquirer.prompt([{
      type: 'checkbox',
      name: 'sfn',
      message: 'Which lambda do you want to add to a state machine?',
      choices
    }])
    : {}
}

export const organiseLambdas = async () => {
  return inquirer.prompt([{
    type: 'input',
    name: 'project',
    message: 'What is the name of your project?'
  }])
}

export const newProjectQuestions = async (config) => {
  let answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addLambda',
      message: 'Do you want to a lambda to your project right now?',
      validate: validateInput
    },
    {
      type: 'input',
      name: 'region',
      message: 'What is the region of your lambda?',
      default: config.aws.region
    }
  ])

  if (answers.addLambda) {
    const lambda = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of your lambda?',
        validate: validateInput
      }
    ])

    answers = { ...answers, ...lambda }
  }

  return answers
}
