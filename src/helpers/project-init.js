import { install } from 'pkg-install'
import fs from 'fs'
import { execa } from 'execa'

export async function createPackageJson (options) {
  return execa('npm', ['init', '-y'], {
    cwd: process.cwd() + '/' + options.projectName
  })
}

export async function createLambdaPackageJson (options, path, config) {
  const packageJson = JSON.parse(config.project.lambdaPackageJson.replace(/:package_name/g, `@${options.projectName}/${options.lambda}`))
  const directory = path + '/' + 'package.json'

  packageJson.scripts = {
    coverage: 'jest --coverage',
    test: 'NODE_ENV=test jest',
    build: 'babel src package.json package-lock.json --out-dir dist --copy-files && cross-env NODE_ENV=production npm install --prefix dist && zip -rXFS9 function.zip dist',
    clean: 'rimraf dist function.zip',
    deploy: 'terraform apply'
  }
  return fs.writeFileSync(directory, JSON.stringify(packageJson, null, 2))
}

export async function addScriptToPackageJson (options) {
  const directory = process.cwd() + '/' + options.projectName
  const packageJson = JSON.parse(fs.readFileSync(directory + '/package.json'))
  packageJson.scripts = {
    test: "mono exec 'npm run test'",
    build: "mono exec 'npm run build'",
    clean: "mono exec 'npm run clean'",
    bootstrap: 'mono bootstrap',
    'cicd-init': 'npm run bootstrap && npm run build && cd terraform && terraform init',
    validate: 'npm test && cd terraform && terraform validate',
    mono: 'mono',
    lint: "eslint packages/**/*.js --ignore-pattern 'packages/**/dist/**/*.js' --ignore-pattern 'packages/**/test/mock/*.js'"
  }
  fs.writeFileSync(directory + '/package.json', JSON.stringify(packageJson, null, 2))
}

export async function createLambdaFromTemplate (options, path, config) {
  const directory = path + '/src/handlers.js'
  const template = config.project.lambda.replace(/:lambda_name/g, options.lambda)

  return fs.writeFileSync(directory, template)
}

export async function createLambdaTestFromTemplate (options, path, config) {
  const directory = path + '/test/handlers.test.js'
  const template = config.project.lambdaTest.replace(/:lambda_name/g, options.lambda)

  return fs.writeFileSync(directory, template)
}

export async function createBabelConfig (path, config) {
  const directory = path + '/' + '.babelrc'
  const template = config.project.babelConfig

  return fs.writeFileSync(directory, template)
}

export async function createGitIgnore (options, config) {
  if (!options.projectName) {
    return
  }
  const directory = process.cwd() + '/' + options.projectName + '/' + '.gitignore'
  const template = config.gitignore

  return fs.writeFileSync(directory, template, 'utf8')
}

export async function createMonoFile (options, config) {
  const directory = process.cwd() + '/' + options.projectName + '/' + 'mono.json'
  const template = config.monoJson

  return fs.writeFileSync(directory, template)
}

export async function addLambdaToMonoFile (options, path) {
  const directory = path + '/mono.json'
  const monoJson = JSON.parse(fs.readFileSync(directory))

  monoJson.packages[`@${options.projectName}/${options.lambda}`] = {
    version: '0.0.1',
    directory: options.lambda
  }

  return fs.writeFileSync(directory, JSON.stringify(monoJson, null, 2))
}

export async function installLambdaDependencies (path) {
  return install({
    jest: '*',
    'aws-sdk': '*',
    '@babel/cli': '*',
    'cross-env': '*',
    '@babel/core': '*',
    '@babel/preset-env': '*',
    '@babel/plugin-transform-runtime': '*',
    '@babel/runtime-corejs3': '*',
    '@babel/register': '*',
    rimraf: '*'
  }, {
    cwd: path,
    dev: true
  })
}

export async function installDependencies (options) {
  return install({
    monomono: '*'
  }, {
    cwd: process.cwd() + '/' + options.projectName
  })
}
