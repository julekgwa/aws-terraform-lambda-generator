import fs, { promises } from 'fs'
import { execa } from 'execa'
import arg from 'arg'
import path from 'path'
import chalk from 'chalk'

const CURR_DIR = process.cwd()
const PACKAGE_DIRECTORY = 'packages'
const { readdir } = promises

function ucFirst (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export async function createProjectDir (dirPath) {
  if (!fs.existsSync(dirPath)) {
    return fs.mkdirSync(dirPath, { recursive: true })
  }
}

export async function initGit (options) {
  const directory = options.targetDir || process.cwd() + `/${options.projectName}`
  const result = await execa('git', ['init'], {
    cwd: directory
  })
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'))
  }
}

export function camelToUnderscore (key) {
  const result = key.replace(/([A-Z])/g, ' $1')
  return result.split(' ').join('_').toLowerCase()
}

export function parseArgumentsIntoOptions (rawArgs) {
  try {
    const args = arg(
      {
        '--add': String,
        '--remove': String,
        '--dir': String,
        '--new': String,
        '-a': '--add',
        '-r': '--remove',
        '-d': '--dir',
        '-n': '--new'
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
      new: args['--new']
    }
  } catch (error) {
    console.log(`%s: ${error.message}`, chalk.red.bold('ERROR'))
    process.exit(1)
  }
}

export const getDirectories = async source =>
  (await readdir(source, { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

export function isInProjectRoot () {
  return fs.existsSync(`${CURR_DIR}/${PACKAGE_DIRECTORY}`)
}

export function validateInput (input) {
  if (/^([A-Za-z\-_\d])+$/.test(input)) return true
  else { return 'Project name may only include letters, numbers, underscores and hashes.' }
}

export async function copyTemplateFiles (options) {
  const currentFileUrl = import.meta.url
  const gitIgnore = path.resolve(
    new URL(currentFileUrl).pathname,
    '../../../.gitignore'
  )
  return fs.copyFileSync(gitIgnore, process.cwd() + '/' + options.projectName + '/.gitignore')
}

export function createStateMachineJSON (sfnList = []) {
  const stateMachineJSON = {
    StartAt: ucFirst(sfnList[0]),
    States: {}
  }

  for (let i = 0; i < sfnList.length; i++) {
    const sfnName = sfnList[i]
    const task = {
      Type: 'Task',
      Resource: '${aws_lambda_function.' + camelToUnderscore(sfnName) + '.arn}'
    }
    const next = i + 1 < sfnList.length ? 'Next' : 'End'
    task[next] = next === 'Next' ? ucFirst(sfnList[i + 1]) : true
    stateMachineJSON.States[ucFirst(sfnName)] = task
  }

  return stateMachineJSON
}

export async function findScript (scriptPath, contents) {
  const script = await fs.readFileSync(scriptPath, 'utf8')
  return script?.trim().includes(contents?.substr(0, contents?.indexOf('{')).trim())
}
