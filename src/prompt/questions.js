import fs from 'fs'
import { getDirectories, isInProjectRoot, validateInput } from '../helpers/utils.js'
import enquirer from 'enquirer'
import { addLambdaToSfn } from '../sfn/index.js'

export const lambdaQuestion = async (config, options) => {
  const regionTfScript = `${process.cwd()}/terraform/variables.tf`
  const lambdaRegion = {
    type: 'input',
    name: 'region',
    message: 'Lambda region:',
    initial: config.aws.region
  }
  const lambdaName = {
    type: 'input',
    name: 'name',
    message: 'Lambda name:',
    validate: validateInput
  }

  const questions = []

  if (!options.lambda) {
    questions.push(lambdaName)
  }

  if (!fs.existsSync(regionTfScript)) {
    questions.push(lambdaRegion)
  }

  if (!questions.length) {
    return options
  }

  const prompt = new enquirer.Form({
    name: 'user',
    message: 'Please provide the following information:',
    choices: questions
  })

  return prompt.run(questions)
}

export const stateMachineQuestions = async (options) => {
  if (options.sfn && !isInProjectRoot()) {
    throw new Error(
      'You must be in a project directory to create state machine'
    )
  } else if (!options.sfn) {
    return []
  }
  const sfns = await getDirectories(`${process.cwd()}/packages`)

  if (sfns.length) {
    return {
      sfn: await addLambdaToSfn(
        undefined,
        'Which lambda would you like to add to the state machine?',
        sfns,
        sfns
      )
    }
  }
  return {}
}

export const organiseLambdas = async () => {
  return {
    project: await new enquirer.Input({
      name: 'project',
      message: 'What is the name of your project?'
    }).run()
  }
}

export const newProjectQuestions = async (config) => {
  let answers = await enquirer.prompt([
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
    const lambda = await enquirer.prompt([
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
