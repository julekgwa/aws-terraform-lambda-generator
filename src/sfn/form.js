import enquirer from 'enquirer'
import { addErrorHandler } from './index.js'

export const invisibleInput = (name, message, initial) => {
  return async () => {
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

export const input = (name, message, initial, hint, validate, result, required = false) => {
  return async () => {
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

export const select = (name, message, choices) => {
  return async () => {
    const s = new enquirer.Select({
      name,
      message,
      choices
    })

    const value = await s.run()

    return { name, initial: value }
  }
}

export const confirm = (name, message, initial, type) => {
  return async () => {
    const p = new enquirer.Confirm({ name, message, initial })
    const value = await p.run()

    if (value && type) {
      const s = await addErrorHandler(type, initial)

      return { name, message, initial: s, value }
    }
    return { name, message, initial: value.toString(), value }
  }
}
