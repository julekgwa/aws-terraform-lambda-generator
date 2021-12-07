import fs from 'fs'
import { execa } from 'execa'
import arg from 'arg'
import path from 'path'

const CURR_DIR = process.cwd()
const PACKAGE_DIRECTORY = 'packages'

export async function createProjectDir (dirPath) {
  if (!fs.existsSync(dirPath)) {
    return fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function writeRegionTerraformScript (options, config) {
  let tfContents = config.terraform.provider
  tfContents = tfContents.replace(/:region/g, options.region)
  const terraformDir = `${CURR_DIR}/${options.projectName}/terraform/providers.tf`

  if (!fs.existsSync(terraformDir)) {
    fs.writeFileSync(terraformDir, tfContents)
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

export async function writeTerraformScript (options, template, config) {
  let tfContents = config.terraform[template]

  tfContents = tfContents.replace(/:lambda_name/g, options.lambda)
  tfContents = tfContents.replace(/:package_name/g, options.lambda)

  const terraformDir =
    `${CURR_DIR}/${options.projectName}/terraform/` + template + '.tf'

  if (!fs.existsSync(terraformDir)) {
    fs.writeFileSync(terraformDir, tfContents)
    console.log(`Created terraform script at ${terraformDir}`)
  } else {
    console.log(`Terraform script already exists at ${terraformDir}`)
  }
}

export function parseArgumentsIntoOptions (rawArgs) {
  const args = arg(
    {
      '--add': String,
      '--remove': String,
      '--dir': String,
      '-a': '--add',
      '-r': '--remove',
      '-d': '--dir'
    },
    {
      argv: rawArgs.slice(2)
    }
  )

  return {
    lambda: args['--add'],
    remove: args['--remove'],
    projectName: args._[0],
    skipPrompts: args['--add'],
    targetDir: args['--dir']
  }
}

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
