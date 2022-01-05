/* eslint-disable no-template-curly-in-string */
import fs from 'fs'
import { execa } from 'execa'
import { uniqueNamesGenerator, adjectives, colors } from 'unique-names-generator'

const CURR_DIR = process.cwd()
const PACKAGE_DIRECTORY = 'packages'

function ucFirst (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function isJSON (jsonString) {
  try {
    JSON.parse(jsonString)
    return true
  } catch (exception) {
    return false
  }
}
function isUpperCase (myString, pos) {
  return myString.charAt(pos) === myString.charAt(pos).toUpperCase()
}

function lcFirst (string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}

export function clean (obj) {
  for (const propName in obj) {
    if (obj[propName] === '' || obj[propName] === 'optional' || obj[propName] === undefined) {
      delete obj[propName]
    }
  }
  return obj
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

  key = isUpperCase(key, 0) ? lcFirst(key) : key
  const result = key.replace(/([A-Z])/g, ' $1')

  return result.split(' ').join('_').toLowerCase()
}

export const getDirectories = async (source) =>
  (await fs.promises.readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

export const getLambdaDirectories = async (source) =>
  (await fs.promises.readdir(source, { withFileTypes: true }))
    .filter(
      (dirent) =>
        dirent.isDirectory() &&
        !fs.existsSync(`${source}/${dirent.name}/lerna.json`) &&
        fs.existsSync(`${source}/${dirent.name}/package.json`)
    )
    .map((dirent) => dirent.name)

export function isInProjectRoot () {
  return fs.existsSync(`${CURR_DIR}/${PACKAGE_DIRECTORY}`)
}

export function validateInput (input) {
  if (/^([A-Za-z\-_\d])+$/.test(input)) return true

  return 'Name may only include letters, numbers, underscores and hashes.'
}

function createStateType (sfnName) {
  const state = {
    Type: sfnName.stateType
  }

  for (const key in sfnName) {
    if (sfnName.Retry === 'true') {
      sfnName.Retry = JSON.parse(sfnName.Retry)
    } else if (sfnName.Retry === 'false') {
      delete sfnName.Retry
    }

    if (sfnName.Catch === 'true') {
      sfnName.Catch = JSON.parse(sfnName.Catch)
    } else if (sfnName.Catch === 'false') {
      delete sfnName.Catch
    }

    if (key !== 'name' && key !== 'stateType' && key !== 'next') {
      state[key] = sfnName[key]
    }
  }

  const next =
    sfnName.next !== 'End' && sfnName.next !== 'Done' ? 'Next' : 'End'

  if (!['Succeed', 'Fail'].includes(sfnName.stateType) && sfnName.next) {
    state[next] = next === 'Next' ? ucFirst(sfnName.next) : true
  }

  return state
}

export function createStateMachineJSON (sfnList) {
  const stateMachineJSON = {
    StartAt: ucFirst(sfnList[0].name),
    States: {}
  }

  for (const sfn of sfnList) {
    const sfnName = clean(sfn)

    if (sfnName.stateType === 'Task') {
      sfnName.Resource = `\${aws_lambda_function.${camelToUnderscore(
        sfnName.name
      )}.arn}`
    }

    if (sfnName.stateType === 'Choice' && sfnName.default) {
      sfnName.Default = ucFirst(sfnName.default)
      delete sfnName.default
    }

    stateMachineJSON.States[ucFirst(sfnName.name)] = createStateType(sfnName)
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

export async function createTerraformSfn (options, template, conf) {
  try {
    const templatePath = `/terraform/${template}.tf`
    const scriptPath = options.currentProjectDir
      ? `${process.cwd()}${templatePath}`
      : `${process.cwd()}/${options.projectName}${templatePath}`
    let contents = conf.terraform[template]

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
  conf,
  templateExtension = ''
) {
  try {
    const templatePath = `/terraform/${template}.tf`
    let contents = conf.terraform[`${template}${templateExtension.trim()}`]

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

export const config = {
  aws: { region: 'us-east-2' },
  help: 'create-aws-tf-lambda generates AWS lambda with terraform script\n\nusage:\n  create-aws-tf-lambda [-n <project>], [-a <lambda>], [-h], [-o]\n\n  commands can be:\n\n  -n,  --new <project>:      used to create a new project\n  -a,  --add  <lambda>:      used to add a new lambda. Use -a sfn to add a step function\n  -h,           --help:      used to print the usage guide\n  -o,            --org:      used to move all your lambdas to one project [mono project]\n',
  project:
     {
       directory: 'packages',
       babelConfig: '{\n  "presets": [\n    [\n      "@babel/preset-env",\n      {\n        "targets": {\n          "node": "12",\n          "esmodules": true\n        }\n      }\n    ]\n  ],\n    "plugins": [\n    [\n      "@babel/plugin-transform-runtime",\n      {\n        "corejs": 3\n      }\n    ]\n  ]\n}\n',
       lambda: 'export async function :lambda_name (event) {\n  console.log(\'Loading function\', event)\n}\n',
       lambdaTest: 'import { :lambda_name } from \'../src/handlers\'\ndescribe(\'Given handler\', () => {\n  test(\'should expose the lambda function handler\', () => {\n    expect(typeof :lambda_name).toBe(\'function\')\n  })\n})\n',
       projectPackageJson: '{\n  "name": ":package_name",\n  "version": "1.0.0",\n  "description": "",\n  "main": "app.js",\n  "scripts": {\n    "start": "node app.js",\n    "test": "jest"\n  },\n  "keywords": [],\n  "author": "",\n  "license": "ISC"\n}\n',
       lambdaPackageJson: '{\n  "name": ":package_name",\n  "version": "1.0.0",\n  "description": "",\n  "main": "app.js",\n  "scripts": {\n    "start": "node app.js",\n    "test": "jest"\n  },\n  "keywords": [],\n  "author": "",\n  "license": "ISC"\n}\n'
     },
  terraform:
     {
       aws_s3_bucket_object: '# resource "aws_s3_bucket_object" ":lambda_name_file_upload" {\n#   bucket  = aws_s3_bucket.lambda_fn_upload.id\n#   key     = "lambda-fns/:package_name/function.zip"\n#   source  = ":source_directory:package_name/function.zip"\n#   etag    = filemd5(":source_directory:package_name/function.zip")\n# }\n',
       aws_s3_bucket: '# resource "aws_s3_bucket" "lambda_fn_upload" {\n#   bucket = var.bucket\n#   acl    = "private"\n# }\n',
       aws_sfn_state_machine: 'resource "aws_sfn_state_machine" "sfn_state_machine" {\n  name     = "sfn_state_machine"\n  role_arn = aws_iam_role.sfn_execution.arn\n\n  :definition\n}\n',
       aws_iam_role_policy_attachment_sfn: 'resource "aws_iam_role_policy_attachment" "sfn_lambda_invoke" {\n    role       = "${aws_iam_role.sfn_execution.name}"\n    policy_arn = "${aws_iam_policy.sfn_lambda_invoke.arn}"\n}\n',
       aws_iam_policy_sfn: 'resource "aws_iam_policy" "sfn_lambda_invoke" {\n    name = "sfn_lambda_invoke"\n    policy = "${data.aws_iam_policy_document.sfn_lambda_invoke.json}"\n}\n',
       aws_iam_policy_document_sfn: 'data "aws_iam_policy_document" "sfn_lambda_invoke" {\n    statement {\n        actions = ["lambda:InvokeFunction"]\n        resources = ["arn:aws:lambda:*:*:*"]\n    }\n}\n',
       aws_iam_policy_document: 'data "aws_iam_policy_document" "sfn_assume_role" {\n  statement {\n    actions = ["sts:AssumeRole"]\n\n    principals {\n      type = "Service"\n      identifiers = ["states.${var.aws_region}.amazonaws.com"]\n    }\n  }\n}\n',
       aws_iam_role_policy_attachment: 'resource "aws_iam_role_policy_attachment" "lambda_fn_policy_logs" {\n  role       = aws_iam_role.lambda_fn_role.name\n  policy_arn = aws_iam_policy.lambda_fn_logging.arn\n}\n',
       aws_iam_policy: 'resource "aws_iam_policy" "lambda_fn_logging" {\n  name        = "lambda_fn_logging"\n  path        = "/"\n  description = "IAM policy for logging from a lambda"\n\n  policy = jsonencode({\n    "Version": "2012-10-17",\n    "Statement": [\n      {\n        "Action": [\n          "logs:CreateLogGroup",\n          "logs:CreateLogStream",\n          "logs:PutLogEvents"\n        ],\n        "Resource": "arn:aws:logs:*:*:*",\n        "Effect": "Allow"\n      }\n    ]\n  })\n}\n',
       aws_cloudwatch_log_group: 'resource "aws_cloudwatch_log_group" ":lambda_name_logs" {\n  name              = "/aws/lambda/:lambda_name"\n  retention_in_days = 0\n}\n',
       aws_iam_role_sfn: 'resource "aws_iam_role" "sfn_execution" {\n  name = "sfn_execution"\n  assume_role_policy = "${data.aws_iam_policy_document.sfn_assume_role.json}"\n}\n',
       aws_iam_role: 'resource "aws_iam_role" "lambda_fn_role" {\n  name = "lambda_fn_role"\n\n  assume_role_policy = jsonencode({\n    "Version" : "2012-10-17",\n    "Statement" : [\n      {\n        "Effect" : "Allow",\n        "Principal" : {\n          "Service" : "lambda.amazonaws.com"\n        },\n        "Action" : "sts:AssumeRole"\n      }\n    ]\n  })\n\n}\n',
       aws_lambda_function: 'resource "aws_lambda_function" ":lambda_name" {\n  # For files larger than 10 MB, consider uploading using Amazon S3.\n  # uncomment the lines in aws_s3_bucket*.tf\n  # s3_bucket         = aws_s3_bucket.lambda_fn_upload.id\n  # s3_key            = "lambda-fns/:package_name/function.zip"\n  filename      = ":source_directory:package_name/function.zip"\n  function_name = ":package_name"\n  role          = aws_iam_role.lambda_fn_role.arn\n  handler       = "dist/handlers.:package_name"\n\n  source_code_hash = filebase64sha256(":source_directory:package_name/function.zip")\n\n  #depends_on = [\n  #  aws_s3_bucket_object.lab_file_upload\n  #]\n\n  runtime = "nodejs12.x"\n}\n',
       archive: 'data "archive_file" ":lambda_name" {\n  type = "zip"\n\n  source_dir  = "${path.module}/:package_name"\n  output_path = "${path.module}/:package_name.zip"\n}\n',
       provider: 'provider "aws" {\n  region     = var.aws_region\n}\n',
       variables: '# variable "bucket" {\n#   type = string\n#   default = "lambda-fns-:bucket_name" # should be unique\n# }\n\nvariable "aws_region" {\n  type    = string\n  default = ":region"\n}\n'
     },
  lernaJson: '{\n  "packages": ["packages/*"],\n  "version": "0.0.1"\n}\n',
  gitignore: '# Logs logs *.log npm-debug.log* yarn-debug.log* yarn-error.log* lerna-debug.log* .pnpm-debug.log*\n# Diagnostic reports (https://nodejs.org/api/report.html) report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json\n# Runtime data pids *.pid *.seed *.pid.lock\n# Directory for instrumented libs generated by jscoverage/JSCover lib-cov\n# Coverage directory used by tools like istanbul coverage *.lcov\n# nyc test coverage .nyc_output\n# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files) .grunt\n# Bower dependency directory (https://bower.io/) bower_components\n# node-waf configuration .lock-wscript\n# Compiled binary addons (https://nodejs.org/api/addons.html) build/Release\n# Dependency directories node_modules/ jspm_packages/\n# Snowpack dependency directory (https://snowpack.dev/) web_modules/\n# TypeScript cache *.tsbuildinfo\n# Optional npm cache directory .npm\n# Optional eslint cache .eslintcache\n# Optional stylelint cache .stylelintcache\n# Microbundle cache .rpt2_cache/ .rts2_cache_cjs/ .rts2_cache_es/ .rts2_cache_umd/\n# Optional REPL history .node_repl_history\n# Output of \'npm pack\' *.tgz\n# Yarn Integrity file .yarn-integrity\n# dotenv environment variables file .env.development.local .env.test.local .env.production.local .env.local\n# parcel-bundler cache (https://parceljs.org/) .cache .parcel-cache\n# Next.js build output .next out\n# Nuxt.js build / generate output .nuxt dist\n# Gatsby files .cache/ # Comment in the public line in if your project uses Gatsby and not Next.js # https://nextjs.org/blog/next-9-1#public-directory-support # public\n# vuepress build output .vuepress/dist\n# vuepress v2.x temp and cache directory .temp .cache\n# Serverless directories .serverless/\n# FuseBox cache .fusebox/\n# DynamoDB Local files .dynamodb/\n# TernJS port file .tern-port\n# Stores VSCode versions used for testing VSCode extensions .vscode-test\n# yarn v2 .yarn/cache .yarn/unplugged .yarn/build-state.yml .yarn/install-state.gz .pnp.*\n'
}
