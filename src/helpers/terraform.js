import fs from 'fs'
import { camelToUnderscore, createStateMachineJSON } from './utils.js'

function createOnce (template, write = false) {
  return !write && (
    template === 'aws_iam_role' ||
    template === 'aws_iam_role_sfn' ||
    template === 'aws_iam_policy' ||
    template === 'provider' ||
    template === 'aws_iam_role_policy_attachment' ||
    template === 'variables' ||
    template === 'aws_iam_policy_document'
  )
}

export async function createTerraformSfn (options, template, config) {
  const scriptPath = `/terraform/${template}.tf`
  const path = options.currentProjectDir
    ? `${process.cwd()}${scriptPath}`
    : `${process.cwd()}/${options.projectName}${scriptPath}`
  let contents = config.terraform[template]

  contents = contents.replace(
    /:definition/g,
    'definition = jsonencode(' +
      JSON.stringify(createStateMachineJSON(options.sfnList), null, 2) + ')'
  )
  return fs.writeFileSync(path, contents)
}

export async function writeTerraformScript (options, template, config, templateExtension = '') {
  const scriptPath = `/terraform/${template}.tf`
  let contents = config.terraform[`${template}${templateExtension.trim()}`]

  if (!contents) {
    return
  }

  contents = contents.replace(/:lambda_name/g, camelToUnderscore(options.lambda).replace('-', '_'))
  contents = contents.replace(/:package_name/g, options.lambda)
  contents = contents.replace(/:region/g, options.region)

  const path = options.path
    ? `${options.path}${scriptPath}`
    : `${process.cwd()}/${options.projectName}${scriptPath}`

  if (fs.existsSync(path) && createOnce(template, options.write)) {
    return
  }

  if (fs.existsSync(path)) {
    return appendScript(path, contents)
  }

  return fs.writeFileSync(path, contents)
}

async function appendScript (path, contents) {
  return fs.appendFileSync(path, '\n' + contents)
}
