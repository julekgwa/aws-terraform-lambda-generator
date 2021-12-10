import fs from 'fs'
import {
  camelToUnderscore,
  createStateMachineJSON,
  findScript
} from './utils.js'

export async function createTerraformSfn (options, template, config) {
  try {
    const scriptPath = `/terraform/${template}.tf`
    const path = options.currentProjectDir
      ? `${process.cwd()}${scriptPath}`
      : `${process.cwd()}/${options.projectName}${scriptPath}`
    let contents = config.terraform[template]

    contents = contents.replace(
      /:definition/g,
      'definition = jsonencode(' +
        JSON.stringify(createStateMachineJSON(options.sfnList), null, 2) +
        ')'
    )
    if (fs.existsSync(path) && (await findScript(path, contents))) {
      return
    }
    if (fs.existsSync(path)) {
      return appendScript(path, contents)
    }
    return fs.writeFileSync(path, contents)
  } catch (err) {
    throw new Error(err.message)
  }
}

export async function writeTerraformScript (
  options,
  template,
  config,
  templateExtension = ''
) {
  try {
    const scriptPath = `/terraform/${template}.tf`
    let contents = config.terraform[`${template}${templateExtension.trim()}`]

    if (!contents) {
      return
    }

    contents = contents.replace(
      /:lambda_name/g,
      camelToUnderscore(options.lambda).replace('-', '_')
    )
    contents = contents.replace(/:package_name/g, options.lambda)
    contents = contents.replace(/:source_directory/g, options.new ? '../packages/' : '../')
    contents = contents.replace(/:region/g, options.region)

    const path = options.path
      ? `${options.path}${scriptPath}`
      : `${process.cwd()}/${options.projectName}${scriptPath}`

    if (fs.existsSync(path) && (await findScript(path, contents))) {
      return
    }

    if (fs.existsSync(path)) {
      return appendScript(path, contents)
    }

    return fs.writeFileSync(path, contents)
  } catch (err) {
    throw new Error(err.message)
  }
}

async function appendScript (path, contents) {
  return fs.appendFileSync(path, '\n' + contents)
}
