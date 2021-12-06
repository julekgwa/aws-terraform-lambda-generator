import config from 'config'
import { install } from 'pkg-install'
import fs from 'fs'
import { execa } from 'execa'

export async function createPackageJson (options) {
  return execa('npm', ['init', '-y'], {
    cwd: process.cwd() + '/' + options.projectName
  })
}

export async function createLambdaPackageJson (options) {
  const packageJson = JSON.parse(config.get('project.lambdaPackageJson').replace(/:package_name/g, `@${options.projectName}/${options.lambda}`))
  const directory = process.cwd() + '/' + options.projectName + '/' + options.lambda + '/' + 'package.json'

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

export async function createLambdaFromTemplate (options) {
  const directory = process.cwd() + '/' + options.projectName + '/' + options.lambda + '/src/app.js'
  const template = config.get('project.lambda').replace(/:lambda_name/g, options.lambda)

  return fs.writeFileSync(directory, template)
}

export async function createLambdaTestFromTemplate (options) {
  const directory = process.cwd() + '/' + options.projectName + '/' + options.lambda + '/test/handler.test.js'
  const template = config.get('project.lambdaTest').replace(/:lambda_name/g, options.lambda)

  return fs.writeFileSync(directory, template)
}

export async function createBabelConfig (options) {
  const directory = process.cwd() + '/' + options.projectName + '/' + options.lambda + '/' + '.babelrc'
  const template = config.get('project.babelConfig')

  return fs.writeFileSync(directory, template)
}

export async function installLambdaDependencies (options) {
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
    cwd: process.cwd() + '/' + options.projectName + '/' + options.lambda,
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
