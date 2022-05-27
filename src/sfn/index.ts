import enquirer from 'enquirer';
import {green, underline, dim, yellow} from 'colorette';

import {confirm, input, invisibleInput, select, addErrorHandler} from './form.js';
import {createStateMachineJSON, isJSON, validateInput} from '../helpers/utils.js';
import { LooseObject} from '../types/types'

const states = [
  'Task',
  'Parallel',
  'Map',
  'Pass',
  'Wait',
  'Choice',
  'Succeed',
  'Fail'
];

const STATE_TYPES = {
  task: 'Task',
  parallel: 'Parallel',
  map: 'Map',
  pass: 'Pass',
  wait: 'Wait',
  choice: 'Choice',
  succeed: 'Succeed',
  fail: 'Fail'
};

async function addChoice(lambdas: string[]) : Promise<LooseObject> {
  const choices: LooseObject = [];

  // @ts-ignore
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
          (res: string) => res,
          true
      ),
      select('nextState', 'Select next state', [...lambdas, 'End']),
      confirm('addChoice', 'Do you want to another choice?', false)
    ]
  }).run();

  choices.push({
    ...JSON.parse(answers.condition),
    Next: answers.nextState
  });

  if (answers.addChoice === 'true') {
    return choices.concat(await addChoice(lambdas));
  }

  return choices;
}

function getQuestions(stepFn: string, stateType: string) {
  const choices = [
    invisibleInput('name', 'Step function name', stepFn),
    invisibleInput('stateType', 'Lambda state type', stateType),
    input('Comment', 'Comment (Optional)', ''),
    input('InputPath', 'InputPath (Optional)', ''),
    input('OutputPath', 'OutputPath (Optional)', ''),
    input('ResultPath', 'ResultPath (Optional)', ''),
    input('Parameters', 'Parameters (Optional)', ''),
    input('ResultSelector', 'ResultSelector (Optional)', ''),
    confirm('Retry', 'Do you want to add a retrier?', false, 'Retry'),
    confirm('Catch', 'Do you want to add a catcher?', false, 'Catch')
  ];

  let removeQ;
  const start = 0;
  const pass = 3;
  const wait = 5;
  const fail = 7;

  switch (true) {
    case stateType === STATE_TYPES.pass:
      removeQ = choices.length - pass;
      break;
    case stateType === STATE_TYPES.wait:
    case stateType === STATE_TYPES.choice:
    case stateType === STATE_TYPES.succeed:
      removeQ = choices.length - wait;
      break;
    case stateType === STATE_TYPES.fail:
      removeQ = choices.length - fail;
      break;
    default:
      removeQ = choices.length;
  }

  return choices.slice(start, removeQ);
}

async function addStates(lambdas: any[], stepFn: string, stateType: string, nextStates: string[], isMap?: boolean) {
  let choice;
  const branches: LooseObject = {};
  const choices = getQuestions(stepFn, stateType);

  if (!isMap && ![STATE_TYPES.choice, STATE_TYPES.succeed, STATE_TYPES.fail].includes(stateType)) {
    choices.push(input('next', 'What is your next state lambda?', '', '', validateInput, (res: string) => res, true));
  }
  // @ts-ignore
  const form = await new enquirer.Form({
    name: 'task',
    message: 'Please review your answers:',
    choices
  }).run();

  if (stateType === STATE_TYPES.choice) {
    choice = await addChoice(nextStates);
  }

  if (stateType === STATE_TYPES.wait) {
    form[form.wait] =
      form.wait !== 'Timestamp' ? Number(form.waitTime) : form.waitTime;
    delete form.wait;
    delete form.waitTime;
  }

  if (form.Retry === 'true') {
    form.Retry = await addErrorHandler('Retry', false);
  }

  if (form.Catch === 'true') {
    form.Catch = await addErrorHandler('Catch', false);
  }

  if (stateType === STATE_TYPES.parallel || stateType === STATE_TYPES.map) {
    const message =
      stateType === STATE_TYPES.parallel ?
        'Add lambda to Parallel branch' :
        'Add lambda to Map Iterator';
    const type: string = STATE_TYPES.parallel === stateType ? 'Branches' : 'Iterator';

    branches[type] = await addLambdaToSfn(
        undefined,
        underline(green(message)),
        lambdas,
        nextStates,
        STATE_TYPES.map === stateType
    );

    if (STATE_TYPES.parallel === stateType) {
      branches[type] = branches[type].map((item: LooseObject) =>
        createStateMachineJSON([item])
      );
    } else {
      branches[type] = createStateMachineJSON(branches[type]);
    }
  }

  return {...form, ...branches, Choices: choice};
}

function getStateQ(
    type: string,
    message: string,
    choices: any[],
    nextLab: string | undefined
) {
  return type === STATE_TYPES.task ?
    {
      type: 'select',
      name: 'lambda',
      message: message,
      choices: choices.filter((choice) => choice !== nextLab)
    } :
    {
      name: 'lambda',
      type: 'input',
      message: 'State name',
      required: true,
      hint: 'e.g Pending'
    };
}

export async function addLambdaToSfn(
    nextLab: string | undefined,
    message: string,
    lambdas: any[],
    next: string[],
    isMap: boolean = false) : Promise<any>
{
  let answer: LooseObject;
  const stateAnswers: any[] = [];
  const messages = ['Which lambda would you like to add to the state machine?'];
  const choices = [
    ...lambdas,
    {role: 'separator', value: dim('────')},
    {
      name: 'Done',
      message: 'Done'
    }
  ];

  if (!lambdas.length) return stateAnswers;

  const doneQ = {
    type: 'confirm',
    name: 'done',
    message: underline(yellow(messages.includes(message) ? 'Add more lambdas to your state?' : 'Add another lambda to Parallel/Map state?')),
    default: true
  };

  const stateTypeQ = {
    type: 'select',
    name: 'type',
    message: 'Choose a state type',
    choices: states
  };

  const stateType: LooseObject = await enquirer.prompt(stateTypeQ);
  let lambda: LooseObject = {};
  const lambdaQ: LooseObject = getStateQ(stateType.type, message, choices, nextLab);

  // @ts-ignore
  lambda = await enquirer.prompt(lambdaQ);

  if (lambda.lambda === 'Done') {
    return stateAnswers;
  }

  switch (stateType.type) {
    case STATE_TYPES.parallel:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.parallel,
          next
      );
      break;
    case STATE_TYPES.map:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.map,
          next,
          isMap
      );
      break;
    case STATE_TYPES.pass:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.pass,
          next
      );
      break;
    case STATE_TYPES.wait:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.wait,
          next
      );
      break;
    case STATE_TYPES.succeed:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.succeed,
          next
      );
      break;
    case STATE_TYPES.fail:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.fail,
          next
      );
      break;
    case STATE_TYPES.choice:
      answer = await addStates(
          lambdas.filter((lb) => lb !== lambda.lambda),
          lambda.lambda,
          STATE_TYPES.choice,
          next
      );
      break;
    default:
      answer = await addStates(choices, lambda.lambda, STATE_TYPES.task, next);
  }

  const availableLambdas = choices.filter((lamb) => lamb !== answer.name);

  if (!isMap) {
    lambda = await enquirer.prompt(doneQ);
  }
  if (availableLambdas.length && !isMap && lambda.done) {
    availableLambdas.splice(-2, 2);
    stateAnswers.push(answer);
    return stateAnswers.concat(
        await addLambdaToSfn(answer.name, message, availableLambdas, next)
    );
  }
  answer.next = 'End';
  stateAnswers.push(answer);

  return stateAnswers;
}
