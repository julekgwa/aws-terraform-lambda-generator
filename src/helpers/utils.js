import fs, { promises } from 'fs'
import { execa } from 'execa'
import path from 'path'
import { uniqueNamesGenerator, adjectives, colors } from 'unique-names-generator'

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
  const directory =
    options.targetDir || `${process.cwd()}/${options.projectName}`
  const result = await execa('git', ['init'], {
    cwd: directory
  })

  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'))
  }
}

export function camelToUnderscore (key) {
  if (!key) {
    return
  }
  const result = key.replace(/([A-Z])/g, ' $1')

  return result.split(' ').join('_').toLowerCase()
}

export const getDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

export const getLambdaDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        !fs.existsSync(`${source}/${dirent.name}/mono.json`) &&
        fs.existsSync(`${source}/${dirent.name}/package.json`)
    )
    .map((dirent) => dirent.name)

export function isInProjectRoot () {
  return fs.existsSync(`${CURR_DIR}/${PACKAGE_DIRECTORY}`)
}

export function validateInput (input) {
  if (/^([A-Za-z\-_\d])+$/.test(input)) return true

  return 'Project name may only include letters, numbers, underscores and hashes.'
}

export async function copyTemplateFiles (options) {
  const currentFileUrl = import.meta.url
  const gitIgnore = path.resolve(
    new URL(currentFileUrl).pathname,
    '../../../.gitignore'
  )

  return fs.copyFileSync(
    gitIgnore,
    `${process.cwd()}/${options.projectName}/.gitignore`
  )
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
      Resource: `\${aws_lambda_function.${camelToUnderscore(sfnName)}.arn}`
    }
    const next = i + 1 < sfnList.length ? 'Next' : 'End'

    task[next] = next === 'Next' ? ucFirst(sfnList[i + 1]) : true
    stateMachineJSON.States[ucFirst(sfnName)] = task
  }

  return stateMachineJSON
}

export async function findScript (scriptPath, contents) {
  const script = await fs.promises.readFile(scriptPath, 'utf8')

  return script
    ?.trim()
    .includes(contents?.substr(0, contents?.indexOf('{')).trim())
}

export async function moveTerraScript (scriptPath, find, replace) {
  let contents = await fs.promises.readFile(scriptPath, 'utf8')

  contents = contents.replace(/\.{2}\/{1}/g, replace)

  return fs.promises.writeFile(scriptPath, contents)
}

export async function createTerraformSfn (options, template, config) {
  try {
    const templatePath = `/terraform/${template}.tf`
    const scriptPath = options.currentProjectDir
      ? `${process.cwd()}${templatePath}`
      : `${process.cwd()}/${options.projectName}${templatePath}`
    let contents = config.terraform[template]

    contents = contents.replace(
      /:definition/g,
      `definition = jsonencode(${
        JSON.stringify(createStateMachineJSON(options.sfnList), null, 2)
        })`
    )
    if (fs.existsSync(scriptPath) && (await findScript(scriptPath, contents))) {
      return
    }
    if (fs.existsSync(scriptPath)) {
      return appendScript(scriptPath, contents)
    }
    return fs.promises.writeFile(scriptPath, contents)
  } catch (err) {
    throw new Error(err.message)
  }
}

export const createBucketName = () => {
  const improvedAdjectives = [
    ...adjectives,
    'abrasive',
    'brash',
    'callous',
    'daft',
    'eccentric'
  ]
  const xMen = [
    'professorX',
    'beast',
    'colossus',
    'cyclops',
    'iceman',
    'wolverine'
  ]

  return uniqueNamesGenerator({
    dictionaries: [improvedAdjectives, colors, xMen],
    length: 2,
    separator: '-'
  })
}

export async function writeTerraformScript (
  options,
  template,
  config,
  templateExtension = ''
) {
  try {
    const templatePath = `/terraform/${template}.tf`
    let contents = config.terraform[`${template}${templateExtension.trim()}`]

    if (!contents) {
      return
    }

    contents = contents.replace(
      /:lambda_name/g,
      camelToUnderscore(options.lambda).replace('-', '_')
    )
    contents = contents.replace(/:package_name/g, options.lambda)
    contents = contents.replace(/:bucket_name/g, createBucketName())
    contents = contents.replace(/:source_directory/g, options.new || options.currentProjectDir ? '../packages/' : '../')
    contents = contents.replace(/:region/g, options.region)

    const scriptPath = options.path
      ? `${options.path}${templatePath}`
      : `${process.cwd()}/${options.projectName}${templatePath}`

    if (fs.existsSync(scriptPath) && (await findScript(scriptPath, contents))) {
      return
    }

    if (fs.existsSync(scriptPath)) {
      return appendScript(scriptPath, contents)
    }

    return fs.promises.writeFile(scriptPath, contents, 'utf8')
  } catch (err) {
    throw new Error(err.message)
  }
}

async function appendScript (scriptPath, contents) {
  return fs.promises.appendFile(scriptPath, `\n${contents}`, 'utf8')
}
