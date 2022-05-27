import {promises} from 'fs';
import {execa} from 'execa';
import {camelToUnderscore} from '../helpers/utils.js';
import {Config, Options} from '../types/types.js';
import {getPackageManager} from 'get-package-manager';

const PKG = getPackageManager({prefer: 'npm'});

export async function createPackageJson(options: Options) {
  return execa(PKG, ['init', '-y'], {
    cwd: `${process.cwd()}/${options.projectName}`
  });
}

export async function createLambdaPackageJson(
    options: Options, path: string, config: Config) {
  const projectName = camelToUnderscore(options.projectName || '') || '';
  const lambda = camelToUnderscore(options.lambda) || '';
  let packageName = `@${projectName.replace(
      '_',
      '-'
  )}/${lambda.replace('_', '-')}`;

  if (!options.currentProjectDir && !options.new) {
    packageName = lambda.replace('_', '-');
  }
  const packageJson = JSON.parse(
      config.project.lambdaPackageJson.replace(/:package_name/g, packageName)
  );
  const directory = `${path}/package.json`;
  const buildScript = 'babel src package.json package-lock.json' +
    ' --out-dir dist --copy-files ' +
    `&& cross-env NODE_ENV=production ${PKG} install --prefix dist ` +
    '&& zip -rXFS9 function.zip dist';

  packageJson.scripts = {
    coverage: 'jest --coverage',
    test: 'NODE_ENV=test jest',
    build: buildScript,
    clean: 'rimraf dist function.zip',
    deploy: 'terraform apply'
  };
  return promises.writeFile(directory, JSON.stringify(packageJson, null, 2));
}

export async function addScriptToPackageJson(options: Options) {
  const directory = `${process.cwd()}/${options.projectName}`;
  const packageContent = await promises.readFile(`${directory}/package.json`);
  const packageJson = JSON.parse(packageContent.toString());
  const packageName = camelToUnderscore(packageJson.name) || '';
  const lint = 'eslint packages/**/*.js --ignore-pattern' +
    ' \'packages/**/dist/**/*.js\'' +
    ' --ignore-pattern \'packages/**/test/mock/*.js\'';

  packageJson.name = packageName.replace('_', '-');
  packageJson.scripts = {
    'test': 'lerna run test',
    'build': 'lerna run build',
    'clean': 'lerna run clean',
    'cicd-init':
      'lerna run test && lerna run build && cd terraform && terraform init',
    'validate': 'lerna test && cd terraform && terraform validate',
    'lint': lint
  };
  promises.writeFile(
      `${directory}/package.json`,
      JSON.stringify(packageJson, null, 2)
  );
}

export async function createLambdaFromTemplate(
    options: Options,
    path: string,
    config: Config
) {
  const directory = `${path}/src/handlers.js`;
  const template = config.project.lambda.replace(
      /:lambda_name/g,
      options.lambda
  );

  return promises.writeFile(directory, template);
}

export async function createLambdaTestFromTemplate(
    options: Options,
    path: string,
    config: Config
) {
  const directory = `${path}/test/handlers.test.js`;
  const template = config.project.lambdaTest.replace(
      /:lambda_name/g,
      options.lambda
  );

  return promises.writeFile(directory, template);
}

export async function createBabelConfig(path: string, config: Config) {
  const directory = `${path}/.babelrc`;
  const template = config.project.babelConfig;

  return promises.writeFile(directory, template);
}

export async function createGitIgnore(options: Options, config: Config) {
  if (!options.projectName) {
    return;
  }
  const directory =
    `${process.cwd()}/${options.projectName}/.gitignore`;
  const template = config.gitignore;

  return promises.writeFile(directory, template, 'utf8');
}

export async function createLernaFile(options: Options, config: Config) {
  const directory =
    `${process.cwd()}/${options.projectName}/lerna.json`;
  const template = config.lernaJson;

  return promises.writeFile(directory, template);
}

export async function modifyPackageFile(
    packagePath: string,
    projectName: string,
    lambda: string
) {
  const lambdaPackage = `${packagePath}/${lambda}/package.json`;
  const packageContent = await promises.readFile(lambdaPackage);
  const json = JSON.parse(packageContent.toString());
  const projectNameCamelCase = camelToUnderscore(projectName) || '';

  json.name = `@${projectNameCamelCase.replace('_', '-')}/${json.name
  }`;

  return promises.writeFile(
      `${packagePath}/package.json`,
      JSON.stringify(json, null, 2)
  );
}

export async function installLambdaDependencies(path: string) {
  console.log('PATH', path);
  const packages = [
    PKG === 'yarn' ? 'add' : 'install',
    'aws-sdk',
    '@babel/runtime-corejs3'
  ];

  return execa(PKG, packages, {
    cwd: path
  });
}

export async function installLambdaDevDependencies(path: string) {
  const packages = [
    PKG === 'yarn' ? 'add' : 'install',
    'jest',
    '@babel/cli',
    'cross-env',
    '@babel/core',
    '@babel/preset-env',
    '@babel/plugin-transform-runtime',
    '@babel/register',
    'rimraf',
    '-D'
  ];

  return execa(PKG, packages, {
    cwd: path
  });
}

export async function installDependencies(options: Options) {
  const packages = [
    PKG === 'yarn' ? 'add' : 'install',
    'lerna'
  ];

  return execa(PKG, packages, {
    cwd: options.projectName
  });
}
