import enquirer from 'enquirer'
import { green, underline, dim } from 'colorette'

import { confirm, input, invisibleInput, select } from './form.js'
import { createStateMachineJSON, isJSON } from '../helpers/utils.js'

const retrierTemplate = `{
  "ErrorEquals": [ "{{error}}" ],
  "IntervalSeconds": "{{intervalSeconds}}",
  "MaxAttempts": "{{maxAttempts}}",
  "BackoffRate": "{{backoffRate}}"
}`

const catcherTemplate = `{
  "ErrorEquals": [ "{{error}}" ],
  "Next": "{{next}}",
  "ResultPath": "{{resultPath}}"
}`

const states = [
  'Task',
  'Parallel',
  'Map',
  'Pass',
  'Wait',
  'Choice',
  'Succeed',
  'Fail'
]

const STATE_TYPES = {
  task: 'Task',
  parallel: 'Parallel',
  map: 'Map',
  pass: 'Pass',
  wait: 'Wait',
  choice: 'Choice',
  succeed: 'Succeed',
  fail: 'Fail'
}

async function addErrorHandler (type = 'Retry', initial = false) {
  const retries = []
  const retry = await new enquirer.Snippet({
    name: 'retry',
    message: `Fill out the fields for ${type}`,
    values: {
      resultPath: 'optional',
      error: 'States.ALL',
      intervalSeconds: 'optional',
      maxAttempts: 'optional',
      backoffRate: 'optional'
    },
    template: type === 'Retry' ? retrierTemplate : catcherTemplate
  }).run()

  const addRetry = await new enquirer.Confirm({
    name: 'error',
    message: `Do you want to add another ${type}?`,
    default: initial
  }).run()

  retries.push(retry.result)
  if (addRetry) {
    return retries.concat(await addErrorHandler(type, initial))
  }

  return retries
}

async function addChoice (lambdas) {
  const choices = []

  const answers = await new enquirer.Form({
    name: 'choice',
    message: 'Please review your changes',
    choices: [
      input(
        'condition',
        'Choices (Required)',
        '',
        '',
        isJSON,
        (res) => res,
        true
      ),
      select('nextState', 'Select next state', [...lambdas, 'End']),
      confirm('addChoice', 'Do you want to another choice?', false)
    ]
  }).run()

  choices.push({
    ...JSON.parse(answers.condition),
    Next: answers.nextState
  })

  if (answers.addChoice === 'true') {
    return choices.concat(await addChoice(lambdas))
  }

  return choices
}

