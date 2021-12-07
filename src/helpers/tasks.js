import { Listr } from 'listr2'
import {
  addLambdaToMonoFile,
  addScriptToPackageJson,
  createBabelConfig,
  createLambdaFromTemplate,
  createLambdaPackageJson,
  createLambdaTestFromTemplate,
  createMonoFile,
  createPackageJson,
  installDependencies,
  installLambdaDependencies
} from './project-init.js'
import {
  copyTemplateFiles,
  createProjectDir,
  initGit,
  writeRegionTerraformScript,
  writeTerraformScript
} from './utils.js'

function createLambdaTasks (options, config) {
  let lambdaPath = `${process.cwd()}/${options.projectName}/packages/${
    options.lambda
  }`

  let monoPath = `${process.cwd()}/${options.projectName}`

  if (options.currentProjectDir) {
    monoPath = process.cwd()
    lambdaPath = `${process.cwd()}/packages/${options.lambda}`
  }
  return new Listr([
    {
      title: 'Creating lambda directory',
      task: async (t, project) => {
        if (!options.lambda) {
          project.skip()
        }

        console.log('Creating lambda directory', lambdaPath)
        await createProjectDir(lambdaPath)

        const lambdaTasks = project.newListr([
          {
            title: 'Creating package.json',
            task: async (t, lambda) => {
              await createLambdaPackageJson(options, lambdaPath, config)
            }
          },
          {
            title: 'Creating .babelrc file',
            task: async (t, lambda) => {
              await createBabelConfig(lambdaPath, config)
            }
          },
          {
            title: 'Adding lambda to mono json file',
            task: async (t, lambda) => {
              await addLambdaToMonoFile(options, monoPath)
            }
          },
          {
            title: 'Creating src directory',
            task: async () => {
              await createProjectDir(`${lambdaPath}/src`)
            }
          },
          {
            title: 'Copying lambda files',
            task: async () => {
              await createLambdaFromTemplate(options, lambdaPath, config)
            }
          },
          {
            title: 'Creating test directory',
            task: async () => {
              await createProjectDir(`${lambdaPath}/test`)
            }
          },
          {
            title: 'Copying lambda test files',
            task: async () => {
              await createLambdaTestFromTemplate(options, lambdaPath, config)
            }
          },
          {
            title: 'Installing lambda dependencies',
            task: async () => {
              await installLambdaDependencies(lambdaPath)
            }
          }
        ])

        await lambdaTasks.run()
      }
    }
  ])
}

function createProjectTasks (options, config) {
  return new Listr([
    {
      title: 'Setting up project',
      task: (_, task) => {
        const subTasks = task.newListr([
          {
            title: 'Creating project directory',
            task: async (t, project) => {
              if (!options.projectName) {
                project.skip()
              }
              await createProjectDir(`${process.cwd()}/${options.projectName}`)

              const projectTasks = project.newListr([
                {
                  title: 'Creating .gitignore file',
                  task: async (t, lambda) => {
                    await copyTemplateFiles(options)
                  }
                },
                {
                  title: 'Creating mono json file',
                  task: async (t, lambda) => {
                    await createMonoFile(options, config)
                  }
                }
              ])

              await projectTasks.run()
            }
          },
          {
            title: 'Creating packages directory',
            task: async (t, project) => {
              if (!options.projectName) {
                project.skip()
              }
              await createProjectDir(
                `${process.cwd()}/${options.projectName}/packages`
              )
            }
          },
          {
            title: 'Creating terraform directory',
            task: async (t, project) => {
              await createProjectDir(
                `${process.cwd()}/${options.projectName}/terraform`
              )

              const terraformScriptTask = project.newListr([
                {
                  title: 'Creating aws lambda function terraform script',
                  task: async () => writeTerraformScript(options, 'lambda', config)
                },
                {
                  title: 'Creating aws iam role terraform script',
                  task: async () => writeTerraformScript(options, 'iam', config)
                },
                {
                  title: 'Creating aws provider terraform script',
                  task: async () => writeRegionTerraformScript(options, config)
                }
              ])

              terraformScriptTask.run()
            }
          },
          {
            title: 'Creating project package.json',
            task: async () => {
              await createPackageJson(options)
            }
          },
          {
            title: 'Updating scripts',
            task: async () => {
              await addScriptToPackageJson(options)
            }
          },
          {
            title: 'Installing dependencies',
            task: async () => {
              await installDependencies(options)
            }
          },
          {
            title: 'Initializing git',
            task: async () => {
              await initGit(options)
            }
          }
        ])

        subTasks.run()
      }
    }
  ])
}

export async function runTasks (options, config) {
  const tasks = []

  if (!options.currentProjectDir) {
    tasks.push(createProjectTasks(options, config))
  }

  if (options.lambda) {
    tasks.push(createLambdaTasks(options, config))
  }

  for (const task of tasks) {
    await task.run()
  }
}
