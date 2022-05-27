import enquirer from 'enquirer'
import { clean } from '../helpers/utils';
import { Catcher, Retrier } from '../types/types';

const retrierTemplate = `{
  "ErrorEquals": [ "{{error}}" ],
  "IntervalSeconds": "{{intervalSeconds}}",
  "MaxAttempts": "{{maxAttempts}}",
  "BackoffRate": "{{backoffRate}}"
}`;

const catcherTemplate = `{
  "ErrorEquals": [ "{{error}}" ],
  "Next": "{{next}}",
  "ResultPath": "{{resultPath}}"
}`;


export async function addErrorHandler(type = 'Retry', initial = false) : Promise<any> {
  const retries: Retrier[] | Catcher[] = [];
  // @ts-ignore
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
  }).run();

  // @ts-ignore
  const addRetry = await new enquirer.Confirm({
    name: 'error',
    message: `Do you want to add another ${type}?`,
    default: initial
  }).run();

  retries.push(<any>clean(JSON.parse(retry.result)));
  if (addRetry) {
    // @ts-ignore
    return retries.concat(await addErrorHandler(type, initial));
  }

  return retries;
}

export const invisibleInput = (name: string, message: string, initial: string) => {
  return async () => {
    // @ts-ignore
    const p = new enquirer.Invisible({
      name,
      message,
      skip: true,
      value: initial,
      enabled: false
    })
    const value = await p.run()

    return { name, message, initial: value, value }
  }
}

export const input = (name: string, message: string, initial: string, hint?: string, validate?: Function, result?: Function, required: boolean = false) => {
  return async () => {
    // @ts-ignore
    const p = new enquirer.Input({
      name,
      message,
      initial,
      hint,
      validate,
      result,
      required
    })
    const value = await p.run()

    return { name, message, initial: value, value }
  }
}

export const select = (name: string, message: string, choices: string[]) => {
  return async () => {
    // @ts-ignore
    const s = new enquirer.Select({
      name,
      message,
      choices
    })

    const value = await s.run()

    return { name, initial: value }
  }
}

export const confirm = (name: string, message:string, initial: boolean, type?: string) => {
  return async () => {
    // @ts-ignore
    const p = new enquirer.Confirm({ name, message, initial })
    const value = await p.run()

    if (value && type) {
      const s = await addErrorHandler(type, initial)

      return { name, message, initial: s, value }
    }
    return { name, message, initial: value.toString(), value }
  }
}