async function addStates (lambdas, stepFn, stateType, nextStates) {
  const branches = {}
  let choice
  const choices = [
    invisibleInput('name', 'Step function name', stepFn),
    invisibleInput('stateType', 'Lambda state type', stateType)
  ]

  if (![STATE_TYPES.succeed, STATE_TYPES.fail].includes(stateType)) {
    choices.push(
      input('Comment', 'Comment (Optional)', ''),
      input('InputPath', 'InputPath (Optional)', ''),
      input('OutputPath', 'OutputPath (Optional)', '')
    )
  }

  if (stateType === STATE_TYPES.choice) {
    choices.push(
      select(
        'default',
        'Select default state (Optional, Recommended)',
        nextStates.filter((lamb) => lamb !== stepFn)
      )
    )
  }

  if (
    ![
      STATE_TYPES.wait,
      STATE_TYPES.choice,
      STATE_TYPES.succeed,
      STATE_TYPES.fail
    ].includes(stateType)
  ) {
    choices.push(
      input('ResultPath', 'ResultPath (Optional)', ''),
      input('Parameters', 'Parameters (Optional)', '')
    )
  }

  if (stateType === STATE_TYPES.wait) {
    choices.push(
      select('wait', 'Select wait field', [
        'Seconds',
        'Timestamp',
        'SecondsPath',
        'TimestampPath'
      ])
    )
    choices.push(
      input(
        'waitTime',
        'Enter wait time',
        '',
        'e.g 2016-08-18T17:33:00Z for Timestamp',
        () => true,
        (res) => res,
        true
      )
    )
  }

  if (
    [STATE_TYPES.task, STATE_TYPES.parallel, STATE_TYPES.map].includes(
      stateType
    )
  ) {
    choices.push(
      input('ResultSelector', 'ResultSelector (Optional)', ''),
      confirm('Retry', 'Do you want to add a retrier?', false, 'Retry'),
      confirm('Catch', 'Do you want to add a catcher?', false, 'Catch')
    )
  }

  if (stateType === STATE_TYPES.pass) {
    choices.push(input('Result', 'Result (Optional)', ''))
  }

  if (
    ![STATE_TYPES.choice, STATE_TYPES.succeed, STATE_TYPES.fail].includes(
      stateType
    )
  ) {
    choices.push(
      select(
        'next',
        'What is your next state lambda?',
        [...nextStates.filter((lamb) => lamb !== stepFn), 'End']
      )
    )
  }

  if (stateType === STATE_TYPES.fail) {
    choices.push(
      input('Cause', 'Cause (Optional)', ''),
      input('Error', 'Error (Optional)', '')
    )
  }

  const form = await new enquirer.Form({
    name: 'task',
    message: 'Please review your answers:',
    choices
  }).run()

  if (form.Retry === 'true') {
    form.Retry = await addErrorHandler('Retry', false)
  }

  if (form.Catch === 'true') {
    form.Catch = await addErrorHandler('Catch', false)
  }

  if (stateType === STATE_TYPES.parallel || stateType === STATE_TYPES.map) {
    const message =
      stateType === STATE_TYPES.parallel
        ? 'Add lambda to Parallel branch'
        : 'Add lambda to Map Iterator'
    const type = STATE_TYPES.parallel === stateType ? 'Branches' : 'Iterator'

    branches[type] = await addLambdaToSfn(
      undefined,
      underline(green(message)),
      lambdas,
      nextStates
    )

    if (STATE_TYPES.parallel === stateType) {
      branches[type] = branches[type].map((item) =>
        createStateMachineJSON([item])
      )
    } else {
      branches[type] = createStateMachineJSON(branches[type])
    }
  }

  if (stateType === STATE_TYPES.choice) {
    choice = await addChoice(nextStates)
  }

  if (stateType === STATE_TYPES.wait) {
    form[form.wait] =
      form.wait !== 'Timestamp' ? Number(form.waitTime) : form.waitTime
    delete form.wait
    delete form.waitTime
  }

  return { ...form, ...branches, Choices: choice }
}

export async function addLambdaToSfn (
  nextLab,
  message,
  lambdas,
  next
) {
  let answer
  const stateAnswers = []
  const choices = [
    ...lambdas,
    { role: 'separator', value: dim('────') },
    {
      name: 'Done',
      message: 'Done'
    }
  ]

  if (!lambdas.length) return stateAnswers

  const lambdaQ = {
    type: 'select',
    name: 'lambda',
    message: message,
    choices: choices.filter((choice) => choice !== nextLab)
  }

  const stateTypeQ = {
    type: 'select',
    name: 'type',
    message: 'Choose a state type',
    choices: states
  }

  const lambda = await enquirer.prompt(lambdaQ)

  if (lambda.lambda === 'Done') {
    return stateAnswers
  }

  const stateType = await enquirer.prompt(stateTypeQ)

  switch (stateType.type) {
    case STATE_TYPES.parallel:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.parallel,
        next
      )
      break
    case STATE_TYPES.map:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.map,
        next
      )
      break
    case STATE_TYPES.pass:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.pass,
        next
      )
      break
    case STATE_TYPES.wait:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.wait,
        next
      )
      break
    case STATE_TYPES.succeed:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.succeed,
        next
      )
      break
    case STATE_TYPES.fail:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.fail,
        next
      )
      break
    case STATE_TYPES.choice:
      answer = await addStates(
        lambdas.filter((lb) => lb !== lambda.lambda),
        lambda.lambda,
        STATE_TYPES.choice,
        next
      )
      break
    default:
      answer = await addStates(choices, lambda.lambda, STATE_TYPES.task, next)
  }

  const availableLambdas = choices.filter((lamb) => lamb !== answer.name)

  if (availableLambdas.length) {
    availableLambdas.splice(-2, 2)
    stateAnswers.push(answer)
    return stateAnswers.concat(
      await addLambdaToSfn(answer.name, message, availableLambdas, next)
    )
  }
  answer.next = 'End'
  stateAnswers.push(answer)

  return stateAnswers
}
