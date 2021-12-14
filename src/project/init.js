import { getPackageManager } from 'pkg-install'
import fs from 'fs'
import { execa } from 'execa'
import { camelToUnderscore } from '../helpers/utils.js'

export async function createPackageJson (options) {
  const pkg = await getPackageManager({
    prefer: 'npm'
  })

  return execa(pkg, ['init', '-y'], {
    cwd: `${process.cwd()}/${options.projectName}`
  })
}

export async function createLambdaPackageJson (options, path, config) {
  let packageName = `${camelToUnderscore(options.projectName).replace(
    '_',
    '-'
  )}/${camelToUnderscore(options.lambda).replace('_', '-')}`

  if (!options.currentProjectDir && !options.new) {
    packageName = camelToUnderscore(options.lambda).replace('_', '-')
  }
  const packageJson = JSON.parse(
    config.project.lambdaPackageJson.replace(/:package_name/g, packageName)
  )
  const directory = `${path}/package.json`

  packageJson.scripts = {
    coverage: 'jest --coverage',
    test: 'NODE_ENV=test jest',
    build:
      'babel src package.json package-lock.json --out-dir dist --copy-files && cross-env NODE_ENV=production npm install --prefix dist && zip -rXFS9 function.zip dist',
    clean: 'rimraf dist function.zip',
    deploy: 'terraform apply'
  }
  return fs.promises.writeFile(directory, JSON.stringify(packageJson, null, 2))
}

export async function addScriptToPackageJson (options) {
  const directory = `${process.cwd()}/${options.projectName}`
  const packageJson = JSON.parse(await fs.promises.readFile(`${directory}/package.json`))

  packageJson.name = camelToUnderscore(packageJson.name).replace('_', '-')
  packageJson.scripts = {
    test: "mono exec 'npm run test'",
    build: "mono exec 'npm run build'",
    clean: "mono exec 'npm run clean'",
    bootstrap: 'mono bootstrap',
    'cicd-init':
      'npm run bootstrap && npm run build && cd terraform && terraform init',
    validate: 'npm test && cd terraform && terraform validate',
    mono: 'mono',
    lint: "eslint packages/**/*.js --ignore-pattern 'packages/**/dist/**/*.js' --ignore-pattern 'packages/**/test/mock/*.js'"
  }
  fs.promises.writeFile(
    `${directory}/package.json`,
    JSON.stringify(packageJson, null, 2)
  )
}

export async function createLambdaFromTemplate (options, path, config) {
  const directory = `${path}/src/handlers.js`
  const template = config.project.lambda.replace(
    /:lambda_name/g,
    options.lambda
  )

  return fs.promises.writeFile(directory, template)
}

export async function createLambdaTestFromTemplate (options, path, config) {
  const directory = `${path}/test/handlers.test.js`
  const template = config.project.lambdaTest.replace(
    /:lambda_name/g,
    options.lambda
  )

  return fs.promises.writeFile(directory, template)
}

export async function createBabelConfig (path, config) {
  const directory = `${path}/.babelrc`
  const template = config.project.babelConfig

  return fs.promises.writeFile(directory, template)
}

export async function createGitIgnore (options, config) {
  if (!options.projectName) {
    return
  }
  const directory =
    `${process.cwd()}/${options.projectName}/.gitignore`
  const template = config.gitignore

  return fs.promises.writeFile(directory, template, 'utf8')
}

export async function createMonoFile (options, config) {
  const directory =
    `${process.cwd()}/${options.projectName}/mono.json`
  const template = config.monoJson

  return fs.promises.writeFile(directory, template)
}

export async function addLambdaToMonoFile (options, path) {
  const directory = `${path}/mono.json`
  const packageName = camelToUnderscore(options.projectName).replace('_', '-')
  const lambda = camelToUnderscore(options.lambda).replace('_', '-')
  const monoJson = JSON.parse(await fs.promises.readFile(directory))

  monoJson.packages[`@${packageName}/${lambda}`] = {
    version: '0.0.1',
    directory: options.lambda
  }

  return fs.promises.writeFile(directory, JSON.stringify(monoJson, null, 2))
}

export async function modifyPackageFile (packagePath, projectName, lambda) {
  const json = JSON.parse(
    await fs.promises.readFile(`${packagePath}/${lambda}/package.json`)
  )

  json.name = `@${camelToUnderscore(projectName).replace('_', '-')}/${
    json.name
  }`

  return fs.promises.writeFile(
    `${packagePath}/package.json`,
    JSON.stringify(json, null, 2)
  )
}

export async function installLambdaDependencies (path) {
  const pkg = await getPackageManager({
    prefer: 'npm'
  })
  const packages = [
    pkg === 'yarn' ? 'add' : 'install',
    'aws-sdk',
    '@babel/runtime-corejs3'
  ]

  return execa(pkg, packages, {
    cwd: path
  })
}

export async function installLambdaDevDependencies (path) {
  const pkg = await getPackageManager({
    prefer: 'npm'
  })
  const packages = [
    pkg === 'yarn' ? 'add' : 'install',
    'jest',
    '@babel/cli',
    'cross-env',
    '@babel/core',
    '@babel/preset-env',
    '@babel/plugin-transform-runtime',
    '@babel/register',
    'rimraf',
    '-D'
  ]

  return execa(pkg, packages, {
    cwd: path
  })
}

export async function installDependencies (options) {
  const pkg = await getPackageManager({
    prefer: 'npm'
  })
  const packages = [
    pkg === 'yarn' ? 'add' : 'install',
    'monomono'
  ]

  return execa(pkg, packages, {
    cwd: options.projectName
  })
}
